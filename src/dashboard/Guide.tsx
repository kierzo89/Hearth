import {useEffect,useRef,useState} from 'preact/hooks';
import type {MusicPlayer} from './useMusic';
import {mediaTime} from './music';
import {readTvControls,readBacklight,setBacklight,setTvMute,setTvVolume,type TvControls} from './stats';
import {playNavigationSound} from './sounds';
interface Action {id:string;label:string;value?:string;disabled?:boolean;run:()=>void;adjust?:(delta:number)=>void;}
export function Guide({player,onClose,onQueue,onMusic,onVisualise,onSystem,onThemes,onHome,notify}:{onHome:()=>void;player:MusicPlayer;onClose:()=>void;onQueue:()=>void;onMusic:()=>void;onVisualise:()=>void;onSystem:()=>void;onThemes:()=>void;notify:(s:string)=>void}) {
	const [tab,setTab]=useState(0),[selected,setSelected]=useState(0);
	const [controls,setControls]=useState<TvControls>({volume:null,muted:null,homeAutoLaunch:null}),[light,setLight]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
	const alive=useRef(true),pending=useRef(false);
	useEffect(()=>{alive.current=true;readTvControls().then(c=>{if(alive.current)setControls(c);}).catch(()=>{if(alive.current)setError('TV audio controls could not be read.');});readBacklight().then(v=>{if(alive.current)setLight(v);}).catch(()=>undefined);return()=>{alive.current=false;};},[]);
	const change=async(run:()=>Promise<void>,refresh:()=>Promise<void>)=>{if(pending.current)return;pending.current=true;setBusy(true);try{await run();await refresh();if(alive.current)setError('');}catch(e){if(alive.current)setError((e as Error).message);}finally{pending.current=false;if(alive.current)setBusy(false);}};
	const refreshAudio=async()=>{const c=await readTvControls();if(alive.current)setControls(c);};
	const volume=(d:number)=>{if(controls.volume!==null)void change(()=>setTvVolume(controls.volume!+d),refreshAudio);};
	const brightness=(d:number)=>{if(light!==null)void change(()=>setBacklight(light+d),async()=>{const value=await readBacklight();if(alive.current)setLight(value);});};
	const go=(action:()=>void)=>{onClose();action();};
	const groups:Action[][]=[[
		{id:'guide-toggle',label:player.state.playing?'Pause music':'Play / resume',disabled:!player.state.track&&!player.queue.entries.length,run:player.toggle},
		{id:'guide-prev',label:'Previous song',disabled:!player.queue.entries.length,run:()=>player.next(-1)},
		{id:'guide-next',label:'Next song',disabled:!player.queue.entries.length,run:()=>player.next()},
		{id:'guide-queue',label:'Music queue',value:String(player.queue.entries.length),run:()=>go(onQueue)},
		{id:'guide-music',label:'Browse music',run:()=>go(onMusic)},
		{id:'guide-visualiser',label:'Open visualiser',disabled:!player.state.track,run:()=>go(onVisualise)}
	],[
		{id:'guide-volume',label:'TV volume',value:controls.volume===null?'Unavailable':String(controls.volume),disabled:busy||controls.volume===null,run:()=>volume(2),adjust:d=>volume(d*2)},
		{id:'guide-mute',label:'Mute',value:controls.muted===null?'Unavailable':controls.muted?'On':'Off',disabled:busy||controls.muted===null,run:()=>{void change(()=>setTvMute(!controls.muted),refreshAudio);}},
		{id:'guide-backlight',label:'Screen brightness',value:light===null?'Unavailable':String(light)+'%',disabled:busy||light===null,run:()=>brightness(5),adjust:d=>brightness(d*5)},
		{id:'guide-system',label:'System settings & stats',run:()=>go(onSystem)}
	],[
		{id:'guide-home',label:'Return to dashboard',run:()=>go(onHome)},
		{id:'guide-theme',label:'Choose a theme',run:()=>go(onThemes)},
		{id:'guide-stop',label:'Stop music',disabled:!player.state.track,run:()=>{player.stop();notify('Music stopped');}}
	]];
	const actions=groups[tab],index=Math.min(selected,actions.length-1);
	const latest=useRef({actions,index,tab});latest.current={actions,index,tab};
	const changeTab=(value:number)=>{setTab(value);setSelected(0);playNavigationSound('cursor');};
	const choose=(a:Action)=>{if(!a.disabled){playNavigationSound('select');a.run();}};
	useEffect(()=>{
		let armed=false;
		const mediaKey=(code:number)=>[415,19,413,425,424,417,412,447,448,449].includes(code);
		const down=(e:KeyboardEvent)=>{if(mediaKey(e.keyCode))return;e.preventDefault();e.stopImmediatePropagation();const v=latest.current,a=v.actions[v.index];
			if(e.keyCode===461||e.keyCode===27||e.keyCode===406){onClose();return;}
			if(e.keyCode===13){if(!e.repeat)armed=true;return;}
			if(e.keyCode===38){setSelected(Math.max(-1,v.index-1));playNavigationSound('cursor');}else if(e.keyCode===40){setSelected(Math.min(v.actions.length-1,v.index+1));playNavigationSound('cursor');}
			else if(e.keyCode===37||e.keyCode===39){const d=e.keyCode===37?-1:1;if(v.index>=0&&a&&a.adjust){if(!a.disabled)a.adjust(d);}else changeTab((v.tab+d+3)%3);}
		};
		const up=(e:KeyboardEvent)=>{if(mediaKey(e.keyCode))return;e.preventDefault();e.stopImmediatePropagation();if(e.keyCode===13&&armed){armed=false;const v=latest.current,a=v.actions[v.index];if(a)choose(a);else setSelected(0);}};
		window.addEventListener('keydown',down,true);window.addEventListener('keyup',up,true);
		return()=>{window.removeEventListener('keydown',down,true);window.removeEventListener('keyup',up,true);};
	},[]);
	return <div class="guide-backdrop" onClick={onClose}><section class="hearth-guide" role="dialog" aria-modal="true" aria-label="Hearth Guide" onClick={e=>e.stopPropagation()}>
		<header><span class="guide-orb">h</span><h1>Hearth Guide</h1><button onClick={onClose} aria-label="Close Guide">×</button></header>
		<nav>{['Music','TV','Shortcuts'].map((name,i)=><button class={i===tab?'is-selected'+(index<0?' is-focused':''):''} onClick={()=>changeTab(i)}>{name}</button>)}</nav>
		<div class="guide-now">{player.state.track&&player.state.track.artwork&&<img src={player.state.track.artwork} alt="" />}<div><strong>{player.state.track?player.state.track.title:'Your dashboard, within reach'}</strong><small>{player.state.track?player.state.track.artist:'Music, TV controls and shortcuts'}</small>{player.state.track&&<small>{mediaTime(player.state.current)} / {mediaTime(player.state.duration)}</small>}</div></div>
		<div class="guide-actions">{actions.map((a,i)=><button data-guide-id={a.id} disabled={a.disabled} class={index===i?'is-focused':''} onMouseEnter={()=>setSelected(i)} onClick={()=>choose(a)}><span>{a.label}</span>{a.value&&<b>{a.value}</b>}{a.adjust&&<small>← →</small>}</button>)}</div>
		{tab===1&&<p class="guide-note">Screen brightness adjusts the backlight. Picture modes may limit it.</p>}
		{error&&<p role="status" class="guide-note">{error}</p>}<footer>↑ ↓ Select · ← → Tabs / adjust · OK Choose · Back Close</footer>
	</section></div>;
}
