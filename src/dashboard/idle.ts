/** Independent idle clock so playback time updates never restart the countdown. */
export function createIdleClock(seconds:number,onChange:(active:boolean)=>void) {
	let active=false,enabled=false,timer:ReturnType<typeof setTimeout>|undefined;
	const clear=()=>{if(timer!==undefined)clearTimeout(timer);timer=undefined;};
	const arm=()=>{clear();if(enabled&&seconds>0&&!active)timer=setTimeout(()=>{active=true;onChange(true);},seconds*1000);};
	return {isActive:()=>active,enable:(value:boolean)=>{enabled=value;if(!value&&active){active=false;onChange(false);}arm();},activity:()=>{const woke=active;if(active){active=false;onChange(false);}arm();return woke;},dispose:()=>{clear();enabled=false;active=false;}};
}
