/* Hearth adapter: keep GOOM's software rendering off the TV UI thread. */
self.window=self;
// Emscripten retains an unused HTML-event target table; resize hooks are disabled.
self.document={};
importScripts('goom.js');
var module=null, samples=new Float32Array(512),sent=null;
var canvas={width:800,height:450,getContext:function(){return {putImageData:function(data,dx,dy,sx,sy,w,h){
  var pixels=new Uint8ClampedArray(w*h*4);
  for(var row=0;row<h;row++)pixels.set(data.data.subarray(((sy+row)*data.width+sx)*4,((sy+row)*data.width+sx+w)*4),row*w*4);
  sent={pixels:pixels.buffer,width:w,height:h};
}};}};
createHearthGoom({canvas:canvas,analyser:{getFloatTimeDomainData:function(target){target.set(samples.subarray(0,target.length));}}}).then(function(m){module=m;postMessage({ready:true});}).catch(function(e){postMessage({error:'GOOM could not start: '+String(e&&e.message||e)});});
onmessage=function(event){if(!module||!event.data.samples)return;samples=new Float32Array(event.data.samples);try{module.render();if(sent){postMessage(sent,[sent.pixels]);sent=null;}}catch(e){postMessage({error:e.message||'GOOM could not render'});}};
