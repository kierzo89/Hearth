import type {DashboardTheme} from './themes';

interface BladePalette {
	id: string; name: string; description: string; accent: string;
	blades: [string, string, string, string, string];
	background: string; surface: string; focus: string; border: string; muted: string;
}
const palettes: BladePalette[] = [
	{id:'futuristic',name:'Futuristic',description:'Orbital blues, titanium and icy cyan light.',accent:'#72e5ff',blades:['#245b78','#347487','#405d95','#505b82','#436d78'],background:'#101c29',surface:'#1b3042',focus:'#29485b',border:'#496579',muted:'#a8c2d3'},
	{id:'gothic',name:'Gothic',description:'Burgundy, cathedral violet and charcoal, edged in antique gold.',accent:'#d6b77b',blades:['#572d40','#3e394e','#62363e','#493353','#42434b'],background:'#19151c',surface:'#2b222e',focus:'#463243',border:'#665263',muted:'#c4afbf'},
	{id:'cyber',name:'Cyber',description:'Electric teal, acid green and neon magenta on dark circuitry.',accent:'#baff57',blades:['#17605b','#24556a','#71305f','#3a5b35','#4c3972'],background:'#0c191d',surface:'#152e33',focus:'#254a43',border:'#426b64',muted:'#a7cec3'},
	{id:'synthwave',name:'Synthwave',description:'After-dark violet, hot pink and sunset neon.',accent:'#ff8cdb',blades:['#60347c','#3e417e','#8d3e6a','#633a68','#3a547c'],background:'#1a142d',surface:'#302345',focus:'#4f305e',border:'#765984',muted:'#cebadc'},
	{id:'aurora',name:'Aurora',description:'Northern lights in jade, turquoise and soft violet.',accent:'#95f2c9',blades:['#286552','#276779','#4e5984','#66547c','#3d6b68'],background:'#101f25',surface:'#20343c',focus:'#30534f',border:'#4e7774',muted:'#b0d0c9'},
	{id:'ember',name:'Ember',description:'Copper, burnt orange and ember red with warm amber highlights.',accent:'#ffca7a',blades:['#85462d','#694c3c','#914139','#704251','#6c5836'],background:'#241713',surface:'#3b2820',focus:'#5a3a29',border:'#805e49',muted:'#d8bda5'},
	{id:'ocean',name:'Ocean',description:'Deep Atlantic blue, sea glass and cool turquoise.',accent:'#80ddd9',blades:['#245879','#286a78','#3a6572','#3e537a','#32676a'],background:'#101e2b',surface:'#1d3244',focus:'#2b4e60',border:'#4b7183',muted:'#abc8d7'},
	{id:'royal',name:'Royal',description:'Sapphire, amethyst and velvet purple with champagne gold.',accent:'#edce88',blades:['#493e7a','#344d7c','#714766','#5e3e78','#4c5272'],background:'#1b182b',surface:'#302a43',focus:'#4b3e5f',border:'#73617f',muted:'#c9bdd7'}
];

export const BLADE_COLOUR_THEMES: DashboardTheme[] = palettes.map(p => ({
	id:'blades-'+p.id,name:'Blades · '+p.name,author:'Hearth custom',description:p.description,
	version:1,layout:'blades',base:'grey',accent:p.accent,background:'theme',bladeColors:p.blades,
	palette:{bg:p.background,wallpaperStart:p.surface,wallpaperMid:p.background,wallpaperEnd:p.background,
		textPrimary:'#f4f5f7',textSecondary:p.muted,textMuted:p.muted,
		tileBg:p.surface,tileBgFocus:p.focus,tileBorder:p.border,tileBorderFocus:p.accent,
		buttonBorder:p.border,buttonActiveBg:p.accent,buttonActiveText:p.background,
		switchTrackOn:p.accent,switchKnobOn:p.background,overlay:p.background,pickerBg:p.surface}
}));
