import {BLADE_COLOUR_THEMES} from './bladeThemes';
import {exec, shellQuote} from '../lib/apps';
import {setRootVars} from '../lib/cssvars';
import {applyTheme, THEMES, type Colors, type ThemeName} from '../theme/tokens';

export interface DashboardTheme {
	id: string;
	name: string;
	author: string;
	description: string;
	version: 1;
	layout: 'classic' | 'blades' | 'hearth';
	base: ThemeName;
	accent: string;
	background: 'theme' | 'wallpaper';
	bladeColors: string[];
	palette: Partial<Colors>;
}
export interface ThemeState {active: string; installed: DashboardTheme[];}
export const THEME_KEY = 'hearth-themes-v1';
export const THEME_FOLDER = '/media/developer/hearth-themes';
const BLADE_COLORS = ['#6b9d19', '#2686a4', '#c57b18', '#766298', '#667279'];
export const BUILTIN_THEMES: DashboardTheme[] = [
	{id:'hearth-plus',name:'Hearth Plus',author:'Hearth custom',description:'Wallpaper, a large clock and app row, with Music, Queue, Visualisers, System and Themes always within reach.',version:1,layout:'hearth',base:'black',accent:'#b4d975',background:'wallpaper',bladeColors:BLADE_COLORS,palette:{textPrimary:'#f1f5ed',textSecondary:'#c7d3bd',tileBorderFocus:'#b4d975',buttonActiveBg:'#b4d975',buttonActiveText:'#182311'}},
	{id: 'black', name: 'Hearth · OLED', author: 'Hearth', description: 'Your wallpaper, clock and familiar app row.', version: 1, layout: 'classic', base: 'black', accent: '#b4d975', background: 'wallpaper', bladeColors: BLADE_COLORS, palette: {}},
	{id: 'grey', name: 'Hearth · Blue-grey', author: 'Hearth', description: 'A calm blue-grey palette with your wallpaper.', version: 1, layout: 'classic', base: 'grey', accent: '#8dcbd9', background: 'wallpaper', bladeColors: BLADE_COLORS, palette: {}},
	{id: 'blades', name: 'Blades 360', author: 'Hearth custom', description: 'Brushed silver, coloured blades and the spirit of 2005.', version: 1, layout: 'blades', base: 'grey', accent: '#83b52b', background: 'theme', bladeColors: BLADE_COLORS, palette: {bg: '#343b3e', wallpaperStart: '#64716c', wallpaperMid: '#333e39', wallpaperEnd: '#1d2722', textPrimary: '#f4f6f2', textSecondary: '#c1cec0', tileBorderFocus: '#a4d74b', buttonActiveBg: '#a4d74b', buttonActiveText: '#17200e', switchTrackOn: '#a4d74b'}},
	...(['midnight','forest','cloud','sand','mist'] as ThemeName[]).map((base): DashboardTheme => ({id:base,name:'Hearth · '+base.charAt(0).toUpperCase()+base.slice(1),author:'Hearth',description:'Classic Hearth palette with your wallpaper and app row.',version:1,layout:'classic',base,accent:THEMES[base].tileBorderFocus,background:'wallpaper',bladeColors:BLADE_COLORS,palette:{}})),
	...BLADE_COLOUR_THEMES
];
const COLOR = /^#[0-9a-f]{6}$/i;
const PALETTE_KEYS = ['bg', 'wallpaperStart', 'wallpaperMid', 'wallpaperEnd', 'textPrimary', 'textSecondary', 'textMuted', 'tileBg', 'tileBgFocus', 'tileBorder', 'tileBorderFocus', 'badge', 'badgeText', 'buttonBorder', 'buttonActiveBg', 'buttonActiveText', 'switchTrack', 'switchTrackOn', 'switchKnob', 'switchKnobOn', 'danger', 'overlay', 'pickerBg'];

