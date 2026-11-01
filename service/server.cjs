'use strict';
// TV-resident music service. Node 8 compatible; credentials never leave the TV.
// InnerTube / TV OAuth are unofficial and may change independently of Hearth.
const fs = require('fs'), path = require('path'), https = require('https'), http = require('http');
const crypto = require('crypto'), zlib = require('zlib'), URL = require('url').URL;
const ROOT = process.env.HEARTH_MUSIC_STATE || '/media/developer/hearth-music';
const PORT = Number(process.env.HEARTH_MUSIC_PORT || 8766);
const TOKEN_FILE = path.join(ROOT, 'pairing-token'), AUTH_FILE = path.join(ROOT, 'account.json');
const CONFIG_FILE = process.env.HEARTH_MUSIC_CONFIG || '/media/developer/hearth-music.json';
const VIDEO = /^[A-Za-z0-9_-]{11}$/, PLAYLIST = /^[A-Za-z0-9_-]{2,160}$/;
const CA = fs.existsSync('/etc/ssl/certs/ca-certificates.crt') ? fs.readFileSync('/etc/ssl/certs/ca-certificates.crt') : undefined;
let account = null, pending = null, pollTimer = null, loginPromise = null, refreshPromise = null;
let clientIdentity = null;
const streams = new Map();
function mkdir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, {mode: 448}); }
function save(file, value) { fs.writeFileSync(file + '.new', JSON.stringify(value), {mode:384}); fs.renameSync(file + '.new', file); }
function load(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; } }
function request(target, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    const url = new URL(target);
    if (url.protocol !== 'https:' || !/(^|\.)youtube\.com$|(^|\.)googleapis\.com$/.test(url.hostname)) return reject(new Error('Unexpected API host'));
    const data = body === undefined ? null : JSON.stringify(body);
    const headers = Object.assign({'User-Agent':'Mozilla/5.0', 'Accept-Language':'en-US', 'Accept-Encoding':'gzip', 'Content-Type':'application/json'}, extraHeaders || {});
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request({hostname:url.hostname, path:url.pathname + url.search, port:443, method:data ? 'POST':'GET', headers:headers, ca:CA}, function(res) {
      let input = res;
      if (res.headers['content-encoding'] === 'gzip') input = res.pipe(zlib.createGunzip());
      const chunks = []; let size = 0;
      input.on('data', function(chunk) { size += chunk.length; if (size > 12 * 1024 * 1024) { req.abort(); reject(new Error('API reply too large')); } else chunks.push(chunk); });
      input.on('error', reject);
      input.on('end', function() {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = JSON.parse(text); } catch (_) {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const err = new Error('YouTube request failed (' + res.statusCode + ')'); err.apiError = json; return reject(err);
        }
        resolve({text:text, json:json, headers:res.headers});
      });
    });
    req.setTimeout(25000, function() { req.abort(); reject(new Error('YouTube request timed out')); });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}
