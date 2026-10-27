import {useEffect, useRef, useState} from 'preact/hooks';
import {DashboardPanel} from './Panel';
import {cpuUsage, formatBytes, formatUptime, readSnapshot, readTvControls, setAutoHome, setTvMute, setTvVolume, type SystemSnapshot, type TvControls} from './stats';
import {launchSystemSettings} from '../lib/launch';
export function SystemPanel ({onClose, onSettings, notify}: {onClose: () => void; onSettings: () => void; notify: (s: string) => void}) {
	const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
	const [cpu, setCpu] = useState<number | null>(null);
	const [error, setError] = useState('');
	const [controls, setControls] = useState<TvControls>({volume: null, muted: null, homeAutoLaunch: null});
	const previous = useRef<SystemSnapshot | null>(null);
	const busy = useRef(false);
	useEffect(() => {
		let cancelled = false, timer = 0;
		const refresh = async () => {
			try {
				const next = await readSnapshot();
				if (!cancelled) { setCpu(cpuUsage(previous.current, next)); previous.current = next; setSnapshot(next); setError(''); }
			} catch (e) { if (!cancelled) setError((e as Error).message); }
			if (!cancelled) timer = window.setTimeout(refresh, 5000);
		};
		refresh(); readTvControls().then((c) => { if (!cancelled) setControls(c); }).catch(() => undefined);
		return () => { cancelled = true; window.clearTimeout(timer); };
	}, []);
	const change = async (run: () => Promise<void>) => {
		if (busy.current) return;
		busy.current = true;
		try { await run(); setControls(await readTvControls()); } catch (e) { notify((e as Error).message); }
		busy.current = false;
	};
	const volume = (delta: number) => { if (controls.volume !== null) change(() => setTvVolume((controls.volume as number) + delta)); };
	const used = snapshot ? Math.max(0, snapshot.memoryTotal - snapshot.memoryAvailable) : 0;
	const memoryPercent = snapshot && snapshot.memoryTotal ? Math.round(used / snapshot.memoryTotal * 100) : 0;
	const storage = snapshot ? snapshot.storage.split(/\s+/) : [];
	return <DashboardPanel title="System" eyebrow="Your TV, at a glance" onClose={onClose} actions={[
		{id: 'volume', label: 'TV volume', detail: '← → adjust by 2 · OK raises volume by 2', value: controls.volume === null ? 'Unavailable' : String(controls.volume), disabled: controls.volume === null, run: () => volume(2), adjust: (d) => volume(d * 2)},
		{id: 'mute', label: 'Mute TV audio', value: controls.muted === null ? 'Unavailable' : controls.muted ? 'On' : 'Off', disabled: controls.muted === null, run: () => change(() => setTvMute(!controls.muted))},
		{id: 'autohome', label: 'LG Home on power-on', detail: 'Keep off to prevent LG Home covering Hearth after waking.', value: controls.homeAutoLaunch === null ? 'Unavailable' : controls.homeAutoLaunch ? 'On' : 'Off', disabled: controls.homeAutoLaunch === null, run: () => change(() => setAutoHome(!controls.homeAutoLaunch))},
		{id: 'tv', label: 'Open LG system settings', detail: 'Picture, sound, network, accessibility and other TV controls.', run: () => { launchSystemSettings().catch((e) => notify(e.message)); }},
		{id: 'hearth', label: 'Hearth settings', detail: 'Apps, inputs, clock, weather, wallpaper and startup options.', run: onSettings}
	]}>
		<div class="stats-grid"><div class="stat-card"><small>CPU usage</small><strong>{cpu === null ? 'Sampling…' : cpu + '%'}</strong><div class="stat-meter"><i style={{width: `${cpu || 0}%`}} /></div></div><div class="stat-card"><small>Memory used</small><strong>{snapshot ? memoryPercent + '%' : 'Loading…'}</strong><div class="stat-meter"><i style={{width: `${memoryPercent}%`}} /></div><p>{snapshot ? formatBytes(used) + ' / ' + formatBytes(snapshot.memoryTotal) : ''}</p></div><div class="stat-card"><small>Uptime</small><strong>{snapshot ? formatUptime(snapshot.uptime) : '—'}</strong></div><div class="stat-card"><small>Temperature</small><strong>{snapshot ? snapshot.temperature : '—'}</strong></div></div>
		<div class="dash-note"><h2>{snapshot ? snapshot.webos : 'Live system stats'}</h2><p>Load average: {snapshot ? snapshot.load : '—'}</p><p>Storage: {storage.length >= 5 ? `${formatBytes(Number(storage[2]) * 1024)} used / ${formatBytes(Number(storage[1]) * 1024)} · ${storage[4]}` : 'Unavailable'}</p><p class="network-lines">{snapshot && snapshot.network ? snapshot.network.split('\n').map((line) => { const p = line.trim().split(/\s+/); return p[1] + ' · ' + p[3]; }).join('  /  ') : 'Network information unavailable'}</p><small>{error || 'Updates every 5 seconds while this panel is open.'}</small></div>
	</DashboardPanel>;
}
