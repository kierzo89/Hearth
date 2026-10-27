import {useState} from 'preact/hooks';
import {DashboardPanel} from './Panel';
import type {MusicPlayer} from './useMusic';
import type {MusicConnection,Track} from './music';
export function TrackMenu({track,connection,player,onClose,notify,onPlay}:{track:Track;connection:MusicConnection;player:MusicPlayer;onClose:()=>void;notify:(s:string)=>void;onPlay:()=>void}) {
	const add=(next:boolean)=>{notify(player.enqueue(track,connection,next)?next?'Playing next: '+track.title:'Added to queue: '+track.title:'The queue is full (500 songs)');onClose();};
	return <DashboardPanel title="Song options" eyebrow={track.title} onClose={onClose} backLabel="Back to songs" actions={[
		{id:'song-play',label:'Play now',run:()=>{onPlay();onClose();}},
		{id:'song-next',label:'Play next',detail:'Keep the current song playing.',run:()=>add(true)},
		{id:'song-add',label:'Add to queue',detail:'Add this song to the end.',run:()=>add(false)}
	]}><div class="music-art">{track.artwork&&<img src={track.artwork} alt="" />}</div><h2>{track.title}</h2><p>{track.artist}</p></DashboardPanel>;
}
export function QueuePanel({player,onClose}:{player:MusicPlayer;onClose:()=>void}) {
	const [editing,setEditing]=useState<string|null>(null);
	const item=player.queue.entries.find(e=>e.key===editing),at=player.queue.entries.findIndex(e=>e.key===editing);
	const [focus,setFocus]=useState({id:'',seq:0});
	const closeItem=()=>{setFocus(f=>({id:editing?'queue-'+editing:'shuffle',seq:f.seq+1}));setEditing(null);};
	const modes=['off','all','one'] as const;
	if(item)return <DashboardPanel title="Queued song" eyebrow={item.track.title} onClose={closeItem} backLabel="Back to queue" actions={[
		{id:'queue-play',label:'Play now',run:()=>{player.playEntry(item.key);closeItem();}},
		{id:'queue-up',label:'Move earlier',disabled:at===0,run:()=>player.move(item.key,-1)},
		{id:'queue-down',label:'Move later',disabled:at===player.queue.entries.length-1,run:()=>player.move(item.key,1)},
		{id:'queue-remove',label:'Remove from queue',run:()=>{player.remove(item.key);closeItem();}}
	]}><div class="music-art">{item.track.artwork&&<img src={item.track.artwork} alt="" />}</div><h2>{item.track.title}</h2><p>{item.track.artist}</p><p>Position {at+1} of {player.queue.entries.length}</p><small>Moving songs keeps the currently playing song and its progress.</small></DashboardPanel>;
	return <DashboardPanel title="Music queue" eyebrow="Choose what plays next" onClose={onClose} focusRequest={focus} actions={[
		{id:'shuffle',label:'Shuffle upcoming songs',value:player.queue.shuffle?'On':'Off',detail:'Enabling mixes upcoming songs. Turning off keeps the current order.',run:player.shuffle},
		{id:'repeat',label:'Repeat',value:player.queue.repeat==='off'?'Off':player.queue.repeat==='all'?'Queue':'One song',run:()=>player.repeat(modes[(modes.indexOf(player.queue.repeat)+1)%3])},
		{id:'clear-upcoming',label:'Clear upcoming songs',disabled:!player.queue.entries.length,run:player.clearUpcoming},
		...player.queue.entries.map((e,i)=>({id:'queue-'+e.key,label:e.track.title,artwork:e.track.artwork,detail:e.track.artist,value:e.key===player.queue.current?'Current':String(i+1),run:()=>setEditing(e.key)}))
	]}><h2>{player.queue.entries.length} songs</h2><p>Select a song to play it, move it earlier/later, or remove it.</p>{player.state.track&&<><div class="music-art">{player.state.track.artwork&&<img src={player.state.track.artwork} alt="" />}</div><h2>{player.state.track.title}</h2><p>{player.state.playing?'Playing now':'Paused'}</p></>}<small>The queue stays available while you browse Hearth. Starting a new playlist replaces it.</small></DashboardPanel>;
}
