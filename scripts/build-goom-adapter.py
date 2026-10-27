import pathlib,re,urllib.request
# Run from the Hearth repository root; fetch the pinned, unmodified upstream bundle.
import json
sha='a83821017af77077b75a2dae8676967053924fec'
s=urllib.request.urlopen('https://raw.githubusercontent.com/goom-online/goom-online.github.io/'+sha+'/GoomOnline.js').read().decode()
s=s.replace('var Module=typeof Module!="undefined"?Module:{};', 'var Module=options;')
s=s.replace('function getRealWidth(){return Module.canvas.clientWidth}', 'function getRealWidth(){return 800}')
s=s.replace('function getRealHeight(){return Module.canvas.clientHeight}', 'function getRealHeight(){return 450}')
a=s.index('function getVoiceData()');b=s.index('function ExitStatus',a)
s=s[:a]+'function getVoiceData(){Module.analyser.getFloatTimeDomainData(Module.leftVoice);return 1}'+s[b:]
a=s.index('var _emscripten_request_animation_frame_loop=');b=s.index(';var abortOnCannotGrowMemory',a)
s=s[:a]+'var _emscripten_request_animation_frame_loop=(cb,userData)=>{Module.render=function(){getWasmTableEntry(cb)(performance.now(),userData)};return 0}'+s[b:]
a=s.index('var _emscripten_set_canvas_element_size=');b=s.index(';var registerUiEventCallback',a)
s=s[:a]+'var _emscripten_set_canvas_element_size=(target,width,height)=>{Module.canvas.width=width;Module.canvas.height=height;return 0}'+s[b:]
a=s.index('var _emscripten_set_resize_callback_on_thread=');b=s.index(';var runtimeKeepaliveCounter',a)
s=s[:a]+'var _emscripten_set_resize_callback_on_thread=()=>0'+s[b:]
# Bind the module instance without global variables; C main creates the renderer once.
s='window.createHearthGoom=function(options){return new Promise(function(resolve,reject){options.onAbort=reject;options.onRuntimeInitialized=function(){setTimeout(function(){resolve(Module)},0)};'+s+'})};'
pathlib.Path('public/visualizers/goom-adapter-source.js').write_text(s)
# Transpile with: npx esbuild public/visualizers/goom-adapter-source.js --target=chrome53 --minify --outfile=public/visualizers/goom.js
base='https://raw.githubusercontent.com/goom-online/goom-online.github.io/'+sha+'/'
pathlib.Path('public/licenses/goom-LGPL.txt').write_bytes(urllib.request.urlopen(base+'ext/goom2k4-0-nologo/COPYING').read())