function today() { return new Date().toISOString().slice(0,10).replace(/-/g,''); }
const TV_UA = 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version';
function tvClient() { return {clientName:'TVHTML5',clientVersion:'7.20260707.07.00',hl:'en',gl:'GB',userAgent:TV_UA}; }
function musicClient() { return {clientName:'WEB_REMIX',clientVersion:'1.' + today() + '.01.00',hl:'en',gl:'GB'}; }
function visionClient() { return {clientName:'VISIONOS',clientVersion:'1.02',deviceMake:'Apple',deviceModel:'RealityDevice17,1',userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',osName:'visionOS',osVersion:'26.5.23O471',hl:'en',timeZone:'UTC',utcOffsetMinutes:0}; }
async function api(endpoint, payload, authenticated) {
  const client = authenticated ? tvClient() : musicClient();
  const headers = {'User-Agent':authenticated ? TV_UA : 'Mozilla/5.0', 'Origin':authenticated ? 'https://www.youtube.com' : 'https://music.youtube.com'};
  if (authenticated) {
    await ensureAccount(); headers.Authorization = 'Bearer ' + account.access_token;
    headers['X-Youtube-Client-Name']='7'; headers['X-Youtube-Client-Version']=client.clientVersion;
  }
  const host = authenticated ? 'www.youtube.com' : 'music.youtube.com';
  const response = await request('https://' + host + '/youtubei/v1/' + endpoint + '?prettyPrint=false', Object.assign({context:{client:client,user:{}}},payload), headers);
  if (!response.json || response.json.error) throw new Error('YouTube could not load this music page');
  return response.json;
}
async function getIdentity() {
  if (clientIdentity) return clientIdentity;
  const page = await request('https://www.youtube.com/tv', undefined, {'User-Agent':TV_UA,'Referer':'https://www.youtube.com/tv'});
  const script = /<script\s+id="base-js"\s+src="([^"]+)"[^>]*><\/script>/.exec(page.text);
  if (!script) throw new Error('YouTube TV sign-in has changed. Update the music service.');
  const scriptUrl = new URL(script[1], 'https://www.youtube.com');
  const source = await request(scriptUrl.toString());
  const match = /clientId:"([^"]+)",[^\"]*?:"([^"]+)"/.exec(source.text);
  if (!match) throw new Error('YouTube TV sign-in is unavailable.');
  clientIdentity = {client_id:match[1],client_secret:match[2]};
  return clientIdentity;
}
function publicStatus() {
  return {ready:true, signedIn:!!account, service:'Hearth TV Music', version:2, computerRequired:false,
    auth:pending ? {state:pending.state,userCode:pending.user_code || '',url:pending.verification_url || '',expiresAt:pending.expiresAt || 0,error:pending.error || ''} : null};
}
async function beginLogin() {
  if (pending && pending.state === 'pending' && pending.expiresAt > Date.now()) return publicStatus();
  if (loginPromise) return loginPromise;
  loginPromise = (async function() {
    if (pollTimer) clearTimeout(pollTimer);
    const identity = await getIdentity();
    const response = await request('https://www.youtube.com/o/oauth2/device/code',{client_id:identity.client_id,scope:'http://gdata.youtube.com https://www.googleapis.com/auth/youtube-paid-content',device_id:crypto.randomBytes(16).toString('hex'),device_model:'ytlr::'});
    const code = response.json;
    if (!code || !code.device_code || !code.user_code || !code.verification_url) throw new Error('YouTube did not issue a sign-in code');
    const verification = new URL(code.verification_url);
    if (verification.protocol !== 'https:' || !/(^|\.)(google\.com|youtube\.com)$/.test(verification.hostname)) throw new Error('Unexpected sign-in URL');
    pending = Object.assign({},code,{state:'pending',expiresAt:Date.now() + (code.expires_in || 1800)*1000,interval:Math.max(5,code.interval || 5)});
    pollTimer = setTimeout(pollLogin,pending.interval*1000);
    return publicStatus();
  })();
  try { return await loginPromise; } finally { loginPromise = null; }
}
async function pollLogin() {
  const current = pending;
  if (!current || current.state !== 'pending') return;
  if (Date.now() >= current.expiresAt) { current.state='expired'; current.error='Sign-in code expired. Choose Sign in for a new code.'; return; }
  try {
    const identity = await getIdentity();
    let result;
    try { result = (await request('https://www.youtube.com/o/oauth2/token',Object.assign({},identity,{code:current.device_code,grant_type:'http://oauth.net/grant_type/device/1.0'}))).json; }
    catch (e) { if (!e.apiError) throw e; result=e.apiError; }
    if (pending !== current) return;
    if (result.error) {
      if (result.error === 'slow_down') current.interval+=5;
      else if (result.error !== 'authorization_pending') { current.state='error';current.error='Sign-in was cancelled or expired. Please try again.';return; }
    } else if (result.access_token && result.refresh_token) {
      account=Object.assign({},result,{client:identity,expiresAt:Date.now()+(result.expires_in||3600)*1000});save(AUTH_FILE,account);pending=null;return;
    }
  } catch (_) { /* A temporary network failure must not discard a pending phone sign-in. */ }
  if (pending === current) pollTimer=setTimeout(pollLogin,current.interval*1000);
}
async function ensureAccount() {
  if (!account) throw new Error('Sign in with the code on your TV first.');
  if (account.expiresAt > Date.now()+60000) return;
  if (refreshPromise) return refreshPromise;
  refreshPromise=(async function() {
    const identity=account.client || await getIdentity();
    const result=(await request('https://www.youtube.com/o/oauth2/token',Object.assign({},identity,{refresh_token:account.refresh_token,grant_type:'refresh_token'}))).json;
    if (!result || !result.access_token) throw new Error('Your session expired. Sign in again.');
    account=Object.assign({},account,result,{expiresAt:Date.now()+(result.expires_in||3600)*1000});save(AUTH_FILE,account);
  })();
  try { await refreshPromise; } finally { refreshPromise=null; }
}
async function signOut() {
  if(pollTimer) clearTimeout(pollTimer);pending=null;
  const token=account && account.access_token;account=null;
  try { fs.unlinkSync(AUTH_FILE); } catch (_) {}
  if (token) { try { await request('https://www.youtube.com/o/oauth2/revoke?token='+encodeURIComponent(token),{}); } catch (_) {} }
  return publicStatus();
}
function text(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value.runs)) return value.runs.map(function(r){return r.text || '';}).join('');
  return value.simpleText || value.content || '';
}
function walk(value, visit, depth) {
  if (!value || typeof value !== 'object' || (depth||0)>45) return;
  visit(value);
  Object.keys(value).forEach(function(key){ const child=value[key]; if(child && typeof child==='object') walk(child,visit,(depth||0)+1); });
}
function firstWatch(value) { let id='';walk(value,function(v){if(!id && v.watchEndpoint && VIDEO.test(v.watchEndpoint.videoId || '')) id=v.watchEndpoint.videoId;});return id; }
function firstPlaylist(value) { let id='';walk(value,function(v){const p=v.browseEndpoint && v.browseEndpoint.browseId || v.watchEndpoint && v.watchEndpoint.playlistId;if(!id&&p&&/^(VL|PL|RD|OLAK|LM|LL)/.test(p)) id=p.replace(/^VL/,'');});return id; }
function titleOf(renderer) {
  if (renderer.title) return text(renderer.title);
  if (renderer.flexColumns && renderer.flexColumns[0]) return text((renderer.flexColumns[0].musicResponsiveListItemFlexColumnRenderer || {}).text);
  if (renderer.metadata && renderer.metadata.tileMetadataRenderer) return text(renderer.metadata.tileMetadataRenderer.title);
  if (renderer.header) return text(renderer.header);
  return '';
}
function artworkOf(renderer) {
  let art='';walk(renderer.thumbnail || renderer.thumbnailRenderer || renderer.header || renderer,function(x){if(x.thumbnails && x.thumbnails.length) art=x.thumbnails[x.thumbnails.length-1].url || art;});
  return /^https:\/\//.test(art)?art:'';
}
function parseTracks(data) {
  const result=[], seen={};
  walk(data,function(v){
    const r=v.musicResponsiveListItemRenderer || v.musicTwoRowItemRenderer || v.videoRenderer || v.compactVideoRenderer || v.playlistVideoRenderer || v.playlistPanelVideoRenderer || v.gridVideoRenderer || v.tileRenderer;
    if(!r) return;
    if(v.tileRenderer && r.contentType && r.contentType!=='TILE_CONTENT_TYPE_VIDEO') return;
    const id=r.videoId || firstWatch(r), title=titleOf(r);
    if(!VIDEO.test(id||'') || !title || seen[id]) return;
    seen[id]=true;
    let artist=text(r.shortBylineText || r.ownerText || r.subtitle || r.description);
    if(r.flexColumns && r.flexColumns[1]) artist=text((r.flexColumns[1].musicResponsiveListItemFlexColumnRenderer || {}).text);
    const metadata=r.metadata && r.metadata.tileMetadataRenderer;
    if(!artist && metadata && metadata.lines && metadata.lines[0]) {
      const line=metadata.lines[0].lineRenderer;
      if(line && line.items) artist=line.items.map(function(i){return text((i.lineItemRenderer || {}).text);}).filter(Boolean).join(' · ');
    }
    let art='';walk(r.thumbnail || r.thumbnailRenderer || r,function(x){if(x.thumbnails && x.thumbnails.length) art=x.thumbnails[x.thumbnails.length-1].url || art;});
    let duration=text(r.lengthText); if(r.fixedColumns && r.fixedColumns[0]) duration=text((r.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer || {}).text);
    if(!duration && r.header) walk(r.header,function(v){if(v.thumbnailOverlayTimeStatusRenderer) duration=text(v.thumbnailOverlayTimeStatusRenderer.text);});
    result.push({id:id,title:title.slice(0,200),artist:artist.slice(0,200),duration:duration,artwork:/^https:\/\//.test(art)?art:''});
  });
  return result.slice(0,100);
}
function parsePlaylists(data) {
  const result=[],seen={};
  walk(data,function(v){
    const r=v.musicTwoRowItemRenderer || v.gridPlaylistRenderer || v.playlistRenderer || v.compactPlaylistRenderer || v.tileRenderer;
    if(!r) return;
    if(v.tileRenderer && r.contentType && r.contentType!=='TILE_CONTENT_TYPE_PLAYLIST') return;
    const id=r.playlistId || firstPlaylist(r), title=titleOf(r);
    if(!PLAYLIST.test(id||'') || !title || seen[id]) return;
    seen[id]=true;result.push({id:id,title:title.slice(0,200),count:'',artwork:artworkOf(r)});
  });return result.slice(0,40);
}
function parseSuggestions(data) {
  const result=[],seen=Object.create(null);
  walk(data,function(v){
    const r=v.searchSuggestionRenderer || v.historySuggestionRenderer;
    if(!r)return;
    const endpoint=r.navigationEndpoint && r.navigationEndpoint.searchEndpoint;
    const query=String(endpoint && endpoint.query || text(r.suggestion)).trim().slice(0,120);
    if(query&&!seen[query.toLowerCase()]){seen[query.toLowerCase()]=true;result.push(query);}
  });return result.slice(0,8);
}
async function resolveAudio(id) {
  if(!VIDEO.test(id)) throw new Error('Invalid track ID');
  const known=streams.get(id);if(known&&known.at>Date.now()-1800000)return known;
  const client=visionClient();
  const page=await request('https://www.youtube.com/watch?v='+id);
  const visitor=/"VISITOR_DATA":"([^"]+)"/.exec(page.text), sts=/"STS":(\d+)/.exec(page.text);
  const playback={html5Preference:'HTML5_PREF_WANTS'};if(sts)playback.signatureTimestamp=Number(sts[1]);
  const playerHeaders={'User-Agent':client.userAgent,'X-Youtube-Client-Name':'101','X-Youtube-Client-Version':client.clientVersion,'Origin':'https://www.youtube.com'};if(visitor)playerHeaders['X-Goog-Visitor-Id']=visitor[1];
  const result=(await request('https://www.youtube.com/youtubei/v1/player?prettyPrint=false',{context:{client:client},videoId:id,contentCheckOk:true,racyCheckOk:true,playbackContext:{contentPlaybackContext:playback}},playerHeaders)).json;
  if(!result || !result.streamingData) throw new Error(result && result.playabilityStatus && result.playabilityStatus.reason || 'YouTube did not provide audio for this track');
  const formats=(result.streamingData.adaptiveFormats || []).filter(function(f){return f.url && /^audio\/mp4/.test(f.mimeType||'');}).sort(function(a,b){return (b.bitrate||0)-(a.bitrate||0);});
  if(!formats.length)throw new Error('No TV-compatible audio stream. Try another track.');
  const selected=formats[0], url=new URL(selected.url);
  if(url.protocol!=='https:' || !url.hostname.endsWith('.googlevideo.com'))throw new Error('Unexpected stream host');
  const stream={url:url.toString(),mime:'audio/mp4',userAgent:client.userAgent,at:Date.now()};
  if(streams.size>40)streams.delete(streams.keys().next().value);streams.set(id,stream);return stream;
}
// Decode one song on the TV using its existing GStreamer AAC decoder. Only a
// one-second PCM window reaches the browser; no full-song Web Audio allocation.
let sampleJob=null;
const SAMPLE_RATE=16000, SAMPLE_BYTES=32768, SAMPLE_LIMIT=20*1024*1024;
function stopSamples() {
  const job=sampleJob;sampleJob=null;if(!job)return;
  if(job.timer)clearTimeout(job.timer);if(job.watchdog)clearInterval(job.watchdog);if(job.request)job.request.abort();if(job.decoder)job.decoder.kill();
  [job.input,job.output].forEach(function(file){try{fs.unlinkSync(file);}catch(_){}});
}
function startSamples(id) {
  stopSamples();mkdir(ROOT);
  const tag=crypto.randomBytes(6).toString('hex');
  const job={id:id,input:path.join(ROOT,'samples-'+tag+'.m4a'),output:path.join(ROOT,'samples-'+tag+'.pcm'),error:'',request:null,decoder:null,timer:null,watchdog:null,lastUsed:Date.now()};sampleJob=job;
  job.timer=setTimeout(function(){if(sampleJob===job){job.error='Audio analysis timed out';if(job.request)job.request.abort();if(job.decoder)job.decoder.kill();}},90000);
  resolveAudio(id).then(function(stream){
    if(sampleJob!==job)return;
    const url=new URL(stream.url);
    job.request=https.get({hostname:url.hostname,path:url.pathname+url.search,ca:CA,headers:{'User-Agent':stream.userAgent,Range:'bytes=0-'+(SAMPLE_LIMIT-1)}},function(response){
      const total=Number((/\/(\d+)$/.exec(response.headers['content-range']||'')||[])[1]||response.headers['content-length']);
      if((response.statusCode!==200&&response.statusCode!==206)||!total||total>SAMPLE_LIMIT){response.resume();job.error='This track is too large for the TV visualiser';clearTimeout(job.timer);return;}
      const output=fs.createWriteStream(job.input,{mode:384});let size=0;
      const fail=function(){job.error='Could not prepare audio samples';output.destroy();if(job.request)job.request.abort();clearTimeout(job.timer);};
      response.on('data',function(chunk){size+=chunk.length;if(size>SAMPLE_LIMIT)fail();});response.on('error',fail);output.on('error',fail);
      output.on('finish',function(){
        if(sampleJob!==job||job.error)return;
        fs.closeSync(fs.openSync(job.output,'w',384));
        job.decoder=require('child_process').spawn('/bin/nice',['-n','10','/usr/bin/gst-launch-1.0','-q','filesrc','location='+job.input,'!','qtdemux','!','avdec_aac','!','audioconvert','!','audioresample','!','audio/x-raw,format=S16LE,rate=16000,channels=1','!','filesink','location='+job.output],{stdio:'ignore'});
        job.watchdog=setInterval(function(){try{if(fs.statSync(job.output).size>64*1024*1024){job.error='This track is too long for the TV visualiser';job.decoder.kill();}}catch(_){}},1000);
        job.decoder.on('error',function(){clearInterval(job.watchdog);job.error='The TV audio decoder is unavailable';clearTimeout(job.timer);});
        job.decoder.on('exit',function(code){clearInterval(job.watchdog);clearTimeout(job.timer);if(code!==0&&!job.error)job.error='Audio analysis could not finish';job.decoder=null;try{fs.unlinkSync(job.input);}catch(_){}});
      });response.pipe(output);
    });job.request.setTimeout(20000,function(){job.request.abort();});job.request.on('error',function(){if(!job.error)job.error='Could not download audio for visualisation';clearTimeout(job.timer);});
  }).catch(function(){job.error='Audio samples are unavailable for this song';clearTimeout(job.timer);});
  return job;
}
function samplePosition(id,at) {
  if(!VIDEO.test(id)||!isFinite(at)||at<0||at>21600)throw new Error('Invalid audio sample request');
  return Math.floor(at*SAMPLE_RATE)*2;
}
function audioSamples(res,id,at) {
  const position=samplePosition(id,at),job=sampleJob&&sampleJob.id===id?sampleJob:startSamples(id);
  job.lastUsed=Date.now();if(job.error)throw new Error(job.error);
  let size=0;try{size=fs.statSync(job.output).size;}catch(_){}
  if(size<position+SAMPLE_BYTES){json(res,202,{preparing:true});return;}
  const data=Buffer.alloc(SAMPLE_BYTES),fd=fs.openSync(job.output,'r');try{fs.readSync(fd,data,0,SAMPLE_BYTES,position);}finally{fs.closeSync(fd);}
  cors(res);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':data.length});res.end(data);
}

