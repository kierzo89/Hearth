// Exercise the real shell output limit that previously discarded every installed icon.
import assert from 'node:assert/strict';
import {exec as shellExec} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';

const out = new URL('../node_modules/.cache-appicons-test.mjs', import.meta.url).pathname;
await build({entryPoints: [new URL('../src/lib/apps.ts', import.meta.url).pathname], bundle: true, format: 'esm', outfile: out, platform: 'node', logLevel: 'error', define: {'import.meta.glob': 'emptyCatalog'}, banner: {js: 'const emptyCatalog = () => ({});'}});
const dir = mkdtempSync(join(tmpdir(), 'hearth-icons-'));
try {
	const points = [100000, 200000, 129249].map((size, i) => {
		const icon = join(dir, `${i}.png`);
		writeFileSync(icon, Buffer.alloc(size, i + 1));
		return {id: `test.app.${i}`, title: `App ${i}`, icon};
	});
	const store = new Map();
	globalThis.localStorage = {getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, v)};
	let reads = 0;
	class Bridge {
		cancel () {}
		call (uri, payload) {
			assert.match(uri, /hbchannel.service\/exec$/);
			const {command} = JSON.parse(payload);
			if (command.includes('listLaunchPoints')) {
				queueMicrotask(() => this.onservicecallback(JSON.stringify({returnValue: true, stdoutString: JSON.stringify({launchPoints: points})})));
				return;
			}
			reads++;
			shellExec(command, {maxBuffer: 200 * 1024}, (error, stdout) => {
				this.onservicecallback(JSON.stringify({returnValue: !error, errorText: error && error.message, stdoutString: stdout}));
			});
		}
	}
	globalThis.window = {PalmServiceBridge: Bridge, setTimeout, clearTimeout};
	const {listApps} = await import(out);
	const first = await listApps(true, true);
	assert.equal(first.source, 'homebrew');
	for (const i of [0, 2]) assert.equal(first.apps[i].iconUrl, `data:image/png;base64,${Buffer.alloc([100000, 200000, 129249][i], i + 1).toString('base64')}`);
	assert.equal(first.apps[1].iconUrl, undefined, 'an oversized icon does not discard icons before or after it');
	assert.equal(reads, 3);
	const second = await listApps(true, true);
	assert.equal(second.apps[2].iconUrl, first.apps[2].iconUrl);
	assert.equal(reads, 4, 'only the failed icon is retried; successful icons stay cached');
	console.log('ok   icon imports survive combined output overflow, isolate oversized files, and reuse the cache');
} finally {
	rmSync(dir, {recursive: true, force: true});
}
