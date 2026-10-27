import {exec} from '../lib/apps';
export interface MusicConnection {baseUrl: string; token: string;}
export interface Track {id: string; title: string; artist: string; duration: string; artwork: string;}
export interface MusicPlaylist {id: string; title: string; count: string; artwork?: string;}
export interface MusicStatus {ready: boolean; signedIn: boolean; auth?: {state: string; userCode: string; url: string; expiresAt: number; error: string} | null;}
export const MUSIC_CONFIG = '/media/developer/hearth-music.json';
export async function loadMusicConnection (): Promise<MusicConnection> {
	const value = JSON.parse(await exec(`sh /var/lib/webosbrew/init.d/95-hearth-music; cat ${MUSIC_CONFIG}`, 15000));
	if (!value || typeof value.baseUrl !== 'string' || !/^https?:\/\/([a-z0-9.-]+|\[[a-f0-9:]+\])(:\d+)?$/i.test(value.baseUrl) || typeof value.token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(value.token)) throw new Error('The TV music service is not installed or paired.');
	return {baseUrl: value.baseUrl, token: value.token};
}
export async function musicRequest<T> (connection: MusicConnection, path: string, method = 'GET'): Promise<T> {
	const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
	const timer = window.setTimeout(() => { if (controller) controller.abort(); }, 25000);
	try {
		const result = await fetch(connection.baseUrl + path, {method, headers: {Authorization: 'Bearer ' + connection.token}, signal: controller ? controller.signal : undefined});
		const body = await result.json();
		if (!result.ok) throw new Error(body.error || 'The TV music service did not accept the request');
		return body as T;
	} catch (e) {
		if (e instanceof TypeError || (e as Error).name === 'AbortError') throw new Error('Cannot reach the TV music service. Reopen Music or check that its startup hook is installed.');
		throw e;
	} finally { window.clearTimeout(timer); }
}
export function trackUrl (connection: MusicConnection, id: string): string {
	if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Invalid track');
	return `${connection.baseUrl}/audio?id=${encodeURIComponent(id)}&token=${encodeURIComponent(connection.token)}`;
}
export function mediaTime (seconds: number): string { return isFinite(seconds) && seconds >= 0 ? Math.floor(seconds / 60) + ':' + ('0' + Math.floor(seconds % 60)).slice(-2) : '0:00'; }
