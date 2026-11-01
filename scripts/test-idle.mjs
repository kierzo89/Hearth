import assert from 'node:assert/strict';
import {build} from 'esbuild';
const out=new URL('../node_modules/.cache-idle-test.mjs',import.meta.url).pathname;
await build({entryPoints:[new URL('../src/dashboard/idle.ts',import.meta.url).pathname],bundle:true,format:'esm',outfile:out,platform:'node',logLevel:'error'});
const {createIdleClock}=await import(out);let n=0;const timers=new Map(),changes=[];globalThis.setTimeout=(fn,delay)=>{timers.set(++n,{fn,delay});return n;};globalThis.clearTimeout=id=>timers.delete(id);
const clock=createIdleClock(120,v=>changes.push(v));clock.enable(true);assert.equal([...timers.values()][0].delay,120000);clock.activity();assert.equal(timers.size,1,'activity replaces the pending countdown');[...timers.values()][0].fn();assert.equal(clock.isActive(),true);assert.equal(clock.activity(),true,'wake is distinguishable from ordinary activity');assert.deepEqual(changes,[true,false]);clock.enable(false);assert.equal(timers.size,0);clock.enable(true);clock.dispose();assert.equal(timers.size,0);const off=createIdleClock(0,()=>assert.fail());off.enable(true);assert.equal(timers.size,0);
console.log('ok   idle delay, reset, single wake, eligibility, off preference and disposal');
