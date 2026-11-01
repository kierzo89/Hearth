/** Load bundled MC360 textures, retaining CSS fallbacks if an asset is unavailable. */
import {setRootVars} from '../lib/cssvars';
export function loadOptionalBladeArtwork (): void {
	const assets = {
		'blade-edge-left': 'blades-size1-left-NF.png',
		'blade-edge-right': 'blades-size1-right-NF.png',
		'blade-edge-active': 'blades-size4-header.png',
		'blade-wash': 'background-overlay-whitewash-centertile-ws.png',
	};
	Object.entries(assets).forEach(([property, file]) => {
		const picture = new Image();
		picture.onload = () => setRootVars({['--' + property]:'url("./mc360/' + file + '")'});
		picture.src = './mc360/' + file;
	});
}
