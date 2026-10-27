import {exec} from '../lib/apps';
export interface SystemSnapshot {
	at: number; cpu: number[]; memoryTotal: number; memoryAvailable: number;
	uptime: number; load: string; storage: string; network: string; temperature: string;
	model: string; webos: string;
}
const COMMAND = `printf '[cpu]\\n'; head -1 /proc/stat; printf '[memory]\\n'; cat /proc/meminfo; printf '[uptime]\\n'; cat /proc/uptime; printf '[load]\\n'; cat /proc/loadavg; printf '[storage]\\n'; df -Pk /media/developer | tail -1; printf '[network]\\n'; ip -o -4 addr show scope global; printf '[temperature]\\n'; for f in /sys/class/thermal/thermal_zone*/temp; do [ -r "$f" ] && head -1 "$f"; done; printf '[webos]\\n'; cat /etc/os-release; true`;
export function parseSnapshot (text: string): SystemSnapshot {
	const parts: Record<string, string> = {};
	let section = '';
	for (const line of text.split('\n')) { const header = /^\[([a-z]+)\]$/.exec(line); if (header) { section = header[1]; parts[section] = ''; } else if (section) parts[section] += line + '\n'; }
	const memory = (name: string) => { const match = new RegExp('^' + name + ':\\s+(\\d+)', 'm').exec(parts.memory || ''); return match ? Number(match[1]) * 1024 : 0; };
	const temperatures = (parts.temperature || '').trim().split(/\s+/).map(Number).filter((n) => n > 0 && n < 200000).map((n) => n > 1000 ? n / 1000 : n);
	return {at: Date.now(), cpu: (parts.cpu || '').trim().split(/\s+/).slice(1).map(Number), memoryTotal: memory('MemTotal'), memoryAvailable: memory('MemAvailable') || memory('MemFree') + memory('Buffers') + memory('Cached'), uptime: Number((parts.uptime || '').split(' ')[0]) || 0, load: (parts.load || '').trim().split(' ').slice(0, 3).join(' / '), storage: (parts.storage || '').trim(), network: (parts.network || '').trim(), temperature: temperatures.length ? Math.round(Math.max(...temperatures)) + ' °C' : 'Unavailable', model: '', webos: ((/^PRETTY_NAME="?([^"\n]+)/m.exec(parts.webos || '') || [])[1] || 'webOS')};
}
export async function readSnapshot (): Promise<SystemSnapshot> { return parseSnapshot(await exec(COMMAND)); }
export function cpuUsage (previous: SystemSnapshot | null, next: SystemSnapshot): number | null {
	if (!previous || next.cpu.length < 4 || previous.cpu.length !== next.cpu.length) return null;
	// guest and guest_nice are already included in user/nice; do not count them twice.
	const total = next.cpu.slice(0, 8).reduce((sum, n, i) => sum + n - previous.cpu[i], 0);
	const idle = next.cpu[3] + (next.cpu[4] || 0) - previous.cpu[3] - (previous.cpu[4] || 0);
	return total > 0 ? Math.max(0, Math.min(100, Math.round((1 - idle / total) * 100))) : null;
}
export function formatBytes (bytes: number): string { return bytes >= 1024 ** 3 ? (bytes / 1024 ** 3).toFixed(1) + ' GB' : Math.round(bytes / 1024 ** 2) + ' MB'; }
export function formatUptime (seconds: number): string { return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds / 3600) % 24}h ${Math.floor(seconds / 60) % 60}m`; }
export interface TvControls {volume: number | null; muted: boolean | null; homeAutoLaunch: boolean | null;}
export async function readTvControls (): Promise<TvControls> {
	const output = await exec(`luna-send -n 1 luna://com.webos.service.audio/master/getVolume '{}'; luna-send -n 1 luna://com.webos.settingsservice/getSystemSettings '{"category":"general","keys":["homeAutoLaunch"]}'`);
	const replies: Record<string, unknown>[] = [];
	for (const line of output.split('\n')) { try { replies.push(JSON.parse(line)); } catch { /* A service can print a diagnostic. */ } }
	const audio = replies.find((r) => r.volumeStatus || typeof r.volume === 'number');
	const status = audio && (audio.volumeStatus || audio) as Record<string, unknown> | undefined;
	const settings = replies.find((r) => r.settings);
	const home = settings && (settings.settings as Record<string, unknown>).homeAutoLaunch;
	return {volume: status && typeof status.volume === 'number' ? status.volume : null, muted: status && typeof status.muteStatus === 'boolean' ? status.muteStatus : status && typeof status.muted === 'boolean' ? status.muted : null, homeAutoLaunch: home === 'on' ? true : home === 'off' ? false : null};
}
async function audioSetting (method: 'setVolume' | 'muteVolume', params: object): Promise<void> {
	const out = await exec(`luna-send -n 1 luna://com.webos.service.audio/master/${method} '${JSON.stringify(params)}'`);
	const reply = JSON.parse(out);
	if (reply.returnValue !== true) throw new Error(reply.errorText || 'The TV did not accept that audio setting');
}
export async function setTvVolume (volume: number): Promise<void> { await audioSetting('setVolume', {volume: Math.max(0, Math.min(100, Math.round(volume)))}); }
export async function setTvMute (mute: boolean): Promise<void> { await audioSetting('muteVolume', {mute}); }
export async function setAutoHome (on: boolean): Promise<void> {
	const out = await exec(`luna-send -n 1 luna://com.webos.settingsservice/setSystemSettings '${JSON.stringify({category: 'general', settings: {homeAutoLaunch: on ? 'on' : 'off'}})}'`);
	if (!out.includes('"returnValue":true') && !out.includes('"returnValue": true')) throw new Error('The TV did not accept the setting');
}
export async function readBacklight():Promise<number|null> {
	const out=JSON.parse(await exec(`luna-send -n 1 luna://com.webos.settingsservice/getSystemSettings '{"category":"picture","keys":["backlight"]}'`));
	const value=out.returnValue===true&&out.settings?Number(out.settings.backlight):NaN;return Number.isFinite(value)&&value>=0&&value<=100?value:null;
}
export async function setBacklight(value:number):Promise<void> {
	const reply=JSON.parse(await exec(`luna-send -n 1 luna://com.webos.settingsservice/setSystemSettings '${JSON.stringify({category:'picture',settings:{backlight:String(Math.max(0,Math.min(100,Math.round(value))))}})}'`));
	if(reply.returnValue!==true)throw Error(reply.errorText||'The TV did not accept the backlight setting');
}