function cors(res) {res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, Range');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Cache-Control','no-store');}
function json(res,status,data){if(res.headersSent){res.destroy();return;}const body=JSON.stringify(data);cors(res);res.writeHead(status,{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)});res.end(body);}
async function proxyAudio(req,res,id) {
  const stream=await resolveAudio(id),url=new URL(stream.url),headers={'User-Agent':stream.userAgent};
  if(/^bytes=\d*-\d*$/.test(req.headers.range||''))headers.Range=req.headers.range;
  await new Promise(function(resolve,reject){
    const upstream=https.get({hostname:url.hostname,path:url.pathname+url.search,headers:headers,ca:CA},function(source){
      if(source.statusCode!==200&&source.statusCode!==206){source.resume();streams.delete(id);return reject(new Error('YouTube refused this audio stream ('+source.statusCode+'). Try again or choose another track.'));}
      cors(res);res.setHeader('Content-Type',stream.mime);res.setHeader('Accept-Ranges','bytes');
      if(source.headers['content-length'])res.setHeader('Content-Length',source.headers['content-length']);if(source.headers['content-range'])res.setHeader('Content-Range',source.headers['content-range']);
      res.writeHead(source.statusCode);source.pipe(res);source.on('end',resolve);source.on('error',reject);
    });upstream.setTimeout(25000,function(){upstream.abort();reject(new Error('Audio request timed out'));});upstream.on('error',reject);res.on('close',function(){upstream.abort();resolve();});
  });
}
async function handle(req,res,token){
  cors(res);if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const url=new URL(req.url,'http://127.0.0.1:'+PORT), bearer=(req.headers.authorization||'').replace(/^Bearer /,'');
  const supplied=bearer || url.searchParams.get('token') || '';
  if(supplied.length!==token.length || !crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(token))){json(res,401,{error:'Music service pairing required'});return;}
  try {
    let body;
    if(url.pathname==='/status')body=publicStatus();
    else if(url.pathname==='/login'&&req.method==='POST')body=await beginLogin();
    else if(url.pathname==='/logout'&&req.method==='POST')body=await signOut();
    else if(url.pathname==='/search'){
      const q=(url.searchParams.get('q')||'').trim().slice(0,120);if(!q)throw new Error('Enter a song or artist');
      body={tracks:parseTracks(await api('search',{query:q,params:'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D'},false))};
    }else if(url.pathname==='/suggest'){
      const q=(url.searchParams.get('q')||'').trim().slice(0,120);
      body={suggestions:q?parseSuggestions(await api('music/get_search_suggestions',{input:q},false)):[]};
    }else if(url.pathname==='/library'){
      const response=await api('browse',{browseId:'FEplaylist_aggregation'},true);
      body={playlists:parsePlaylists(response)};
    }else if(url.pathname==='/playlist'){
      const id=url.searchParams.get('id')||'';if(!PLAYLIST.test(id))throw new Error('Invalid playlist ID');
      const response=await api('browse',{browseId:'VL'+id},!!account);
      body={title:id==='LM'?'Your liked songs':'Playlist',tracks:parseTracks(response)};
    }else if(url.pathname==='/samples'){audioSamples(res,url.searchParams.get('id')||'',Number(url.searchParams.get('at')));return;}else if(url.pathname==='/audio'){await proxyAudio(req,res,url.searchParams.get('id')||'');return;}
    else {json(res,404,{error:'Unknown music action'});return;}
    json(res,200,body);
  }catch(error){json(res,502,{error:error.message || 'Music request failed'});}
}
function main(){
  mkdir(ROOT);fs.chmodSync(ROOT,448);
  fs.readdirSync(ROOT).filter(function(name){return /^samples-[a-f0-9]+\.(m4a|pcm)$/.test(name);}).forEach(function(name){try{fs.unlinkSync(path.join(ROOT,name));}catch(_){}});
  process.on('SIGTERM',function(){stopSamples();process.exit(0);});
  setInterval(function(){if(sampleJob&&Date.now()-sampleJob.lastUsed>120000)stopSamples();},30000).unref();
  let token;try{token=fs.readFileSync(TOKEN_FILE,'utf8').trim();}catch(_){token=crypto.randomBytes(32).toString('hex');fs.writeFileSync(TOKEN_FILE,token,{mode:384});}
  account=load(AUTH_FILE);save(CONFIG_FILE,{baseUrl:'http://127.0.0.1:'+PORT,token:token});
  const server=http.createServer(function(req,res){handle(req,res,token).catch(function(){json(res,500,{error:'Music service error'});});});
  server.listen(PORT,'127.0.0.1',function(){console.log('Hearth TV music service ready on loopback:'+PORT);});
  server.on('error',function(error){console.error('Music service failed:',error.code);process.exit(1);});
}
if(require.main===module)main();
module.exports={samplePosition:samplePosition,parseTracks:parseTracks,parsePlaylists:parsePlaylists,parseSuggestions:parseSuggestions,resolveAudio:resolveAudio,beginLogin:beginLogin,publicStatus:publicStatus,request:request};
