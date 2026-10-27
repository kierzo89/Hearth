import {useEffect, useRef, useState} from 'preact/hooks';
import {emptyQueue, entry, stepQueue, moveQueue, insertQueue, removeQueue, shuffleQueue, shuffled, type QueueState, type RepeatMode} from './queue';
import {trackUrl, type MusicConnection, type Track} from './music';
export interface PlayerState {playbackId: number; track: Track | null; playing: boolean; loading: boolean; current: number; duration: number; error: string;}
export type {MusicAudioGraph} from './musicSamples';
import {createMusicSampler, type MusicAudioGraph} from './musicSamples';
export function useMusic () {
	const sampler = useRef<ReturnType<typeof createMusicSampler> | null>(null);
	const audio = useRef<HTMLAudioElement | null>(null);
	const queueRef=useRef<QueueState>(emptyQueue());
	const [queue,setQueue]=useState(queueRef.current);
	const updateQueue=(next:QueueState)=>{queueRef.current=next;setQueue(next);};
	const [state, setState] = useState<PlayerState>({playbackId: 0, track: null, playing: false, loading: false, current: 0, duration: 0, error: ''});
	const sequence = useRef(0);
	const playEntry = (key: string, start=true) => {
		const item=queueRef.current.entries.find(e=>e.key===key),player=audio.current;if(!item||!player)return;
		const request=++sequence.current;player.pause();updateQueue({...queueRef.current,current:key});player.src=trackUrl(item.connection,item.track.id);
		setState({playbackId:request,track:item.track,playing:false,loading:start,current:0,duration:0,error:''});
		if(start)player.play().catch(()=>{if(sequence.current===request)setState(s=>({...s,playing:false,loading:false,error:'This track could not play. Try another track, or check the TV music service.'}));});
	};
	const play = (tracks: Track[], at: number, source: MusicConnection) => {
		if(!tracks[at])return;const entries=tracks.slice(0,500).map(t=>entry(t,source));if(!entries[at])return;
		const key=entries[at].key;updateQueue({...queueRef.current,entries:queueRef.current.shuffle?entries.slice(0,at+1).concat(shuffled(entries.slice(at+1))):entries,current:key});playEntry(key);
	};
	const next = (delta=1,ended=false) => {const key=stepQueue(queueRef.current,delta,ended);if(key)playEntry(key);else if(ended)setState(s=>({...s,playing:false,loading:false}));};
	const toggle = () => {const player=audio.current;if(!player)return;if(!player.getAttribute('src')){const key=queueRef.current.current||(queueRef.current.entries[0]||{}).key;if(key)playEntry(key);return;}if(!player.paused)player.pause();else player.play().catch(()=>setState(s=>({...s,loading:false,error:'Playback could not resume'})));};
	const enqueue = (track:Track,source:MusicConnection,next=false):boolean => {const q=insertQueue(queueRef.current,entry(track,source),next);if(q===queueRef.current)return false;updateQueue(q);return true;};
	const move = (key:string,delta:number) => updateQueue(moveQueue(queueRef.current,key,delta));
	const remove = (key:string) => {const wasCurrent=queueRef.current.current===key,wasPlaying=!!audio.current&&!audio.current.paused;const q=removeQueue(queueRef.current,key);updateQueue(q);if(wasCurrent){if(q.current)playEntry(q.current,wasPlaying);else stop();}};
	const shuffle = () => updateQueue(shuffleQueue(queueRef.current));
	const repeat = (mode:RepeatMode) => updateQueue({...queueRef.current,repeat:mode});
	const clearUpcoming = () => {const at=queueRef.current.entries.findIndex(e=>e.key===queueRef.current.current);updateQueue({...queueRef.current,entries:queueRef.current.entries.slice(0,at+1)});};

	const stop = () => { ++sequence.current; if (audio.current) { audio.current.pause(); audio.current.removeAttribute('src'); audio.current.load(); } setState({playbackId:sequence.current,track: null, playing: false, loading: false, current: 0, duration: 0, error: ''}); };
	const clearQueue = () => { stop(); updateQueue(emptyQueue()); };
	const seek = (delta: number) => { const p = audio.current; if (p && isFinite(p.duration)) p.currentTime = Math.max(0, Math.min(p.duration, p.currentTime + delta)); };
	const controls = useRef({next, toggle, stop, seek});
	controls.current = {next, toggle, stop, seek};
	useEffect(() => {
		const player = new Audio(); audio.current = player; player.crossOrigin = 'anonymous'; player.preload = 'metadata';
		const sync = () => setState((s) => ({...s, playing: !player.paused, loading: player.readyState < 3 && !player.paused, current: player.currentTime || 0, duration: isFinite(player.duration) ? player.duration : 0}));
		const error = () => { if (player.getAttribute('src')) setState((s) => ({...s, playing: false, loading: false, error: 'Audio playback failed. Check the TV music service or try another track.'})); };
		const sampleSync = () => { if (sampler.current) sampler.current.sync(); };
		['playing','pause','seeking','emptied'].forEach(event => player.addEventListener(event,sampleSync));
		const ended = () => { controls.current.next(1,true); };
		['timeupdate', 'playing', 'pause', 'waiting', 'loadedmetadata', 'canplay'].forEach((event) => player.addEventListener(event, sync));
		player.addEventListener('error', error); player.addEventListener('ended', ended);
		const visibility = () => { if (document.hidden) player.pause(); };
		const mediaKey = (event: KeyboardEvent) => {
			if (document.hidden || /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return;
			if (event.keyCode === 415) player.play().catch(() => undefined);
			else if (event.keyCode === 19) player.pause();
			else if (event.keyCode === 413) controls.current.stop();
			else if (event.keyCode === 425) controls.current.next();
			else if (event.keyCode === 424) controls.current.next(-1);
			else if (event.keyCode === 417) controls.current.seek(15);
			else if (event.keyCode === 412) controls.current.seek(-15);
			else return;
			event.preventDefault();
		};
		document.addEventListener('visibilitychange', visibility); window.addEventListener('keydown', mediaKey);
		return () => { ++sequence.current; player.pause(); player.src = ''; audio.current = null; if (sampler.current) { sampler.current.dispose(); sampler.current = null; } document.removeEventListener('visibilitychange', visibility); window.removeEventListener('keydown', mediaKey); };
	}, []);
	const getAudioGraph = (): MusicAudioGraph | null => {
		if (!audio.current) return null;
		if (!sampler.current) sampler.current=createMusicSampler(()=>({connection:(queueRef.current.entries.find(e=>e.key===queueRef.current.current)||{}).connection||null,id:((queueRef.current.entries.find(e=>e.key===queueRef.current.current)||{}).track||{}).id||'',position:audio.current ? audio.current.currentTime : 0,playing:!!audio.current&&!audio.current.paused}));
		sampler.current.start();return sampler.current.graph;
	};
	const releaseAudioGraph = () => { if(sampler.current)sampler.current.stop(); };
	return {state, queue, play, playEntry, enqueue, move, remove, shuffle, repeat, clearUpcoming, clearQueue, next, toggle, stop, seek, getAudioGraph, releaseAudioGraph};
}
export type MusicPlayer = ReturnType<typeof useMusic>;
