import {useEffect, useRef, useState} from 'preact/hooks';
import {useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {DashboardPanel} from './Panel';
import {VISUALISERS, createVisualiser, type VisualiserPrefs, type VisualiserEngine} from './visualisers';
import type {MusicPlayer} from './useMusic';
import {mediaTime} from './music';
export function VisualiserPanel ({prefs, onChange, onClose, onFullScreen, active}: {prefs: VisualiserPrefs; onChange: (p: VisualiserPrefs) => void; onClose: () => void; onFullScreen: () => void; active: boolean}) {
	return <DashboardPanel title="Music visualisers" eyebrow="A soundtrack you can see" onClose={onClose} active={active} actions={[
		{id:'fullscreen',label:'Open full-screen visualiser',detail:'← → effect · ↑ ↓ visualiser preset · OK play/pause · Back return',run:onFullScreen},
		{id:'rotation',label:'Change visualiser',value:prefs.rotation==='timed'?'Every 3 minutes':prefs.rotation==='song'?'Every song':'Manual',detail:'Choose a different effect every three minutes while music and visuals are active, every song, or manually. Selecting an effect or preset switches to Manual.',run:()=>onChange({...prefs,rotation:prefs.rotation==='timed'?'song':prefs.rotation==='song'?'manual':'timed'})},
		{id:'idle',label:'Automatic full-screen visualiser',value:prefs.idleSeconds ? (prefs.idleSeconds<60 ? prefs.idleSeconds+' seconds' : prefs.idleSeconds/60+' minutes') : 'Off',detail:'While music plays on Home. Any button wakes the dashboard.',run:()=>{const delays=[0,30,60,120,300];onChange({...prefs,idleSeconds:delays[(delays.indexOf(prefs.idleSeconds)+1)%delays.length]});}},
		{id:'idle-wallpaper',label:'Wallpaper behind automatic visualiser',value:prefs.idleWallpaper?'On':'Off',detail:'Keep your wallpaper slideshow cycling, with the visualiser blended over it. Uses your wallpaper and slideshow interval settings.',run:()=>onChange({...prefs,idleWallpaper:!prefs.idleWallpaper})},
		{id:'background',label:'Visualiser behind the dashboard',value:prefs.background?'On':'Off',run:()=>onChange({...prefs,background:!prefs.background})},
		...VISUALISERS.map(v=>({id:'visualiser-'+v.id,label:v.name,detail:v.detail,value:prefs.mode===v.id?'Selected':'',run:()=>onChange({...prefs,mode:v.id,rotation:'manual'})})),
		{id:'preset-next',label:'Next visualiser preset',detail:'Cycle MilkDrop or Kodi Shadertoy presets',run:()=>onChange({...prefs,preset:prefs.preset+1,rotation:'manual'})}
	]}><h2>{(VISUALISERS.find(v=>v.id===prefs.mode)||VISUALISERS[0]).name}</h2><p>Visuals react to the music playing on your TV. Choose an effect, then open full screen or return to your dashboard.</p><div class="dash-note"><strong>Ports and recreations</strong><p>MilkDrop uses Butterchurn. GOOM runs the original engine through WebAssembly. Shadertoy uses 29 original Kodi shader presets. The other effects are lightweight Hearth recreations.</p><small>Native G-Force, projectM, FishBMC and RSXS add-ons cannot be loaded directly by Hearth. They are not installed plug-ins here.</small></div></DashboardPanel>;
}
export function VisualiserLayer ({player, prefs, visible, fullScreen, onChange, onClose, onSettings, automatic=false, interactive=true}: {automatic?:boolean; interactive?:boolean; player: MusicPlayer; prefs: VisualiserPrefs; visible: boolean; fullScreen: boolean; onChange: (p: VisualiserPrefs) => void; onClose: () => void; onSettings: () => void}) {
	const renderFailed = useRef(false);
	const canvas = useRef<HTMLCanvasElement>(null), engine = useRef<VisualiserEngine | null>(null);
	const playing = useRef(player.state.playing); playing.current = player.state.playing;
	const [error,setError]=useState(''), [presetName,setPresetName]=useState('');
	const [loading,setLoading]=useState(false),[sampleStatus,setSampleStatus]=useState('');
	const mode=(VISUALISERS.find(v=>v.id===prefs.mode)||VISUALISERS[0]);
	const hasTrack=!!player.state.track;
	useEffect(()=>{
		if(!visible||!hasTrack||!canvas.current)return;
		let disposed=false, frame=0, last=0, frames=0;const element=canvas.current;renderFailed.current=false;setError('');setLoading(true);setPresetName('');setSampleStatus('');
		const run=async()=>{try{const graph=player.getAudioGraph();if(!graph)throw Error('Start a song first');const renderer=await createVisualiser(prefs.mode,element,graph);if(disposed){renderer.dispose();return}const levels=new Uint8Array(graph.analyser.frequencyBinCount);engine.current=renderer;if(renderer.preset)setPresetName(renderer.preset(prefs.preset));setLoading(false);
			const tick=(time:number)=>{if(disposed)return;frame=requestAnimationFrame(tick);if(document.hidden||!playing.current||renderFailed.current||time-last<(prefs.mode==='goom'?66:33))return;last=time;try{renderer.render(time);frames++;if(frames%15===0){setSampleStatus(graph.sampleStatus);element.setAttribute('data-frames',String(frames));graph.analyser.getByteFrequencyData(levels);element.setAttribute('data-energy',String(Math.max.apply(null,Array.from(levels))));}}catch(e){setError((e as Error).message||'This preset could not render. Choose another effect.');renderFailed.current=true;}};frame=requestAnimationFrame(tick);
		}catch(e){if(!disposed){setError((e as Error).message);setLoading(false);}}};void run();
		return()=>{player.releaseAudioGraph();disposed=true;cancelAnimationFrame(frame);if(engine.current){engine.current.dispose();engine.current=null;}};
	},[visible,hasTrack,prefs.mode]);
	useEffect(()=>{if(engine.current&&engine.current.preset){try{setPresetName(engine.current.preset(prefs.preset));renderFailed.current=false;setError('');}catch(e){setError((e as Error).message);}}},[prefs.preset]);
	const changeMode=(delta:number)=>{const index=VISUALISERS.findIndex(v=>v.id===prefs.mode);onChange({...prefs,mode:VISUALISERS[(index+delta+VISUALISERS.length)%VISUALISERS.length].id,rotation:'manual'});};
	useKeys(key=>{if(key==='back')onClose();else if(key==='left'||key==='right')changeMode(key==='left'?-1:1);else if(key==='up'||key==='down')onChange({...prefs,preset:Math.max(0,prefs.preset+(key==='up'?-1:1)),rotation:'manual'});},fullScreen&&interactive&&!automatic);
	useOkPress({onPress:player.toggle,onLongPress:onSettings},fullScreen&&interactive&&!automatic);
	if(!visible&&!fullScreen)return null;
	return <div class={'music-visualiser'+(fullScreen?' music-visualiser--full':'')+(automatic?' music-visualiser--auto':'')+(automatic&&fullScreen&&prefs.idleWallpaper?' music-visualiser--wallpaper':'')} data-mode={prefs.mode}>
		{hasTrack&&<canvas key={prefs.mode} ref={canvas} width={640} height={360} aria-label={mode.name+' music visualiser'} />}
		{fullScreen&&<><div class="visualiser-heading"><div><strong>{mode.name}</strong><span>{presetName||mode.detail}</span></div>{!automatic&&<><button onClick={onSettings}>Visualiser settings</button><button onClick={onClose}>Back</button></>}</div><div class="visualiser-track">{player.state.track&&player.state.track.artwork&&<img src={player.state.track.artwork} alt="" />}<div><strong>{player.state.track?player.state.track.title:'Play a song to begin'}</strong><span>{player.state.track?player.state.track.artist:'Choose a track from Music, then open the visualiser.'}</span><small>{player.state.playing?'Playing':'Paused'} · {mediaTime(player.state.current)} / {mediaTime(player.state.duration)}</small></div></div><div class="visualiser-help">{automatic?'Press any button to return to your dashboard':'← → Effect · ↑ ↓ Preset · OK Play / Pause · Back Dashboard'}</div></>}
		{(loading||error||sampleStatus)&&<p class="visualiser-status" role="status">{error||(loading?'Loading visualiser…':sampleStatus)}</p>}
	</div>;
}
