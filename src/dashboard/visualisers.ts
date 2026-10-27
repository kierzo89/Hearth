import type {MusicAudioGraph} from './useMusic';
import {createShadertoy} from './shadertoy';
export const VISUALISERS = [
	{id: 'milkdrop', name: 'MilkDrop', detail: 'Butterchurn browser port · 116 classic and modern presets'},
	{id: 'shadertoy', name: 'Kodi Shadertoy', detail: '29 original Kodi shader presets · WebGL adapter'},
	{id: 'goom', name: 'GOOM', detail: 'Original GOOM engine · WebAssembly browser port'},
	{id: 'spectrum', name: 'Spectrum', detail: 'Hearth recreation · classic frequency bars'},
	{id: 'waveform', name: 'Waveform', detail: 'Hearth recreation · live oscilloscope'},
	{id: 'boxalizer', name: 'Boxalizer style', detail: 'Hearth recreation · dancing spectral boxes'},
	{id: 'fountain', name: 'Fountain style', detail: 'Hearth recreation · sound-driven particles'},
	{id: 'saville', name: 'Saville style', detail: 'Hearth recreation · layered spectrum history'},
	{id: 'starburst', name: 'StarBurst style', detail: 'Hearth recreation · rotating radial spectrum'},
	{id: 'spectrum3d', name: '3D Spectrum style', detail: 'Hearth recreation · perspective spectrum landscape'},
	{id: 'fluid', name: 'Fluid trails', detail: 'Hearth effect · flowing, sound-driven trails'},
	{id: 'plasma', name: 'Plasma', detail: 'Hearth effect · colourful audio-reactive waves'},
	{id: 'fish', name: 'Fishtank', detail: 'Hearth effect · audio-reactive swimming particles'}
];
export interface VisualiserPrefs {mode: string; background: boolean; preset: number; idleSeconds: number; randomEachSong: boolean; idleWallpaper: boolean;}
export const VISUALISER_KEY = 'hearth-visualisers-v1';
export function loadVisualiserPrefs (): VisualiserPrefs {
	try { const p = JSON.parse(localStorage.getItem(VISUALISER_KEY) || '{}'); return {idleWallpaper: p.idleWallpaper !== false, randomEachSong: p.randomEachSong !== false, mode: VISUALISERS.some((v) => v.id === p.mode) ? p.mode : 'spectrum', background: p.background !== false, idleSeconds:[0,30,60,120,300].includes(p.idleSeconds)?p.idleSeconds:120, preset: Number.isInteger(p.preset) && p.preset >= 0 ? p.preset : 0}; } catch { return {mode: 'spectrum', background: true, preset: 0, idleSeconds:120, randomEachSong:true, idleWallpaper:true}; }
}
export function saveVisualiserPrefs (prefs: VisualiserPrefs): void { try { localStorage.setItem(VISUALISER_KEY, JSON.stringify(prefs)); } catch { /* Optional persistence. */ } }
/** Pick once per song, excluding the current effect so each change is visible.
 * Preset engines wrap this random index to their own installed preset count. */
