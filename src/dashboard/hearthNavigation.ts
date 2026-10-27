import type {TileModel} from '../components/Tile';
export const HEARTH_NAV:TileModel[]=[
	{key:'apps',label:'Apps'},{key:'inputs',label:'Inputs'},
	{key:'dashboard-music',label:'Music'},{key:'dashboard-queue',label:'Queue'},
	{key:'dashboard-visualisers',label:'Visualisers'},{key:'dashboard-system',label:'System'},
	{key:'dashboard-themes',label:'Themes'},{key:'settings',label:'Settings'}
];
export interface HearthFocus {zone:'nav'|'tiles';nav:number;tile:number;}
export function moveHearthFocus(focus:HearthFocus,key:'left'|'right'|'up'|'down',count:number):HearthFocus {
	if(key==='up')return {...focus,zone:'nav'};
	if(key==='down')return {...focus,zone:'tiles'};
	const delta=key==='left'?-1:1;
	return focus.zone==='nav'?{...focus,nav:Math.max(0,Math.min(HEARTH_NAV.length-1,focus.nav+delta))}:{...focus,tile:Math.max(0,Math.min(Math.max(0,count-1),focus.tile+delta))};
}
