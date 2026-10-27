import assert from 'node:assert/strict';
import {build} from 'esbuild';
const out=new URL('../node_modules/.cache-visualiser-rotation-test.mjs',import.meta.url).pathname;
await build({entryPoints:['src/dashboard/visualiserRotation.ts'],bundle:true,format:'esm',outfile:out,platform:'node',logLevel:'error'});
const {createVisualiserRotation,VISUALISER_ROTATION_MS}=await import(out);
let now=0,id=0,changes=0;const timers=new Map();
globalThis.setInterval=(fn,delay)=>{timers.set(++id,{fn,delay,next:now+delay});return id;};
globalThis.clearInterval=id=>timers.delete(id);
function advance(ms){const until=now+ms;for(;;){const next=[...timers.values()].sort((a,b)=>a.next-b.next)[0];if(!next||next.next>until)break;now=next.next;next.next+=next.delay;next.fn();}now=until;}
assert.equal(VISUALISER_ROTATION_MS,180000);
const clock=createVisualiserRotation(()=>changes++);
clock.enable(false);assert.equal(timers.size,0);
clock.enable(true);advance(179999);assert.equal(changes,0);
clock.enable(true);assert.equal(timers.size,1,'repeated enable neither duplicates nor resets the clock');
advance(1);assert.equal(changes,1);advance(360000);assert.equal(changes,3,'continues changing every three minutes');
clock.enable(false);advance(360000);assert.equal(changes,3,'pause, hidden and manual eligibility stop changes');
clock.enable(true);advance(179999);assert.equal(changes,3);advance(1);assert.equal(changes,4,'resume starts a fresh interval');
clock.dispose();assert.equal(timers.size,0);advance(360000);assert.equal(changes,4,'unmount leaves no timer');
console.log('ok   180-second boundaries, repeated changes, stable timer, stop/resume and disposal');
