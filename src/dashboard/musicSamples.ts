import type {MusicConnection} from './music';
export interface MusicAudioGraph {context: AudioContext; source: AudioNode; analyser: AnalyserNode; sampleStatus: string;}
interface Playback {connection: MusicConnection | null; id: string; position: number; playing: boolean;}
/** webOS cannot analyse HTMLAudioElement. Analyse tiny TV-decoded PCM windows,
 * muted after the analyser, while the hardware player remains the only sound. */
export function createMusicSampler (playback: () => Playback) {
	const context=new AudioContext(), source=context.createGain(), analyser=context.createAnalyser(), mute=context.createGain();
	analyser.fftSize=2048;analyser.smoothingTimeConstant=.75;mute.gain.value=0;
	source.connect(analyser);analyser.connect(mute);mute.connect(context.destination);
	const graph:MusicAudioGraph={context,source,analyser,sampleStatus:'Preparing this song’s visualiser…'};
	let users=0,active=false,timer=0,request:XMLHttpRequest|null=null,voice:AudioBufferSourceNode|null=null,generation=0,lastId='',failed='';
	const stopVoice=()=>{if(voice){try{voice.stop();}catch{/* Already ended. */}voice.disconnect();voice=null;}};
	const cancel=()=>{generation++;clearTimeout(timer);if(request){request.abort();request=null;}stopVoice();};
	const tick=()=>{
		if(!active)return;
		const p=playback();
		if(p.id!==lastId){lastId=p.id;failed='';graph.sampleStatus='Preparing this song’s visualiser…';}
		if(!p.connection||!p.id||!p.playing||document.hidden||failed){stopVoice();timer=window.setTimeout(tick,250);return;}
		const epoch=generation,xhr=new XMLHttpRequest();request=xhr;
		xhr.open('GET',p.connection.baseUrl+'/samples?id='+encodeURIComponent(p.id)+'&at='+p.position.toFixed(3));xhr.setRequestHeader('Authorization','Bearer '+p.connection.token);xhr.responseType='arraybuffer';xhr.timeout=6000;
		const finish=(delay:number)=>{if(epoch!==generation)return;request=null;timer=window.setTimeout(tick,delay);};
		xhr.onload=()=>{
			if(epoch!==generation)return;
			const now=playback();if(now.id!==p.id||!now.playing||Math.abs(now.position-p.position)>1.5){finish(0);return;}
			if(xhr.status===202){graph.sampleStatus='Preparing this song’s visualiser…';finish(500);return;}
			if(xhr.status!==200){failed='Audio analysis is unavailable for this song. Playback can continue.';graph.sampleStatus=failed;finish(250);return;}
			const samples=new Int16Array(xhr.response),buffer=context.createBuffer(1,samples.length,16000),data=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)data[i]=samples[i]/32768;
			const offset=Math.max(0,now.position-p.position);if(offset>=buffer.duration){finish(0);return;}
			stopVoice();voice=context.createBufferSource();voice.buffer=buffer;voice.connect(source);voice.start(0,offset);graph.sampleStatus='';finish(160);
		};
		xhr.onerror=xhr.ontimeout=()=>{if(epoch!==generation)return;graph.sampleStatus='Waiting for music samples…';finish(1000);};xhr.send();
	};
	return {graph,start:()=>{users++;if(active)return;failed='';active=true;void context.resume().catch(()=>undefined);tick();},stop:()=>{users=Math.max(0,users-1);if(!users){active=false;cancel();}},sync:()=>{cancel();if(active)tick();},dispose:()=>{active=false;cancel();source.disconnect();analyser.disconnect();mute.disconnect();void context.close();}};
}
