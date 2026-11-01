import type {ComponentChildren} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import type {TileModel} from '../components/Tile';
import {Glyph} from '../components/Glyph';
import {useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {useClock} from '../hooks/useClock';
import {timeParts, fullDate, type TimeFormat} from '../lib/clock';
import type {WeatherView} from '../lib/weather';
import type {DashboardTheme} from './themes';
import {bladeOffset, BLADE_WIDTH, BLADE_OVERLAP} from './bladeLayout';
import {playNavigationSound, playBladeSound, prepareSounds} from './sounds';

const SECTIONS = [
	{title: 'Apps', subtitle: 'Your entertainment, ready to go.', tag: 'YOUR APPS'},
	{title: 'Inputs', subtitle: 'Everything connected to your screen.', tag: 'GET CONNECTED'},
	{title: 'Music', subtitle: 'Give your dashboard a soundtrack.', tag: 'NOW PLAYING'},
	{title: 'System', subtitle: 'Make yourself at home.', tag: 'TAKE CONTROL'},
	{title: 'Themes', subtitle: 'A new look. The same Hearth.', tag: 'MAKE IT YOURS'}
];
export function Blades ({items, inputs, theme, active, paused, wake, focus, timeFormat, weather, onActivate, onLongPress, inputActive = true, onPlayerFocus, visualiser, nowPlaying, preview = false}: {preview?: boolean; nowPlaying?: {title: string; artist: string; artwork: string} | null; visualiser?: ComponentChildren; inputActive?: boolean; onPlayerFocus?: () => void; items: TileModel[]; inputs: TileModel[]; theme: DashboardTheme; active: boolean; paused: boolean; wake: number; focus?: {key: string; seq: number}; timeFormat: TimeFormat; weather: WeatherView | null; onActivate: (item: TileModel) => void; onLongPress: (item: TileModel) => void}) {
	const now = useClock(paused);
	const [section, setSection] = useState(0);
	const [positions, setPositions] = useState([0, 0, 0, 0, 0]);
	const navigation = useRef({section: 0, positions: [0, 0, 0, 0, 0]});
	const apps = items.filter((t) => t.key.indexOf('dashboard-') !== 0 && ['lg-home', 'settings', 'system-settings'].indexOf(t.key) < 0 && !/^com.webos.app.(hdmi|livetv)/.test(t.key));
	const lists: TileModel[][] = [apps, inputs,
		[{key: 'dashboard-music', label: 'YouTube Music', glyph: 'music'}, {key: 'dashboard-music-connect', label: 'Connect your music account', glyph: 'gear'}],
		[{key: 'dashboard-system', label: 'System stats & quick settings', glyph: 'tv'}, {key: 'system-settings', label: 'LG system settings', glyph: 'tv'}, {key: 'settings', label: 'Hearth settings', glyph: 'gear'}, {key: 'lg-home', label: 'Open LG Home', glyph: 'house'}],
		[{key: 'dashboard-themes', label: 'Theme library', glyph: 'gear'}, {key: 'dashboard-theme-import', label: 'Install a custom theme', glyph: 'gear'}, {key: 'dashboard-theme-classic', label: 'Switch to Hearth Plus', glyph: 'house'}]
	];
	const pick = (index: number) => {
		const nav = navigation.current, current = nav.section;
		if (index !== nav.positions[current] && index >= 0) { playNavigationSound('cursor'); nav.positions = nav.positions.map((v, i) => i === current ? index : v); setPositions(nav.positions); }
	};
	const switchBlade = (index: number) => {
		if (index !== navigation.current.section && index >= 0 && index < SECTIONS.length) { navigation.current.section = index; playBladeSound(index); setSection(index); }
	};
	const reset = () => { navigation.current = {section: 0, positions: [0, 0, 0, 0, 0]}; setSection(0); setPositions(navigation.current.positions); };
	const activate = (entry: TileModel) => { playNavigationSound('select'); onActivate(entry); };
	useEffect(() => { if (active && !preview) prepareSounds(); }, [active, preview]);
	useEffect(reset, [wake]);
	useEffect(() => { if (focus) { const index = apps.findIndex((a) => a.key === focus.key); if (index >= 0) { navigation.current.section = 0; navigation.current.positions = [index, ...navigation.current.positions.slice(1)]; setSection(0); setPositions(navigation.current.positions); } } }, [focus && focus.seq]);
	useKeys((key) => {
		const nav = navigation.current, entries = lists[nav.section], selected = Math.min(nav.positions[nav.section], Math.max(0, entries.length - 1));
		if (key === 'left') switchBlade(nav.section - 1);
		else if (key === 'right') switchBlade(nav.section + 1);
		else if (key === 'up') pick(Math.max(0, selected - 1));
		else if (key === 'down') { if (selected >= entries.length - 1 && onPlayerFocus) onPlayerFocus(); else pick(Math.min(entries.length - 1, selected + 1)); }
		else if (key === 'back') { if (nav.section || selected) playNavigationSound('back'); reset(); }
	}, active && inputActive);
	const currentItem = () => { const nav = navigation.current, entries = lists[nav.section]; return entries[Math.min(nav.positions[nav.section], Math.max(0, entries.length - 1))]; };
	useOkPress({onPress: () => { const item = currentItem(); if (item) activate(item); }, onLongPress: () => { const item = currentItem(); if (item && navigation.current.section < 2) { playNavigationSound('select'); onLongPress(item); } }}, active && inputActive);
	const time = timeParts(now, timeFormat);
	const descriptions = ['Launch an app and pick up where you left off.', 'Switch directly to a TV input.', 'Your library, liked songs and music — right here on your dashboard.', 'Live TV statistics and the settings you use most.', 'Choose a built-in design or install your own.'];
	return <div class={'blades-screen' + (theme.background === 'wallpaper' ? ' blades-screen--wallpaper' : '') + (!active ? ' screen--away' : '')}>
		<div class="blades-deck">{SECTIONS.map((s, i) => {
			const open = section === i, entries = lists[i], at = Math.min(positions[i], Math.max(0, entries.length - 1)), start = Math.max(0, at - 5), featured = entries[at], track = i === 2 ? nowPlaying : null;
			return <section key={s.title} class={'blade' + (open ? ' blade--open' : i > section ? ' blade--right' : ' blade--left')} style={{'--blade-color': theme.bladeColors[i], width: `${BLADE_WIDTH + BLADE_OVERLAP}px`, transform: `translate3d(${bladeOffset(i, section)}px,0,0)`}}>
				{open && visualiser}
				<button class="blade-spine" tabIndex={preview ? -1 : 0} onClick={() => switchBlade(i)} aria-label={s.title} aria-expanded={open}><span>{s.title}</span></button>
				<div class="blade-content" aria-hidden={!open}>
					<div class="blades-top"><div class="blades-brand"><span class="blades-orb">h</span><span>hearth <span class="blades-edition">360</span></span></div><div class="blades-date">{fullDate(now)}</div><div class="blades-time">{time.time}<small>{time.period}</small></div></div>
					<header class="blade-heading"><div><div class="blade-eyebrow">{s.tag}</div><h1>{s.title}</h1></div><div class="blade-page">0{i + 1}<span> / 05</span></div></header>
					<div class="blade-body"><div class="blade-menu">{entries.slice(start, start + 6).map((entry, j) => <button key={entry.key} tabIndex={open && !preview ? 0 : -1} class={'blade-menu-item' + (start + j === at ? ' is-focused' : '')} onMouseEnter={() => { if (open) pick(start + j); }} onClick={() => { if (open) activate(entry); }}>{entry.imageUrl ? <img src={entry.imageUrl} alt="" /> : entry.glyphImageUrl ? <img src={entry.glyphImageUrl} alt="" /> : <span class="blade-menu-glyph">{entry.glyph ? <Glyph name={entry.glyph} /> : entry.label.charAt(0)}</span>}<span>{entry.label}</span><b>›</b></button>)}{!entries.length && <div class="blade-empty">No inputs selected. Add them in Hearth settings → Sources.</div>}<div class="blade-counter">{entries.length ? at + 1 : 0} / {entries.length} {i === 0 ? 'apps' : i === 1 ? 'sources' : 'options'}</div></div>
						<div class="blade-feature"><div class="blade-feature__art">{track && track.artwork ? <img src={track.artwork} alt="Current song artwork" /> : featured && featured.imageUrl ? <img src={featured.imageUrl} alt="" /> : <div class="blade-feature__symbol"><Glyph name={i === 2 ? 'music' : i === 3 || i === 4 ? 'gear' : 'tv'} /></div>}<div class="blade-feature__reflection" /></div><div class="blade-eyebrow">{i === 0 ? 'READY WHEN YOU ARE' : s.tag}</div><h2>{track ? track.title : featured ? featured.label : s.title}</h2><p>{track ? track.artist : descriptions[i]}</p>{weather && <div class="blade-weather">{weather.city} · {weather.main}</div>}</div>
					</div><footer class="blade-footer"><span><i class="remote-key">OK</i> Select</span><span><i class="remote-key remote-key--back">B</i> Back</span><span>← → Switch blades</span><span>↑ ↓ Browse{onPlayerFocus ? ' · ↓ at end: player' : ''}{i === 0 ? ' · Hold OK for app options' : ''}</span></footer>
				</div>
			</section>;
		})}</div>
	</div>;
}