export function visualiserForSong(prefs: VisualiserPrefs, random = Math.random): VisualiserPrefs {
	if (!prefs.randomEachSong) return prefs;
	const choices = VISUALISERS.filter(v => v.id !== prefs.mode);
	return {...prefs, mode: choices[Math.floor(random() * choices.length)].id, preset: Math.floor(random() * 1000000)};
}
export interface VisualiserEngine {render: (time: number) => void; dispose: () => void; preset?: (index: number) => string;}
const scripts: Partial<Record<string, Promise<void>>> = {};
function loadScript (file: string): Promise<void> {
	if (scripts[file]) return scripts[file]!;
	return scripts[file] = new Promise<void>((resolve, reject) => {
		const script = document.createElement('script'); const timer = window.setTimeout(() => { script.remove(); delete scripts[file]; reject(new Error('Visualiser took too long to load')); }, 15000);
		script.src = './visualizers/' + file; script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); delete scripts[file]; reject(new Error('Visualiser file could not load')); }; document.head.appendChild(script);
	});
}
interface MilkEngine {connectAudio: (source: AudioNode) => void; disconnectAudio: (source: AudioNode) => void; loadPreset: (preset: unknown, seconds: number) => void; render: () => void;}
interface Libraries {butterchurn: {default?: {createVisualizer: Creator}; createVisualizer: Creator}; butterchurnPresetsMinimal: {getPresets: () => Record<string, unknown>}; butterchurnPresetsMD1: {getPresets: () => Record<string, unknown>}; createHearthGoom: (options: {canvas: HTMLCanvasElement; analyser: AnalyserNode}) => Promise<{render: () => void}>;}
type Creator = (context: AudioContext, canvas: HTMLCanvasElement, options: Record<string, number>) => MilkEngine;
export async function createVisualiser (mode: string, canvas: HTMLCanvasElement, graph: MusicAudioGraph): Promise<VisualiserEngine> {
	if (mode === 'shadertoy') return createShadertoy(canvas, graph.analyser);
	const libs = window as unknown as Libraries;
	if (mode === 'milkdrop') {
		await Promise.all([loadScript('butterchurn.min.js'), loadScript('butterchurnPresetsMinimal.min.js'), loadScript('butterchurnPresetsMD1.min.js')]);
		if (!canvas.getContext('webgl2')) throw new Error('MilkDrop needs WebGL 2. Choose Spectrum or Waveform on this device.');
		const api = libs.butterchurn.default || libs.butterchurn;
		const engine = api.createVisualizer(graph.context, canvas, {width: 640, height: 360, meshWidth: 24, meshHeight: 18, pixelRatio: 1, textureRatio: 1});
		engine.connectAudio(graph.source);
		const presets = {...libs.butterchurnPresetsMD1.getPresets(), ...libs.butterchurnPresetsMinimal.getPresets()}, names = Object.keys(presets);
		let initial = true;
		return {render: () => engine.render(), preset: (index) => { const name = names[index % names.length]; engine.loadPreset(presets[name], initial ? 0 : 1); initial = false; return name; }, dispose: () => { engine.disconnectAudio(graph.source); const gl = canvas.getContext('webgl2'); const ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }};
	}
	if (mode === 'goom') {
		return new Promise<VisualiserEngine>((resolve,reject)=>{
			const worker=new Worker('./visualizers/goom-worker.js'), context=canvas.getContext('2d')!;canvas.width=800;canvas.height=450;
			let busy=false,failure='';const samples=new Float32Array(512),timer=window.setTimeout(()=>{worker.terminate();reject(Error('GOOM took too long to load'));},15000);
			worker.onerror=()=>{clearTimeout(timer);failure='GOOM worker is unavailable';worker.terminate();reject(Error(failure));};
			worker.onmessage=event=>{const data=event.data;if(data.error){clearTimeout(timer);failure=data.error;worker.terminate();reject(Error(failure));return;}if(data.ready){clearTimeout(timer);resolve({render:()=>{if(failure)throw Error(failure);if(busy)return;busy=true;graph.analyser.getFloatTimeDomainData(samples);worker.postMessage({samples:samples.buffer.slice(0)});},dispose:()=>worker.terminate()});}else if(data.pixels){context.putImageData(new ImageData(new Uint8ClampedArray(data.pixels),data.width,data.height),0,0);busy=false;}};
		});
	}
	return canvasVisualiser(mode, canvas, graph.analyser);
}
function canvasVisualiser (mode: string, canvas: HTMLCanvasElement, analyser: AnalyserNode): VisualiserEngine {
	canvas.width = 640; canvas.height = 360;
	const c = canvas.getContext('2d')!; if (!c) throw new Error('Canvas rendering is unavailable');
	const freq = new Uint8Array(analyser.frequencyBinCount), wave = new Uint8Array(analyser.fftSize);
	const history: number[][] = []; const particles: {x: number; y: number; vx: number; vy: number; life: number; hue: number}[] = [];
	let frames = 0;
	return {dispose: () => { particles.length = 0; history.length = 0; }, render: (time) => {
		analyser.getByteFrequencyData(freq); analyser.getByteTimeDomainData(wave); const t = time / 1000; frames++;
		const bars = Array.from({length: 48}, (_, i) => freq[Math.min(freq.length - 1, Math.floor(Math.pow(i / 47, 2) * 600))] / 255);
		const bass = bars.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
		c.fillStyle = mode === 'fluid' || mode === 'fountain' ? 'rgba(4,8,16,.18)' : '#050b15'; c.fillRect(0, 0, 640, 360);
		const hue = t * 12 % 360;
		if (mode === 'waveform' || mode === 'fluid') {
			for (let line = 0; line < (mode === 'fluid' ? 5 : 2); line++) { c.beginPath(); c.strokeStyle = `hsl(${hue + line * 45},85%,65%)`; c.lineWidth = 2;
				for (let x = 0; x < 640; x += 2) { const sample = (wave[Math.floor(x / 640 * wave.length)] - 128) / 128; const y = 180 + sample * (70 + line * 20) + (mode === 'fluid' ? Math.sin(x / 80 + t + line) * 70 : line * 4); if (!x) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
		} else if (mode === 'starburst') {
			c.save(); c.translate(320,180); c.rotate(t * .12); for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2, r = 35 + bass * 35, end = r + bars[i % 48] * 110; c.beginPath(); c.strokeStyle = `hsl(${hue + i * 3.75},90%,60%)`; c.lineWidth = 3; c.moveTo(Math.cos(a)*r,Math.sin(a)*r); c.lineTo(Math.cos(a)*end,Math.sin(a)*end); c.stroke(); } c.restore();
		} else if (mode === 'fountain' || mode === 'fish') {
			if (mode === 'fountain') { for (let i = 0; i < 4 + bass * 12 && particles.length < 250; i++) particles.push({x:320,y:330,vx:(Math.random()-.5)*(3+bass*10),vy:-3-Math.random()*(4+bass*8),life:90,hue:hue+Math.random()*50}); }
			else while (particles.length < 55) particles.push({x:Math.random()*640,y:Math.random()*360,vx:.5+Math.random()*1.5,vy:Math.random()*6,life:999,hue:Math.random()*360});
			for (let i=particles.length-1;i>=0;i--) { const p=particles[i]; p.x+=p.vx*(mode==='fish'?1+bass*3:1); p.y+=mode==='fish'?Math.sin(t+p.vy)*.6:p.vy; if(mode==='fountain'){p.vy+=.13;p.life--;}else if(p.x>650)p.x=-10; c.fillStyle=`hsla(${p.hue},90%,65%,${Math.min(1,p.life/30)})`; c.beginPath(); c.ellipse(p.x,p.y,mode==='fish'?5+bass*3:2,2,0,0,Math.PI*2);c.fill();if(p.life<=0||p.y>370)particles.splice(i,1); }
		} else if (mode === 'plasma') {
			for(let y=0;y<360;y+=12)for(let x=0;x<640;x+=12){const n=Math.sin(x/70+t)+Math.sin(y/50-t)+Math.sin((x+y)/90+t*.6); c.fillStyle=`hsl(${hue+n*55+bass*90},85%,${25+bars[Math.floor(x/640*48)]*35}%)`;c.fillRect(x,y,12,12);}
		} else if (mode === 'saville' || mode === 'spectrum3d') {
			if(frames%2===0){history.unshift(bars);if(history.length>16)history.pop();}
			for(let z=history.length-1;z>=0;z--){const scale=1-z*.025;for(let i=0;i<48;i++){const h=history[z][i]*(mode==='saville'?100:90);c.fillStyle=`hsla(${hue+i*5+z*6},85%,${60-z*2}%,.9)`;c.fillRect(320+(i-24)*12*scale+z*2,310-z*14-h,9*scale,h+1);}}
		} else {
			for(let i=0;i<48;i++){const h=bars[i]*260,x=24+i*12.4;c.fillStyle=`hsl(${hue+i*5},85%,60%)`;if(mode==='boxalizer'){for(let y=0;y<h;y+=13)c.fillRect(x,320-y,9,9);}else {c.fillRect(x,320-h,9,h);c.fillStyle='#eaf8f2';c.fillRect(x,315-h,9,2);}}
		}
	}};
}
