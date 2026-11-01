import assert from 'node:assert/strict';
import {build} from 'esbuild';
const out = new URL('../node_modules/.cache-blades-test.mjs', import.meta.url).pathname;
await build({entryPoints: ['src/dashboard/bladeLayout.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error'});
const {bladeOffset, BLADE_SPINE, BLADE_WIDTH, BLADE_OVERLAP} = await import(out);
for (let active = 0; active < 5; active++) {
  const positions = Array.from({length: 5}, (_, i) => bladeOffset(i, active));
  assert.equal(positions[0], 0);
  assert.equal(positions[4] + (active === 4 ? BLADE_WIDTH : BLADE_SPINE), 1920);
  for (let i = 0; i < 4; i++) assert.equal(positions[i + 1] - positions[i], i === active ? BLADE_WIDTH : BLADE_SPINE);
  for (let next = 0; next < 5; next++) {
    for (const t of [.1,.3,.5,.9]) {
      const interpolated = positions.map((x, i) => x * (1-t) + bladeOffset(i, next) * t);
      for (let i = 0; i < 4; i++) {
        assert.ok(interpolated[i + 1] - interpolated[i] <= BLADE_WIDTH + 1e-6, 'sliding sheets never expose a gap');
        assert.ok(interpolated[i + 1] + 40 <= interpolated[i] + BLADE_WIDTH + BLADE_OVERLAP + 1e-6, 'the preceding sheet covers the curved cutout throughout the slide');
      }
    }
  }
}
console.log('ok   all five blade positions and interrupted/direct slides keep the viewport covered');