/** Theme files are data only. No scripts, CSS, URLs or shell commands are accepted. */
export function parseTheme (value: unknown): DashboardTheme {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a theme object');
	const t = value as Record<string, unknown>;
	if (t.version !== 1 || typeof t.id !== 'string' || !/^[a-z][a-z0-9-]{2,47}$/.test(t.id)) throw new Error('Invalid theme version or ID');
	if (BUILTIN_THEMES.some((b) => b.id === t.id)) throw new Error('Choose an ID different from a built-in theme');
	if (typeof t.name !== 'string' || !t.name.trim() || t.name.length > 48) throw new Error('Theme needs a name (up to 48 characters)');
	if (t.layout !== 'classic' && t.layout !== 'blades' && t.layout !== 'hearth') throw new Error('Layout must be classic, hearth or blades');
	if (typeof t.accent !== 'string' || !COLOR.test(t.accent)) throw new Error('Accent must be a six-digit hex colour');
	const palette: Partial<Colors> = {};
	if (t.palette !== undefined) {
		if (!t.palette || typeof t.palette !== 'object' || Array.isArray(t.palette)) throw new Error('Invalid palette');
		for (const key of Object.keys(t.palette)) {
			const color = (t.palette as Record<string, unknown>)[key];
			if (PALETTE_KEYS.indexOf(key) < 0 || typeof color !== 'string' || !COLOR.test(color)) throw new Error(`Invalid palette colour: ${key}`);
			(palette as Record<string, string>)[key] = color;
		}
	}
	const bladeColors = t.bladeColors === undefined ? BLADE_COLORS.slice() : t.bladeColors;
	if (!Array.isArray(bladeColors) || bladeColors.length !== 5 || !bladeColors.every((c) => typeof c === 'string' && COLOR.test(c))) throw new Error('Provide five blade colours');
	return {id: t.id, name: t.name.trim(), author: typeof t.author === 'string' ? t.author.slice(0, 60) : 'Custom', description: typeof t.description === 'string' ? t.description.slice(0, 180) : '', version: 1, layout: t.layout, base: t.base === 'grey' ? 'grey' : 'black', accent: t.accent, background: t.background === 'wallpaper' ? 'wallpaper' : 'theme', bladeColors, palette};
}
export function themeList (state: ThemeState): DashboardTheme[] { return BUILTIN_THEMES.concat(state.installed); }
export function activeTheme (state: ThemeState): DashboardTheme { return themeList(state).find((t) => t.id === state.active) || BUILTIN_THEMES.find(t=>t.id==='black')!; }
export function loadThemes (fallback = 'black'): ThemeState {
	try {
		const raw = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
		if (!raw) return {active: fallback, installed: []};
		const installed: DashboardTheme[] = [];
		if (Array.isArray(raw.installed)) for (const item of raw.installed.slice(0, 24)) { try { const theme = parseTheme(item); if (!installed.some((t) => t.id === theme.id)) installed.push(theme); } catch { /* Ignore one invalid theme. */ } }
		const state = {active: typeof raw.active === 'string' ? raw.active : fallback, installed};
		return {...state, active: activeTheme(state).id};
	} catch { return {active: fallback, installed: []}; }
}
export function saveThemes (state: ThemeState): void { localStorage.setItem(THEME_KEY, JSON.stringify(state)); }
export function applyDashboardTheme (theme: DashboardTheme): void {
	applyTheme(theme.base);
	const root = document.documentElement;
	const vars: Record<string,string> = {'--dashboard-accent':theme.accent};
	for (const key of Object.keys(theme.palette)) vars['--color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase()] = (theme.palette as Record<string,string>)[key];
	setRootVars(vars);
	root.setAttribute('data-dashboard-layout', theme.layout);
	root.setAttribute('data-dashboard-colour-pack', BLADE_COLOUR_THEMES.some(t => t.id === theme.id) ? 'on' : 'off');
}
export async function importThemes (): Promise<{themes: DashboardTheme[]; errors: string[]}> {
	const list = await exec(`for f in ${shellQuote(THEME_FOLDER)}/*.json; do [ -f "$f" ] && printf '%s\\n' "$f"; done; true`);
	const themes: DashboardTheme[] = [], errors: string[] = [];
	for (const path of list.split('\n').filter((p) => p.indexOf(THEME_FOLDER + '/') === 0 && !/[\x00-\x1f]/.test(p)).slice(0, 24)) {
		try {
			const json = await exec(`head -c 16385 ${shellQuote(path)}`);
			if (json.length > 16384) throw new Error('Theme file is too large');
			const theme = parseTheme(JSON.parse(json));
			if (themes.some((t) => t.id === theme.id)) throw new Error('Duplicate theme ID');
			themes.push(theme);
		} catch (error) { errors.push(path.split('/').pop() + ': ' + String((error as Error).message)); }
	}
	return {themes, errors};
}
