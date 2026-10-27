import assert from 'node:assert/strict';
import {build} from 'esbuild';
const out=new URL('../node_modules/.cache-visualiser-random-test.mjs',import.meta.url).pathname;
await build({entryPoints:[new URL('../src/dashboard/visualisers.ts',import.meta.url).pathname],bundle:true,format:'esm',outfile:out,platform:'node',logLevel:'error'});
const v=await import(out);
let saved=null;globalThis.localStorage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
const initial=v.loadVisualiserPrefs();assert.equal(initial.randomEachSong,true);assert.equal(initial.idleWallpaper,true);
saved=JSON.stringify({mode:'goom',background:false,idleSeconds:30,preset:9});
const migrated=v.loadVisualiserPrefs();assert.equal(migrated.randomEachSong,true);assert.equal(migrated.mode,'goom');assert.equal(migrated.background,false);assert.equal(migrated.idleSeconds,30);
assert.equal(migrated.idleWallpaper,true);
const manual={...migrated,randomEachSong:false,idleWallpaper:false};v.saveVisualiserPrefs(manual);assert.deepEqual(v.loadVisualiserPrefs(),manual);
assert.strictEqual(v.visualiserForSong(manual,()=>assert.fail('Manual mode must not draw random numbers')),manual);
for(const current of v.VISUALISERS){const seen=new Set();for(let i=0;i<v.VISUALISERS.length-1;i++){let n=0;const result=v.visualiserForSong({...initial,mode:current.id},()=>n++===0?(i+.5)/(v.VISUALISERS.length-1):.5);assert.notEqual(result.mode,current.id);assert.equal(result.preset,500000);assert.equal(result.background,initial.background);assert.equal(result.idleWallpaper,initial.idleWallpaper);assert.equal(result.idleSeconds,initial.idleSeconds);assert.equal(result.randomEachSong,true);seen.add(result.mode);}assert.equal(seen.size,v.VISUALISERS.length-1,'Every other installed effect is eligible');}
saved='broken json';assert.equal(v.loadVisualiserPrefs().randomEachSong,true);assert.equal(v.loadVisualiserPrefs().idleWallpaper,true);
console.log('ok   visualiser default, migration, persisted manual override, all random effects and no immediate repeats');
