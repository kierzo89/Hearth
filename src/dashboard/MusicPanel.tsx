import qrcode from 'qrcode-generator';
import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {DashboardPanel, type PanelAction, type PanelFocus} from './Panel';
import {loadMusicConnection, mediaTime, musicRequest, type MusicConnection, type MusicPlaylist, type MusicStatus, type Track} from './music';
import type {MusicPlayer} from './useMusic';
import {TrackMenu} from './QueuePanel';
import {MusicSearch} from './MusicSearch';
import {useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {playNavigationSound} from './sounds';
export function MusicPanel ({player, onClose, notify, onVisualisers, onQueue}: {onQueue: () => void; onVisualisers: () => void; player: MusicPlayer; onClose: () => void; notify: (s: string) => void}) {
	const [connection, setConnection] = useState<MusicConnection | null>(null);
	const [status, setStatus] = useState<MusicStatus | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Connecting to your TV music service…');
	const [tracks, setTracks] = useState<Track[]>([]);
	const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
	const [heading, setHeading] = useState('YouTube Music');
	const [trackOptions,setTrackOptions]=useState<number|null>(null);
	const [searching, setSearching] = useState(false);
	const [query, setQuery] = useState('');
	const [view, setView] = useState<'home' | 'library' | 'tracks'>('home');
	const [trackParent, setTrackParent] = useState<'home' | 'library'>('home');
	const [browseError, setBrowseError] = useState('');
	const [focus, setFocus] = useState<PanelFocus>({id: 'search', seq: 0});
	const browseSequence = useRef(0);
	const playlistFocus = useRef('');
	const focusAction = (id: string) => setFocus((f) => ({id, seq: f.seq + 1}));
	const alive = useRef(true);
	useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
	const run = async (fn: () => Promise<void>) => {
		if (busy) return;
		setBusy(true);
		try { await fn(); } catch (e) { if (alive.current) setMessage((e as Error).message); }
		if (alive.current) setBusy(false);
	};
	const refresh = async () => {
		const source = await loadMusicConnection();
		const state = await musicRequest<MusicStatus>(source, '/status');
		if (!alive.current) return;
		setConnection(source); setStatus(state);
		setMessage(state.signedIn ? 'Account connected. Open your library or search for music.' : state.auth && state.auth.state === 'pending' ? 'Scan the QR code or enter this code on your phone. Waiting for Google approval…' : 'Choose Sign in to get a TV code, then approve it with Google on your phone.');
	};
	useEffect(() => { run(refresh); }, []);
	useEffect(() => {
		if (!connection || !status || !status.auth || status.auth.state !== 'pending') return undefined;
		let cancelled = false, timer = 0;
		const poll = async () => {
			try { const next = await musicRequest<MusicStatus>(connection, '/status'); if (!cancelled) { setStatus(next); if (next.signedIn) setMessage('Account connected. Open your library or liked songs.'); } } catch { /* Refresh can retry a temporary connection failure. */ }
			if (!cancelled) timer = window.setTimeout(poll, 3000);
		};
		timer = window.setTimeout(poll, 3000);
		return () => { cancelled = true; window.clearTimeout(timer); };
	}, [connection, !!(status && status.auth && status.auth.state === 'pending')]);
	const loadLibrary = async () => {
		if (!connection) return;
		const request = ++browseSequence.current;
		setView('library'); setHeading('Your library'); setBusy(true); setPlaylists([]); setBrowseError(''); setMessage('Loading your playlists…'); focusAction('browse-back');
		try {
			const list = await musicRequest<{playlists: MusicPlaylist[]}>(connection, '/library');
			if (!alive.current || request !== browseSequence.current) return;
			setPlaylists(list.playlists); setMessage(list.playlists.length ? `${list.playlists.length} playlists. Select one to see its songs.` : 'No playlists found for this account.');
			focusAction(list.playlists.length ? 'playlist-' + list.playlists[0].id : 'browse-back');
		} catch (e) { if (alive.current && request === browseSequence.current) { setBrowseError((e as Error).message); setMessage((e as Error).message); } }
		finally { if (alive.current && request === browseSequence.current) setBusy(false); }
	};
	const loadPlaylist = async (id: string, title?: string, parent: 'home' | 'library' = 'home') => {
		if (!connection) return;
		const request = ++browseSequence.current;
		setView('tracks'); setTrackParent(parent); playlistFocus.current = id; setHeading(title || (id === 'LM' ? 'Your liked songs' : 'Playlist')); setBusy(true); setTracks([]); setBrowseError(''); setMessage('Loading songs…'); focusAction('browse-back');
		try {
			const list = await musicRequest<{title: string; tracks: Track[]}>(connection, '/playlist?id=' + encodeURIComponent(id));
			if (!alive.current || request !== browseSequence.current) return;
			setTracks(list.tracks); setHeading(title || list.title); setMessage(list.tracks.length ? `${list.tracks.length} songs. Select one to play.` : 'No playable songs in this playlist.');
			focusAction(list.tracks.length ? 'track-' + list.tracks[0].id + '-0' : 'browse-back');
		} catch (e) { if (alive.current && request === browseSequence.current) { setBrowseError((e as Error).message); setMessage((e as Error).message); } }
		finally { if (alive.current && request === browseSequence.current) setBusy(false); }
	};
	const goBack = () => {
		if (view === 'home') { onClose(); return; }
		browseSequence.current++; setBusy(false); setBrowseError('');
		if (view === 'tracks' && trackParent === 'library') { setView('library'); setHeading('Your library'); setMessage(`${playlists.length} playlists. Select one to see its songs.`); focusAction('playlist-' + playlistFocus.current); }
		else { setView('home'); setHeading('YouTube Music'); setMessage('Choose your library, liked songs or search.'); focusAction(view === 'library' ? 'library' : 'liked'); }
	};
	const homeActions: PanelAction[] = [
		{id:'queue',label:'Music queue',detail:player.queue.entries.length+' songs · reorder, shuffle and repeat',run:onQueue},
		{id: 'visualisers', label: 'Visualisers', detail: 'Dashboard background, full screen and effects.', run: onVisualisers},
		{id: 'search', label: 'Search music', detail: 'Live results, suggestions and recent searches.', disabled: !connection || busy, run: () => setSearching(true)},
		{id: 'library', label: 'Your library', detail: 'Playlists from your signed-in YouTube Music account.', disabled: !connection || !status || !status.signedIn || busy, run: loadLibrary},
		{id: 'liked', label: 'Your liked songs', disabled: !connection || !status || !status.signedIn || busy, run: () => loadPlaylist('LM')},
		...(player.state.track ? [{id: 'toggle', label: player.state.playing ? 'Pause' : 'Play / resume', detail: player.state.track.title, run: player.toggle}, {id: 'next', label: 'Next track', run: () => player.next()}, {id: 'prev', label: 'Previous track', run: () => player.next(-1)}, {id: 'seek', label: 'Seek in track', detail: '← → skip 15 seconds · OK skips forward', value: mediaTime(player.state.current) + ' / ' + mediaTime(player.state.duration), run: () => player.seek(15), adjust: (d: number) => player.seek(d * 15)}, {id: 'stop', label: 'Stop music', run: player.stop}] : []),
		{id: 'login', label: status && status.signedIn ? 'Change music account' : 'Sign in to YouTube Music', detail: 'Approve the code on your phone. Your session is saved on this TV.', disabled: !connection || busy, run: () => run(async () => { if (!connection) return; const next = await musicRequest<MusicStatus>(connection, '/login', 'POST'); if (alive.current) { setStatus(next); setMessage('Scan the QR code or open the address on your phone and enter the code.'); notify('Google sign-in code ready'); } })},
		{id: 'refresh', label: 'Refresh connection', detail: 'Refresh your TV account connection.', disabled: busy, run: () => run(refresh)},
		...(status && status.signedIn ? [{id: 'logout', label: 'Sign out of music', detail: 'Revokes and removes this TV music session.', run: () => run(async () => { if (!connection) return; const next = await musicRequest<MusicStatus>(connection, '/logout', 'POST'); player.clearQueue(); if (alive.current) { setStatus(next); setPlaylists([]); setTracks([]); setView('home'); setHeading('YouTube Music'); focusAction('login'); setMessage('Signed out.'); } })}] : []),
	];
	const browseActions: PanelAction[] = [{id: 'browse-back', label: view === 'tracks' && trackParent === 'library' ? 'Back to your library' : 'Back to music', run: goBack}];
	if (busy) browseActions.push({id: 'loading', label: view === 'library' ? 'Loading your playlists…' : 'Loading songs…', disabled: true, run: () => undefined});
	else if (browseError) browseActions.push({id: 'browse-error', label: 'Could not load this list', detail: browseError, disabled: true, run: () => undefined}, {id: 'retry', label: 'Try again', run: () => view === 'library' ? loadLibrary() : loadPlaylist(playlistFocus.current, heading, trackParent)});
	else if (view === 'library') {
		browseActions.push(...playlists.map((p) => ({id: 'playlist-' + p.id, label: p.title, artwork: p.artwork, detail: p.count ? p.count + ' tracks' : 'Open playlist', run: () => loadPlaylist(p.id, p.title, 'library')})));
		if (!playlists.length) browseActions.push({id: 'empty', label: 'No playlists found', detail: 'Try your liked songs or search for music.', disabled: true, run: () => undefined});
	} else {
		browseActions.push(...tracks.map((t, i) => ({id: 'track-' + t.id + '-' + i, label: t.title, artwork: t.artwork, detail: t.artist, more:()=>{focusAction('track-'+t.id+'-'+i);setTrackOptions(i);}, value: player.state.track && player.state.track.id === t.id && player.state.playing ? 'Playing' : t.duration, run: () => { if (connection) { player.play(tracks, i, connection); notify('Loading ' + t.title); } }})));
		if (!tracks.length) browseActions.push({id: 'empty', label: 'No playable songs', detail: 'Choose another playlist or search for music.', disabled: true, run: () => undefined});
	}
	const actions = view === 'home' ? homeActions : browseActions;

	const track = player.state.track;
	const auth = status && status.auth;
	const qr = useMemo(() => {
		if (!auth || !/^https:\/\/([a-z0-9-]+\.)*(google\.com|youtube\.com)(\/|$)/i.test(auth.url)) return '';
		const code = qrcode(0, 'M'); code.addData(auth.url); code.make(); return code.createDataURL(6, 2);
	}, [auth && auth.url]);
	if(trackOptions!==null&&connection&&tracks[trackOptions])return <TrackMenu track={tracks[trackOptions]} connection={connection} player={player} onClose={()=>setTrackOptions(null)} notify={notify} onPlay={()=>player.play(tracks,trackOptions,connection)} />;
	if (searching && connection) return <MusicSearch notify={notify} connection={connection} player={player} initialQuery={query} onQuery={setQuery} onClose={() => setSearching(false)} />;
	return <DashboardPanel title={heading} eyebrow="Music, without leaving home" onClose={goBack} focusRequest={focus} backLabel={view === 'home' ? 'Back to dashboard' : view === 'tracks' && trackParent === 'library' ? 'Back to library' : 'Back to music'} actions={actions}>
		{auth && auth.state === 'pending' ? <div class="music-signin">{qr && <img src={qr} alt="Google sign-in QR code" />}<div><h2>Sign in on your phone</h2><p>{auth.url}</p><strong>{auth.userCode}</strong><small>Approve with Google. Hearth never asks for your password.</small></div></div> : <div class="music-art">{track && track.artwork ? <img src={track.artwork} alt="" /> : <span>♫</span>}</div>}<h2>{track ? track.title : 'Your dashboard soundtrack'}</h2><p>{track ? track.artist : 'Search, browse your library and listen while exploring Hearth.'}</p>{track && <><div class="music-progress"><i style={{width: `${player.state.duration ? player.state.current / player.state.duration * 100 : 0}%`}} /></div><p class="music-time">{player.state.loading ? 'Loading audio…' : player.state.playing ? 'Playing' : 'Paused'} · {mediaTime(player.state.current)} / {mediaTime(player.state.duration)}</p></>}
		<div class="dash-note"><strong>{busy ? 'Working…' : status && status.signedIn ? 'Account connected' : 'YouTube Music'}</strong><p role="status">{player.state.error || (auth && auth.error) || message}</p><small>Runs entirely on your TV. Music pauses when you open another TV app. Remote Play / Pause / Next / Previous also work.</small></div>
	</DashboardPanel>;
}
export function MiniPlayer ({player, onOpen, focused, onFocus, onBlur, onVisualise}: {player: MusicPlayer; onOpen: () => void; focused: boolean; onFocus: () => void; onBlur: () => void; onVisualise: () => void}) {
	const [selected, setSelected] = useState(1);
	const buttons = [
		{label: 'Previous track', text: '‹‹', run: () => player.next(-1)},
		{label: player.state.playing ? 'Pause' : 'Play', text: player.state.playing ? 'Ⅱ' : '▶', run: player.toggle},
		{label: 'Open music', text: '', run: onOpen},
		{label: 'Next track', text: '››', run: () => player.next()},
		{label: 'Visualiser', text: '◈', run: onVisualise},
		{label: 'Stop', text: '■', run: () => { player.stop(); onBlur(); }}
	];

	useKeys((key) => {
		if (key === 'up' || key === 'back') { setSelected(1); onBlur(); return; }
		if (key === 'left' || key === 'right') { playNavigationSound('cursor'); setSelected((s) => Math.max(0, Math.min(buttons.length - 1, s + (key === 'left' ? -1 : 1)))); }
	}, focused && !!player.state.track);
	useOkPress({onPress: () => { playNavigationSound('select'); buttons[selected].run(); }, onLongPress: () => undefined}, focused && !!player.state.track);
	if (!player.state.track) return null;
	const {current, duration, track} = player.state;
	const progress = duration > 0 ? Math.max(0, Math.min(100, current / duration * 100)) : 0;
	return <div class={'music-mini' + (focused ? ' music-mini--focused' : '')}>
		<div class="music-mini__controls"><div class="music-mini__art">{track.artwork ? <img src={track.artwork} alt="" onLoad={(e) => { e.currentTarget.style.visibility = ''; }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : '♫'}</div>{buttons.map((button, i) => <button key={i} class={(i === 2 ? 'music-mini__title ' : '') + (focused && selected === i ? 'is-focused' : '')} onMouseEnter={() => { onFocus(); setSelected(i); }} onClick={button.run} aria-label={button.label}>{i === 2 ? <><strong>{track.title}</strong><small>{player.state.error || (player.state.loading ? 'Loading…' : track.artist)}</small></> : button.text}</button>)}</div>
		<div class="music-mini__timeline"><span>{mediaTime(current)}</span><div class="music-progress" role="progressbar" aria-label="Track playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${mediaTime(current)} of ${mediaTime(duration)}`}><i style={{width: `${progress}%`}} /></div><span>{mediaTime(duration)}</span></div>
		{focused && <div class="music-mini__hint">← → Controls · OK Select · ↑ Back to menu</div>}
	</div>;
}
