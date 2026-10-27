/** Locally supplied legacy textures are optional and are never bundled in the public source. */
export function loadOptionalBladeArtwork (): void {
	const assets = {
		'blade-edge-left': 'blades-size1-left-NF.png',
		'blade-edge-right': 'blades-size1-right-NF.png',
		'blade-edge-active': 'blades-size4-header.png',
		'blade-wash': 'background-overlay-whitewash-centertile-ws.png',
	};
	Object.entries(assets).forEach(([property, file]) => {
		const picture = new Image();
		picture.onload = () => document.documentElement.style.setProperty('--' + property, 'url("./mc360/' + file + '")');
		picture.src = './mc360/' + file;
	});
}
