import type {MusicConnection, Track} from './music';
export type RepeatMode = 'off' | 'all' | 'one';
export interface QueueEntry {key: string; track: Track; connection: MusicConnection;}
export interface QueueState {entries: QueueEntry[]; current: string | null; shuffle: boolean; repeat: RepeatMode;}
let serial=0;
export const emptyQueue = (): QueueState => ({entries:[],current:null,shuffle:false,repeat:'off'});
export const entry = (track: Track, connection: MusicConnection): QueueEntry => ({key:'song-'+(++serial),track,connection});
export function shuffled<T>(items: T[], random= Math.random): T[] {const list=items.slice();for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
export function stepQueue(q: QueueState, delta: number, ended=false): string | null {
	if(!q.entries.length)return null;
	const at=q.entries.findIndex(e=>e.key===q.current);
	if(ended&&q.repeat==='one'&&at>=0)return q.current;
	const next=at+delta;if(next>=0&&next<q.entries.length)return q.entries[next].key;
	if(q.repeat==='all')return q.entries[(next+q.entries.length)%q.entries.length].key;
	return null;
}
export function moveQueue(q: QueueState, key: string, delta: number): QueueState {
	const at=q.entries.findIndex(e=>e.key===key),to=at+delta;if(at<0||to<0||to>=q.entries.length)return q;
	const entries=q.entries.slice();entries.splice(to,0,entries.splice(at,1)[0]);return {...q,entries};
}
export function insertQueue(q: QueueState, item: QueueEntry, next: boolean): QueueState {
	if(q.entries.length>=500)return q;
	const entries=q.entries.slice(),at=entries.findIndex(e=>e.key===q.current);entries.splice(next?at+1:entries.length,0,item);return {...q,entries};
}
export function removeQueue(q: QueueState,key:string): QueueState {
	const at=q.entries.findIndex(e=>e.key===key);if(at<0)return q;const entries=q.entries.filter(e=>e.key!==key);
	return {...q,entries,current:q.current===key?(entries[at]||entries[at-1]||{}).key||null:q.current};
}
export function shuffleQueue(q:QueueState,random=Math.random):QueueState {
	const at=q.entries.findIndex(e=>e.key===q.current);return {...q,shuffle:!q.shuffle,entries:q.shuffle?q.entries:q.entries.slice(0,at+1).concat(shuffled(q.entries.slice(at+1),random))};
}
