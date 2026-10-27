import assert from 'node:assert/strict';
import {build} from 'esbuild';
const out=new URL('../node_modules/.cache-visualiser-random-test.mjs',import.meta.url).pathname;
await build({entryPoints:[new URL('../src/dashboard/visualisers.ts',import.meta.url).pathname],bundle:true,format:'esm',outfile:out,platform:'node',logLevel:'error'});
const v=await import(out);
let saved=null;globalThis.localStorage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
const initial=v.loadVisualiserPrefs();assert.equal(initial.rotation,'timed');assert.equal(initial.idleWallpaper,true);
saved=JSON.stringify({mode:'goom',background:false,idleSeconds:30,preset:9,randomEachSong:true});
const migrated=v.loadVisualiserPrefs();assert.equal(migrated.rotation,'timed');assert.equal(migrated.mode,'goom');assert.equal(migrated.background,false);assert.equal(migrated.idleSeconds,30);assert.equal(migrated.idleWallpaper,true);
saved=JSON.stringify({randomEachSong:false});assert.equal(v.loadVisualiserPrefs().rotation,'manual','Legacy manual choice survives');
saved=JSON.stringify({rotation:'invalid'});assert.equal(v.loadVisualiserPrefs().rotation,'timed');
for(const rotation of ['timed','song','manual']){const prefs={...migrated,rotation,idleWallpaper:false};v.saveVisualiserPrefs(prefs);assert.deepEqual(v.loadVisualiserPrefs(),prefs);}
const manual={...migrated,rotation:'manual'};
assert.strictEqual(v.nextVisualiser(manual,()=>assert.fail('Manual mode must not draw random numbers')),manual);
assert.strictEqual(v.visualiserForSong(initial,()=>assert.fail('Song changes must not change a timed visualiser')),initial);
assert.strictEqual(v.visualiserForSong(manual,()=>assert.fail('Song changes must not change a manual visualiser')),manual);
assert.notEqual(v.visualiserForSong({...initial,rotation:'song'},()=>0).mode,initial.mode);
for(const current of v.VISUALISERS){const seen=new Set();for(let i=0;i<v.VISUALISERS.length-1;i++){let n=0;const result=v.nextVisualiser({...initial,mode:current.id},()=>n++===0?(i+.5)/(v.VISUALISERS.length-1):.5);assert.notEqual(result.mode,current.id);assert.equal(result.preset,500000);assert.equal(result.background,initial.background);assert.equal(result.idleWallpaper,initial.idleWallpaper);assert.equal(result.idleSeconds,initial.idleSeconds);assert.equal(result.rotation,'timed');seen.add(result.mode);}assert.equal(seen.size,v.VISUALISERS.length-1,'Every other installed effect is eligible');}
saved='broken json';assert.equal(v.loadVisualiserPrefs().rotation,'timed');assert.equal(v.loadVisualiserPrefs().idleWallpaper,true);
console.log('ok   three-minute default, migration, persisted manual/song choices, song boundaries, all random effects and no immediate repeats');
