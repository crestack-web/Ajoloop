/**
 * UI layer — DOM rendering and input. Depends on engine globals (G, FX, Store, …).
 */
import { loadEngine } from '../engine/index.js';
import api from '../data/client.js';

loadEngine();

// --- UI (from original app) ---
/* ============ UI ============ */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const app=document.getElementById('app');

const CIRCLE_GAMES_UI=[
  {id:'lucky',ic:'🎯',n:'Lucky Number',d:'Everyone picks 1–10. Closest to the secret number wins.'},
  {id:'rps',ic:'✊',n:'Rock · Paper · Scissors',d:'Best of three against the circle — simultaneous throw.'},
  {id:'who',ic:'🕵️',n:"Who's Who?",d:'Guess which member matches the clue.'},
  {id:'emoji',ic:'😎',n:'Emoji Match',d:'Pick the emoji that fits the prompt before others.'},
  {id:'scramble',ic:'🔤',n:'Word Scramble',d:'Unscramble a Kano / circle word together.'}
];
function circleGamesCatalog(){return (typeof CIRCLE_GAMES!=='undefined'&&CIRCLE_GAMES.length)?CIRCLE_GAMES:(window.CIRCLE_GAMES||CIRCLE_GAMES_UI)}


/* —— Onboarding intro audio —— */
const INTRO_AUDIO_SRC='/build-your-circle.mp3';
let _introAudio=null;
function getIntroMuted(){
  try{return localStorage.getItem('ajoloop_intro_muted')==='1'}catch(e){return false}
}
function setIntroMuted(m){
  try{localStorage.setItem('ajoloop_intro_muted',m?'1':'0')}catch(e){}
  UI.introMuted=!!m;
  if(_introAudio) _introAudio.muted=!!m;
}
function stopIntroAudio(){
  try{
    if(_introAudio){_introAudio.pause();_introAudio.currentTime=0}
  }catch(e){}
}
function playIntroAudio(){
  if(typeof G!=='undefined'&&G&&G.p) return; // only for pre-login onboarding
  try{
    if(!_introAudio){
      _introAudio=new Audio(INTRO_AUDIO_SRC);
      _introAudio.loop=false;
      _introAudio.preload='auto';
      _introAudio.volume=0.7;
    }
    _introAudio.muted=!!(UI.introMuted!=null?UI.introMuted:getIntroMuted());
    const p=_introAudio.play();
    if(p&&p.catch) p.catch(()=>{/* autoplay blocked until user taps */});
  }catch(e){}
}

const UI={tab:'life',modal:null,form:{name:'',username:'',age:24,gender:'Male',interests:[],businessStatus:''},regStep:1,authMode:null,ajoNew:{name:'Kano Hustlers',size:5,amt:5000,freq:7,purpose:'general'},acat:'',more:'ledger',prog:0,confirmReset:false,townMode:'map',peopleFilter:'all',ajoTab:'home',ajoChat:'',avForm:null,avCat:'skin',mapPin:null,homeForm:{area:'Fagge',label:'',style:'compound'},bizForm:{name:'',cat:'Provisions',area:'Fagge',label:'',bio:''},spotForm:{name:'',area:'Fagge',label:'',ic:'📍',note:'',loc:'market',img:'',lat:null,lng:null,address:''},chatWith:null,chatText:'',gi:{msg:'',pollOpen:false,pollQ:'',pollOpts:['','','']},gc:{av:'🏘️',cat:'Friends & Family',tags:[],vis:'public',disc:false,join:'open',memInvite:'members',maxMembers:30},ge:{kind:'meetup',loc:'restaurant',off:1,type:'talk',target:10,dur:7},gs:null,gp:{size:5,amt:5000,freq:7},gl:{ttl:7,max:10},gt:'home',gcat:'',gconf:null,gsel:[],treatForm:{biz:null,product:null,friend:null,note:'',mode:'request'}};
const col=v=>v>=65?'#22c177':v>=35?'#ffc928':'#ff5a6b';
const colH=v=>v<=35?'#22c177':v<=65?'#ffc928':'#ff5a6b';
const bar=(v,c)=>`<div class="bar"><i style="width:${Math.round(v)}%;background:${c}"></i></div>`;
const trustTier=v=>v>=85?'Rock solid':v>=65?'Reliable':v>=45?'Fair':v>=25?'Shaky':'Not trusted';
const repTier=v=>v>=85?'Big name':v>=65?'Respected':v>=45?'Known':v>=25?'Doubted':'Disliked';
const relLabel=n=>n.rel>=80?'Trusted Friend':n.rel>=60?'Friend':n.rel>=35?(n.tags.some(t=>['ambitious','wealthy','opportunistic'].includes(t))?'Business Contact':'Acquaintance'):'Low Trust';
const titleFor=()=>{const s=(G.p.trust+G.p.rep)/2+Math.min(20,netWorth()/5000);return s>=85?'Community Pillar':s>=68?'Trusted Name':s>=50?'Known Face':'Street Hustler'};

/* —— Original character avatar (African-inspired, not a third-party style copy) —— */
const AV={
 skin:[{id:'s1',c:'#2c1810',n:'Deep ebony'},{id:'s2',c:'#3d2314',n:'Espresso'},{id:'s3',c:'#5c3317',n:'Mahogany'},{id:'s4',c:'#7a4a22',n:'Cocoa'},{id:'s5',c:'#a67c52',n:'Caramel'},{id:'s6',c:'#c4a574',n:'Honey'},{id:'s7',c:'#d4b896',n:'Golden'},{id:'s8',c:'#e8c4a0',n:'Sand'}],
 hair:[{id:'bald',n:'Bald'},{id:'short',n:'Short'},{id:'fade',n:'Fade'},{id:'afro',n:'Afro'},{id:'afropuff',n:'Afro puff'},{id:'twist',n:'Twists'},{id:'locs',n:'Locs'},{id:'braids',n:'Braids'},{id:'longbraids',n:'Long braids'},{id:'cornrows',n:'Cornrows'},{id:'curly',n:'Curly'},{id:'bun',n:'Bun'},{id:'weave',n:'Long weave'},{id:'gele',n:'Gele'},{id:'headwrap',n:'Headwrap'},{id:'kufi',n:'Kufi'},{id:'long',n:'Long'}],
 hairColor:[{id:'black',c:'#1a1a1a',n:'Black'},{id:'darkbrown',c:'#3b2314',n:'Dark brown'},{id:'brown',c:'#6b4423',n:'Brown'},{id:'auburn',c:'#8b4513',n:'Auburn'},{id:'grey',c:'#8a8a8a',n:'Grey'}],
 face:[{id:'oval',n:'Oval'},{id:'round',n:'Round'},{id:'square',n:'Square'},{id:'heart',n:'Heart'}],
 eyes:[{id:'almond',n:'Almond'},{id:'round',n:'Round'},{id:'hooded',n:'Hooded'}],
 brows:[{id:'full',n:'Full'},{id:'arched',n:'Arched'},{id:'soft',n:'Soft'}],
 nose:[{id:'broad',n:'Broad'},{id:'medium',n:'Medium'},{id:'button',n:'Soft'}],
 mouth:[{id:'full',n:'Full'},{id:'smile',n:'Smile'},{id:'neutral',n:'Calm'}],
 facial:[{id:'none',n:'None'},{id:'beard',n:'Beard'},{id:'mustache',n:'Mustache'},{id:'goatee',n:'Goatee'}],
 accessory:[{id:'none',n:'None'},{id:'earrings',n:'Studs'},{id:'hoops',n:'Hoops'},{id:'necklace',n:'Bead necklace'},{id:'glasses',n:'Glasses'}],
 top:[{id:'tee',n:'Tee',c:'#4a3f8c'},{id:'dashiki',n:'Dashiki',c:'#c9a227'},{id:'kaftan',n:'Kaftan',c:'#2d6a4f'},{id:'blouse',n:'Blouse',c:'#9b2226'},{id:'ankara',n:'Ankara',c:'#e85d04'},{id:'gown',n:'Gown',c:'#7209b7'},{id:'wrapper',n:'Wrapper',c:'#0077b6'},{id:'hoodie',n:'Hoodie',c:'#1d3557'}]
};
function avPart(a,k,fallback){const v=(a&&a[k])||fallback;return v}
function skinC(a){const s=AV.skin.find(x=>x.id===avPart(a,'skin','s3'));return s?s.c:'#5c3317'}
function hairC(a){const s=AV.hairColor.find(x=>x.id===avPart(a,'hairColor','black'));return s?s.c:'#1a1a1a'}
function topC(a){const s=AV.top.find(x=>x.id===avPart(a,'top','dashiki'));return s?s.c:'#c9a227'}

function renderAvatar(a,size){
  a=a||(G&&G.p&&G.p.avatar)||defaultAvatar('Female');
  const gender=a.gender||(G&&G.p&&G.p.gender)||'Female';
  const fem=gender==='Female';
  const sz=size||48, skin=skinC(a), hc=hairC(a), tc=topC(a);
  const face=avPart(a,'face',fem?'heart':'oval'), hair=avPart(a,'hair',fem?'braids':'fade'), eyes=avPart(a,'eyes','almond');
  const brows=avPart(a,'brows',fem?'arched':'full'), nose=avPart(a,'nose','medium'), mouth=avPart(a,'mouth',fem?'full':'smile');
  const facial=fem?'none':avPart(a,'facial','none'), acc=avPart(a,'accessory',fem?'hoops':'none');
  // Face — softer / narrower chin for women
  const facePath=fem?{
    oval:'M50 26 C72 26 84 46 84 60 C84 80 66 94 50 94 C34 94 16 80 16 60 C16 46 28 26 50 26Z',
    round:'M50 28 C74 28 86 48 86 64 C86 84 68 96 50 96 C32 96 14 84 14 64 C14 48 26 28 50 28Z',
    square:'M26 32 H74 V76 Q74 92 50 94 Q26 92 26 76Z',
    heart:'M50 26 C70 26 84 40 84 56 C84 78 62 94 50 94 C38 94 16 78 16 56 C16 40 30 26 50 26Z'
  }[face]:{
    oval:'M50 28 C70 28 82 48 82 62 C82 82 68 92 50 92 C32 92 18 82 18 62 C18 48 30 28 50 28Z',
    round:'M50 30 C72 30 84 48 84 64 C84 84 68 94 50 94 C32 94 16 84 16 64 C16 48 28 30 50 30Z',
    square:'M24 34 H76 V78 Q76 90 50 90 Q24 90 24 78Z',
    heart:'M50 30 C68 30 82 42 82 58 C82 78 60 92 50 92 C40 92 18 78 18 58 C18 42 32 30 50 30Z'
  }[face];
  let hairSvg='';
  if(hair==='afro') hairSvg=`<ellipse cx="50" cy="38" rx="${fem?40:38}" ry="${fem?38:36}" fill="${hc}"/><ellipse cx="20" cy="48" rx="15" ry="17" fill="${hc}"/><ellipse cx="80" cy="48" rx="15" ry="17" fill="${hc}"/>`;
  else if(hair==='afropuff') hairSvg=`<ellipse cx="50" cy="20" rx="22" ry="20" fill="${hc}"/><path d="M30 40 Q50 28 70 40" fill="${hc}"/><circle cx="50" cy="36" r="6" fill="${skin}"/>`;
  else if(hair==='locs') hairSvg=`<path d="M20 40 Q18 70 22 88 M30 32 Q28 75 32 90 M40 28 Q40 80 42 92 M50 26 Q50 82 50 92 M60 28 Q60 80 58 92 M70 32 Q72 75 68 90 M80 40 Q82 70 78 88" stroke="${hc}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  else if(hair==='braids') hairSvg=`<path d="M28 36 Q26 70 24 88 M36 30 Q34 72 32 90 M44 28 Q44 74 42 90 M56 28 Q56 74 58 90 M64 30 Q66 72 68 90 M72 36 Q74 70 76 88" stroke="${hc}" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="24" cy="90" r="3" fill="${hc}"/><circle cx="76" cy="90" r="3" fill="${hc}"/>`;
  else if(hair==='longbraids') hairSvg=`<path d="M26 36 Q20 75 18 105 M34 30 Q28 80 26 108 M42 28 Q40 85 38 110 M58 28 Q60 85 62 110 M66 30 Q72 80 74 108 M74 36 Q80 75 82 105" stroke="${hc}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="18" cy="105" r="3.5" fill="#c9a227"/><circle cx="82" cy="105" r="3.5" fill="#c9a227"/><path d="M28 34 Q50 18 72 34" fill="${hc}"/>`;
  else if(hair==='cornrows') hairSvg=`<path d="M30 32 L28 70 M40 28 L40 72 M50 26 L50 74 M60 28 L60 72 M70 32 L72 70" stroke="${hc}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  else if(hair==='twist') hairSvg=`<path d="M26 38 Q30 50 26 62 Q30 74 26 85 M38 32 Q42 50 38 68 Q42 80 38 90 M50 30 Q54 55 50 78 M62 32 Q58 50 62 68 Q58 80 62 90 M74 38 Q70 50 74 62 Q70 74 74 85" stroke="${hc}" stroke-width="4" fill="none"/>`;
  else if(hair==='curly') hairSvg=`<circle cx="28" cy="36" r="10" fill="${hc}"/><circle cx="42" cy="28" r="11" fill="${hc}"/><circle cx="58" cy="28" r="11" fill="${hc}"/><circle cx="72" cy="36" r="10" fill="${hc}"/><circle cx="22" cy="52" r="8" fill="${hc}"/><circle cx="78" cy="52" r="8" fill="${hc}"/><path d="M30 40 Q50 24 70 40" fill="${hc}"/>`;
  else if(hair==='weave') hairSvg=`<path d="M18 42 Q14 90 22 110 H40 Q32 70 34 42 M82 42 Q86 90 78 110 H60 Q68 70 66 42" fill="${hc}"/><path d="M26 32 Q50 14 74 32 L72 42 Q50 28 28 42Z" fill="${hc}"/>`;
  else if(hair==='bun') hairSvg=`<ellipse cx="50" cy="20" rx="17" ry="15" fill="${hc}"/><path d="M28 40 Q50 26 72 40" fill="${hc}"/>`;
  else if(hair==='gele') hairSvg=`<path d="M14 50 Q50 4 86 50 L80 54 Q50 18 20 54Z" fill="#c9a227"/><path d="M20 48 Q50 14 80 48" fill="#e8c547"/><path d="M28 44 Q50 26 72 44" fill="#9b2226"/><path d="M36 40 Q50 30 64 40" fill="#fff" fill-opacity=".35"/>`;
  else if(hair==='headwrap') hairSvg=`<path d="M18 46 Q50 12 82 46 L76 52 Q50 28 24 52Z" fill="#7209b7"/><path d="M24 46 Q50 22 76 46" fill="#f72585"/><ellipse cx="50" cy="40" rx="8" ry="5" fill="#c9a227"/>`;
  else if(hair==='kufi') hairSvg=`<ellipse cx="50" cy="36" rx="28" ry="10" fill="#1d3557"/><rect x="24" y="36" width="52" height="14" rx="2" fill="#2d6a4f"/><path d="M24 42 H76" stroke="#c9a227" stroke-width="2"/>`;
  else if(hair==='long') hairSvg=`<path d="M22 42 Q18 85 28 105 H42 Q36 70 38 45 M78 42 Q82 85 72 105 H58 Q64 70 62 45" fill="${hc}"/><path d="M26 34 Q50 18 74 34" fill="${hc}"/>`;
  else if(hair==='fade') hairSvg=`<path d="M26 48 Q28 32 50 26 Q72 32 74 48 L72 52 Q50 34 28 52Z" fill="${hc}"/>`;
  else if(hair==='short') hairSvg=`<path d="M28 46 Q32 30 50 28 Q68 30 72 46 Q50 36 28 46Z" fill="${hc}"/>`;
  // Eyes — slightly larger + lashes for women
  let eyeSvg='';
  const er=fem?1.15:1;
  if(eyes==='round') eyeSvg=`<ellipse cx="38" cy="56" rx="${5*er}" ry="${5.5*er}" fill="#1a1a1a"/><ellipse cx="62" cy="56" rx="${5*er}" ry="${5.5*er}" fill="#1a1a1a"/><circle cx="39.5" cy="54.5" r="1.5" fill="#fff"/><circle cx="63.5" cy="54.5" r="1.5" fill="#fff"/>`;
  else if(eyes==='hooded') eyeSvg=`<path d="M32 54 Q38 50 44 54" stroke="#1a1a1a" stroke-width="2.5" fill="none"/><path d="M56 54 Q62 50 68 54" stroke="#1a1a1a" stroke-width="2.5" fill="none"/><ellipse cx="38" cy="56" rx="4" ry="3" fill="#1a1a1a"/><ellipse cx="62" cy="56" rx="4" ry="3" fill="#1a1a1a"/>`;
  else eyeSvg=`<ellipse cx="38" cy="56" rx="${6*er}" ry="${4.2*er}" fill="#1a1a1a"/><ellipse cx="62" cy="56" rx="${6*er}" ry="${4.2*er}" fill="#1a1a1a"/><circle cx="40" cy="55" r="1.4" fill="#fff"/><circle cx="64" cy="55" r="1.4" fill="#fff"/>`;
  if(fem) eyeSvg+=`<path d="M31 54 L28 51 M33 53 L31 49 M44 53 L46 49" stroke="#1a1a1a" stroke-width="1.2" fill="none"/><path d="M69 54 L72 51 M67 53 L69 49 M56 53 L54 49" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>`;
  let browSvg= brows==='arched'
    ? `<path d="M30 48 Q38 44 46 48" stroke="#1a1a1a" stroke-width="${fem?2:2.2}" fill="none"/><path d="M54 48 Q62 44 70 48" stroke="#1a1a1a" stroke-width="${fem?2:2.2}" fill="none"/>`
    : brows==='soft'
    ? `<path d="M31 49 Q38 47 45 49" stroke="#1a1a1a" stroke-width="1.8" fill="none"/><path d="M55 49 Q62 47 69 49" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>`
    : `<path d="M30 49 L46 48" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round"/><path d="M54 48 L70 49" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round"/>`;
  let noseSvg= nose==='broad'
    ? `<path d="M50 58 L44 70 H56 Z" fill="${skin}" stroke="#000" stroke-opacity=".15" stroke-width="1"/><ellipse cx="45" cy="70" rx="3" ry="2" fill="#000" fill-opacity=".12"/><ellipse cx="55" cy="70" rx="3" ry="2" fill="#000" fill-opacity=".12"/>`
    : nose==='button'
    ? `<ellipse cx="50" cy="66" rx="4" ry="3.5" fill="${skin}" stroke="#000" stroke-opacity=".12"/>`
    : `<path d="M50 60 L47 70 H53 Z" fill="${skin}" stroke="#000" stroke-opacity=".12" stroke-width="1"/>`;
  let mouthSvg= mouth==='smile'
    ? `<path d="M40 76 Q50 84 60 76" stroke="#5c1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    : mouth==='neutral'
    ? `<path d="M42 78 H58" stroke="#5c1a1a" stroke-width="2.2" stroke-linecap="round"/>`
    : `<path d="M40 76 Q50 86 60 76 Q50 82 40 76Z" fill="#8b2942"/>`;
  let facialSvg='';
  if(facial==='beard') facialSvg=`<path d="M28 70 Q32 95 50 98 Q68 95 72 70 Q60 88 50 90 Q40 88 28 70Z" fill="${hc}" fill-opacity=".9"/>`;
  if(facial==='mustache') facialSvg=`<path d="M38 74 Q50 80 62 74" stroke="${hc}" stroke-width="3" fill="none"/>`;
  if(facial==='goatee') facialSvg=`<path d="M44 80 Q50 94 56 80" fill="${hc}"/>`;
  let accSvg='';
  if(acc==='hoops') accSvg=`<circle cx="16" cy="60" r="7" fill="none" stroke="#c9a227" stroke-width="2.5"/><circle cx="84" cy="60" r="7" fill="none" stroke="#c9a227" stroke-width="2.5"/>`;
  if(acc==='earrings') accSvg=`<circle cx="16" cy="62" r="3.5" fill="#c9a227"/><circle cx="84" cy="62" r="3.5" fill="#c9a227"/>`;
  if(acc==='necklace') accSvg=`<path d="M32 92 Q50 104 68 92" stroke="#c9a227" stroke-width="2.5" fill="none"/><circle cx="50" cy="102" r="3.5" fill="#e8c547"/>`;
  if(acc==='glasses') accSvg=`<circle cx="38" cy="56" r="9" fill="none" stroke="#1a1a1a" stroke-width="2"/><circle cx="62" cy="56" r="9" fill="none" stroke="#1a1a1a" stroke-width="2"/><path d="M47 56 H53" stroke="#1a1a1a" stroke-width="2"/>`;
  // Shoulders — slightly narrower for women
  const topSvg=fem
    ? `<path d="M14 100 Q22 86 36 88 L50 90 L64 88 Q78 86 86 100 L86 110 H14Z" fill="${tc}"/><path d="M42 88 L50 98 L58 88" fill="${skin}"/>`
    : `<path d="M10 100 Q20 88 35 90 L50 92 L65 90 Q80 88 90 100 L90 110 H10Z" fill="${tc}"/><path d="M40 90 L50 100 L60 90" fill="${skin}"/>`;

  return `<svg class="av-svg" width="${sz}" height="${sz}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${hairSvg}<path d="${facePath}" fill="${skin}"/><path d="M16 60 Q10 68 16 76" fill="${skin}"/><path d="M84 60 Q90 68 84 76" fill="${skin}"/>${browSvg}${eyeSvg}${noseSvg}${facialSvg}${mouthSvg}${accSvg}${topSvg}</svg>`;
}
function avatar(g){
  // Prefer player custom avatar when rendering player
  if(G&&G.p&&G.p.avatar) return renderAvatar(G.p.avatar,40);
  return g==='Female'?'👩🏾':g==='Male'?'👨🏾':'🧑🏾';
}
function playerAvatar(sz){return renderAvatar((G&&G.p&&G.p.avatar)||defaultAvatar(G&&G.p&&G.p.gender),sz||48)}

const STORE_WALLS={cream:'#e8dcc8',sand:'#c4a574',red:'#c45c48',blue:'#4a6fa5',green:'#3d8b6e',yellow:'#d4a017',white:'#f0ebe3'};
const STORE_ROOF={tin:'#8a9ba8',flat:'#5c5346',awning:'#c45c48'};
function renderStoreBuilding(a,size){
  a=a||defaultStoreAvatar('Other');
  if(!a||a.kind!=='building') a=defaultStoreAvatar('Other');
  const sz=size||48;
  const wall=STORE_WALLS[a.wall]||STORE_WALLS.cream;
  const roof=STORE_ROOF[a.roof]||STORE_ROOF.tin;
  const style=a.style||'shop';
  const sign=a.sign||'board';
  const door=a.door||'open';
  const win=a.window!==false;
  let body='';
  if(style==='stall'){
    body=`<rect x="12" y="48" width="76" height="50" rx="3" fill="${wall}"/>
      <path d="M8 48 L50 28 L92 48" fill="${roof}"/>
      <rect x="8" y="48" width="84" height="6" fill="${roof}"/>`;
  } else if(style==='kiosk'){
    body=`<rect x="22" y="40" width="56" height="58" rx="4" fill="${wall}"/>
      <rect x="18" y="36" width="64" height="10" rx="2" fill="${roof}"/>
      <rect x="20" y="32" width="60" height="6" fill="${roof}" opacity=".85"/>`;
  } else if(style==='container'){
    body=`<rect x="10" y="42" width="80" height="56" rx="2" fill="${wall}"/>
      <rect x="10" y="42" width="80" height="8" fill="${roof}"/>
      <line x1="50" y1="50" x2="50" y2="98" stroke="#000" stroke-opacity=".15" stroke-width="2"/>`;
  } else if(style==='boutique'){
    body=`<rect x="14" y="38" width="72" height="60" rx="2" fill="${wall}"/>
      <rect x="10" y="34" width="80" height="8" fill="${roof}"/>
      <rect x="18" y="28" width="64" height="8" fill="${roof}" opacity=".9"/>`;
  } else {
    body=`<rect x="12" y="40" width="76" height="58" rx="2" fill="${wall}"/>
      <path d="M8 40 L50 18 L92 40" fill="${roof}"/>
      <rect x="8" y="40" width="84" height="5" fill="${roof}"/>`;
  }
  let doorSvg='';
  if(door==='open')
    doorSvg=`<rect x="40" y="62" width="20" height="36" fill="#2a1f14"/><rect x="42" y="64" width="8" height="32" fill="#1a120c" opacity=".5"/>`;
  else if(door==='curtain')
    doorSvg=`<rect x="40" y="62" width="20" height="36" fill="#6b3a5c"/><path d="M40 62 Q45 80 40 98 M50 62 Q55 80 50 98 M60 62 Q55 80 60 98" stroke="#4a2840" stroke-width="2" fill="none"/>`;
  else
    doorSvg=`<rect x="40" y="62" width="20" height="36" rx="1" fill="#5c4030"/><circle cx="56" cy="80" r="1.5" fill="#c9a227"/>`;
  let winSvg='';
  if(win){
    winSvg=`<rect x="18" y="58" width="16" height="14" rx="1" fill="#87ceeb" stroke="#333" stroke-width="1.2" opacity=".9"/>
      <rect x="66" y="58" width="16" height="14" rx="1" fill="#87ceeb" stroke="#333" stroke-width="1.2" opacity=".9"/>
      <line x1="26" y1="58" x2="26" y2="72" stroke="#333" stroke-width="1"/><line x1="18" y1="65" x2="34" y2="65" stroke="#333" stroke-width="1"/>
      <line x1="74" y1="58" x2="74" y2="72" stroke="#333" stroke-width="1"/><line x1="66" y1="65" x2="82" y2="65" stroke="#333" stroke-width="1"/>`;
  }
  let signSvg='';
  if(sign==='board')
    signSvg=`<rect x="28" y="44" width="44" height="12" rx="2" fill="#2a2272" stroke="#c9a227" stroke-width="1.5"/>
      <rect x="30" y="46" width="40" height="8" rx="1" fill="#17123f"/>`;
  else if(sign==='painted')
    signSvg=`<rect x="24" y="46" width="52" height="10" rx="1" fill="#c9a227" opacity=".9"/>`;
  const ground=`<rect x="4" y="98" width="92" height="6" rx="1" fill="#3d3558" opacity=".5"/>`;
  return `<svg class="av-svg store-bld" width="${sz}" height="${sz}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}${winSvg}${doorSvg}${signSvg}${ground}</svg>`;
}
function renderBizFace(b,size){
  if(!b) return '🏪';
  const a=(b.avatar&&b.avatar.kind==='building')?b.avatar:(typeof storeAvatarFromBiz==='function'?storeAvatarFromBiz(b):defaultStoreAvatar(b.cat||'Other'));
  return renderStoreBuilding(a,size||48);
}

function gFace(g,sz){
  if(g&&g.photo) return `<img class="g-photo" src="${g.photo}" alt="" width="${sz||40}" height="${sz||40}">`;
  return `<span>${(g&&g.av)||'🏘️'}</span>`;
}


async function boot(){
  try{if(typeof api!=='undefined'&&api.init) await api.init()}catch(e){console.warn('api.init',e)}
  let s=await Store.load();
  try{
    if(typeof api!=='undefined'&&api.online){
      const session=await api.getSession();
      if(session){
        await api.hydrateCloud();
        const remote=await api.pullState();
        if(remote&&remote.p){s=remote}
      }
    }
  }catch(e){console.warn('cloud pull',e)}
  if(s&&s.p){G=s;migrate()}
  try{
    if(typeof api!=='undefined'&&api.online&&api.userId&&G){
      await api.hydrateCloud();
    }
  }catch(e){console.warn('post-boot hydrate',e)}
  deepLink();render();
  setInterval(()=>{if(!G||G.ev||UI.modal)return;UI.prog++;const hb=document.getElementById('hb');if(hb)hb.style.width=(UI.prog/60*100)+'%';if(UI.prog>=60){UI.prog=0;tick(1);commit()}},1000)
}
function commit(){
  Store.save();
  try{
    if(typeof api!=='undefined'&&api.online&&typeof G!=='undefined'&&G){
      api.schedulePush(G);
    }
  }catch(e){}
  render();
}

function render(){
 if(!G){
  if(UI.introMuted==null) UI.introMuted=getIntroMuted();
  // Allow avatar builder during registration (before game state exists)
  if(UI.modal&&UI.modal.t==='avatar'){
    app.innerHTML=`<div class="title auth-simple" style="padding-bottom:24px">${avatarSheet(!!UI.modal.create)}</div>`;
    flush();
    return;
  }
  app.innerHTML=createView();
  requestAnimationFrame(()=>{playIntroAudio()});
  return
 }
 stopIntroAudio();
 // Full-page chat (WhatsApp-style) — no bottom nav clutter
 if(UI.modal&&UI.modal.t==='ajoChat'){
  app.innerHTML=ajoChatPage(ajoOf(UI.modal.id));
  const log=document.getElementById('wa-log');
  if(log)log.scrollTop=log.scrollHeight;
  flush();return;
 }
 if(UI.modal&&UI.modal.t==='dmChat'){
  app.innerHTML=dmChatPage(UI.modal.id);
  const log=document.getElementById('wa-log');
  if(log)log.scrollTop=log.scrollHeight;
  flush();return;
 }
 if(UI.modal&&UI.modal.t==='grpChat'){
  app.innerHTML=groupChatPage(UI.modal.id);
  const log=document.getElementById('wa-log');
  if(log)log.scrollTop=log.scrollHeight;
  flush();return;
 }
 const sc0=document.getElementById('sheet'),st0=sc0?sc0.scrollTop:0;
 destroyLiveMaps();
 app.innerHTML=hud()+'<main>'+({life:lifeView,town:townView,people:peopleView,groups:groupsView,ajo:ajoView,more:moreView}[UI.tab])()+'</main>'+navHtml()+sheetHtml();
 if(st0){const s1=document.getElementById('sheet');if(s1)s1.scrollTop=st0}
 flush();
 requestAnimationFrame(()=>{mountLiveMap();mountSpotPicker();mountHomePicker();bindSpotPhotoUpload()});
}

function createView(){
  const acc=typeof Account!=='undefined'?Account.load():null;
  // Returning user — simple social-style continue
  if(acc&&acc.username&&UI.authMode!=='register'){
    const face=acc.avatar?renderAvatar(acc.avatar,88):renderAvatar(defaultAvatar(acc.gender||'Male'),88);
    return `<div class="title auth-simple">
<img class="logo-hero" src="/logo.png" alt="AjoLoop" width="240" height="auto">
${`<button type="button" class="intro-mute" data-a="introMute" aria-label="${UI.introMuted?'Unmute intro':'Mute intro'}">${UI.introMuted?'🔇 Intro muted':'🔊 Intro playing'}</button>`}
<h1>Welcome back</h1>
<p class="muted">Meet people · share experiences · build trust · support your circle.</p>
<div class="card flat auth-card">
  <div class="av-preview">${face}</div>
  <div class="auth-user">@${esc(acc.username)}</div>
  <div class="muted sm" style="text-align:center;margin-top:4px">${esc(acc.name||acc.username)}</div>
  <button class="btn" data-a="loginContinue" style="margin-top:16px">Continue</button>
  <button class="btn ghost sm" data-a="authRegister" style="margin-top:10px;display:block;width:100%">Create a new account</button>
  <a class="btn ghost sm" href="/welcome.html" style="margin-top:10px;display:block;width:100%;text-align:center;text-decoration:none">Our story · Welcome</a>
</div>
<div class="card flat auth-card" style="margin-top:14px">
  <div class="muted sm" style="margin-bottom:4px;text-align:center">Or sign in with email</div>
  <label class="l">Email</label>
  <div class="field"><input type="email" id="f-email" autocomplete="email" placeholder="you@email.com"></div>
  <label class="l">Password</label>
  <div class="field"><input type="password" id="f-password" autocomplete="current-password" placeholder="••••••••"></div>
  <button class="btn" data-a="onlineLogin" style="margin-top:14px;width:100%">Sign in</button>
</div>
</div>`;
  }
  // First-time / register wizard
  const f=UI.form;const step=UI.regStep||1;
  const prev=UI.avForm||defaultAvatar(f.gender);
  const ints=typeof INTERESTS!=='undefined'?INTERESTS:['Trade & market','Food & kitchen','Fashion','Business networking','Neighbourhood','Learning'];
  const statuses=typeof BIZ_STATUS!=='undefined'?BIZ_STATUS:[
    {id:'owner',n:'I run a business',ic:'🏪'},{id:'worker',n:'I work for someone',ic:'💼'},
    {id:'student',n:'I am a student',ic:'📚'},{id:'seeking',n:'Looking for work',ic:'🔎'},{id:'none',n:'Not working right now',ic:'🙂'}
  ];
  const dots=[1,2,3,4].map(s=>`<i class="reg-dot ${step===s?'on':(step>s?'done':'')}"></i>`).join('');
  let body='';
  if(step===1){
    body=`<h2 class="reg-h">Create your account</h2>
      <p class="muted sm reg-sub">Pick a username people will know you by.</p>
      <label class="l">Username</label>
      <div class="field"><input type="text" id="f-username" maxlength="20" placeholder="e.g. abubakar_kano" value="${esc(f.username||'')}" autocomplete="username" autocapitalize="off"></div>
      <div class="muted tiny">Letters, numbers, underscore — no spaces.</div>
      <label class="l">Display name</label>
      <div class="field"><input type="text" id="f-name" maxlength="20" placeholder="e.g. Abubakar" value="${esc(f.name||'')}" autocomplete="nickname"></div>
      ${(typeof api!=='undefined'&&api.online)?`<label class="l">Email</label>
      <div class="field"><input type="email" id="f-email" value="${esc(f.email||'')}" autocomplete="email" placeholder="you@email.com"></div>
      <label class="l">Password</label>
      <div class="field"><input type="password" id="f-password" autocomplete="new-password" placeholder="At least 6 characters"></div>
      <div class="muted tiny" style="margin-bottom:8px">Used to sign in and sync your progress.</div>`:''}
      <label class="l">Age</label>
      <div class="field"><input type="number" id="f-age" min="18" max="60" value="${f.age||24}"></div>
      <label class="l">I am</label>
      <div class="opts">${['Male','Female','Other'].map(g=>`<button data-a="gender" data-v="${g}" class="${f.gender===g?'on':''}">${g}</button>`).join('')}</div>
      <button class="btn" data-a="${(typeof api!=='undefined'&&api.online)?'onlineRegister':'regNext'}" style="margin-top:16px">${(typeof api!=='undefined'&&api.online)?'Create account & continue':'Continue'}</button>`;;
  } else if(step===2){
    body=`<h2 class="reg-h">What are you into?</h2>
      <p class="muted sm reg-sub">Pick a few interests so we can match you with people and groups.</p>
      <div class="opts interest-opts">${ints.map(t=>`<button data-a="regInterest" data-v="${esc(t)}" class="${(f.interests||[]).includes(t)?'on':''}">${esc(t)}</button>`).join('')}</div>
      <div class="muted tiny" style="margin-top:8px">${(f.interests||[]).length}/6 selected</div>
      <div class="row" style="gap:8px;margin-top:16px">
        <button class="btn ghost" data-a="regBack">Back</button>
        <button class="btn" data-a="regNext" style="flex:1">Continue</button>
      </div>`;
  } else if(step===3){
    body=`<h2 class="reg-h">Work & business</h2>
      <p class="muted sm reg-sub">Helps neighbours know how to connect with you.</p>
      <div class="biz-status-list">${statuses.map(s=>`<button class="biz-status ${f.businessStatus===s.id?'on':''}" data-a="regBizStatus" data-v="${s.id}"><span class="bs-ic">${s.ic}</span><span>${esc(s.n)}</span></button>`).join('')}</div>
      <div class="row" style="gap:8px;margin-top:16px">
        <button class="btn ghost" data-a="regBack">Back</button>
        <button class="btn" data-a="regNext" style="flex:1">Continue</button>
      </div>`;
  } else {
    body=`<h2 class="reg-h">Your look</h2>
      <p class="muted sm reg-sub">Show up as yourself — you can change this anytime.</p>
      <div class="av-preview">${renderAvatar(prev,110)}</div>
      <button class="btn sm ghost" style="display:block;margin:10px auto" data-a="avOpenCreate">Customize look</button>
      <div class="card" style="margin-top:12px;background:var(--card)">
        <div class="muted tiny">@${esc(f.username||'…')} · ${esc(f.name||'')}</div>
        <div class="muted tiny" style="margin-top:4px">${(f.interests||[]).slice(0,3).map(esc).join(' · ')||'Interests set'}</div>
        <div class="muted tiny" style="margin-top:4px">${esc((statuses.find(s=>s.id===f.businessStatus)||{}).n||'')}</div>
      </div>
      <div class="row" style="gap:8px;margin-top:16px">
        <button class="btn ghost" data-a="regBack">Back</button>
        <button class="btn" data-a="begin" style="flex:1">Enter AjoLoop</button>
      </div>`;
  }
  return `<div class="title auth-reg">
${`<button type="button" class="intro-mute" data-a="introMute" aria-label="${UI.introMuted?'Unmute intro':'Mute intro'}">${UI.introMuted?'🔇 Intro muted':'🔊 Intro playing'}</button>`}

<img class="logo-hero" src="/logo.png" alt="AjoLoop" width="200" height="auto">
<div style="text-align:center;margin:4px 0 8px"><a href="/welcome.html" class="muted tiny" style="color:var(--gold)">Our story · how Ajo works</a></div>
<div class="reg-dots">${dots}</div>
<div class="card flat auth-card">${body}</div>
${acc?`<button class="btn ghost sm" data-a="authLogin" style="margin-top:12px">I already have an account</button>`:''}
</div>`;
}


function hud(){const p=G.p,unread=G.notes.filter(n=>!n.read).length;
 const area=(p.home&&p.home.done)?p.home.area:(p.area||'Set home area');
 const dueAjo=G.ajos.some(a=>a.status==='active'&&a.members.includes('player')&&!cyc(a,'player')&&!(a.cycle===0&&a.host==='player')&&G.day>=dueDay(a)-1);
 return `<header class="hud"><div class="r1"><div class="day"><img class="logo-hud" src="/logo.png" alt="AjoLoop">
 <span style="display:block;font-weight:800;font-size:15px">${esc(p.name)}</span>
 <span class="muted" style="font-size:12px;font-weight:700">${p.username?'@'+esc(p.username)+' · ':''}📍 ${esc(area)}</span></div>
 <button type="button" class="center cash-tap" data-a="topUpOpen" style="background:none;border:0;color:inherit;padding:0;cursor:pointer"><span class="cash-label">Balance · Top up</span><div class="cash sm" id="cash">${fmt(p.cash)}</div></button>
 <button class="bell" data-a="notes" aria-label="Notifications">🔔${unread?`<b>${unread}</b>`:''}${dueAjo?'<i class="dot" style="top:2px;right:2px"></i>':''}</button></div>
 <div class="r2" style="grid-template-columns:1fr 1fr auto">
  <div class="stat-tap" data-a="statHint" data-k="trust"><div class="mini">Trust</div><div class="row sp"><b style="color:${col(p.trust)}">${Math.round(p.trust)}</b><span class="tiny muted">${trustTier(p.trust)}</span></div>${bar(p.energy>0?p.trust:p.trust,col(p.trust))}</div>
  <div class="stat-tap" data-a="statHint" data-k="rep"><div class="mini">Reputation</div><div class="row sp"><b style="color:${col(p.rep)}">${Math.round(p.rep)}</b><span class="tiny muted">${repTier(p.rep)}</span></div>${bar(p.rep,col(p.rep))}</div>
  <span class="chip t">🤝 Community</span>
 </div>
 <div class="hb"><i id="hb" style="width:${UI.prog/60*100}%"></i></div></header>`}

function navHtml(){const dueAjo=G.ajos.some(a=>a.status==='active'&&a.members.includes('player')&&!cyc(a,'player')&&!(a.cycle===0&&a.host==='player')&&G.day>=dueDay(a)-1);
 const gInv=G.groups.some(g=>!g.dead&&g.inv.some(i=>i.to==='player'&&invState(i)==='pending'));
 const t=[['life','🏠','Home'],['town','📍','Places'],['people','💬','People'],['ajo','🤝','Ajo'],['more','☰','More']];
 return `<nav aria-label="Main">${t.map(([k,i,l])=>`<button data-a="tab" data-v="${k}" class="${UI.tab===k?'on':''}" aria-current="${UI.tab===k?'page':'false'}"><span aria-hidden="true">${i}</span>${l}${(k==='ajo'&&dueAjo)||(k==='groups'&&gInv)?'<i class="dot" aria-label="Needs attention"></i>':''}</button>`).join('')}</nav>`}

function gauge(v,c,ic){return `<div class="gauge" style="--c:${c};--v:${v}"><div>${Math.round(v)}</div></div>`}

function nextActions(){
 const p=G.p,out=[];
 const debts=G.debts.filter(d=>d.m==='player'&&!d.paid);
 if(debts.length) out.push({ic:'💸',l:'Pay what you owe',s:'Clear Ajo debt to repair trust',a:'tabAjo'});
 if(p.hunger>=70) out.push({ic:'🍲',l:'Eat something',s:p.loc==='home'?'Cook at home or go to Mama Put':'Hunger is high — food restores you',a:p.loc==='home'?'cook':(p.loc==='restaurant'?'eat':'goto'),to:p.loc==='restaurant'?null:'restaurant'});
 if(p.energy<=25) out.push({ic:'😴',l:'Rest',s:p.loc==='home'?'Recover energy at home':'Go home and rest',a:p.loc==='home'?'rest':'goto',to:'home'});
 if(!p.job) out.push({ic:'💼',l:'Find work',s:'Jobs are posted at the Workplace',a:'goto',to:'work'});
 else if(p.shiftDay!==G.day&&G.hour<=14) out.push({ic:'💼',l:'Work your shift',s:JOBS.find(x=>x.id===p.job)?.n||'Earn today\'s pay',a:p.loc==='work'?'work':'goto',to:p.loc==='work'?null:'work'});
 if(G.biz&&G.biz.stock>0&&p.loc!=='market'&&G.hour<=18) out.push({ic:'🛒',l:'Tend the Mini Shop',s:G.biz.stock+' drinks in stock',a:'goto',to:'market'});
 if(G.biz&&G.biz.stock<=0) out.push({ic:'📦',l:'Restock the shop',s:'Out of stock at the Market',a:'goto',to:'market'});
 const aj=myAjos().filter(a=>a.status==='active')[0];
 if(aj&&!cyc(aj,'player')&&G.day>=dueDay(aj)-2) out.push({ic:'🤝',l:'Pay Ajo contribution',s:esc(aj.name)+' · '+fmt(aj.amt),a:'tabAjo'});
 if(!G.npcs.some(n=>n.met)) out.push({ic:'👋',l:'Meet someone',s:'Start at Kasuwa Market or Mama Put',a:'goto',to:'market'});
 if(out.length<2&&p.loc==='home'&&G.hour<20) out.push({ic:'🗺️',l:'Explore town',s:'Markets, work, suya — pick a place',a:'tab',v:'town'});
 return out.slice(0,2);
}
function setupSteps(){
  const home=!!(G.p.home&&G.p.home.done);
  const met=G.npcs.filter(n=>n.met).length>=1;
  const chat=Object.keys(G.chats||{}).some(k=>(G.chats[k]||[]).some(m=>m.by==='player'));
  const ajo=G.ajos.some(a=>a.members.includes('player'));
  return [
    {id:'home',ok:home,t:'Set your home area',a:'homeEdit'},
    {id:'people',ok:met,t:'Meet someone in your community',a:'tab',v:'people'},
    {id:'chat',ok:chat,t:'Start a conversation',a:'tab',v:'people'},
    {id:'ajo',ok:ajo,t:'Join or create an Ajo circle',a:'tab',v:'ajo'}
  ];
}
function lifeView(){const p=G.p,j=JOBS.find(x=>x.id===p.job),met=G.npcs.filter(n=>n.met).sort((a,b)=>b.rel-a.rel);
 const aj=myAjos().filter(a=>a.status==='active'||a.status==='stones'||a.status==='open')[0];
 const debts=G.debts.filter(d=>d.m==='player'&&!d.paid);
 const biz=playerBiz();
 const areaBiz=(p.home&&p.home.area)?bizesInArea(p.home.area).filter(b=>b.owner!=='player').slice(0,4):[];
 const near=G.p.nearbyOptIn?nearbyPeople().slice(0,4):[];
 const gCount=G.groups.filter(g=>!g.dead&&g.mem.player).length;
 const steps=setupSteps();
 const next=steps.find(s=>!s.ok);
 const showSetup=!G.p.onboarded||(next&&!G.p.onboarded);
 return `
 <section class="card gift-strip-card">
  <div class="row sp"><b>To attend</b><span class="stars-pill sm">${(typeof pendingExperiences==='function'?pendingExperiences():[]).length} waiting</span></div>
  <div class="muted sm" style="margin:4px 0 8px">Unlocked experiences at real places near you — not free virtual loot. Show up to complete them.</div>
  ${(()=>{const pe=typeof pendingExperiences==='function'?pendingExperiences():[];
    if(!pe.length) return `<div class="tiny muted">Nothing pending. Unlock a gym, salon, spa or meetup when you are active in the community.</div>
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" style="flex:1" data-a="giftsOpen">View list</button><button class="btn sm ghost" style="flex:1" data-a="giftWheelOpen">Unlock more</button></div>`;
    return pe.slice(0,3).map(x=>`<div class="pending-exp row sp" style="margin-top:8px">
      <div><span style="margin-right:6px">${x.ic||'📍'}</span><b>${esc(x.n)}</b>
      <div class="tiny muted">Still to attend${x.bizId&&bizById(x.bizId)?' · '+esc(bizById(x.bizId).name):''}</div></div>
      <button class="btn sm green" data-a="giftAttend" data-i="${x.slot}">I went</button>
    </div>`).join('')+`<div class="row" style="gap:8px;margin-top:10px"><button class="btn sm ghost" style="flex:1" data-a="giftsOpen">All pending</button><button class="btn sm ghost" style="flex:1" data-a="giftWheelOpen">Unlock more</button></div>`;
  })()}
 </section>
 <section class="card journey-card">
  <b>Your path on AjoLoop</b>
  <div class="muted sm" style="margin:6px 0 10px;line-height:1.45">Build real connections around you — places, people, groups, then Ajo when trust is there.</div>
  <div class="journey-steps">
   <button class="journey-step" data-a="tab" data-v="people"><span class="js-n">1</span><span class="js-t">Meet</span><span class="js-d">People & friends</span></button>
   <button class="journey-step" data-a="tab" data-v="town"><span class="js-n">2</span><span class="js-t">Experience</span><span class="js-d">Places & businesses</span></button>
   <button class="journey-step" data-a="tab" data-v="ajo"><span class="js-n">3</span><span class="js-t">Belong</span><span class="js-d">Groups & hangouts</span></button>
   <button class="journey-step" data-a="tab" data-v="ajo"><span class="js-n">4</span><span class="js-t">Support</span><span class="js-d">Ajo when ready</span></button>
  </div>
  <div class="tiny muted" style="margin-top:8px">Financial circles stay voluntary. Never required to unlock social features.</div>
 </section>
 ${showSetup||next?`<section class="card"><div class="row sp"><b>Next steps</b><span class="tiny muted">${steps.filter(s=>s.ok).length}/${steps.length}</span></div>
  <div class="muted sm" style="margin:4px 0 8px">Set up your place in the community. No demo mode — this is the real product flow.</div>
  ${steps.map(s=>`<div class="check-row ${s.ok?'ok':''}"><span>${s.ok?'✅':'○'} ${esc(s.t)}</span>
   ${s.ok?'':`<button class="btn sm ghost" data-a="${s.a}" ${s.v?`data-v="${s.v}"`:''}>Go</button>`}</div>`).join('')}
  ${next?`<div class="muted sm" style="margin-top:8px">Up next: <b>${esc(next.t)}</b></div>`:''}
  ${!next&&!G.p.onboarded?`<button class="btn" style="margin-top:10px" data-a="finishSetup">Continue to Home</button>`:''}
 </section>`:''}

 <section class="card hero"><div class="row"><button class="av av-btn" data-a="avOpen" aria-label="Edit character">${playerAvatar(56)}</button><div style="min-width:0;flex:1">
  <h2>${esc(p.name)}</h2>
  <div class="muted sm">Building community · Trust ${Math.round(p.trust)} · Rep ${Math.round(p.rep)}</div>
  <div class="loc-chip" style="margin-top:8px"><span class="dot-live"></span>${p.home&&p.home.done?`📍 ${esc(p.home.area)}`:'📍 Set your home area'}</div>
 </div></div>
 <div class="quote">Talk. Show up. Keep your word. That is how trust grows.</div></section>

 ${!(p.home&&p.home.done)?`<div class="home-banner"><b>Start with where you live</b><div class="muted sm" style="margin:6px 0 10px">Area only — not your street number. Neighbours and shops appear around you.</div>
  <button class="btn" data-a="homeEdit">Set home area</button></div>`:''}

 ${blocked()?`<div class="warnbox">🚫 Trust damage: blocked from new Ajo for ${p.blockedUntil-G.day} more day(s). Clear what you owe.</div>`:''}

 <div class="section-label">Your dashboard</div>
 <div class="grid2 px">
  <button class="card trust-card" data-a="tab" data-v="ajo" style="cursor:pointer"><div class="muted sm" style="font-weight:800">Trust</div>${gauge(p.trust,col(p.trust))}<b>${trustTier(p.trust)}</b><div class="why">Chat, visits, on-time Ajo, kept promises.</div></button>
  <button class="card trust-card" data-a="tab" data-v="people" style="cursor:pointer"><div class="muted sm" style="font-weight:800">Reputation</div>${gauge(p.rep,col(p.rep))}<b>${repTier(p.rep)}</b><div class="why">How the wider circle sees you.</div></button>
 </div>

 <div class="section-label">Your cycle</div>
 <section class="card">
  <div class="row sp"><b>🤝 Ajo</b><span class="badge-ajo">Real circle ritual</span></div>
  ${aj?`<div class="money-row" style="margin-top:8px"><span class="label">${esc(aj.name)}</span><span class="pill wait">${aj.status}</span></div>
   <div class="muted sm">${fmt(aj.amt)} every ${aj.freq} days · ${aj.members.length}/${aj.size} people</div>
   <button class="btn sm" style="margin-top:10px" data-a="ajoOpen" data-id="${aj.id}">Open circle</button>`
  :`<div class="muted sm" style="margin-top:8px">No active circle. Create one and invite people you trust — or join someone who invited you.</div>
   <button class="btn sm" style="margin-top:10px" data-a="tab" data-v="ajo">Go to Ajo</button>`}
  ${debts.length?`<div class="warnbox" style="margin:10px 0 0">You owe ${fmt(debts.reduce((s,d)=>s+d.amt,0))} on contributions.</div>`:''}
 </section>

 <div class="section-label">Home, work & business</div>
 <section class="card">
  <div class="row sp"><b>🏠 Home</b><button class="btn sm ghost" data-a="homeEdit">${p.home&&p.home.done?'Edit':'Set'}</button></div>
  <div class="muted sm" style="margin-top:6px">${p.home&&p.home.done?esc(p.home.area)+(p.home.label?' · '+esc(p.home.label):''):'Not set — required for nearby people and shops.'}</div>
  <div class="row sp" style="margin-top:14px"><b>💼 What I do</b><button class="btn sm ghost" data-a="workEdit">${p.work&&p.work.set?'Edit':'Set'}</button></div>
  <div class="muted sm" style="margin-top:6px">${p.work&&p.work.set?esc(p.work.title||p.work.cat):'Trade, job, or student — so the circle knows you.'}</div>
  <div class="row sp" style="margin-top:14px"><b>🏪 Business</b><button class="btn sm ghost" data-a="bizManage">${biz?'Manage':'List one'}</button></div>
  ${biz?`<div class="row" style="margin-top:8px;gap:10px;align-items:center">${biz?renderBizFace(biz,48):''}<div class="muted sm">${esc(biz.name)} · ${esc(biz.area)} · trust ${Math.round(biz.trust||0)}</div></div>`
  :`<div class="muted sm" style="margin-top:6px">Optional public shop with address and storefront.</div>`}
 </section>
 <div class="section-label">Where I am today</div>
 ${(()=>{
   const dp=typeof myDailyPlace==='function'?myDailyPlace():null;
   const visitsIn=typeof pendingVisitIn==='function'?pendingVisitIn():[];
   let h='';
   if(visitsIn.length){
     h+=visitsIn.map(r=>{
       const n=npc(r.from);const L=LOCS[r.loc]||{};
       return `<div class="card"><div class="row sp"><div><b>📍 Visit request</b><div class="muted sm">${esc(n?n.n:'Someone')} wants to join you at ${L.ic||''} ${esc(L.n||r.loc)}</div>${r.msg?`<div class="tiny muted" style="margin-top:4px">${esc(r.msg)}</div>`:''}</div></div>
        <div class="row" style="gap:8px;margin-top:10px">
         <button class="btn sm green" data-a="visitAns" data-id="${r.id}" data-y="1">Approve</button>
         <button class="btn sm ghost" data-a="visitAns" data-id="${r.id}" data-y="0">Decline</button>
        </div></div>`;
     }).join('');
   }
   if(dp){
     const L=LOCS[dp.loc]||{};
     const title=dp.name||L.n||dp.loc;
     const ic=L.ic||'📍';
     h+=`<div class="card">${dp.img?`<div class="spot-preview" style="background-image:url('${esc(dp.img)}');margin:0 0 10px"></div>`:''}
      <div class="row sp"><div><b>${ic} ${esc(title)}</b><div class="muted sm">Shared with friends · they can request to visit</div>${dp.note?`<div class="tiny" style="margin-top:4px">${esc(dp.note)}</div>`:''}</div>
      <button class="btn sm ghost" data-a="dailyPlaceClear">Clear</button></div>
      <button class="btn sm" style="margin-top:10px" data-a="dailyPlaceOpen">Change place</button></div>`;
   } else {
     h+=`<div class="card"><div class="muted sm">Set where you are today. Friends nearby can see it on your profile and request to visit — only if you approve.</div>
      <button class="btn" style="margin-top:10px" data-a="dailyPlaceOpen">Set today's place</button></div>`;
   }
   return h;
 })()}

 <div class="section-label">Near you ${p.nearbyOptIn?'':'· off'}</div>
 ${!p.nearbyOptIn?`<div class="card"><div class="muted sm">Turn on nearby to see people and businesses in your area. Approximate only.</div>
  <button class="btn sm" style="margin-top:10px" data-a="nearbyToggle">Enable nearby</button></div>`
 :`<section class="card"><b>People</b>
  ${near.length?near.map(n=>`<div class="row sp" style="margin-top:8px"><span>${n.em} ${n.n}</span><span><button class="btn sm ghost" data-a="chatOpen" data-id="${n.id}">Chat</button></span></div>`).join('')
  :'<div class="muted sm" style="margin-top:6px">Meet people first (People tab), then they can appear nearby.</div>'}
  <div class="row sp" style="margin-top:12px"><b>Shops in ${esc(p.home&&p.home.area||'area')}</b><button class="btn sm ghost" data-a="tab" data-v="town">Map</button></div>
  ${areaBiz.length?areaBiz.map(b=>`<button class="g-card" style="margin:8px 0 0;width:100%" data-a="bizOpen" data-id="${b.id}"><div class="g-av">${b.ic||'🏪'}</div><div class="meta"><b>${esc(b.name)}</b><div class="l">${esc(b.cat)} · chat with owner</div></div></button>`).join('')
  :'<div class="muted sm" style="margin-top:6px">No other shops listed here yet.</div>'}
 </section>`}

 <div class="section-label">Community</div>
 <section class="card">
  <div class="row sp"><b>💬 People</b><button class="btn sm ghost" data-a="tab" data-v="people">${met.length} known</button></div>
  <div class="muted sm" style="margin-top:6px">Chat builds familiarity before Ajo or meetups.</div>
  ${met.slice(0,3).map(n=>`<div class="row sp" style="margin-top:8px"><span>${n.em} ${n.n} · ${relLabel(n)}</span><button class="btn sm ghost" data-a="chatOpen" data-id="${n.id}">Chat</button></div>`).join('')||'<div class="muted sm" style="margin-top:8px">Nobody yet — open People or Map.</div>'}
  <div class="row sp" style="margin-top:14px"><b>🏘️ Groups</b><button class="btn sm ghost" data-a="tab" data-v="ajo">${gCount} joined</button></div>
  <div class="muted sm" style="margin-top:6px">Social communities — separate from money circles.</div>
 </section>

 <div class="tiny muted px" style="margin:16px 12px">Work, energy and town gigs still exist under Map if you want them. Ajoloop is about trust, visits, groups and real Ajo support — not transport fares.</div>
`}

function locMeta(id){
 const L=LOCS[id]||{};
 const M={
  home:{tags:['Rest','Food'],blurb:'Recover energy and cook cheap meals.'},
  market:{tags:['Trade','Kano shops','Social'],blurb:'Real market stalls and traders in '+(L.area||'Kano')+'.'},
  restaurant:{tags:['Food','Mama Put','Social'],blurb:'Street kitchens and shared tables in '+(L.area||'Kano')+'.'},
  park:{tags:['Transport','Keke','Gig'],blurb:'Motor park life — rides and news across the city.'},
  work:{tags:['Jobs','Pay','Offices'],blurb:'Workshops and desks along the municipal strip.'},
  bank:{tags:['Savings','Services'],blurb:'Banks and small service desks in one corridor.'},
  social:{tags:['Suya','Hangout','Reputation'],blurb:'Evening hangout where names are made.'},
  ajo:{tags:['Ajo circles','Community'],blurb:'Where savings circles meet across Kano.'}
 };
 return M[id]||{tags:[],blurb:''};
}
function travelInfo(to){
 if(to===G.p.loc) return null;
 return {fare:0,hours:0,mode:'free',canRide:true};
}
function locActions(){const p=G.p,L=p.loc,A=[];
 const add=(ic,l,s,a,d={},dis,g='do',primary=false,cost='')=>A.push({ic,l,s,a,d,dis,g,primary,cost});
 const j=JOBS.find(x=>x.id===p.job);const hereN=here();
 const meet=()=>add('👋🏾','Meet people here',hereN.length?hereN.length+' neighbour'+(hereN.length===1?'':'s')+' around':'Nobody around right now','meet',{},hereN.length?'':'No one here','social',!!hereN.length);
 if(L==='home'){
  add('🛋️','Rest','+14 energy · 2 hours','rest',{},'','needs',p.energy<60,'Free');
  add('🍚','Cook at home','−30 hunger · 1 hour','cook',{},p.cash<500?'Need ₦500':'','needs',p.hunger>=50,'₦500');
  add('📞','Call family','+mood · 1 hour','call',{},'','social',false,'Free');
  add('😴','Sleep until morning','Ends the day · restores energy','sleep',{},'','rest',false,'');
 }
 if(L==='market'){
  add('🍢','Suya snack','−18 hunger · 1 hour','snack',{},p.cash<600?'Need ₦600':'','needs',p.hunger>=40,'₦600');
  meet();
  add('🔎','Look for opportunity','1 hour · chance to meet someone useful','opp',{},'','social');
  if(!G.biz) add('🏪','Open Mini Shop',fmt(SHOP_COST)+' startup · stall, permit, 10 drinks','bizStart',{},p.cash<SHOP_COST?'Need '+fmt(SHOP_COST):'','work',true,fmt(SHOP_COST));
  else{
   add('🥤','Tend the shop','Sell at ₦700 · '+G.biz.stock+' in stock · 2 hours','bizTend',{},G.biz.stock<=0?'Out of stock':'','work',G.biz.stock>0,'');
   add('📦','Buy stock ×10','10 drinks · 1 hour','bizBuy',{n:10},p.cash<5000?'Need ₦5,000':'','work',false,'₦5,000');
   add('📦','Buy stock ×20','20 drinks · 1 hour','bizBuy',{n:20},p.cash<10000?'Need ₦10,000':'','work',false,'₦10,000');
  }
 }
 if(L==='restaurant'){
  add('🍛','Jollof & chicken','−45 hunger · 1 hour','eat',{},p.cash<1500?'Need ₦1,500':'','needs',p.hunger>=35,'₦1,500');
  meet();
 }
 if(L==='park'){
  meet();
  add('🛺','Keke errand','+₦1,500 · −10 energy · 2 hours','gig',{},p.energy<12?'Too tired':'','work',true,'+₦1,500');
 }
 if(L==='work'){
  if(!j) add('📋','See open jobs','Shop, rider, or sales roles','jobs',{},'','work',true,'');
  else{
   add(j.ic,'Work a shift','+'+fmt(j.pay)+' · −'+j.en+' energy · 8 hours','work',{},p.shiftDay===G.day?'Already worked today':(p.energy<j.en?'Need '+j.en+' energy':''),'work',p.shiftDay!==G.day,fmt(j.pay));
   add('🚪','Quit this job','You can re-apply later','quit',{},'','work');
  }
  meet();
 }
 if(L==='bank'){
  add('🏦','Save ₦2,000','Move cash to savings','dep',{n:2000},p.cash<2000?'Need ₦2,000':'','work',false,'₦2,000');
  add('🏦','Save ₦10,000','','dep',{n:10000},p.cash<10000?'Need ₦10,000':'','work',false,'₦10,000');
  add('💵','Withdraw ₦5,000','Saved: '+fmt(p.savings),'wd',{n:5000},p.savings<=0?'Nothing saved':'','work',false,'');
  add('💵','Withdraw all','Empty savings into cash','wd',{n:1e9},p.savings<=0?'Nothing saved':'','work',false,'');
 }
 if(L==='social'){
  add('🎶','Hang out','+mood · 2 hours','hang',{},'','social',true,'Free');
  add('🍻','Buy a round','Everyone here likes you more','round',{},p.cash<1500?'Need ₦1,500':'','social',false,'₦1,500');
  add('🗣️','Tall story','+Reputation · −Trust · once a day','boast',{},p.boastDay===G.day?'Already told one today':'','social',false,'');
  meet();
 }
 if(L==='ajo'){
  add('🤝','Open Ajo hub','Create, join, vote, contribute','tabAjo',{},'','work',true,'');
 }
 return A}
function actButton(a){
 const dis=a.dis?` disabled`:'';
 const cls='act'+(a.primary&&!a.dis?' primary':'');
 const extra=a.d&&a.d.n?` data-n="${a.d.n}"`:'';
 const sub=a.dis&&a.dis!=='No one here'?a.dis:a.s;
 const cost=a.cost&&!a.dis?`<span class="cost">${a.cost}</span>`:'';
 return `<button class="${cls}" data-a="${a.a}"${extra}${dis}><div class="ic">${a.ic}</div><div><b>${a.l}</b><small>${sub}</small>${cost}</div><span class="go">›</span></button>`;
}


function homeBanner(){
  const h=G.p.home;
  if(h&&h.done) return `<div class="home-banner"><div class="row sp"><div><b>🏠 Home · ${esc(h.area)}</b><div class="muted sm">${esc(h.label||HOME_STYLES.find(s=>s.id===h.style)?.n||'Home')}</div></div>
    <button class="btn sm ghost" data-a="homeEdit">Edit</button></div>
    <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
      <button class="btn sm ${G.p.nearbyOptIn?'green':'ghost'}" data-a="nearbyToggle">${G.p.nearbyOptIn?'Nearby on':'Enable nearby'}</button>
      <button class="btn sm ghost" data-a="tab" data-v="town">City map</button>
    </div></div>`;
  return `<div class="home-banner"><b>Set your home area</b><div class="muted sm" style="margin:6px 0 10px">Approximate only — LGA / neighbourhood, not your street number. This is how people find your circle.</div>
    <button class="btn" data-a="homeEdit">Choose home in Kano</button></div>`;
}


/* —— Auto-detect location → address —— */
async function reverseGeocode(lat,lng){
  try{
    const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lng)+'&zoom=17&addressdetails=1';
    const res=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error('geocode');
    const j=await res.json();
    const a=j.address||{};
    const parts=[a.road||a.pedestrian||a.neighbourhood||a.suburb,a.suburb||a.village||a.town,a.city||a.county||a.state]
      .filter(Boolean)
      .filter((v,i,arr)=>arr.indexOf(v)===i);
    const short=parts.slice(0,3).join(', ')||(j.display_name||'').split(',').slice(0,3).join(',').trim();
    return {address:short.slice(0,120),display:j.display_name||short,raw:a};
  }catch(e){
    return {address:'',display:'',raw:{}};
  }
}
function detectUserLocation(cb,errCb){
  if(!navigator.geolocation){if(errCb)errCb('Location not available on this device.');return}
  navigator.geolocation.getCurrentPosition(pos=>{
    cb(+pos.coords.latitude.toFixed(6),+pos.coords.longitude.toFixed(6),pos.coords.accuracy);
  },err=>{
    const msg=err&&err.code===1?'Location permission denied. Allow location for this site.':
      (err&&err.code===3?'Location timed out. Try again outdoors.':'Could not get location.');
    if(errCb)errCb(msg); else fx(msg,'warn');
  },{enableHighAccuracy:true,timeout:15000,maximumAge:30000});
}

/* —— Live OpenStreetMap (Leaflet) —— */
let _liveMap=null,_pickMap=null,_pickMarker=null,_homeMap=null;

function destroyLiveMaps(){
  try{if(_liveMap){_liveMap.remove();_liveMap=null}}catch(e){}
  try{if(_pickMap){_pickMap.remove();_pickMap=null;_pickMarker=null}}catch(e){}
  try{if(_homeMap){_homeMap.remove();_homeMap=null}}catch(e){}
}

function liveMapBlock(){
  const peopleN=(typeof peopleOnMap==='function'?peopleOnMap():[]).length;
  const bizN=(G.bizs||[]).filter(b=>!b.closed).length;
  const showP=UI.mapShowPeople!==false, showPl=UI.mapShowPlaces!==false, showB=UI.mapShowBiz!==false;
  return `<div class="live-map-wrap">
    <div id="live-map" class="live-map"></div>
    <div class="live-map-legend">
      <span>👤 People (${peopleN})</span>
      <span>🏪 Businesses (${bizN})</span>
      <span>📍 Spots</span>
      <span>Tap to open</span>
    </div>
    <div class="px" style="margin:8px 0;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn sm ${showP?'':'ghost'}" data-a="mapTogglePeople">${showP?'👤 People on':'👤 People off'}</button>
      <button class="btn sm ${showB?'':'ghost'}" data-a="mapToggleBiz">${showB?'🏪 Shops on':'🏪 Shops off'}</button>
      <button class="btn sm ${showPl?'':'ghost'}" data-a="mapTogglePlaces">${showPl?'📍 Places on':'📍 Places off'}</button>
      <button class="btn sm" data-a="spotAdd">＋ Add spot</button>
      <button class="btn sm ghost" data-a="mapLocate">📍 My location</button>
    </div>
    <div class="muted tiny px">People as characters · shops as storefronts · spots as pins. Tap any marker to open it.</div>
  </div>`;
}

function mountLiveMap(){
  const el=document.getElementById('live-map');
  if(!el||typeof L==='undefined') return;
  try{if(_liveMap){_liveMap.remove();_liveMap=null}}catch(e){}
  const c=KANO_MAP.center;
  _liveMap=L.map(el,{zoomControl:true}).setView([c.lat,c.lng],c.zoom||13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  }).addTo(_liveMap);
  const showPeople=UI.mapShowPeople!==false;
  const showPlaces=UI.mapShowPlaces!==false;
  const showBiz=UI.mapShowBiz!==false;
  if(showBiz){
    const bizPins=mapPins().filter(p=>p.kind==='biz'&&p.lat!=null&&p.lng!=null);
    bizPins.forEach(p=>{
      const b=p.biz||bizById(p.id);
      const face=b?renderBizFace(b,40):(p.ic||'🏪');
      const icon=L.divIcon({
        className:'lm-pin lm-biz',
        html:`<div class="lm-bld">${typeof face==='string'?face:'🏪'}<i class="lm-bld-tag">Shop</i></div>`,
        iconSize:[48,52],iconAnchor:[24,52]
      });
      const m=L.marker([p.lat,p.lng],{icon,zIndexOffset:300}).addTo(_liveMap);
      m.bindPopup(`<b>${esc(p.n)}</b><br><span style="opacity:.85">${esc(p.sub||'Business')}</span>`);
      m.on('click',()=>{UI.modal={t:'biz',id:p.id};render()});
    });
  }
  if(showPlaces){
    const pins=mapPins().filter(p=>p.lat!=null&&p.lng!=null&&(p.kind==='spot'||p.kind==='public'||p.kind==='home'));
    pins.forEach(p=>{
      const color=p.kind==='spot'?'#ffc928':p.kind==='home'?'#22c177':'#c4b5fd';
      const icon=L.divIcon({
        className:'lm-pin',
        html:`<div class="lm-dot" style="background:${color}"><span>${p.ic||'📍'}</span></div>`,
        iconSize:[36,36],iconAnchor:[18,18]
      });
      const m=L.marker([p.lat,p.lng],{icon,zIndexOffset:100}).addTo(_liveMap);
      m.bindPopup(`<b>${esc(p.n)}</b><br><span style="opacity:.85">${esc(p.sub||'')}</span>`);
      m.on('click',()=>{
        if(p.kind==='spot'){UI.modal={t:'spot',id:p.id};render()}
        else if(p.kind==='home'){UI.modal={t:'home'};render()}
      });
    });
  }
  if(showPeople){
    peopleOnMap().forEach(p=>{
      const face=p.avatar?renderAvatar(p.avatar,36):(p.em?`<span class="lm-em">${p.em}</span>`:'👤');
      const ring=p.me?'#ffc928':'#5b8cff';
      const icon=L.divIcon({
        className:'lm-pin lm-person',
        html:`<div class="lm-char" style="box-shadow:0 0 0 2px ${ring},0 4px 12px rgba(0,0,0,.4)">${face}${p.me?'<i class="lm-me">You</i>':''}</div>`,
        iconSize:[44,48],iconAnchor:[22,48]
      });
      const m=L.marker([p.lat,p.lng],{icon,zIndexOffset:p.me?600:400}).addTo(_liveMap);
      m.bindPopup(`<b>${esc(p.n)}</b><br><span style="opacity:.85">${esc(p.sub||'')}</span>`);
      m.on('click',()=>{
        if(p.me){UI.tab='more';render()}
        else if(p.id){UI.modal={t:'npc',id:p.id};render()}
      });
    });
  }
  if(UI.mapFocus){
    const all=[...(typeof mapPins==='function'?mapPins():[]),...(typeof peopleOnMap==='function'?peopleOnMap():[])];
    const f=all.find(p=>p.id===UI.mapFocus);
    if(f&&f.lat!=null) _liveMap.setView([f.lat,f.lng],16);
    UI.mapFocus=null;
  }
  setTimeout(()=>{try{_liveMap.invalidateSize()}catch(e){}},80);
}


function bindSpotPhotoUpload(){
  const file=document.getElementById('sf-file');
  if(!file||file._bound) return;
  file._bound=true;
  file.addEventListener('change',()=>{
    const f=file.files&&file.files[0];
    if(!f) return;
    if(f.size>4e6){fx('Photo too large (max ~4MB).','warn');return}
    const reader=new FileReader();
    reader.onload=()=>{
      let data=reader.result;
      // Soft cap data URL size in form
      if(String(data).length>900000){
        fx('Compressing… try a smaller photo if this fails.','warm');
      }
      if(!UI.spotForm) UI.spotForm={};
      UI.spotForm.img=data;
      const input=document.getElementById('sf-img');
      if(input) input.value=typeof data==='string'&&data.startsWith('http')?data:'';
      // Keep data URL in form even if input shows empty for data:
      if(typeof data==='string'&&data.startsWith('data:')){
        UI.spotForm.img=data;
      }
      render();
    };
    reader.readAsDataURL(f);
  });
}

function mountSpotPicker(){
  const el=document.getElementById('spot-pick-map');
  if(!el||typeof L==='undefined') return;
  try{if(_pickMap){_pickMap.remove();_pickMap=null;_pickMarker=null}}catch(e){}
  const f=UI.spotForm||{};
  const start=f.lat!=null?[f.lat,f.lng]:[KANO_MAP.center.lat,KANO_MAP.center.lng];
  _pickMap=L.map(el,{zoomControl:true}).setView(start, f.lat!=null?16:13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OSM'}).addTo(_pickMap);
  const placeMarker=(lat,lng)=>{
    if(_pickMarker) _pickMarker.setLatLng([lat,lng]);
    else {
      _pickMarker=L.marker([lat,lng],{draggable:true}).addTo(_pickMap);
      _pickMarker.on('dragend',()=>{
        const ll=_pickMarker.getLatLng();
        UI.spotForm.lat=+ll.lat.toFixed(6);
        UI.spotForm.lng=+ll.lng.toFixed(6);
        UI.spotForm.area=nearestArea(UI.spotForm.lat,UI.spotForm.lng);
        const lab=document.getElementById('sf-coords');
        if(lab) lab.textContent=UI.spotForm.lat+', '+UI.spotForm.lng+' · '+UI.spotForm.area;
      });
    }
    UI.spotForm.lat=+lat.toFixed(6);
    UI.spotForm.lng=+lng.toFixed(6);
    UI.spotForm.area=nearestArea(UI.spotForm.lat,UI.spotForm.lng);
    const lab=document.getElementById('sf-coords');
    if(lab) lab.textContent=UI.spotForm.lat+', '+UI.spotForm.lng+' · '+UI.spotForm.area;
  };
  if(f.lat!=null&&f.lng!=null) placeMarker(f.lat,f.lng);
  _pickMap.on('click',e=>placeMarker(e.latlng.lat,e.latlng.lng));
  setTimeout(()=>{try{_pickMap.invalidateSize()}catch(e){}},120);
}

function nearbyBlock(){
  if(!G.p.nearbyOptIn) return `<div class="card" style="margin:12px"><b>People near you</b><div class="muted sm" style="margin:6px 0">Opt in to see neighbours in your home area. Approximate only — no live GPS.</div>
    <button class="btn sm" data-a="nearbyToggle">Enable nearby</button></div>`;
  const list=nearbyPeople();
  const spots=communitySpots().filter(s=>s.area===(G.p.home&&G.p.home.area));
  return `<div class="section-label">Nearby · ${esc(G.p.home&&G.p.home.area||'')}</div>
    ${list.length?list.map(n=>{
      const st=friendStatus(n.id);
      const chatBtn=st==='friends'?`<button class="btn sm ghost" data-a="chatOpen" data-id="${n.id}">Chat</button>`:`<button class="btn sm ghost" data-a="friendReq" data-id="${n.id}">${st==='pending_out'?'Pending':st==='pending_in'?'Accept':'Add friend'}</button>`;
      return `<div class="suggest-card"><div class="av">${n.em}</div><div class="meta"><b>${n.n}</b><div class="l">${n.occ} · ${relLabel(n)}</div></div>
      ${chatBtn}
      <button class="btn sm" data-a="npc" data-id="${n.id}">Profile</button></div>`;
    }).join('')
    :'<div class="card empty"><div class="big">📍</div>No met neighbours in your area yet. Meet people in Town, then they can show as nearby.</div>'}
    <div class="section-label">Community spots · ${esc(G.p.home&&G.p.home.area||'')}</div>
    <div class="muted tiny px" style="margin-bottom:8px">Places people usually go — visit to meet friends nearby and build trust.</div>
    ${spots.length?spots.map(s=>`<button class="g-card" data-a="spotOpen" data-id="${s.id}" style="width:calc(100% - 24px)"><div class="g-av">${s.ic||'📍'}</div><div class="meta"><b>${esc(s.name)}</b><div class="l">${esc(s.area)}${s.label?' · '+esc(s.label):''}${s.by==='player'?' · yours':''}</div></div></button>`).join('')
    :'<div class="card empty"><div class="big">📌</div>No community spots yet.</div>'}
    <div class="px" style="margin:8px 0 12px"><button class="btn sm" data-a="spotAdd">＋ Add your spot</button></div>`;
}

function spotAddSheet(){
  const f=UI.spotForm||{name:'',area:(G.p.home&&G.p.home.area)||'Fagge',label:'',ic:'📍',note:'',lat:null,lng:null};
  const ics=['📍','🕌','🏟️','🌳','☕','🛒','🏫','🚏','🎵','🏥'];
  const hasPin=f.lat!=null&&f.lng!=null;
  return `<div class="sec" style="margin-top:0">Add a spot<small>Drop a pin on the real map — friends can find it and visit.</small></div>
    <label class="l">Name</label><input id="sf-name" maxlength="32" placeholder="e.g. Central Mosque courtyard" value="${esc(f.name||'')}">
    <label class="l">Pin on live map</label>
    <div id="spot-pick-map" class="spot-pick-map"></div>
    <div class="row sp" style="margin:8px 0;gap:8px;flex-wrap:wrap">
      <button class="btn sm ghost" type="button" data-a="spotGeo">📍 Use my location</button>
      <span id="sf-coords" class="muted tiny">${hasPin?(f.lat+', '+f.lng+' · '+(f.area||'')):'Tap the map to place a pin'}</span>
    </div>
    <label class="l">Area (auto from pin)</label><div class="opts">${allAreas().map(a=>`<button data-a="spotArea" data-v="${a}" class="${f.area===a?'on':''}">${a}</button>`).join('')}</div>
    <label class="l">Linked daily place (optional)</label><div class="opts">${['market','restaurant','park','work','bank','social','ajo'].map(id=>`<button data-a="spotLoc" data-v="${id}" class="${(f.loc||'')===id?'on':''}">${LOCS[id].ic} ${LOCS[id].n}</button>`).join('')}</div>
    <label class="l">Landmark (optional)</label><input id="sf-label" maxlength="48" placeholder="e.g. Near the old gate" value="${esc(f.label||'')}">
    <label class="l">Photo of the place</label>
    <div class="field"><input type="url" id="sf-img" maxlength="500" placeholder="Paste image URL or upload below" value="${esc(f.img||'')}"></div>
    <input type="file" id="sf-file" accept="image/*" style="margin:8px 0;font-size:13px">
    ${f.img?`<div class="spot-preview" style="background-image:url('${esc(f.img)}')"></div>`:''}
    <label class="l" style="margin-top:10px"><input type="checkbox" id="sf-daily" ${f.setDaily?'checked':''}> Also set as my place today</label>
    <label class="l">Icon</label><div class="opts">${ics.map(ic=>`<button data-a="spotIc" data-v="${ic}" class="${f.ic===ic?'on':''}">${ic}</button>`).join('')}</div>
    <label class="l">Note (optional)</label><input id="sf-note" maxlength="120" placeholder="Why friends meet here" value="${esc(f.note||'')}">
    <button class="btn" style="margin-top:14px" data-a="spotSave">Save spot on map</button>
    <div class="muted tiny" style="margin-top:10px">Pin is approximate for community discovery — not a precise private address.</div>`;
}
function spotDetailSheet(id){
  const s=(G.spots||[]).find(x=>x.id===id&&!x.removed);
  if(!s) return `<h2>Spot gone</h2><div class="muted sm">This place was removed.</div>`;
  const peeps=peopleAtSpot(s.id);
  return `${s.img?`<div class="place-photo" style="background-image:url('${esc(s.img)}')"><div class="place-photo-shade"><div class="place-photo-ic">${s.ic||'📍'}</div><div><h2>${esc(s.name)}</h2><div class="place-photo-sub">${esc(s.area)}${s.label?' · '+esc(s.label):''}</div></div></div></div>`
    :`<div class="place-hero"><div class="ph-ic">${s.ic||'📍'}</div><div><h2>${esc(s.name)}</h2>
    <div class="muted sm">${esc(s.area)}${s.label?' · '+esc(s.label):''}</div></div></div>`}
    <div class="place-meta" style="margin:8px 12px"><span class="place-tag hot">Community spot</span>${s.by==='player'?'<span class="place-tag">Yours</span>':''}${s.loc&&LOCS[s.loc]?`<span class="place-tag">${LOCS[s.loc].n}</span>`:''}</div>
    ${s.note?`<div class="travel-hint" style="margin:0 12px">${esc(s.note)}</div>`:''}
    <div class="px" style="margin:10px 0;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" data-a="spotVisit" data-id="${s.id}">Visit this place</button>
      ${s.lat!=null?`<button class="btn ghost" data-a="spotShowMap" data-id="${s.id}">Show on live map</button>`:''}
    </div>
    ${s.lat!=null?`<div class="muted tiny px">${Number(s.lat).toFixed(5)}, ${Number(s.lng).toFixed(5)}${s.address?' · '+esc(s.address):''}</div>`:''}
    <div class="section-label">Friends & people nearby</div>
    <div class="muted tiny px" style="margin-bottom:8px">Connect with people who share this area — chat after you become friends.</div>
    ${peeps.length?peeps.map(n=>{
      const st=friendStatus(n.id);
      return `<div class="suggest-card"><div class="av">${n.em}</div><div class="meta"><b>${esc(n.n)}</b><div class="l">${esc(n.occ)} · ${relLabel(n)}</div></div>
        ${st==='friends'?`<button class="btn sm ghost" data-a="chatOpen" data-id="${n.id}">Chat</button>`
        :`<button class="btn sm" data-a="friendReq" data-id="${n.id}">${st==='pending_out'?'Pending':'Add friend'}</button>`}
        <button class="btn sm ghost" data-a="npc" data-id="${n.id}">Profile</button></div>`;
    }).join(''):'<div class="card empty"><div class="big">👋</div>No met neighbours linked to this area yet. Meet people in Town first.</div>'}
    ${s.by==='player'?`<button class="btn ghost red" style="margin-top:12px" data-a="spotRemove" data-id="${s.id}">Remove this spot</button>`:''}`;
}


function mountHomePicker(){
  const el=document.getElementById('home-pick-map');
  if(!el||typeof L==='undefined') return;
  const f=UI.homeForm||{};
  if(f.lat==null||f.lng==null) return;
  try{if(_homeMap){_homeMap.remove();_homeMap=null}}catch(e){}
  _homeMap=L.map(el,{zoomControl:true,dragging:true}).setView([f.lat,f.lng],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OSM'}).addTo(_homeMap);
  const m=L.marker([f.lat,f.lng],{draggable:true}).addTo(_homeMap);
  m.on('dragend',async()=>{
    const ll=m.getLatLng();
    UI.homeForm.lat=+ll.lat.toFixed(6);
    UI.homeForm.lng=+ll.lng.toFixed(6);
    UI.homeForm.area=nearestArea(UI.homeForm.lat,UI.homeForm.lng);
    const geo=await reverseGeocode(UI.homeForm.lat,UI.homeForm.lng);
    if(geo.address) UI.homeForm.address=geo.address;
    render();
  });
  setTimeout(()=>{try{_homeMap.invalidateSize()}catch(e){}},80);
}

function homeSheet(){
  const f=UI.homeForm||{}, styles=HOME_STYLES;
  const hasPin=f.lat!=null&&f.lng!=null;
  return `<div class="sec" style="margin-top:0">Your home<small>Detect from the map — area is public; full address stays private on this device.</small></div>
    <button class="btn" data-a="homeDetect" style="margin-bottom:10px">📍 Detect my location</button>
    <div class="muted tiny" style="margin-bottom:10px">${f.detecting?'Finding you on the map…':(hasPin?('Pin: '+f.lat+', '+f.lng+(f.address?(' · '+esc(f.address)):'')):'Tap detect to fill your address from GPS.')}</div>
    ${hasPin?`<div id="home-pick-map" class="spot-pick-map" style="height:180px;border-radius:16px;margin-bottom:12px"></div>`:''}
    <label class="l">Area (auto from map)</label>
    <div class="opts">${allAreas().map(a=>`<button data-a="homeArea" data-v="${a}" class="${f.area===a?'on':''}">${a}</button>`).join('')}</div>
    <label class="l">Address from map</label>
    <div class="field"><input type="text" id="hf-address" maxlength="120" placeholder="Detected street / neighbourhood" value="${esc(f.address||'')}"></div>
    <label class="l">Private note (optional)</label>
    <div class="field"><input type="text" id="hf-label" maxlength="40" placeholder="e.g. Near central mosque" value="${esc(f.label||'')}"></div>
    <label class="l">Home type</label>
    <div class="opts">${styles.map(s=>`<button data-a="homeStyle" data-v="${s.id}" class="${(f.style||'compound')===s.id?'on':''}">${s.ic} ${s.n}</button>`).join('')}</div>
    <button class="btn" style="margin-top:12px" data-a="homeSave">Save as my address</button>
    <div class="tiny muted" style="margin-top:10px">Precise pin places you on the live map. Strangers only see your area, not your exact street.</div>`;
}
function bizManageSheet(){
  const existing=playerBiz(), f=UI.bizForm;
  if(existing){
    if(!existing.avatar)existing.avatar=defaultStoreAvatar((playerBiz()&&playerBiz().cat)||(UI.bizForm&&UI.bizForm.cat)||'Other');
    return `<div class="sec" style="margin-top:0">${esc(existing.name)}<small>${esc(existing.area)} · ${esc(existing.cat)}</small></div>
    <div class="av-preview">${renderBizFace(existing,96)}</div>
    <button class="btn sm ghost" style="display:block;margin:8px auto" data-a="storeAvOpen">Customize storefront</button>
    <div class="muted sm" style="margin-top:8px">${esc(existing.bio||'')}</div>
    <div class="row sp" style="margin-top:12px"><span class="muted sm">Shop trust</span><b>${Math.round(existing.trust||0)}</b></div>
    <div class="row sp"><span class="muted sm">Visits</span><b>${existing.visits||0}</b></div>
    <div class="row sp"><span class="muted sm">Address</span><b>${esc(existing.area)}${existing.label?' · '+esc(existing.label):''}</b></div>
    <div class="tiny muted" style="margin-top:12px">Your storefront is what neighbours see on the map and when they visit.</div>`;
  }
  const prev=UI.storeAvForm||defaultStoreAvatar((playerBiz()&&playerBiz().cat)||(UI.bizForm&&UI.bizForm.cat)||'Other');
  return `<div class="sec" style="margin-top:0">List your business<small>Optional — for traders and shop owners. Builds trust when people visit.</small></div>
    <div class="av-preview">${renderStoreBuilding(prev.kind==='building'?prev:defaultStoreAvatar(f.cat||'Other'),88)}</div>
    <button class="btn sm ghost" style="display:block;margin:8px auto" data-a="storeAvOpenCreate">Customize storefront</button>
    <label class="l">Business name</label><input id="bf-name" maxlength="28" placeholder="e.g. Amina Provisions" value="${esc(f.name)}">
    <label class="l">Category</label><div class="opts">${BIZ_CATS.map(c=>`<button data-a="bizCat" data-v="${c}" class="${f.cat===c?'on':''}">${c}</button>`).join('')}</div>
    <label class="l">Area / address</label><div class="opts">${allAreas().map(a=>`<button data-a="bizArea" data-v="${a}" class="${f.area===a?'on':''}">${a}</button>`).join('')}</div>
    <label class="l">Landmark (optional)</label><input id="bf-label" maxlength="40" placeholder="Near motor park, by the mosque…" value="${esc(f.label)}">
    <label class="l">About the shop</label><input id="bf-bio" maxlength="120" placeholder="What you sell or offer" value="${esc(f.bio)}">
    <button class="btn" style="margin-top:12px" data-a="bizCreate">Publish business</button>
    <div class="tiny muted" style="margin-top:10px">You can skip this and only set “what you do” without a public shop.</div>`;
}
function workSheet(){
  const w=G.p.work||{cat:'',title:''}, f=UI.workForm||{cat:w.cat||'Trader',title:w.title||''};
  return `<div class="sec" style="margin-top:0">What do you do?<small>Your trade or work — helps the community know you.</small></div>
    <label class="l">Category</label><div class="opts">${WORK_CATS.map(c=>`<button data-a="workCat" data-v="${c}" class="${f.cat===c?'on':''}">${c}</button>`).join('')}</div>
    <label class="l">Title (optional)</label><input id="wf-title" maxlength="40" placeholder="e.g. Provisions seller, tailor…" value="${esc(f.title)}">
    <button class="btn" style="margin-top:12px" data-a="workSave">Save</button>
    <div class="section-label">Also list a shop?</div>
    <div class="muted sm" style="margin-bottom:8px">Optional. Add a public shop with a building look people can find and visit.</div>
    <button class="btn ghost" data-a="bizManage">＋ Add my business</button>`;
}

function bizDetailSheet(b){
  if(!b) return '<div class="muted">Not found</div>';
  const owner=b.owner==='player'?G.p:npc(b.owner);
  const ownerName=b.owner==='player'?G.p.name:(owner?owner.n:'Someone');
  const pending=(G.visits||[]).find(v=>v.biz===b.id&&v.by==='player'&&v.st==='pending');
  const approved=(G.visits||[]).filter(v=>v.biz===b.id&&v.st==='approved').length;
  const face=renderBizFace(b,56);
  return `<div class="row"><div class="av av-biz">${typeof face==='string'&&face.includes('<svg')?face:`<span style="font-size:36px">${face}</span>`}</div><div><h2>${esc(b.name)}</h2><div class="muted sm">${esc(b.cat)} · ${esc(b.area)}${b.label?' · '+esc(b.label):''}</div></div></div>
    <div class="muted sm" style="margin:10px 0">${esc(b.bio||'')}</div>
    <div class="row sp"><span class="muted sm">Owner</span><b>${esc(ownerName)}${b.owner!=='player'?' <span class="npc-badge">NPC</span>':''}</b></div>
    <div class="row sp"><span class="muted sm">Shop trust</span><b>${Math.round(b.trust||0)}</b></div>
    <div class="row sp"><span class="muted sm">Approved visits</span><b>${b.visits||0}</b></div>
    ${b.label?`<div class="tiny muted">Landmark: ${esc(b.label)}</div>`:''}
    <div class="card" style="margin-top:12px;background:var(--card)"><div class="tiny muted" style="font-weight:800">VISIT (NO TRANSPORT FEE)</div>
    <div class="sm" style="margin-top:6px;line-height:1.4">You request a visit. The owner confirms you came. Both sides gain trust — like showing up in real life.</div></div>
    <div class="profile-actions" style="margin-top:14px">
      ${b.owner!=='player'?(
        pending?`<div class="pill wait">Visit requested — waiting for approval</div>`:
        `<button class="btn" data-a="visitBiz" data-id="${b.id}">📍 Request visit</button>
         <button class="btn ghost" data-a="treatOpenBiz" data-id="${b.id}">🙏 Ask friend to pay</button>
         <button class="btn ghost" data-a="interestBiz" data-id="${b.id}">👍 Show interest</button>
         <button class="btn ghost" data-a="chatOpen" data-id="${b.owner}">💬 Chat with owner</button>`
      ):`<div class="muted sm">Your listing. When others request visits, approve them to build trust.</div>
         ${(G.visits||[]).filter(v=>v.biz===b.id&&v.st==='pending').map(v=>`<div class="inv-card" style="margin-top:8px"><b>Visit request</b>
           <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm green" data-a="approveVisit" data-vid="${v.id}" data-y="1">Confirm visit</button>
           <button class="btn sm ghost" data-a="approveVisit" data-vid="${v.id}" data-y="0">Decline</button></div></div>`).join('')}`}
    </div>
    ${(()=>{
      const credit=circleCreditAvailable();
      const products=bizProducts(b);
      if(b.owner==='player') return '';
      let h=`<div class="section-label">Buy with circle credit</div>`;
      if(!credit.ok){
        h+=`<div class="card" style="background:var(--card)"><div class="muted sm">${esc(credit.why||'Not available')}</div>
          <div class="tiny muted" style="margin-top:6px">Need an <b>active Ajo circle</b>, Trust 55+, Reputation 48+. Amount is taken from your pot on your turn.</div></div>`;
        return h;
      }
      h+=`<div class="card" style="background:var(--card)"><div class="row sp"><span class="muted sm">Available credit</span><b>${fmt(credit.limit)}</b></div>
        <div class="tiny muted">From ${esc(credit.ajo.name)} · ${Math.round((credit.pct||0)*100)}% of pot based on your trust & reputation</div></div>`;
      h+=products.map(p=>`<div class="card" style="margin-top:8px"><div class="row sp"><div><b>${esc(p.n)}</b><div class="muted sm">${fmt(p.price)}</div></div>
        <button class="btn sm ${p.price>credit.limit?'ghost':''}" data-a="circleBuy" data-biz="${b.id}" data-prod="${p.id}" data-ajo="${credit.ajo.id}" ${p.price>credit.limit?'disabled':''}>${p.price>credit.limit?'Over limit':'Buy on pot'}</button></div></div>`).join('');
      return h;
    })()}
    <div class="tiny muted" style="margin-top:10px">Circle credit is only for members of an active loop with strong trust — paid back from your pot when your turn arrives.</div>`}
function chatSheet(uid){
  const n=npc(uid); if(!n) return '<div class="muted">Unknown</div>';
  const th=chatThread(uid);
  const biz=bizByOwner(uid);
  return `<div class="row"><div class="av">${n.em}</div><div><h2>${n.n}</h2><div class="muted sm">${n.occ} · ${relLabel(n)} · ${Math.round(n.rel)} closeness</div></div></div>
    ${biz?`<div class="card" style="margin:10px 0;background:var(--card)"><div class="row sp"><span>${biz.ic||'🏪'} <b>${esc(biz.name)}</b></div><div class="muted sm">${esc(biz.area)}</div>
      <button class="btn sm ghost" style="margin-top:8px" data-a="bizOpen" data-id="${biz.id}">View shop</button>
      <button class="btn sm" style="margin-top:8px" data-a="visitBiz" data-id="${biz.id}">Request visit</button></div>`:''}
    <div class="chat-log" id="chat-log">${th.length?th.map(m=>`<div class="chat-bubble ${m.by==='player'?'me':'them'}">${esc(m.t)}<div class="tiny" style="opacity:.7;margin-top:4px">Day ${m.day}</div></div>`).join(''):'<div class="empty">Talk first. Trust grows from conversation, visits, and kept promises.</div>'}</div>
    <div class="row" style="gap:8px;margin-top:8px"><input id="chat-in" maxlength="200" placeholder="Message…" value="${esc(UI.chatText||'')}" style="flex:1">
    <button class="btn sm" data-a="chatSend" data-id="${uid}">Send</button></div>
    <div class="section-label">Grow closer</div>
    <div class="row" style="gap:8px;flex-wrap:wrap">
      <button class="btn sm ghost" data-a="trustAct" data-id="${uid}" data-g="wave">👋 Greet</button>
      <button class="btn sm ghost" data-a="trustAct" data-id="${uid}" data-g="intro">🤝 Introduce</button>
      <button class="btn sm ghost" data-a="trustAct" data-id="${uid}" data-g="help">🆘 Offer help</button>
      <button class="btn sm ghost" data-a="trustAct" data-id="${uid}" data-g="vouch">🗣️ Vouch</button>
      <button class="btn sm ghost" data-a="chatGame" data-id="${uid}" data-g="plan">📅 Meetup</button>
    </div>
    <div class="tiny muted" style="margin-top:8px">These small acts raise closeness and trust over time — the same way community works offline.</div>`}


function placePhotoBlock(locId){
  const L=LOCS[locId]||{}, cover=placeCover(locId), meta=locMeta(locId);
  const areaLine=L.area?(L.area+(L.label?' · '+L.label:'')):(L.label||'Your place');
  const peopleTag=here().length?`<span class="place-tag people">${here().length} here now</span>`:'<span class="place-tag">Quiet now</span>';
  if(cover){
    return `<div class="place-photo" style="background-image:url('${esc(cover)}')">
      <div class="place-photo-shade">
        <div class="place-photo-ic">${L.ic||'📍'}</div>
        <div style="min-width:0;flex:1"><h2>${esc(L.n)}</h2>
        <div class="place-photo-sub">${esc(areaLine)}</div>
        <div class="place-meta" style="margin-top:8px">${(meta.tags||[]).map(t=>`<span class="place-tag hot">${t}</span>`).join('')}${peopleTag}</div>
        </div>
      </div>
    </div>`;
  }
  return `<div class="place-hero"><div class="ph-ic">${L.ic}</div><div style="min-width:0;flex:1"><h2>${esc(L.n)}</h2>
    <div class="muted sm">${esc(L.d||'')}</div>
    <div class="place-meta">${(meta.tags||[]).map(t=>`<span class="place-tag hot">${t}</span>`).join('')}${peopleTag}</div></div></div>`;
}
function placeListings(locId){
  if(locId==='home') return '';
  const bizs=businessesAtLoc(locId);
  const spots=spotsAtLoc(locId);
  let h=`<div class="section-label">Businesses & spots · ${esc((LOCS[locId]||{}).area||'Kano')}</div>
    <div class="muted tiny px" style="margin-bottom:8px">Shops and places people added in this part of Kano — visit, meet friends, build trust.</div>`;
  if(!bizs.length&&!spots.length){
    h+=`<div class="card empty"><div class="big">📌</div>No listings here yet.<button class="btn sm" style="margin-top:10px" data-a="spotAdd">Add a spot</button></div>`;
    return h;
  }
  h+=bizs.map(b=>`<button class="place-listing" data-a="bizOpen" data-id="${b.id}">
      <div class="pl-img" style="${b.img?`background-image:url('${esc(b.img)}')`:''}">${b.img?'':(b.ic||'🏪')}</div>
      <div class="pl-meta"><b>${esc(b.name)}</b>
        <div class="l">${esc(b.cat)} · ${esc(b.area)}${b.label?' · '+esc(b.label):''}</div>
        <div class="tiny muted">Trust ${Math.round(b.trust||0)} · ${b.owner==='player'?'Yours':'Open'}</div>
      </div>
      <span class="go">›</span>
    </button>`).join('');
  h+=spots.map(s=>`<button class="place-listing" data-a="spotOpen" data-id="${s.id}">
      <div class="pl-img spot" style="${s.img?`background-image:url('${esc(s.img)}')`:''}">${s.img?'':(s.ic||'📍')}</div>
      <div class="pl-meta"><b>${esc(s.name)}</b>
        <div class="l">${esc(s.area)}${s.label?' · '+esc(s.label):''}${s.by==='player'?' · yours':''}</div>
        <div class="tiny muted">${esc(s.note||'Community hangout')}</div>
      </div>
      <span class="go">›</span>
    </button>`).join('');
  h+=`<div class="px" style="margin:8px 0 4px"><button class="btn sm ghost" data-a="spotAdd">＋ Add your spot in this area</button></div>`;
  return h;
}

function townView(){const L=LOCS[G.p.loc],meta=locMeta(G.p.loc),acts=locActions(),hn=here();
 const order=['home','market','restaurant','park','_c','work','bank','social','ajo'];
 const mode=(UI.townMode==='city'?'live':(UI.townMode||'live'));
 const tile=id=>{
  if(id==='_c')return `<div class="tile center"><div>✦</div><b>KANO</b></div>`;
  const l=LOCS[id],h=G.p.loc===id,n=G.npcs.filter(x=>npcLoc(x)===id).length;
  const bizN=id==='home'?0:businessesAtLoc(id).length;
  return `<button class="tile ${h?'here':''}" data-a="travel" data-to="${id}" ${h?'disabled':''} aria-label="${l.n}${h?' (you are here)':''}"><span class="ti">${l.ic}</span><b>${l.n}</b>${h?'<em class="me">You</em>':`<small class="${n||bizN?'busy':''}">${bizN?bizN+' shop'+(bizN>1?'s':''):(n?n+' here':'—')}</small>`}</button>`;
 };
 const dirItem=id=>{
  const l=LOCS[id],h=G.p.loc===id,n=G.npcs.filter(x=>npcLoc(x)===id).length,m=locMeta(id),info=travelInfo(id);
  const trail=h?'You are here':(info?'Open to visit':'');
  const area=l.area?l.area:'';
  return `<button class="dir-item ${h?'here':''}" data-a="${h?'':'travel'}" ${h?'disabled':`data-to="${id}"`}><div class="di-ic">${l.ic}</div><div style="min-width:0;flex:1"><b>${l.n}</b><div class="tiny muted">${area?area+' · ':''}${m.blurb}</div><div class="tiny muted" style="margin-top:2px">${n?n+' people · ':''}${id!=='home'&&businessesAtLoc(id).length?businessesAtLoc(id).length+' shops · ':''}${trail}</div></div><span class="go">${h?'●':'›'}</span></button>`;
 };
 const groups=[['needs','Look after yourself'],['work','Work & money'],['social','People & vibe'],['rest','End the day'],['do','Here']];
 const grouped=groups.map(([g,label])=>{
  const list=acts.filter(a=>a.g===g);
  if(!list.length) return '';
  return `<div class="act-group"><div class="ag-label">${label}</div>${list.map(actButton).join('')}</div>`;
 }).join('');
 const openJobs=G.openJobs?G.openJobs.length:0;
 return `<div class="sec">Map<small>Places, shops, people — free to move · trust is the point</small></div>
 ${homeBanner()}
 <div class="town-tabs">
  <button data-a="townMode" data-v="live" class="${mode==='live'?'on':''}">Live map</button>
  <button data-a="townMode" data-v="map" class="${mode==='map'?'on':''}">Daily places</button>
  <button data-a="townMode" data-v="list" class="${mode==='list'?'on':''}">List</button>
  <button data-a="townMode" data-v="biz" class="${mode==='biz'?'on':''}">Businesses</button>
  <button data-a="townMode" data-v="spots" class="${mode==='spots'?'on':''}">My spots</button>
 </div>
 ${mode==='live'?liveMapBlock():''}
 ${mode==='map'?`<div class="map-wrap"><div class="map">${order.map(tile).join('')}</div><div class="map-legend"><span>Tap a tile to travel</span><span>Free to move · focus is people & trust</span></div></div>
 ${placePhotoBlock(G.p.loc)}
 <div class="card flat" style="margin:0 12px 8px"><div class="travel-hint" style="margin:0">You are here · ${String(G.hour).padStart(2,'0')}:00 · Day ${G.day}. ${meta.blurb}</div>
 <div class="muted sm" style="margin-top:6px">${esc(L.d||'')}</div></div>
 ${placeListings(G.p.loc)}
 ${acts.length?grouped:'<div class="card empty"><div class="big">🗺️</div>Nothing to do here right now.</div>'}
 <div class="sec">People here<small>${hn.length?'Tap someone to talk, share a meal, or help.':'Nobody on this block right now.'}</small></div>
 ${hn.length?hn.map(personRow).join(''):'<div class="card empty"><div class="big">🚶</div>Empty for the moment.</div>'}`:''}
 ${mode==='list'?`<div class="dir-list">${['home','market','restaurant','park','work','bank','social','ajo'].map(dirItem).join('')}</div>`:''}
 ${mode==='biz'?`<div class="px row" style="gap:8px;margin:8px 0"><button class="btn" data-a="bizManage">${playerBiz()?'My business':'＋ List my business'}</button></div>
   <div class="section-label">On the map</div>
   ${G.bizs.filter(b=>!b.closed).map(b=>`<button class="g-card" data-a="bizOpen" data-id="${b.id}" style="width:calc(100% - 24px)"><div class="g-av">${b.ic||'🏪'}</div><div class="meta"><b>${esc(b.name)}</b><div class="l">${esc(b.cat)} · ${esc(b.area)} · trust ${Math.round(b.trust||0)}</div></div></button>`).join('')||'<div class="card empty">No businesses listed.</div>'}`:''}
 ${mode==='spots'?`<div class="px" style="margin:8px 0"><button class="btn" data-a="spotAdd">＋ Add a spot you usually go</button></div>
   <div class="muted tiny px" style="margin-bottom:8px">Your community can see these addresses (area + landmark — not exact street for strangers) and meet friends nearby to build trust.</div>
   <div class="section-label">Your spots</div>
   ${mySpots().length?mySpots().map(s=>`<div class="card spot-tile-card" style="margin:8px 12px">
     <div class="sti" style="${s.img?`background-image:url('${esc(s.img)}')`:''}">${s.img?'':(s.ic||'📍')}</div>
     <div class="stb">
       <b>${esc(s.name)}</b>
       <div class="tiny muted">${esc(s.area||'')}${s.label?(' · '+esc(s.label)):''}</div>
       <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">
         <button class="btn sm" data-a="spotSetDaily" data-id="${s.id}">Here today</button>
         <button class="btn sm ghost" data-a="spotOpen" data-id="${s.id}">Open</button>
         <button class="btn sm ghost" data-a="spotRemove" data-id="${s.id}">Remove</button>
       </div>
     </div>
   </div>`).join('')
   :'<div class="card empty"><div class="big">📌</div>No spots yet. Pin a place on the map and add a photo.</div>'}
   <div class="section-label">Community spots</div>
   ${communitySpots().filter(s=>s.by!=='player').length?communitySpots().filter(s=>s.by!=='player').map(s=>`<button class="g-card" data-a="spotOpen" data-id="${s.id}" style="width:calc(100% - 24px)"><div class="g-av">${s.ic||'📍'}</div><div class="meta"><b>${esc(s.name)}</b><div class="l">${esc(s.area)}${s.label?' · '+esc(s.label):''}</div></div></button>`).join('')
   :'<div class="card empty">No other community spots in view. Enable nearby and set home area.</div>'}`:''}`}

function relPill(n){
 if(n.rel>=80) return '<span class="rel-pill close">Trusted</span>';
 if(n.rel>=60) return '<span class="rel-pill friend">Friend</span>';
 if(n.rel>=35) return '<span class="rel-pill acq">Acquaintance</span>';
 return '<span class="rel-pill low">Low trust</span>';
}
function personRow(n){
 const where=LOCS[npcLoc(n)];
 const fr=isFriend(n.id)?' · Friends':'';
 return `<button class="person" data-a="npc" data-id="${n.id}"><div class="av">${n.em}</div><div class="meta"><b>${n.n}<span class="npc-badge">NPC</span></b><div class="l">${n.occ} · ${relLabel(n)}${fr}</div><div class="tiny muted" style="margin-top:2px">${where.ic} ${where.n}${n.lastSeen?` · last Day ${n.lastSeen}`:''}</div></div><div style="text-align:right">${relPill(n)}<div class="score" style="color:${col(n.rel)};margin-top:4px">${Math.round(n.rel)}</div></div></button>`;
}

function peopleView(){
 const filter=UI.peopleFilter||'all';
 const met=G.npcs.filter(n=>n.met).sort((a,b)=>b.rel-a.rel);
 const close=met.filter(n=>isFriend(n.id)||n.rel>=60);
 const un=G.npcs.filter(n=>!n.met);
 const pendingIn=pendingFriendReqs();const pendingTreats=typeof pendingTreatsIn==='function'?pendingTreatsIn():[];
 const pendingOut=outgoingFriendReqs();
 // Suggested: unmet who share a location with people you know, or high-trust tags nearby spots
 const suggest=un.slice().sort((a,b)=>{
  const sa=a.spots.includes(G.p.loc)?2:0; const sb=b.spots.includes(G.p.loc)?2:0;
  return (sb+b.tr/100)-(sa+a.tr/100);
 }).slice(0,4);
 const list=filter==='close'?close:filter==='all'?met:met;
 const seg=[['all','All '+met.length],['close','Friends '+close.length],['discover','Discover']];
 let body='';
 body+=`<div class="px" style="margin:0 0 10px;display:flex;gap:8px;flex-wrap:wrap">
  <button class="btn sm" data-a="treatOpen">🙏 Ask friend to pay</button>
  <button class="btn sm ghost" data-a="treatsOpen">Treats${pendingTreats.length?` (${pendingTreats.length})`:''}</button>
 </div>`;
 if(pendingTreats.length){
  body+=`<div class="warnbox" style="margin:0 12px 10px">${pendingTreats.length} treat request${pendingTreats.length>1?'s':''} for you — <button class="btn sm" data-a="treatsOpen">Review</button></div>`;
 }
 if(pendingIn.length||pendingOut.length){
  body+=`<div class="section-label">Friend requests</div>`;
  pendingIn.forEach(r=>{
    const n=npc(r.from); if(!n) return;
    body+=`<div class="suggest-card"><div class="av">${n.em}</div><div class="meta"><b>${esc(n.n)}</b><div class="l">${esc(n.occ)} · wants to connect</div></div>
      <button class="btn sm green" data-a="friendAccept" data-id="${r.id}">Accept</button>
      <button class="btn sm ghost" data-a="friendReject" data-id="${r.id}">Reject</button></div>`;
  });
  pendingOut.forEach(r=>{
    const n=npc(r.to); if(!n) return;
    body+=`<div class="suggest-card"><div class="av">${n.em}</div><div class="meta"><b>${esc(n.n)}</b><div class="l">Request pending</div></div>
      <button class="btn sm ghost" data-a="friendCancel" data-id="${n.id}">Cancel</button>
      <button class="btn sm" data-a="npc" data-id="${n.id}">Profile</button></div>`;
  });
 }
 if(filter==='discover'){
  body=`<div class="section-label">Find them in town</div>
   <div class="muted tiny px" style="margin-bottom:8px">These are simulated neighbours. Meet them where they spend the day.</div>
   ${suggest.length?suggest.map(n=>{
    const spot=n.spots[0],L=LOCS[spot],hereNow=npcLoc(n)===G.p.loc;
    return `<div class="suggest-card"><div class="av">${n.em}</div><div class="meta"><b>${n.n}<span class="npc-badge">NPC</span></b><div class="l">${n.occ}</div><div class="tiny muted">${L.ic} often at ${L.n}${hereNow?' · here now':''}</div></div>
     <button class="btn sm ${hereNow?'':'ghost'}" data-a="${hereNow?'npc':'goto'}" ${hereNow?`data-id="${n.id}"`:`data-to="${npcLoc(n)}"`}>${hereNow?'Meet':'Go'}</button></div>`;
   }).join(''):'<div class="card empty"><div class="big">✨</div>No new people nearby right now. Check Places or come back later.</div>'}
   <div class="section-label">Still to meet (${un.length})</div>
   ${un.map(n=>`<div class="person" style="opacity:.85"><div class="av">${n.em}</div><div class="meta"><b>${n.n}</b><div class="l">${n.occ}</div></div><span class="chip">${LOCS[n.spots[0]].ic} ${LOCS[n.spots[0]].n}</span></div>`).join('')}`;
 } else if(!met.length){
  body=`<div class="card empty"><div class="big">👋</div>No one in your network yet.<div class="muted sm" style="margin-top:8px">Relationships start with a hello at the Market or Mama Put.</div>
   <button class="btn sm" style="margin-top:12px" data-a="goto" data-to="market">Go to Kasuwa Market</button>
   <button class="btn sm ghost" style="margin-top:8px" data-a="goto" data-to="restaurant">Go to Mama Put</button></div>`;
 } else {
  body=`<div class="section-label">${filter==='close'?'Close friends':'Your network'}</div>
   ${list.length?list.map(personRow).join(''):'<div class="card empty"><div class="big">🤝</div>No close friends yet.<div class="muted sm" style="margin-top:6px">Talk, share meals, and keep promises to raise relationship.</div></div>'}`;
 }
 return `<div class="sec">Friends & people<small>${met.length} of ${G.npcs.length} known · full chat with voice notes</small></div>
 <div class="people-seg">${seg.map(([k,l])=>`<button data-a="peopleFilter" data-v="${k}" class="${filter===k?'on':''}">${l}</button>`).join('')}</div>
 ${body}`}

function ajoView(){const cat=UI.acat||'';
 const filterPur=list=>cat?list.filter(a=>(a.purpose||'general')===cat):list;
 const mine=filterPur(myAjos()),pub=filterPur(publicAjos()),done=filterPur(G.ajos.filter(a=>a.status==='done'&&a.members.includes('player'))),debts=G.debts.filter(d=>d.m==='player'&&!d.paid);
 const pendingOut=G.ajos.filter(a=>(a.joinReqs||[]).some(r=>r.from==='player'&&r.st==='pending'));
 const purTabs=[{id:'',n:'All'},...AJO_PURPOSES.map(p=>({id:p.id,n:p.ic+' '+p.n.split(' ')[0]}))];
 return `<div class="sec">Ajo<small>Community savings circles — create one for a real need, request to join, and take the pot when it is your turn</small></div>
 <div class="note-sep">Pick a purpose (wedding furniture, kitchen, business tools…). Members share why they join. When you claim the pot, you tell the line what it is for.</div>
 <div class="seg" style="margin:10px 12px;flex-wrap:wrap;overflow:auto">${purTabs.map(p=>`<button data-a="ajoCat" data-v="${p.id}" class="${cat===p.id?'on':''}">${p.n}</button>`).join('')}</div>
 ${blocked()?`<div class="warnbox">🚫 Blocked from new Ajo for ${G.p.blockedUntil-G.day} more day(s).</div>`:''}
 ${debts.map(d=>`<div class="card"><div class="row sp"><div><b>Debt: ${fmt(d.amt)}</b><div class="muted sm">${esc(ajoOf(d.ajo).name)}</div></div><button class="btn sm red" data-a="debt" data-id="${d.id}">Pay</button></div></div>`).join('')}
 <div class="section-label">My circles</div>
 ${mine.length?mine.map(ajoCard).join(''):'<div class="card empty"><div class="big">🤝</div>No circle yet. Create one for a community need, or request a public loop below.</div>'}
 <div class="px" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
 <button class="btn" data-a="ajoNew" style="flex:1">＋ Create public Ajo</button>
 <button class="btn ghost" data-a="ajoCodeOpen" style="flex:1">Have a code?</button>
</div>
 ${pendingOut.length?`<div class="section-label">Your requests</div>${pendingOut.map(a=>{const r=(a.joinReqs||[]).find(x=>x.from==='player'&&x.st==='pending');const pur=ajoPurpose(a.purpose);return `<div class="card"><b>${esc(a.name)}</b><div class="muted sm">${pur.ic} ${esc(pur.n)} · ${fmt(a.amt)} / ${a.freq}d</div>${r&&r.reason?`<div class="tiny muted" style="margin-top:4px">Your reason: ${esc(r.reason)}</div>`:''}</div>`}).join('')}`:''}
 <div class="section-label">Public loops open to request</div>
 <div class="muted tiny px" style="margin-bottom:8px">Organizers made these discoverable. Send a request with your reason — they accept or decline.</div>
 ${pub.length?pub.map(a=>{
  const h=a.host==='player'?G.p:npc(a.host);
  const pending=(a.joinReqs||[]).some(r=>r.from==='player'&&r.st==='pending');
  const why=joinCheck(a);
  const pur=ajoPurpose(a.purpose);
  return `<div class="g-card" style="width:calc(100% - 24px);display:flex"><div class="g-av">${a.host==='player'?avatar(G.p.gender):(h&&h.em)||pur.ic||'🤝'}</div><div class="meta" style="flex:1"><b>${esc(a.name)}</b><div class="l">${fmt(a.amt)} every ${a.freq} days · ${a.members.length}/${a.size} · ${a.host==='player'?'You':esc(h&&h.n||'Host')}</div>
   <div class="tiny muted">${pur.ic} ${esc(pur.n)} · public</div></div>
   <div style="display:flex;flex-direction:column;gap:6px">
    <button class="btn sm ghost" data-a="ajoOpen" data-id="${a.id}">View</button>
    ${pending?'<span class="pill wait">Pending</span>':why?`<span class="pill wait">Locked</span>`:`<button class="btn sm" data-a="ajoRequest" data-id="${a.id}">Request</button>`}
   </div></div>`;
 }).join(''):'<div class="card empty"><div class="big">🔎</div>No public seats in this category. Create one for your people.</div>'}
 ${done.length?`<div class="section-label">Completed</div>${done.map(ajoCard).join('')}`:''}`}

function ajoCard(a){const st={open:'Gathering',stones:a.rolled?'Order set':'Pick stones',voting:'Voting',active:'Running',done:'Complete'}[a.status]||a.status;const mem=a.members.length;
 const unread=a.chat&&a.chat.length?a.chat.length:0;
 const pur=ajoPurpose(a.purpose);
 let line='';if(a.status==='active'){const d=dueDay(a);const adv=advancesOutstanding(a,'player');line=`<div class="row sp sm" style="margin-top:8px"><span class="muted">Round ${a.cycle+1}/${a.size} · due Day ${d}</span><span>→ ${nm(a.order[a.cycle])}</span></div>${adv?`<div class="tiny" style="margin-top:4px;color:var(--danfo)">Circle credit owed: ${fmt(adv)} (cuts your pot)</div>`:''}`}
 if(a.status==='stones')line=`<div class="tiny muted" style="margin-top:6px">${a.rolled?'Stone order locked. Ready to start.':'Choose your stone · organizer is always first'}</div>`;
 if(a.status==='open'&&a.host==='player'&&(a.joinReqs||[]).some(r=>r.st==='pending'))line+=`<div class="tiny" style="margin-top:6px;color:var(--danfo)">Join requests waiting</div>`;
 line+=`<div class="tiny muted" style="margin-top:4px">${pur.ic} ${esc(pur.n)} · ${a.vis==='public'?'🌐 Public':'🔒 Private'}${unread?` · 💬 ${unread} messages`:''}</div>`;
 return `<button class="card" style="width:calc(100% - 24px);text-align:left;display:block" data-a="ajoOpen" data-id="${a.id}"><div class="row sp"><b style="font-size:17px">${esc(a.name)}</b><span class="pill wait">${st}</span></div><div class="muted sm" style="margin-top:4px">${fmt(a.amt)} every ${a.freq} days · ${mem}/${a.size}</div>${line}</button>`}

function moreView(){const seg=[['ledger','Money'],['rep','Trust & Rep'],['journey','Journey'],['shop','Shop'],['gstats','Groups'],['settings','Settings']];
 return `<div class="seg">${seg.map(([k,l])=>`<button data-a="more" data-v="${k}" class="${UI.more===k?'on':''}">${l}</button>`).join('')}</div>`+({ledger:ledgerV,rep:repV,journey:journeyV,shop:shopV,gstats:gstatsV,settings:settingsV}[UI.more])()}
function ledgerV(){
  ensureKyc();
  const k=G.p.kyc||{};
  const b=G.p.bank;
  return `<div class="px" style="margin:8px 0 12px;display:flex;flex-wrap:wrap;gap:8px">
  <button class="btn" data-a="topUpOpen">＋ Top up</button>
  <button class="btn ghost" data-a="wdOpen">Withdraw</button>
 </div>
 <section class="card"><b>Identity & payouts</b>
  <div class="row sp" style="margin-top:8px"><span class="muted sm">NIN verification</span><span class="pill ${k.status==='verified'?'ok':'wait'}">${k.status||'unverified'}</span></div>
  <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
   <button class="btn sm" data-a="kycOpen">Verify NIN</button>
   <button class="btn sm ghost" data-a="bankOpen">Bank account</button>
  </div>
  ${b?`<div class="tiny muted" style="margin-top:8px">${esc(b.bankName)} · ••••${esc(String(b.accountNumber).slice(-4))} · ${esc(b.accountName)}</div>`:'<div class="tiny muted" style="margin-top:8px">Add a bank account to withdraw pot money.</div>'}
 </section>
 <section class="card">${G.tx.length?G.tx.slice(0,40).map(t=>`<div class="tx"><div><b>${esc(t.label)}</b><div class="tiny muted">Day ${t.day} · ${t.cat}</div></div><span class="${t.amount>0?'pos':'neg'}">${t.amount>0?'+':'−'}${fmt(t.amount)}</span></div>`).join(''):'<div class="muted">No transactions yet.</div>'}</section>`}
function repV(){const mk=(arr,l)=>`<section class="card"><b>${l}</b>${arr.length?arr.slice(0,12).map(h=>`<div class="tx"><div>${esc(h.why)}<div class="tiny muted">Day ${h.day} → ${h.v}</div></div><span class="${h.d>0?'pos':'neg'}">${h.d>0?'+':''}${h.d}</span></div>`).join(''):'<div class="muted sm" style="margin-top:6px">Nothing yet.</div>'}</section>`;return mk(G.th,'🤝 Trust history')+mk(G.rh,'⭐ Reputation history')}
function spark(arr,c,l){if(arr.length<2)return `<div class="muted sm">${l}: more days needed</div>`;const w=300,h=60,mx=Math.max(...arr,1),mn=Math.min(...arr,0),r=mx-mn||1;const pts=arr.map((v,i)=>`${(i/(arr.length-1)*w).toFixed(1)},${(h-4-(v-mn)/r*(h-8)).toFixed(1)}`).join(' ');return `<div style="margin:10px 0"><div class="row sp sm"><b>${l}</b><span class="muted">${arr[arr.length-1].toLocaleString('en-US')}</span></div><svg viewBox="0 0 ${w} ${h}" width="100%" height="60" preserveAspectRatio="none"><polyline fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/></svg></div>`}
function journeyV(){const s=G.snap.concat([{day:G.day,nw:netWorth(),trust:Math.round(G.p.trust),rep:Math.round(G.p.rep)}]);const ms=Object.values(G.mile).sort((a,b)=>b.day-a.day);
 return `<section class="card"><b>📈 Your life so far</b>${spark(s.map(x=>x.nw),'#ffc928','Net worth (₦)')}${spark(s.map(x=>x.trust),'#22c177','Trust')}${spark(s.map(x=>x.rep),'#5cc8ff','Reputation')}</section>
 <section class="card"><b>🏁 Milestones</b>${ms.length?ms.map(m=>`<div class="tx"><span>${esc(m.txt)}</span><span class="muted tiny">Day ${m.day}</span></div>`).join(''):'<div class="muted sm">Your story starts now.</div>'}</section>`}
function shopV(){const b=G.biz;return b?`<section class="card"><b>🥤 Mini Shop</b><div class="row sp" style="margin-top:8px"><span class="muted">Stock</span><b>${b.stock} drinks</b></div><div class="row sp"><span class="muted">Sold</span><b>${b.sold}</b></div><div class="row sp"><span class="muted">Revenue</span><b>${fmt(b.rev)}</b></div><div class="row sp"><span class="muted">Profit</span><b class="pos">${fmt(b.profit)}</b></div><div class="muted tiny" style="margin-top:8px">Buy at ~${fmt(UNIT_COST)}, sell at ${fmt(UNIT_PRICE)}. Friends send customers.</div></section><section class="card"><b>Shop activity</b>${b.sold||G.btx.length?G.btx.slice(0,15).map(t=>`<div class="tx"><span>${esc(t.txt)}</span><span class="${t.amt>0?'pos':'neg'}">${t.amt>0?'+':'−'}${fmt(t.amt)}</span></div>`).join(''):''}</section>`:`<section class="card"><b>No shop yet</b><div class="muted sm" style="margin-top:6px">Open the Mini Shop at the Market for ${fmt(SHOP_COST)}.</div></section>`}
function settingsV(){
  const online=typeof api!=='undefined'&&api.online;
  const signedIn=online&&api.userId;
  const acc=typeof Account!=='undefined'?Account.load():null;
  const uname=(G&&G.p&&G.p.username)||(acc&&acc.username)||'';
  return `<section class="card"><b>Account</b>
<div class="muted sm" style="margin:6px 0 10px">${uname?'Signed in as <b>@'+esc(uname)+'</b>':'Playing on this device'}${online?(signedIn?' · 🟢 Online':' · 🟢 Online ready'):' · ⚪ Offline'}</div>
<button class="btn" data-a="logout" style="width:100%">Log out</button>
<div class="tiny muted" style="margin-top:8px">Saves your progress${online?' to the cloud':''}, then returns to the welcome screen. You can sign back in anytime.</div>
</section>
<section class="card"><b>About</b>
<div class="muted sm" style="margin:6px 0 10px">The idea behind Ajo Loop — community, trust, and the circle.</div>
<a class="btn sm" href="/welcome.html" style="text-decoration:none">Read the welcome story</a>
</section>
<section class="card"><b>Connection</b>
<div class="muted sm" style="margin:6px 0">${online?'🟢 Online — progress syncs to your account.':'⚪ Offline — local only on this device.'}</div>
</section>
<section class="card"><b>About AjoLoop</b><div class="muted sm" style="margin:6px 0;line-height:1.5">
Meet people. Share real experiences at local places. Build communities you can rely on. When a circle is ready, Ajo is a voluntary way to save together — not the starting point.
<br><br>
Trust grows from showing up, keeping word, and feedback after real interactions — not a single score that claims to know your character.
<br><br>
This offline build stores data on this device until the backend is connected.
</div></section>
<section class="card"><b>The path</b>
<div class="muted sm" style="margin-top:6px;line-height:1.55">
<b>1. Meet</b> — interests, people nearby, friend requests<br>
<b>2. Experience</b> — local businesses, spots, hangouts<br>
<b>3. Belong</b> — groups, chat, shared activities<br>
<b>4. Support</b> — Ajo only when your community chooses it
</div></section>
<section class="card"><b>Time</b><div class="muted sm" style="margin:6px 0 10px">Advance the day to run Ajo contribution cycles.</div>
 <button class="btn ghost" data-a="sleep">⏭ Next day</button>
</section>
<section class="card"><b>Reset</b><div class="muted sm" style="margin:6px 0 10px">Deletes progress on this device.</div><button class="btn ${UI.confirmReset?'red':'ghost'}" data-a="reset">${UI.confirmReset?'Tap again to erase everything':'Start over'}</button></section>`}

/* ---- sheets ---- */

function giftsHubSheet(){
  ensureGifts();
  const stars=G.p.stars|0;
  const slots=G.p.giftSlots||[];
  const pending=slots.map((s,i)=>s&&s.status==='pending'?{...s,slot:i}:null).filter(Boolean);
  const wellness=typeof wellnessNearby==='function'?wellnessNearby():[];
  return `<div class="gift-hub">
  <div class="gift-hero"><div class="big">📍</div><h2>Experiences to attend</h2>
  <p class="muted sm">These are real bookings at partner places. Unlocking is not the same as going — mark <b>I went</b> after you show up. Trust grows when you attend.</p>
  <div class="stars-pill">Activity ${stars}</div>
  </div>
  <div class="section-label">Waiting for you · ${pending.length}</div>
  ${pending.length?pending.map(s=>`<div class="card" style="margin-bottom:8px">
    <div class="row sp"><b>${s.ic||''} ${esc(s.n)}</b><span class="pill wait">To attend</span></div>
    <div class="muted sm" style="margin:6px 0">${esc(s.d||'')}</div>
    ${s.bizId&&bizById(s.bizId)?`<div class="tiny muted">${esc(bizById(s.bizId).name)} · ${esc(bizById(s.bizId).area)}</div>
    <button class="btn sm ghost" style="margin-top:8px" data-a="bizOpen" data-id="${s.bizId}">View place</button>`:''}
    <button class="btn green" style="width:100%;margin-top:8px" data-a="giftAttend" data-i="${s.slot}">I attended this</button>
  </div>`).join(''):'<div class="card empty"><div class="muted sm">No pending experiences. Unlock one when you are active — then go in person.</div></div>'}
  <button class="btn" style="width:100%;margin-top:12px" data-a="giftWheelOpen">Unlock an experience</button>
  <div class="section-label" style="margin-top:16px">Partner places</div>
  ${wellness.map(b=>`<button type="button" class="g-card" data-a="bizOpen" data-id="${b.id}" style="width:100%;margin:0 0 8px">
    <div class="g-av">${b.ic||'🧘'}</div>
    <div class="meta"><b>${esc(b.name)}</b><div class="l">${esc(b.area)} · ${esc(b.cat)}</div></div>
  </button>`).join('')||'<div class="muted sm">Explore Places for partners near you.</div>'}
  <div class="tiny muted" style="margin-top:12px">Not free virtual money. These are commitments to show up at real spots in your area.</div>
  </div>`;
}
function giftWheelSheet(){
  ensureGifts();
  const spinsLeft=Math.max(0,3-(G.p.spinsToday||0));
  const spinning=UI.giftSpinning;
  return `<div class="gift-wheel-wrap">
  <button class="x" data-a="giftsOpen" aria-label="Back" style="position:absolute;right:12px;top:12px">✕</button>
  <h2 class="center">Unlock a real experience</h2>
  <p class="muted sm center">Based on community activity · ${spinsLeft} spin${spinsLeft===1?'':'s'} left today</p>
  <div class="wheel-stage">
    <div class="wheel-pointer">▼</div>
    <div class="wheel ${spinning?'spinning':''}" id="ajo-wheel">
      <div class="w-slice s0"><span>FREE</span></div>
      <div class="w-slice s1"><span>5%</span></div>
      <div class="w-slice s2"><span>Salon</span></div>
      <div class="w-slice s3"><span>10%</span></div>
      <div class="w-slice s4"><span>Spa</span></div>
      <div class="w-slice s5"><span>20%</span></div>
      <div class="w-slice s6"><span>Stars</span></div>
      <div class="w-slice s7"><span>Yoga</span></div>
      <button class="wheel-hub" data-a="giftSpin" ${spinning?'disabled':''}>SPIN</button>
    </div>
  </div>
  <button class="btn" style="width:100%;margin-top:16px" data-a="giftSpin" ${spinning?'disabled':''}>Spin (${spinsLeft} left)</button>
  <p class="tiny muted center" style="margin-top:10px">First unlock free each day. Later ones need activity points. You still must attend the place — unlocking is only the booking.</p>
  ${UI.giftResult?`<div class="gift-result card">${esc(UI.giftResult)}</div>`:''}
  </div>`;
}
function giftReadySheet(){
  return `<div class="gift-ready">
  <div class="ready-text">ARE YOU<br>READY?</div>
  <p class="muted sm center" style="margin-top:16px">Unlock bookings at partner places near you. They stay on your list until you attend. Showing up builds trust — not free virtual cash.</p>
  <button class="btn" style="width:100%;margin-top:18px" data-a="giftReadyGo">Let&apos;s go</button>
  <button class="btn ghost" style="width:100%;margin-top:8px" data-a="close">Maybe later</button>
  </div>`;
}



function dailyPlaceSheet(){
  const places=Object.keys(LOCS).filter(k=>k!=='ajo'&&k!=='home');
  const dp=typeof myDailyPlace==='function'?myDailyPlace():null;
  const cur=UI.dailyPlaceForm||{loc:(dp&&dp.loc)||G.p.loc||'market',note:(dp&&dp.note)||'',spotId:(dp&&dp.spotId)||null};
  UI.dailyPlaceForm=cur;
  const mine=typeof playerSpots==='function'?playerSpots():(G.spots||[]).filter(s=>s.by==='player'&&!s.removed);
  return `<h2>Where I am today</h2>
  <div class="muted sm" style="margin:4px 0 12px">Friends can see this and request to visit. You approve each request.</div>
  ${mine.length?`<label class="l">Your map places</label>
  <div class="daily-spot-grid">${mine.map(s=>{
    const on=cur.spotId===s.id;
    return `<button type="button" class="daily-spot-tile ${on?'on':''}" data-a="dailyPlaceSpot" data-id="${s.id}">
      <div class="dst-img" style="${s.img?`background-image:url('${esc(s.img)}')`:''}">${s.img?'':(s.ic||'📍')}</div>
      <div class="dst-meta"><b>${esc(s.name)}</b><span class="tiny muted">${esc(s.area||'')}${s.label?(' · '+esc(s.label)):''}</span></div>
    </button>`;
  }).join('')}</div>
  <div class="tiny muted" style="margin:6px 0 12px">Create more under Town → My spots (pin on map + photo).</div>`:''}
  <label class="l">City places</label>
  <div class="opts" style="flex-wrap:wrap">${places.map(k=>{
    const L=LOCS[k];
    const on=!cur.spotId&&cur.loc===k;
    return `<button data-a="dailyPlaceLoc" data-v="${k}" class="${on?'on':''}">${L.ic} ${esc(L.n)}</button>`;
  }).join('')}</div>
  <label class="l">Note (optional)</label>
  <div class="field"><input type="text" data-f="dailyPlaceNote" maxlength="120" placeholder="e.g. At the stall until evening" value="${esc(cur.note||UI.gi.dailyPlaceNote||'')}"></div>
  <button class="btn" style="width:100%;margin-top:14px" data-a="dailyPlaceSave">Share with friends</button>
  ${dp?`<button class="btn ghost" style="width:100%;margin-top:8px" data-a="dailyPlaceClear">Stop sharing today</button>`:''}`;
}

function kycSheet(){
  ensureKyc();
  const k=G.p.kyc;
  const st=k.status||'unverified';
  return `<h2>Verify identity (NIN)</h2>
  <div class="muted sm" style="margin:4px 0 12px">Required before bank payouts and pot withdrawals. We store only a secure hash — never show your full NIN again.</div>
  <div class="card" style="margin-bottom:12px"><div class="row sp"><b>Status</b><span class="pill ${st==='verified'?'ok':st==='pending'?'wait':'wait'}">${st}</span></div>
  ${k.ninLast4?`<div class="tiny muted" style="margin-top:6px">NIN ••••${esc(k.ninLast4)}${k.fullName?(' · '+esc(k.fullName)):''}</div>`:''}</div>
  ${st==='verified'?`<div class="pill ok">Verified — you can add a bank and withdraw.</div>`:`
  <label class="l">Full legal name (as on NIN)</label>
  <div class="field"><input type="text" data-f="kycName" maxlength="120" placeholder="As on your NIN slip" value="${esc(UI.gi.kycName||k.fullName||G.p.name||'')}"></div>
  <label class="l">NIN (11 digits)</label>
  <div class="field"><input type="text" data-f="kycNin" inputmode="numeric" maxlength="11" placeholder="12345678901" value="${esc(UI.gi.kycNin||'')}"></div>
  <button class="btn" style="width:100%;margin-top:14px" data-a="kycSubmit">Submit for verification</button>
  <div class="tiny muted" style="margin-top:8px">Review may take time. Pending status still lets you save a bank account.</div>`}`;
}
function bankSheet(){
  const b=G.p.bank;
  const code=(UI.gi.bankCode||(b&&b.bankCode)||'058');
  return `<h2>Bank account for payouts</h2>
  <div class="muted sm" style="margin:4px 0 12px">Pots and wallet withdrawals go to this account after approval.</div>
  ${!kycReady()?`<div class="warnbox">Submit NIN verification first.</div>`:''}
  ${b?`<div class="card" style="margin-bottom:12px"><b>${esc(b.bankName)}</b><div class="muted sm">${esc(b.accountName)} · ••••${esc(String(b.accountNumber).slice(-4))}</div></div>`:''}
  <label class="l">Bank</label>
  <div class="opts" style="flex-wrap:wrap;max-height:140px;overflow:auto">${NG_BANKS_UI.map(x=>`<button data-a="bankCode" data-v="${x.c}" data-n="${x.n}" class="${code===x.c?'on':''}">${esc(x.n)}</button>`).join('')}</div>
  <label class="l">Account number (10 digits)</label>
  <div class="field"><input type="text" data-f="bankAcct" inputmode="numeric" maxlength="10" placeholder="0123456789" value="${esc(UI.gi.bankAcct||(b&&b.accountNumber)||'')}"></div>
  <label class="l">Account name</label>
  <div class="field"><input type="text" data-f="bankName" maxlength="120" placeholder="Name on the account" value="${esc(UI.gi.bankName||(b&&b.accountName)||G.p.name||'')}"></div>
  <button class="btn" style="width:100%;margin-top:14px" data-a="bankSave" ${kycReady()?'':'disabled'}>Save bank account</button>`;
}
function withdrawSheet(){
  const bal=G.p.cash|0;
  const amts=[1000,2000,5000,10000,20000,50000].filter(a=>a<=bal);
  return `<h2>Withdraw to bank</h2>
  <div class="muted sm" style="margin:4px 0 12px">Send wallet / pot balance to your saved bank account.</div>
  <div class="card" style="text-align:center;margin-bottom:12px"><div class="tiny muted">Available</div><div class="cash" style="font-size:26px">${fmt(bal)}</div></div>
  ${!kycReady()?`<div class="warnbox">Verify NIN first.</div>`:''}
  ${!bankReady()?`<div class="warnbox">Add a bank account first.</div>`:''}
  <label class="l">Amount</label>
  <div class="opts">${amts.map(a=>`<button data-a="wdAmt" data-v="${a}" class="${+(UI.wdAmt||0)===a?'on':''}">${fmt(a)}</button>`).join('')||'<span class="muted sm">Top up or claim a pot first</span>'}</div>
  <div class="field" style="margin-top:8px"><input type="number" id="f-wd" min="500" max="${bal}" step="100" value="${UI.wdAmt||''}" placeholder="Custom amount"></div>
  <button class="btn" style="width:100%;margin-top:14px" data-a="wdGo" ${kycReady()&&bankReady()&&bal>=500?'':'disabled'}>Withdraw</button>`;
}

function topUpSheet(){
  const bal=G.p.cash|0;
  const amts=[1000,2000,5000,10000,20000,50000];
  const online=typeof api!=='undefined'&&api.online;
  return `<h2>Top up balance</h2>
  <div class="muted sm" style="margin:4px 0 12px">Add real NGN with card or bank transfer (Bachs). Funds credit your Ajoloop wallet after payment succeeds.</div>
  <div class="card" style="text-align:center;margin-bottom:12px">
    <div class="tiny muted">Current balance</div>
    <div class="cash" style="font-size:28px;margin-top:4px">${fmt(bal)}</div>
  </div>
  ${!online?`<div class="warnbox">Sign in with an online account to top up. Payments need Supabase + Bachs.</div>`:''}
  <label class="l">Quick amounts</label>
  <div class="opts">${amts.map(a=>`<button data-a="topUpAmt" data-v="${a}" class="${+(UI.topUpAmt||0)===a?'on':''}">${fmt(a)}</button>`).join('')}</div>
  <label class="l">Custom amount (₦)</label>
  <div class="field"><input type="number" id="f-topup" min="100" max="500000" step="100" placeholder="e.g. 7500" value="${UI.topUpAmt||''}"></div>
  <button class="btn" style="width:100%;margin-top:14px" data-a="topUpGo" ${online?'':'disabled'}>Pay with Bachs</button>
  <div class="tiny muted" style="margin-top:10px">You will be redirected to secure checkout. After paying, return here — your balance updates automatically.</div>`;
}

function sheetHtml(){let h='';
 if(G.ev)return wrap(eventSheet(),true);
 const m=UI.modal;if(!m)return '';
 if(m.t==='npc')h=npcSheet(npc(m.id));if(m.t==='ajo')h=ajoSheet(ajoOf(m.id));if(m.t==='ajoJoin')h=ajoJoinSheet(ajoOf(m.id));if(m.t==='ajoCode')h=ajoCodeSheet();if(m.t==='ajoShare')h=ajoShareSheet(ajoOf(m.id));if(m.t==='avatar')h=avatarSheet(!!m.create);if(m.t==='storeAvatar')h=storeAvatarSheet(!!m.create);if(m.t==='ajoNew')h=ajoNewSheet();if(m.t==='notes')h=notesSheet();if(m.t==='jobs')h=jobsSheet();if(m.t==='grp')h=grpSheet(m.id);if(m.t==='gnew')h=gnewSheet();if(m.t==='gcode')h=gcodeSheet();if(m.t==='ginv')h=ginvSheet(m.id);if(m.t==='gajo')h=gajoSheet(m.id);
 if(m.t==='home')h=homeSheet();if(m.t==='work')h=workSheet();if(m.t==='bizManage')h=bizManageSheet();if(m.t==='biz')h=bizDetailSheet(bizById(m.id));if(m.t==='chat')h=chatSheet(m.id);if(m.t==='treat')h=treatRequestSheet();if(m.t==='treats')h=treatsInboxSheet();
 if(m.t==='spotAdd')h=spotAddSheet();if(m.t==='spot')h=spotDetailSheet(m.id);
 if(m.t==='gifts')h=giftsHubSheet();
 if(m.t==='giftWheel')h=giftWheelSheet();
 if(m.t==='giftReady')h=giftReadySheet();
 if(m.t==='topup')h=topUpSheet();if(m.t==='kyc')h=kycSheet();if(m.t==='bank')h=bankSheet();if(m.t==='withdraw')h=withdrawSheet();if(m.t==='dailyPlace')h=dailyPlaceSheet();
 return wrap(h)}
function wrap(h,lock){return `<div class="back" ${lock?'':'data-a="closeBack"'}><div class="sheet" id="sheet">${lock?'':'<button class="x" data-a="close" aria-label="Close">✕</button>'}${h}</div></div>`}

function eventSheet(){const e=G.ev,v=EV[e.id].view(e.d);return `<div class="ev"><div class="big">${v.ic}</div><h2 class="center">${v.t}</h2><p class="center" style="font-weight:700;line-height:1.45">${esc(v.txt)}</p>${v.ch.map((c,i)=>{const dis=c.need&&G.p.cash<c.need?'Need '+fmt(c.need):c.dis||'';return `<button class="btn ${i===0?'':'ghost'}" style="margin-top:10px" data-a="ev" data-i="${i}" ${dis?'disabled':''}>${esc(c.l)}${dis?' ('+dis+')':''}</button>`}).join('')}</div>`}

function npcSheet(n){const here_=npcLoc(n)===G.p.loc,p=G.p;const know=n.rel>=50;
 const wl=n.w>=65?'Well-off':n.w>=40?'Getting by':'Struggling';
 const reads=know?(n.tr>=70?'Reliable. Keeps their word.':n.tr>=45?'Mixed record — stay alert.':'Not dependable with money or time.'):'Meet them and build history before you judge.';
 const where=LOCS[npcLoc(n)];
 return `<div class="profile-hero"><div class="av-lg">${n.em}</div><h2>${n.n}<span class="npc-badge">NPC</span></h2><div class="muted sm">${n.occ}</div>
 ${n.met?`<div style="margin-top:8px">${relPill(n)}</div>`:''}</div>
 <div class="muted sm" style="margin:10px 0;line-height:1.45">${n.bio}</div>
 <div>${n.tags.map(t=>`<span class="tag">${t}</span>`).join('')}<span class="tag">${wl}</span></div>
 ${n.met?`<div class="card" style="margin-top:12px"><div class="row sp"><b>${relLabel(n)}</b><b style="color:${col(n.rel)}">${Math.round(n.rel)}/100</b></div>${bar(n.rel,col(n.rel))}
 <div class="tiny muted" style="margin-top:8px">Raised by talking, shared meals, help, and kept promises. Hurt by missed Ajo or broken word.</div></div>`
 :`<div class="card empty" style="margin-top:12px"><div class="big">🤝</div>You have not met yet. Say hello when you are in the same place.</div>`}
 <div class="card" style="background:var(--card)"><div class="tiny muted" style="font-weight:800">CAN YOU TRUST THEM?</div><div style="margin-top:4px;font-weight:700">${reads}</div>
 <div class="tiny muted" style="margin-top:6px">This is limited evidence from interactions here — not a real-money credit score or a judgment of character.</div></div>
 ${n.said?`<div class="card" style="background:var(--card2)">“${esc(n.said)}”</div>`:''}
 ${(()=>{
   if(!n.met) return '';
   const close=isFriend(n.id)||n.rel>=60;
   if(!close) return `<div class="card"><div class="muted sm">Become friends to see where they are today and request a visit.</div></div>`;
   const dp=typeof npcDailyPlace==='function'?npcDailyPlace(n):null;
   if(!dp) return `<div class="card"><div class="muted sm">No shared place today.</div></div>`;
   const L=LOCS[dp.loc]||{};
   const pending=(G.visitReqs||[]).some(r=>r.from==='player'&&r.to===n.id&&r.st==='pending'&&r.day===G.day);
   const accepted=typeof acceptedVisitToday==='function'&&acceptedVisitToday(n.id);
   return `<div class="card"><b>📍 Today</b><div class="muted sm" style="margin-top:4px">${L.ic||''} ${esc(L.n||dp.loc)}${dp.note?(' · '+esc(dp.note)):''}</div>
    ${accepted?`<div class="pill ok" style="margin-top:8px">Visit approved — you can go</div>
      <button class="btn sm" style="margin-top:8px" data-a="goto" data-to="${dp.loc}">Go there</button>`
     :pending?`<span class="pill wait" style="margin-top:8px;display:inline-block">Visit request pending</span>`
     :`<button class="btn sm" style="margin-top:10px" data-a="visitRequest" data-id="${n.id}">Request to visit</button>
       <div class="tiny muted" style="margin-top:6px">They must approve before you join them there.</div>`}
   </div>`;
 })()}
 <div class="profile-actions">
 ${(()=>{const st=friendStatus(n.id);
   if(!n.met) return '';
   if(st==='friends') return `<button class="btn green" data-a="chatOpen" data-id="${n.id}">💬 Chat</button><div class="muted sm center" style="margin:4px 0 8px">Friends · you can message anytime</div>`;
   if(st==='pending_out') return `<button class="btn ghost" data-a="friendCancel" data-id="${n.id}">Request pending · Cancel</button>`;
   if(st==='pending_in'){const rid=pendingFriendReqs().find(r=>r.from===n.id);return rid?`<div class="row" style="gap:8px"><button class="btn green" style="flex:1" data-a="friendAccept" data-id="${rid.id}">Accept friend</button><button class="btn ghost" style="flex:1" data-a="friendReject" data-id="${rid.id}">Reject</button></div>`:''}
   return `<button class="btn" data-a="friendReq" data-id="${n.id}">🤝 Add friend</button><div class="muted sm center" style="margin:4px 0 8px">They accept or reject — then you can chat</div>`;
 })()}
 ${here_?`<button class="btn ${friendStatus(n.id)==='friends'?'ghost':''}" data-a="talk" data-id="${n.id}">💬 Talk in person · 1 hour</button>
 ${p.loc==='restaurant'?`<button class="btn ghost" data-a="eatw" data-id="${n.id}">🍛 Eat together · ₦3,000 (you pay)</button>`:''}
 ${isFriend(n.id)?`<button class="btn ghost" data-a="treatOpenFriend" data-id="${n.id}">🙏 Ask them to cover a local treat</button>`:''}
 <div class="row" style="gap:8px"><button class="btn ghost sm" style="flex:1" data-a="helpn" data-id="${n.id}" data-n="2000" ${p.cash<2000?'disabled':''}>Help ₦2,000</button><button class="btn ghost sm" style="flex:1" data-a="helpn" data-id="${n.id}" data-n="5000" ${p.cash<5000?'disabled':''}>Help ₦5,000</button></div>`
 :`<div class="card" style="background:var(--card);margin:0">Right now at <b>${where.ic} ${where.n}</b>.
 <button class="btn ghost" style="margin-top:10px" data-a="goto" data-to="${npcLoc(n)}">Go there · travel costs apply</button></div>`}
 ${G.promises.filter(x=>x.npc===n.id).map(pr=>`<button class="btn green" data-a="keep" data-id="${pr.id}">🤞🏾 Keep promise · bring ${fmt(pr.amt)}</button>`).join('')}
 </div>
 ${n.hist.length?`<div class="section-label">Between you two</div>${n.hist.slice(0,6).map(h=>`<div class="tx sm"><span>${esc(h.why)} <span class="muted tiny">Day ${h.day}</span></span><span class="${h.d>0?'pos':'neg'}">${h.d>0?'+':''}${h.d}</span></div>`).join('')}`:''}`}



function ajoPotCard(a){
  if(!a||(a.status!=='active'&&a.status!=='open'&&a.status!=='stones'))return '';
  ensureRoundPot(a);
  const rp=a.roundPot||{collected:0,target:potTarget(a)};
  const target=rp.target||potTarget(a)||1;
  const collected=rp.collected|0;
  const pct=Math.min(100,Math.round(collected/target*100));
  const paid=potPaidCount(a), need=potExpectedPayers(a);
  const rec=a.status==='active'&&a.order&&a.order[a.cycle]!=null?nm(a.order[a.cycle]):'—';
  const full=collected>=target&&target>0;
  return `<section class="card ajo-pot-card">
    <div class="row sp"><b>💰 Circle pot</b><span class="pill ${full?'ok':'wait'}">${full?'Ready to pay out':'Filling'}</span></div>
    <div class="ajo-pot-visual">
      <div class="ajo-pot-jar">
        <div class="ajo-pot-fill" style="height:${pct}%"></div>
        <div class="ajo-pot-amt">${fmt(collected)}</div>
      </div>
      <div class="ajo-pot-meta">
        <div class="row sp sm"><span class="muted">This round</span><b>${fmt(collected)} / ${fmt(target)}</b></div>
        <div class="ajo-pot-bar"><i style="width:${pct}%"></i></div>
        <div class="row sp sm" style="margin-top:8px"><span class="muted">Contributions</span><b>${paid} / ${need}</b></div>
        ${a.status==='active'?`<div class="row sp sm"><span class="muted">Receives pot</span><b>${esc(rec)}</b></div>`:''}
        <div class="tiny muted" style="margin-top:8px">Every payment adds to the pot. When everyone has paid, the pot pays out in stone order.</div>
      </div>
    </div>
  </section>`;
}
function ajoStoneOrderCard(a,animating){
  if(!a)return '';
  if(animating){
    const pool=a.members.filter(m=>m!==a.host).map(m=>{
      const st=stoneOf(a,m);
      return {m,ic:st?st.ic:'🪨',n:st?st.n:'Stone'};
    });
    // scramble display order for animation frames
    const scrambled=[...pool].sort(()=>Math.random()-0.5);
    return `<section class="card stone-roll-card">
      <b>🎲 Shuffling stones…</b>
      <div class="muted sm" style="margin:6px 0 10px">Everyone watches — fair order is being drawn.</div>
      <div class="stone-shuffle">${scrambled.map((x,i)=>`<div class="stone-chip shuffle" style="animation-delay:${i*0.08}s"><span class="sic">${x.ic}</span><span class="sn">${esc(nm(x.m))}</span></div>`).join('')}</div>
      <div class="tiny muted" style="margin-top:10px">Organizer is always round 1. Other positions follow the shuffle.</div>
    </section>`;
  }
  if(!a.rolled||!a.order||!a.order.length)return '';
  return `<section class="card">
    <b>🪨 Payout order</b>
    <div class="muted sm" style="margin:6px 0 10px">Locked after the stone shuffle. Round 1 → organizer.</div>
    <div class="stone-order-list">${a.order.map((m,i)=>{
      const st=stoneOf(a,m);
      const now=a.status==='active'&&a.cycle===i;
      return `<div class="stone-order-row ${now?'on':''}"><span class="so-rank">${i+1}</span><span class="so-ic">${st?st.ic:(i===0?'👑':'🪨')}</span><span class="so-name">${esc(nm(m))}${m===a.host?' · organizer':''}</span>${now?'<span class="pill ok">Now</span>':''}</div>`;
    }).join('')}</div>
  </section>`;
}


function ajoCodeSheet(){
  return `<h2>Join Ajo with a code</h2>
  <div class="muted sm" style="margin:4px 0 12px">Enter a code like <b>AJO-AB12CD</b> from an organizer. You join that circle if seats remain.</div>
  <label class="l">Invite code</label>
  <div class="field"><input type="text" data-f="ajoCode" id="f-ajo-code" maxlength="16" placeholder="AJO-XXXXXX" value="${esc((UI.gi.ajoCode||'').toUpperCase())}" style="text-transform:uppercase"></div>
  <label class="l">Why are you joining? (optional)</label>
  <div class="field"><input type="text" data-f="ajoCodeReason" maxlength="200" placeholder="e.g. Saving for wedding furniture" value="${esc(UI.gi.ajoCodeReason||'')}"></div>
  <button class="btn" style="width:100%;margin-top:14px" data-a="ajoCodeRedeem">Join circle</button>`;
}
function ajoShareSheet(a){
  if(!a) return '<div class="muted">Circle not found</div>';
  const codes=(a.codes||[]).filter(c=>!c.rev&&c.exp>=G.day);
  const ttl=UI.gi.ajoCodeTtl||14;
  const max=UI.gi.ajoCodeMax||10;
  return `<h2>Invite to ${esc(a.name)}</h2>
  <div class="muted sm" style="margin:4px 0 12px">Share a code or link. People join while the circle is still gathering.</div>
  <label class="l">Valid for (days)</label>
  <div class="opts">${[7,14,30].map(v=>`<button data-a="ajoCodeTtl" data-v="${v}" class="${+ttl===v?'on':''}">${v}d</button>`).join('')}</div>
  <label class="l">Max uses</label>
  <div class="opts">${[5,10,25].map(v=>`<button data-a="ajoCodeMax" data-v="${v}" class="${+max===v?'on':''}">${v}</button>`).join('')}</div>
  <button class="btn" style="width:100%;margin-top:12px" data-a="ajoCodeCreate" data-id="${a.id}">Create invite code</button>
  ${codes.length?`<div class="section-label" style="margin-top:16px">Active codes</div>${codes.map(c=>{
    const link=typeof ajoInviteLink==='function'?ajoInviteLink(c.code):('#ajo='+c.code);
    return `<div class="card" style="margin-top:8px"><div class="row sp"><b style="letter-spacing:.04em">${esc(c.code)}</b><span class="pill wait">${c.uses}/${c.max}</span></div>
     <div class="tiny muted">Expires day ${c.exp}</div>
     <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="btn sm" data-a="ajoCodeShare" data-id="${a.id}" data-c="${esc(c.code)}">Share</button>
      <button class="btn sm ghost" data-a="ajoCodeCopy" data-c="${esc(c.code)}">Copy code</button>
      <button class="btn sm ghost" data-a="ajoCodeRevoke" data-id="${a.id}" data-r="${c.id}">Revoke</button>
     </div>
     <div class="tiny muted" style="margin-top:6px;word-break:break-all">${esc(link)}</div></div>`;
  }).join('')}`:'<div class="muted sm" style="margin-top:12px">No active codes yet.</div>'}`;
}
function ajoShare(code, ajoId){
  const a=ajoOf(ajoId);
  if(!a) return;
  const link=ajoInviteLink(code);
  const text='Join my Ajo circle "'+a.name+'" on AjoLoop. Code: '+code;
  if(navigator.share){
    navigator.share({title:a.name+' — Ajo invite', text, url:link}).catch(()=>{});
    return;
  }
  const payload=text+'\n'+link;
  const done=m=>{fx(m,'warm');render()};
  try{
    navigator.clipboard.writeText(payload).then(()=>done('Invite copied — paste into WhatsApp or chat'),()=>done('Code: '+code));
  }catch(e){done('Code: '+code)}
}
function ajoJoinSheet(a){
  if(!a)return '<div class="muted">Circle not found</div>';
  const pur=ajoPurpose(a.purpose);
  return `<h2>Request to join</h2>
  <div class="card" style="margin-top:12px"><b>${esc(a.name)}</b>
    <div class="muted sm" style="margin-top:4px">${pur.ic} ${esc(pur.n)} · ${fmt(a.amt)} every ${a.freq} days · ${a.members.length}/${a.size}</div>
    <div class="tiny muted" style="margin-top:6px">${esc(pur.d)}</div>
  </div>
  <label class="l">Why do you want to join?</label>
  <div class="field"><input type="text" data-f="ajoJoinReason" maxlength="200" placeholder="e.g. Raising money for my daughter's wedding furniture" value="${esc(UI.gi.ajoJoinReason||'')}"></div>
  <div class="muted tiny">The organizer and members will see this reason. Be honest — it builds trust.</div>
  <button class="btn" style="margin-top:14px" data-a="ajoRequestSend" data-id="${a.id}">Send request</button>
  <button class="btn ghost" style="margin-top:8px" data-a="ajoOpen" data-id="${a.id}">Cancel</button>`;
}

function ajoNewSheet(){const f=UI.ajoNew,opt=(k,vals,fm)=>`<div class="opts">${vals.map(v=>`<button data-a="anset" data-k="${k}" data-v="${v}" class="${+f[k]===+v?'on':''}">${fm?fm(v):v}</button>`).join('')}</div>`;
 const size=Math.max(3,Math.min(20,parseInt(f.size)||5));
 const amt=Math.max(500,Math.min(500000,parseInt(f.amt)||5000));
 const freq=Math.max(1,Math.min(60,parseInt(f.freq)||7));
 const pot1=amt*(size-1),fee=Math.round(pot1*AJO_FEE_PCT),hostGets=pot1-fee;
 return `<h2>Create an Ajo</h2><div class="muted sm" style="margin-top:4px">Starts <b>public</b> so others can request to join. Build it around a real community need.</div>
 <label class="l">Purpose of this circle</label>
 <div class="opts" style="flex-wrap:wrap">${AJO_PURPOSES.map(p=>`<button data-a="anset" data-k="purpose" data-v="${p.id}" class="${(f.purpose||'general')===p.id?'on':''}">${p.ic} ${esc(p.n)}</button>`).join('')}</div>
 <div class="muted tiny" style="margin-bottom:8px">${esc(ajoPurpose(f.purpose||'general').d)}</div>
 <label class="l">Your reason (what the pot is for)</label>
 <div class="field"><input type="text" data-f="ajoReason" maxlength="200" placeholder="e.g. Buying kitchen set for my sister's wedding" value="${esc(UI.gi.ajoReason||'')}"></div>
 <div class="muted tiny">Members will see this. When someone claims the pot, they also state their use to the line.</div>
 <label class="l">Name</label><div class="field"><input type="text" id="f-ajo" maxlength="24" value="${esc(f.name)}" placeholder="e.g. Kano Hustlers"></div>
 <label class="l">Members</label>
 <div class="field-row"><input type="number" id="f-ajo-size" min="3" max="20" step="1" value="${size}" data-f="ajoSize"><span class="field-hint">3–20 people</span></div>
 <div class="opts" style="margin-top:6px">${opt('size',[3,4,5,6,8,10,12])}</div>
 <label class="l">Contribution amount (₦)</label>
 <div class="field-row"><input type="number" id="f-ajo-amt" min="500" max="500000" step="100" value="${amt}" data-f="ajoAmt"><span class="field-hint">Your amount</span></div>
 <div class="opts" style="margin-top:6px">${opt('amt',[1000,2000,5000,10000,20000,50000],fmt)}</div>
 <label class="l">Every (days)</label>
 <div class="field-row"><input type="number" id="f-ajo-freq" min="1" max="60" step="1" value="${freq}" data-f="ajoFreq"><span class="field-hint">1–60 days</span></div>
 <div class="opts" style="margin-top:6px">${opt('freq',[3,7,14,21,30],v=>v+' days')}</div>
 <div class="card" style="background:var(--card)"><b>How payout works</b>
 <div class="muted sm" style="margin-top:8px;line-height:1.45">
 <b>Round 1</b> → You (organizer). Members pay; you do not contribute that round.<br>
 <b>Ajoloop fee</b> → ${Math.round(AJO_FEE_PCT*100)}% of round 1 pot only (agent fee).<br>
 <b>Later rounds</b> → Members pick stones; a fair roll sets the order.<br>
 </div>
 <div class="money-row" style="margin-top:10px"><span class="label">Round 1 pot (est.)</span><span class="val">${fmt(pot1)}</span></div>
 <div class="money-row"><span class="label">Platform fee</span><span class="val">${fmt(fee)}</span></div>
 <div class="money-row"><span class="label">You receive</span><span class="val gold">${fmt(hostGets)}</span></div>
 </div>
 <button class="btn" style="margin-top:12px" data-a="ajoCreate">Create circle</button>
 <div class="tiny muted" style="margin-top:10px">Set any members, contribution, and schedule. Use your wallet balance for contributions.</div>`}




function storeAvatarSheet(createMode){
  if(!UI.storeAvForm||UI.storeAvForm.kind!=='building')
    UI.storeAvForm=Object.assign({},defaultStoreAvatar((playerBiz()&&playerBiz().cat)||(UI.bizForm&&UI.bizForm.cat)||'Other'));
  const a=UI.storeAvForm;
  const styles=[{id:'shop',n:'Shop'},{id:'kiosk',n:'Kiosk'},{id:'stall',n:'Food stall'},{id:'boutique',n:'Boutique'},{id:'container',n:'Container'}];
  const walls=[{id:'cream',n:'Cream'},{id:'sand',n:'Sand'},{id:'red',n:'Red'},{id:'blue',n:'Blue'},{id:'green',n:'Green'},{id:'yellow',n:'Yellow'},{id:'white',n:'White'}];
  const roofs=[{id:'tin',n:'Tin'},{id:'flat',n:'Flat'},{id:'awning',n:'Awning'}];
  const signs=[{id:'board',n:'Sign board'},{id:'painted',n:'Painted'},{id:'none',n:'None'}];
  const doors=[{id:'open',n:'Open'},{id:'closed',n:'Closed'},{id:'curtain',n:'Curtain'}];
  const opt=(list,key)=>list.map(o=>`<button class="av-opt ${a[key]===o.id?'on':''}" data-a="storeAvSet" data-k="${key}" data-v="${o.id}"><span>${esc(o.n)}</span></button>`).join('');
  return `<div class="sec" style="margin-top:0">Storefront<small>Building look for your shop — not a person</small></div>
    <div class="av-preview">${renderStoreBuilding(a,110)}</div>
    <label class="l">Building style</label><div class="opts">${opt(styles,'style')}</div>
    <label class="l">Wall colour</label><div class="opts">${opt(walls,'wall')}</div>
    <label class="l">Roof</label><div class="opts">${opt(roofs,'roof')}</div>
    <label class="l">Sign</label><div class="opts">${opt(signs,'sign')}</div>
    <label class="l">Door</label><div class="opts">${opt(doors,'door')}</div>
    <label class="l">Windows</label><div class="opts">
      <button class="av-opt ${a.window!==false?'on':''}" data-a="storeAvSet" data-k="window" data-v="1">Yes</button>
      <button class="av-opt ${a.window===false?'on':''}" data-a="storeAvSet" data-k="window" data-v="0">No</button>
    </div>
    <div class="row" style="gap:8px;margin-top:14px">
      <button class="btn ghost" data-a="storeAvRandom">Shuffle</button>
      <button class="btn" data-a="storeAvSave" style="flex:1">Save storefront</button>
    </div>`;
}

function avatarSheet(createMode){
  if(!UI.avForm)UI.avForm=Object.assign({},(G&&G.p&&G.p.avatar)||defaultAvatar((G&&G.p&&G.p.gender)||UI.form.gender));
  const a=UI.avForm; a.gender=a.gender||(G&&G.p&&G.p.gender)||UI.form.gender||'Female';
  const cat=UI.avCat||'skin'; const fem=a.gender==='Female';
  const cats=[['skin','Skin'],['hair','Hair'],['hairColor','Color'],['face','Face'],['eyes','Eyes'],['brows','Brows'],['nose','Nose'],['mouth','Mouth']].concat(fem?[]:[['facial','Beard']]).concat([['accessory','Style'],['top','Clothes']]);
  const opts=AV[cat]||[];
  return `<div class="av-builder">
  <h2>${createMode?'Your character':'Edit character'}</h2>
  <div class="muted sm">Original looks with African-inspired hair, dress and features. Not a copy of any other app.</div>
  <div class="av-preview lg">${renderAvatar(a,120)}</div>
  <div class="people-seg av-cats">${cats.map(([k,l])=>`<button data-a="avCat" data-v="${k}" class="${cat===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="av-opts">${opts.map(o=>{
    const on=a[cat]===o.id?'on':'';
    const swatch=o.c?`<i class="swatch" style="background:${o.c}"></i>`:'';
    return `<button class="av-opt ${on}" data-a="avSet" data-k="${cat}" data-v="${o.id}">${swatch}<span>${esc(o.n)}</span></button>`;
  }).join('')}</div>
  <div class="row" style="gap:8px;margin-top:14px">
    <button class="btn ghost" data-a="avRandom">Shuffle</button>
    <button class="btn" data-a="${createMode?'avSaveCreate':'avSave'}" style="flex:1">Save look</button>
  </div>
</div>`;
}


function groupChatPage(gid){
  const g=grp(gid); if(!g||g.dead) return `<div class="wa-page"><header class="wa-head"><button class="wa-back" data-a="close">‹</button><div class="wa-title"><b>Group</b></div></header><div class="empty">Not available</div></div>`;
  if(!g.mem.player) return `<div class="wa-page"><header class="wa-head"><button class="wa-back" data-a="close">‹</button></header><div class="empty">Join this group to chat</div></div>`;
  const memN=Object.keys(g.mem).length;
  const ps=(postsFor(gid)||[]).filter(p=>!p.parent);
  let msgs='', lastDay=null;
  ps.forEach(p=>{
    if(p.day!==lastDay){msgs+=`<div class="wa-day">Day ${p.day}</div>`;lastDay=p.day}
    if(p.kind==='poll'){
      const total=(p.options||[]).reduce((s,o)=>s+(o.votes||[]).length,0)||1;
      const my=(p.options||[]).find(o=>(o.votes||[]).includes('player'));
      msgs+=`<div class="wa-poll"><div class="wa-poll-q">📊 ${esc(p.txt)}</div><div class="tiny muted" style="margin-bottom:8px">${esc(nm(p.by))} · ${total} vote${total===1?'':'s'}</div>
        ${(p.options||[]).map(o=>{
          const n=(o.votes||[]).length, pct=Math.round(n/total*100);
          const on=my&&my.id===o.id;
          return `<button class="wa-poll-opt ${on?'on':''}" data-a="g_vote" data-id="${gid}" data-p="${p.id}" data-o="${o.id}">
            <span class="wa-poll-t">${esc(o.t)}</span>
            <span class="wa-poll-bar"><i style="width:${pct}%"></i></span>
            <span class="wa-poll-n">${n} · ${pct}%</span>
          </button>`;
        }).join('')}</div>`;
      return;
    }
    if(p.kind==='announce'){
      msgs+=`<div class="wa-sys">📣 ${esc(nm(p.by))}: ${esc(p.txt)}</div>`;
      return;
    }
    const me=p.by==='player';
    if(p.kind==='voice'){
      msgs+=`<div class="wa-row ${me?'me':''}"><div class="wa-bubble ${me?'me':'them'} voice"><div class="wa-name">${me?'You':esc(nm(p.by))}</div>
        <button class="wa-voice" data-a="playVoice" data-sec="${p.sec||3}" type="button"><span class="wv">▶</span> <span class="wb"></span><span class="ws">${p.sec||3}s</span></button>
        <div class="wa-time">Day ${p.day}</div></div></div>`;
      return;
    }
    msgs+=`<div class="wa-row ${me?'me':''}"><div class="wa-bubble ${me?'me':'them'}"><div class="wa-name">${me?'You':esc(nm(p.by))}</div><div class="wa-text">${esc(p.txt)}</div><div class="wa-time">Day ${p.day}</div></div></div>`;
  });
  if(!ps.length)msgs=`<div class="wa-sys">Only members see this chat.</div><div class="empty" style="margin-top:24px">Say hello to the group.</div>`;

  const pollOpen=UI.gi.pollOpen;
  return `<div class="wa-page">
  <header class="wa-head">
    <button class="wa-back" data-a="grpChatBack" data-id="${gid}" aria-label="Back">‹</button>
    <div class="wa-av ${g.photo?'has-photo':''}">${gFace(g,44)}</div>
    <button class="wa-title" data-a="g_open" data-id="${gid}">
      <b>${esc(g.name)}</b>
      <span>${memN} member${memN===1?'':'s'}</span>
    </button>
  </header>
  <div class="wa-log" id="wa-log">${msgs}</div>
  ${pollOpen?`<div class="wa-poll-form">
    <b>New poll</b>
    <input id="poll-q" maxlength="120" placeholder="Ask a question…" value="${esc(UI.gi.pollQ||'')}">
    <input id="poll-o1" maxlength="60" placeholder="Option 1" value="${esc((UI.gi.pollOpts||[])[0]||'')}">
    <input id="poll-o2" maxlength="60" placeholder="Option 2" value="${esc((UI.gi.pollOpts||[])[1]||'')}">
    <input id="poll-o3" maxlength="60" placeholder="Option 3 (optional)" value="${esc((UI.gi.pollOpts||[])[2]||'')}">
    <div class="row" style="gap:8px;margin-top:8px">
      <button class="btn ghost sm" data-a="g_pollCancel">Cancel</button>
      <button class="btn sm" data-a="g_pollSend" data-id="${gid}">Post poll</button>
    </div>
  </div>`:''}
  <div class="wa-quick">
    <button data-a="g_pollOpen" data-id="${gid}">📊 Poll</button>
    <button data-a="g_quick" data-id="${gid}" data-t="Who is free this weekend?">Weekend?</button>
    <button data-a="g_quick" data-id="${gid}" data-t="Reminder: keep this space respectful.">Respect</button>
  </div>
  <footer class="wa-compose">
    <button class="wa-plus" type="button" data-a="g_pollOpen" data-id="${gid}" aria-label="Poll">📊</button>
    <button class="wa-mic" type="button" data-a="g_voice" data-id="${gid}" aria-label="Voice note">🎤</button>
    <input id="grp-chat-in" maxlength="280" placeholder="Message" autocomplete="off" value="${esc((UI.gi&&UI.gi.msg)||'')}">
    <button class="wa-send" data-a="g_chatSend" data-id="${gid}" aria-label="Send">➤</button>
  </footer>
</div>`;
}

function ajoChatPage(a){
  if(!a) return `<div class="wa-page"><header class="wa-head"><button class="wa-back" data-a="close">‹</button><div class="wa-title"><b>Circle</b></div></header><div class="empty">Not found</div></div>`;
  const host=a.host==='player'?G.p:npc(a.host);
  const hostEm=a.host==='player'?avatar(G.p.gender):(host&&host.em)||'🤝';
  const memNames=a.members.slice(0,4).map(m=>m==='player'?'You':nm(m)).join(', ')+(a.members.length>4?'…':'');
  const log=a.chat||[];
  // Build with system activity interleaved lightly
  let msgs='';
  let lastDay=null;
  const items=[];
  (a.activity||[]).slice().reverse().forEach(x=>{
    if(x.kind==='join'||x.kind==='system')items.push({type:'sys',day:x.day,t:x.txt});
  });
  log.forEach(m=>items.push({type:'msg',day:m.day,by:m.by,t:m.t,hour:m.hour}));
  items.sort((x,y)=>(x.day-y.day)||0);
  items.forEach(it=>{
    if(it.day!==lastDay){
      msgs+=`<div class="wa-day">Day ${it.day}</div>`;
      lastDay=it.day;
    }
    if(it.type==='sys'){
      msgs+=`<div class="wa-sys">${esc(it.t)}</div>`;
    } else {
      const me=it.by==='player';
      const who=me?'You':esc(nm(it.by));
      msgs+=`<div class="wa-row ${me?'me':''}"><div class="wa-bubble ${me?'me':'them'}"><div class="wa-name">${who}</div><div class="wa-text">${esc(it.t)}</div><div class="wa-time">Day ${it.day}</div></div></div>`;
    }
  });
  if(!items.length)msgs=`<div class="wa-sys">Messages are only visible to members of this circle.</div><div class="empty" style="margin-top:24px">Say hello — this is your circle chat.</div>`;

  return `<div class="wa-page">
  <header class="wa-head">
    <button class="wa-back" data-a="ajoChatBack" data-id="${a.id}" aria-label="Back">‹</button>
    <div class="wa-av">${hostEm}</div>
    <button class="wa-title" data-a="ajoOpen" data-id="${a.id}">
      <b>${esc(a.name)}</b>
      <span>${esc(memNames)}</span>
    </button>
    <button class="wa-icon" data-a="ajoOpen" data-id="${a.id}" title="Circle info">ⓘ</button>
  </header>
  <div class="wa-log" id="wa-log">${msgs}</div>
  <div class="wa-quick">
    <button data-a="ajoAct" data-id="${a.id}" data-k="remind">⏰ Dues</button>
    <button data-a="ajoAct" data-id="${a.id}" data-k="meetup">📅 Meetup</button>
    <button data-a="ajoAct" data-id="${a.id}" data-k="cheers">✨ Encourage</button>
    <button data-a="ajoAct" data-id="${a.id}" data-k="rules">📋 Rules</button>
  </div>
  ${a.members.includes('player')?`<footer class="wa-compose">
    <button class="wa-plus" type="button" data-a="ajoAct" data-id="${a.id}" data-k="cheers" aria-label="Quick">＋</button>
    <input id="ajo-chat-in" maxlength="240" placeholder="Message" autocomplete="off">
    <button class="wa-send" data-a="ajoChatSend" data-id="${a.id}" aria-label="Send">➤</button>
  </footer>`:`<footer class="wa-compose"><div class="muted sm" style="padding:12px;text-align:center;width:100%">Join this circle to send messages</div></footer>`}
</div>`;
}

function dmChatPage(uid){
  const n=npc(uid); if(!n) return `<div class="wa-page"><header class="wa-head"><button class="wa-back" data-a="close">‹</button></header><div class="empty">Unknown</div></div>`;
  const th=chatThread(uid);
  let msgs='',lastDay=null;
  th.forEach(m=>{
    if(m.day!==lastDay){msgs+=`<div class="wa-day">Day ${m.day}</div>`;lastDay=m.day}
    const me=m.by==='player';
    if(m.kind==='voice'){
      msgs+=`<div class="wa-row ${me?'me':''}"><div class="wa-bubble ${me?'me':'them'} voice">
        <button class="wa-voice" data-a="playVoice" data-sec="${m.sec||3}" type="button"><span class="wv">▶</span> <span class="wb"></span><span class="ws">${m.sec||3}s</span></button>
        <div class="wa-time">Day ${m.day}</div></div></div>`;
      return;
    }
    msgs+=`<div class="wa-row ${me?'me':''}"><div class="wa-bubble ${me?'me':'them'}"><div class="wa-text">${esc(m.t)}</div><div class="wa-time">Day ${m.day}</div></div></div>`;
  });
  if(!th.length)msgs=`<div class="empty" style="margin-top:40px">Start the conversation. Trust grows from talking.</div>`;
  const biz=bizByOwner(uid);
  return `<div class="wa-page">
  <header class="wa-head">
    <button class="wa-back" data-a="close" aria-label="Back">‹</button>
    <div class="wa-av">${n.em}</div>
    <div class="wa-title"><b>${esc(n.n)}</b><span>${esc(n.occ)} · ${relLabel(n)}</span></div>
  </header>
  <div class="wa-log" id="wa-log">${msgs}</div>
  <div class="wa-quick">
    <button data-a="trustAct" data-id="${uid}" data-g="wave">👋 Greet</button>
    <button data-a="trustAct" data-id="${uid}" data-g="help">🆘 Help</button>
    <button data-a="trustAct" data-id="${uid}" data-g="vouch">🗣️ Vouch</button>
    ${biz?`<button data-a="visitBiz" data-id="${biz.id}">📍 Visit</button>`:''}
  </div>
  ${isFriend(uid)?`<footer class="wa-compose">
    <button class="wa-plus" type="button" data-a="trustAct" data-id="${uid}" data-g="intro" aria-label="Quick">＋</button>
    <button class="wa-mic" type="button" data-a="chatVoice" data-id="${uid}" aria-label="Voice note">🎤</button>
    <input id="chat-in" maxlength="200" placeholder="Message a friend" autocomplete="off" value="${esc(UI.chatText||'')}">
    <button class="wa-send" data-a="chatSend" data-id="${uid}" aria-label="Send">➤</button>
  </footer>`
  :friendStatus(uid)==='pending_out'
  ?`<footer class="wa-compose"><div class="muted sm" style="padding:12px;text-align:center;width:100%">Friend request pending — chat unlocks when they accept</div></footer>`
  :friendStatus(uid)==='pending_in'
  ?`<footer class="wa-compose"><div style="padding:10px;width:100%;display:flex;gap:8px;justify-content:center">
      <button class="btn sm green" data-a="friendAccept" data-id="${(pendingFriendReqs().find(r=>r.from===uid)||{}).id}">Accept friend</button>
      <button class="btn sm ghost" data-a="friendReject" data-id="${(pendingFriendReqs().find(r=>r.from===uid)||{}).id}">Reject</button>
    </div></footer>`
  :`<footer class="wa-compose"><div style="padding:10px;width:100%;text-align:center">
      <div class="muted sm" style="margin-bottom:8px">Add ${esc(n.n)} as a friend to chat</div>
      <button class="btn sm" data-a="friendReq" data-id="${uid}">🤝 Send friend request</button>
    </div></footer>`}
</div>`;
}


function ajoSheet(a){if(!a)return'<div class="muted">Not found</div>';
 const P=G.p,host=a.host==='player'?null:npc(a.host),st=a.status;
 const tab=UI.ajoTab||'home';
 const tabs=[['home','Circle'],['games','Games'],['chat','Chat'],['activity','Activity']];
 const pur=ajoPurpose(a.purpose);
 let h=`<div class="row"><div class="av">${a.host==='player'?avatar(P.gender):(host?host.em:pur.ic||'🤝')}</div><div><h2>${esc(a.name)}</h2><div class="muted sm">${pur.ic} ${esc(pur.n)} · ${fmt(a.amt)} every ${a.freq} days · ${a.members.length}/${a.size} · ${a.vis==='public'?'Public':'Private'}</div></div></div>`;
 h+=`<div class="people-seg ajo-tabs" style="margin:12px 0;flex-wrap:wrap">${tabs.map(([k,l])=>`<button data-a="ajoTab" data-v="${k}" class="${tab===k?'on':''}">${k==='games'?'🎮 ':''}${l}</button>`).join('')}</div>`;

 if(tab==='chat'){
  const log=a.chat||[];
  h+=`<div class="chat-log" style="max-height:320px">${log.length?log.map(m=>`<div class="chat-bubble ${m.by==='player'?'me':'them'}"><div class="tiny muted" style="margin-bottom:2px">${m.by==='player'?'You':esc(nm(m.by))}</div>${esc(m.t)}<div class="tiny" style="opacity:.7;margin-top:4px">Day ${m.day}</div></div>`).join(''):'<div class="empty">Circle chat is empty. Say hello — like a WhatsApp group for this Ajo only.</div>'}</div>`;
  if(a.members.includes('player')){
   h+=`<div class="row" style="gap:8px;margin-top:8px"><input id="ajo-chat-in" maxlength="240" placeholder="Message the circle…" style="flex:1">
    <button class="btn sm" data-a="ajoChatSend" data-id="${a.id}">Send</button></div>
    <div class="section-label">Quick</div>
    <div class="row" style="gap:8px;flex-wrap:wrap">
     <button class="btn sm ghost" data-a="ajoAct" data-id="${a.id}" data-k="remind">⏰ Remind dues</button>
     <button class="btn sm ghost" data-a="ajoAct" data-id="${a.id}" data-k="meetup">📅 Suggest meetup</button>
     <button class="btn sm ghost" data-a="ajoAct" data-id="${a.id}" data-k="cheers">✨ Encourage</button>
     <button class="btn sm ghost" data-a="ajoAct" data-id="${a.id}" data-k="rules">📋 Rules</button>
    </div>`;
  } else {
   h+=`<div class="muted sm">Join this circle to chat with members.</div>`;
  }
  return h;
 }

 if(tab==='games'){
  if(!a.members.includes('player')){
   h+=`<div class="card empty">Join this circle to play games with members.</div>`;
   return h;
  }
  const active=a.game&&a.game.status==='playing'?a.game:null;
  if(active){
   const def=circleGamesCatalog().find(x=>x.id===active.type)||{n:active.type,ic:'🎮'};
   const oppId=(active.players||[]).find(x=>x!=='player');
   const oppName=oppId?nm(oppId):'Circle';
   h+=`<div class="african-game-shell">
    <div class="ag-top"><div><b>${def.ic||'🎮'} ${esc(def.n||active.type)}</b>
    <div class="muted tiny">${esc(def.d||'')}</div></div>
    <button class="btn sm ghost" data-a="ajoGameSkip" data-id="${a.id}">Close board</button></div>
    <div class="ag-players">
      <div class="ag-you"><span class="ag-av">${playerAvatar(36)}</span><div><b>You</b><div class="tiny muted">South</div></div></div>
      <div class="ag-turn">${(active.data.board&&active.data.board.turn===0)?'Your turn':'Their turn'}</div>
      <div class="ag-opp"><div><b>${esc(oppName)}</b><div class="tiny muted">North</div></div><span class="ag-av">${oppId&&npc(oppId)?npc(oppId).em:'👤'}</span></div>
    </div>`;
   const b=active.data&&active.data.board;
   if(active.type==='ayo'&&b){
    const north=b.pits.slice(6,12).slice().reverse();
    const south=b.pits.slice(0,6);
    h+=`<div class="ayo-board">
      <div class="ayo-store opp">${b.store[1]}</div>
      <div class="ayo-grid">
        <div class="ayo-row north">${north.map((n,i)=>{
          const pit=11-i;
          return `<button type="button" class="ayo-pit" disabled><span class="ayo-seeds">${'•'.repeat(Math.min(n,8))}${n>8?'+':''}</span><span class="ayo-n">${n}</span></button>`;
        }).join('')}</div>
        <div class="ayo-row south">${south.map((n,i)=>{
          const can=b.turn===0&&n>0;
          return `<button type="button" class="ayo-pit ${can?'playable':''}" data-a="ajoGamePlay" data-id="${a.id}" data-v="${i}" ${can?'':'disabled'}><span class="ayo-seeds">${'•'.repeat(Math.min(n,8))}${n>8?'+':''}</span><span class="ayo-n">${n}</span></button>`;
        }).join('')}</div>
      </div>
      <div class="ayo-store you">${b.store[0]}</div>
    </div>
    <div class="tiny muted" style="text-align:center;margin-top:8px">Tap one of your pits to sow seeds. Capture 2s and 3s on their side.</div>`;
   } else if(active.type==='morabaraba'&&b){
    h+=`<div class="mora-board"><div class="muted sm" style="margin-bottom:8px">${b.phase==='place'?'Place a cow on an empty point':'Move a cow to an adjacent point'}</div>
     <div class="mora-grid">${b.cells.map((c,i)=>{
       const empty=c==null;
       const mine=c===0;
       if(b.phase==='place'&&empty&&b.turn===0)
         return `<button class="mora-cell empty" data-a="ajoGamePlay" data-id="${a.id}" data-v="${i}">·</button>`;
       if(b.phase==='move'&&mine&&b.turn===0)
         return `<button class="mora-cell you sel" data-a="moraPick" data-v="${i}">🐄</button>`;
       return `<button class="mora-cell ${c===0?'you':c===1?'opp':'empty'}" disabled>${c===0?'🐄':c===1?'🐃':'·'}</button>`;
     }).join('')}</div>
     ${UI.moraFrom!=null?`<div class="muted sm" style="margin-top:8px">Selected ${UI.moraFrom}. Tap an adjacent empty cell.
       <div class="opts" style="margin-top:6px">${(MORA_ADJ_UI[UI.moraFrom]||[]).filter(t=>b.cells[t]==null).map(t=>`<button data-a="ajoGamePlay" data-id="${a.id}" data-v="${UI.moraFrom}:${t}">→ ${t}</button>`).join('')||'No moves'}</div></div>`:''}
    </div>`;
   } else if(active.type==='yote'&&b){
    h+=`<div class="yote-board"><div class="yote-grid">${b.cells.map((c,i)=>{
      const mine=c===0;
      return `<button class="yote-cell ${c===0?'you':c===1?'opp':''}" data-a="${mine&&b.turn===0?'yotePick':'noop'}" data-v="${i}" ${mine&&b.turn===0?'': 'disabled'}>${c===0?'●':c===1?'○':'·'}</button>`;
    }).join('')}</div>
    ${UI.yoteFrom!=null?`<div class="muted sm">From ${UI.yoteFrom}. Choose destination.
      <div class="opts">${(typeof yoteMoves==='function'?yoteMoves(b,0):[]).filter(m=>m.from===UI.yoteFrom).map(m=>`<button data-a="ajoGamePlay" data-id="${a.id}" data-v="${m.from}:${m.to}">→ ${m.to}${m.cap!=null?' (cap)':''}</button>`).join('')}</div></div>`:''}
    <div class="tiny muted">Captured: you ${b.captured[0]} · them ${b.captured[1]}</div></div>`;
   } else if(active.type==='senet'&&b){
    const roll=active.data.pendingRoll;
    h+=`<div class="senet-board">
      <div class="senet-track">${Array.from({length:15},(_,i)=>{
        const yp=b.pos[0].map((p,pi)=>p===i?pi:-1).filter(x=>x>=0);
        const op=b.pos[1].map((p,pi)=>p===i?pi:-1).filter(x=>x>=0);
        return `<div class="senet-sq"><span class="sn">${i+1}</span>${yp.map(()=>'<i class="sy">◆</i>').join('')}${op.map(()=>'<i class="so">◇</i>').join('')}</div>`;
      }).join('')}</div>
      <div class="muted sm" style="margin:10px 0">${roll!=null?`Roll: <b>${roll}</b> — pick a piece to move`:'Tap roll, then pick a piece'}</div>
      ${roll==null?`<button class="btn" data-a="ajoGamePlay" data-id="${a.id}" data-v="0">Throw sticks</button>`:
        `<div class="opts">${[0,1,2].map(p=>b.pos[0][p]<15?`<button data-a="ajoGamePlay" data-id="${a.id}" data-v="${p}">Piece ${p+1} @ ${b.pos[0][p]||'start'}</button>`:'').join('')}</div>`}
    </div>`;
   }
   h+=`</div>`;
   return h;
  }
  h+=`<div class="muted sm" style="margin-bottom:10px">Board games from African history — Ayo, Morabaraba, Yote, Senet. Play against a circle member. Wins lift mood and reputation.</div>`;
  const list=circleGamesCatalog();
  h+=list.map(g=>`<button type="button" class="g-card game-card" style="width:100%;margin:0 0 8px;text-align:left;cursor:pointer" data-a="ajoGameStart" data-id="${a.id}" data-v="${g.id}">
    <div class="g-av" style="font-size:28px">${g.ic}</div>
    <div class="meta"><b>${esc(g.n)}</b><div class="l">${esc(g.d)}</div></div>
   </button>`).join('');
  const hist=(a.games||[]).slice(0,6);
  if(hist.length){
   h+=`<div class="section-label">Recent plays</div>`;
   h+=hist.map(x=>`<div class="muted sm px" style="margin-bottom:4px">${x.win?'🏆':'·'} ${esc(x.result||x.type)} · Day ${x.day}</div>`).join('');
  }
  return h;
 }

 if(tab==='activity'){
  const act=a.activity||[];
  h+=act.length?act.map(x=>`<div class="tx"><div><b>${esc(x.kind)}</b><div class="sm">${esc(x.txt)}</div><div class="tiny muted">Day ${x.day}</div></div></div>`).join(''):'<div class="empty">No activity yet.</div>';
  return h;
 }

 // home tab
 h+=`<div class="card" style="margin-top:4px;background:var(--card)"><div class="tiny muted" style="font-weight:800">TRADITIONAL RULES</div>
 <div class="sm" style="margin-top:6px;line-height:1.4">Organizer takes <b>round 1</b>. Fee <b>${Math.round((a.feePct||AJO_FEE_PCT)*100)}%</b> on that pot. Later pots follow the <b>stone roll</b>. Chat keeps the circle warm.</div></div>`;

 if(a.host==='player'&&st==='open'){
  h+=`<div class="row" style="gap:8px;margin:10px 0"><button class="btn sm ${a.vis==='public'?'':'ghost'}" data-a="ajoVis" data-id="${a.id}" data-v="public">🌐 Public</button>
   <button class="btn sm ${a.vis==='private'?'':'ghost'}" data-a="ajoVis" data-id="${a.id}" data-v="private">🔒 Private</button>
   ${a.host==='player'?`<button class="btn sm" data-a="ajoShareOpen" data-id="${a.id}">🔗 Invite code</button>`:''}</div>`;
  if(a.host==='player'){
    const ac=(a.codes||[]).filter(c=>!c.rev&&c.exp>=G.day);
    if(ac.length) h+=`<div class="tiny muted" style="margin-bottom:8px">Active invites: ${ac.map(c=>esc(c.code)).join(', ')}</div>`;
  }
 }

 const pending=(a.joinReqs||[]).filter(r=>r.st==='pending');
 if(a.host==='player'&&pending.length){
  h+=`<section class="card"><b>Join requests</b>${pending.map(r=>`<div class="inv-card" style="margin:8px 0"><b>${r.from==='player'?'A neighbour':esc(nm(r.from))}</b><div class="muted sm">Day ${r.day}</div>${r.reason?`<div class="sm" style="margin-top:6px;line-height:1.35">Reason: <b>${esc(r.reason)}</b></div>`:''}
   <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm green" data-a="ajoAnsReq" data-id="${a.id}" data-r="${r.id}" data-y="1">Accept</button>
   <button class="btn sm ghost" data-a="ajoAnsReq" data-id="${a.id}" data-r="${r.id}" data-y="0">Decline</button></div></div>`).join('')}</section>`;
 }

 const memRows=a.members.map(m=>{
  const stn=stoneOf(a,m);const isHost=m===a.host;
  const c=a.status==='active'?cyc(a,m):null;
  return `<div class="row sp" style="margin-top:8px"><span>${m==='player'?avatar(P.gender):(npc(m)?npc(m).em:'?')} ${nm(m)}${isHost?' · organizer':''}${stn?' '+stn.ic:''}</span>
  ${a.status==='active'?`<span class="pill ${c?(c.st==='paid'||c.st==='host_skip'?'ok':'no'):'wait'}">${c?(c.st==='host_skip'?'Organizer':c.st==='paid'?'Paid':'Missed'):'Pending'}</span>`:(stn?`<span class="pill ok">${stn.ic} ${stn.n}</span>`:(isHost?'<span class="pill wait">First pot</span>':'<span class="pill wait">No stone</span>'))}</div>`;
 }).join('');
 h+=`<section class="card"><b>Members (${a.members.length}/${a.size})</b>${memRows}</section>`;

 if(st==='open'&&a.host!=='player'){
  const why=joinCheck(a);
  const pendingMe=(a.joinReqs||[]).some(r=>r.from==='player'&&r.st==='pending');
  h+=`<div class="card" style="background:var(--card)">${why?'🔒 '+why:a.vis==='public'?'🌐 Public circle — request to join.':'Private — need an invite.'}</div>`;
  if(!a.members.includes('player')){
   if(pendingMe)h+=`<div class="pill wait">Request pending</div>`;
   else if(!why&&a.vis==='public')h+=`<button class="btn" data-a="ajoRequest" data-id="${a.id}">Request to join</button>`;
   else if(!why)h+=`<button class="btn" data-a="join" data-id="${a.id}" >Join</button>`;
  }
 }
 if(st==='open'&&a.host==='player'){const cands=G.npcs.filter(n=>n.met&&!a.members.includes(n.id)).sort((x,y)=>y.rel-x.rel);h+=`<section class="card"><b>Invite your people</b><div class="muted tiny">Traditional start — people you know.</div>${cands.length?cands.map(n=>`<div class="tx"><div class="row"><span style="font-size:22px">${n.em}</span><div><b>${n.n}</b><div class="tiny muted">${relLabel(n)}</div></div></div><button class="btn sm" data-a="inv" data-id="${a.id}" data-n="${n.id}" ${a.inv[n.id]===G.day?'disabled':''}>Invite</button></div>`).join(''):'<div class="muted sm">Meet people first or start Demo path.</div>'}
 </section>`}

 if(st==='stones'){
  const animating=UI.stoneAnim&&UI.stoneAnim.id===a.id;
  h+=ajoPotCard(a);
  h+=`<section class="card"><b>🪨 Stones</b><div class="muted sm" style="margin:6px 0 10px">When the circle is full, everyone picks a stone. The organizer rolls them so the payout order is fair and visible.</div>`;
  if(a.members.includes('player')&&!a.stones.player&&!a.rolled){
   h+=`<div class="stone-grid">${freeStones(a).map(s=>`<button class="stone-btn" data-a="pickStone" data-id="${a.id}" data-s="${s.id}"><span class="sic">${s.ic}</span><span class="sn">${s.n}</span></button>`).join('')}</div>`;
  } else if(a.stones.player){
   const mine=stoneOf(a,'player');h+=`<div class="muted sm">Your stone: <b>${mine?mine.ic+' '+mine.n:''}</b></div>`;
  }
  // Who has picked
  h+=`<div class="tiny muted" style="margin-top:8px">${a.members.filter(m=>m!==a.host).map(m=>{
    const stn=stoneOf(a,m);return esc(nm(m))+': '+(stn?stn.ic+' '+stn.n:'waiting…');
  }).join(' · ')}</div>`;
  h+=`</section>`;
  if(animating){
   h+=ajoStoneOrderCard(a,true);
  } else if(a.rolled){
   h+=ajoStoneOrderCard(a,false);
   if(a.members.includes('player'))h+=`<button class="btn" style="margin-top:12px" data-a="ajoStart" data-id="${a.id}">Start circle (begins tomorrow)</button>`;
  } else if(stonesReady(a)){
   const canRoll=a.host==='player'||a.members.includes('player');
   h+=`<button class="btn" style="margin-top:12px" data-a="rollStones" data-id="${a.id}" ${canRoll?'':'disabled'}>🎲 Shuffle & roll the stones</button>
   <div class="tiny muted" style="margin-top:6px">Organizer rolls. Everyone sees the shuffle, then the locked order.</div>`;
  } else {
   h+=`<div class="muted sm" style="margin-top:10px">Waiting for everyone to pick a stone…</div>`;
  }
 }

 if(st==='active'){
  const d=dueDay(a),rec=a.order[a.cycle],paid=!!cyc(a,'player');
  const pend=a.pendingPayout&&!a.pendingPayout.claimed?a.pendingPayout:null;
  ensureRoundPot(a);
  h+=ajoPotCard(a);
  h+=ajoStoneOrderCard(a,false);
  h+=`
  <section class="card"><b>Round ${a.cycle+1} of ${a.size}</b>
   <div class="row sp" style="margin-top:8px"><span class="muted sm">Due</span><b>Day ${d}</b></div>
   <div class="row sp"><span class="muted sm">Receives pot</span><b>${nm(rec)}${a.cycle===0?' · organizer':''}</b></div>
   <div class="row sp"><span class="muted sm">Contribution</span><b>${fmt(a.amt)}</b></div>
   ${a.members.includes('player')&&!paid&&!(a.cycle===0&&a.host==='player')?`<button class="btn" style="margin-top:12px" data-a="pay" data-id="${a.id}">Pay contribution ${fmt(a.amt)}</button>
   <div class="tiny muted" style="margin-top:6px">Need cash? <button class="btn sm ghost" data-a="topUpOpen">Top up balance</button></div>`:''}
   ${a.cycle===0&&a.host==='player'&&!pend?`<div class="pill ok" style="margin-top:10px">Organizer — no contribution this round</div>`:''}
   ${paid?`<div class="pill ok" style="margin-top:10px">You paid this round</div>`:''}
  </section>`;
  if(pend){
   h+=`<section class="card" style="border:2px solid var(--danfo,#ffc928)">
    <b>💰 Your pot is ready</b>
    <div class="muted sm" style="margin:8px 0">Round ${(pend.cycle||0)+1} · Claim to move money into your balance.</div>
    <div class="money-row"><span class="label">Pot for you</span><span class="val gold">${fmt(pend.amt)}</span></div>
    ${pend.fee?`<div class="money-row"><span class="label">Platform fee taken</span><span class="val">${fmt(pend.fee)}</span></div>`:''}
    ${pend.ded?`<div class="money-row"><span class="label">Credits deducted</span><span class="val">${fmt(pend.ded)}</span></div>`:''}
    <label class="l">Tell the circle how you will use this pot</label>
    <div class="field"><input type="text" data-f="ajoUseReason" maxlength="200" placeholder="e.g. Paying carpenter for wedding furniture" value="${esc(UI.gi.ajoUseReason||'')}"></div>
    <div class="muted tiny">Everyone in the line will see this reason in activity and chat.</div>
    <button class="btn green" style="width:100%;margin-top:12px" data-a="ajoClaim" data-id="${a.id}">Claim payout ${fmt(pend.amt)}</button>
   </section>`;
  }
  if(a.order.length){h+=`<section class="card"><b>Order</b>${a.order.map((m,i)=>`<div class="row sp sm" style="margin-top:6px"><span class="${i===a.cycle?'':'muted'}">${i+1}. ${nm(m)} ${stoneOf(a,m)?stoneOf(a,m).ic:''}</span>${i<a.cycle?'<span class="pill ok">Paid out</span>':i===a.cycle?'<span class="pill wait">Current</span>':''}</div>`).join('')}</section>`}
 }

 if(a.payouts&&a.payouts.length){h+=`<section class="card"><b>Payouts</b>${a.payouts.map(p=>`<div class="tx"><div><b>${nm(p.to)}</b><div class="tiny muted">Round ${p.cycle+1}${p.fee?` · fee ${fmt(p.fee)}`:''}</div></div><span class="pos">${fmt(p.amt)}</span></div>`).join('')}</section>`}
 if(st==='done')h+=`<div class="card empty"><div class="big">✅</div>Circle complete.</div>`;
 h+=`<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">
  <button class="btn" style="flex:1" data-a="ajoTab" data-v="games">🎮 Play games</button>
  <button class="btn ghost" style="flex:1" data-a="ajoChatOpen" data-id="${a.id}">💬 Circle chat</button>
 </div>`;
 return h}


function treatRequestSheet(){
  const f=UI.treatForm||{biz:null,product:null,friend:null,note:'',mode:'request'};
  const area=(G.p.home&&G.p.home.done&&G.p.home.area)||G.p.area||'your area';
  const bizs=businessesInUserArea('player');
  const friends=friendsList();
  const b=f.biz?bizById(f.biz):null;
  const products=b?bizProducts(b):[];
  const prod=products.find(p=>p.id===f.product)||products[0];
  return `<div class="sec" style="margin-top:0">${f.mode==='suggest'?'Suggest a treat':'Ask a friend to pay'}<small>From businesses in ${esc(area)}</small></div>
    <div class="muted sm" style="margin-bottom:10px">Friends can cover a meal, ride, or service for you at a local shop — builds trust when they come through.</div>
    <label class="l">Type</label>
    <div class="opts">
      <button data-a="treatMode" data-v="request" class="${f.mode!=='suggest'?'on':''}">🙏 Request (ask them to pay)</button>
      <button data-a="treatMode" data-v="suggest" class="${f.mode==='suggest'?'on':''}">💡 Suggest (put the idea to them)</button>
    </div>
    <label class="l">Business in your area</label>
    ${bizs.length?`<div class="opts" style="flex-direction:column;align-items:stretch">${bizs.map(x=>`<button data-a="treatBiz" data-v="${x.id}" class="${f.biz===x.id?'on':''}" style="text-align:left">${x.ic||'🏪'} ${esc(x.name)} · ${esc(x.cat)} · ${esc(x.area)}</button>`).join('')}</div>`
      :'<div class="card empty">No businesses in your area yet. Set home area or wait for nearby shops.</div>'}
    ${b?`<label class="l">Activity / item</label>
      <div class="opts" style="flex-direction:column;align-items:stretch">${products.map(p=>`<button data-a="treatProd" data-v="${p.id}" class="${(f.product||(prod&&prod.id))===p.id?'on':''}" style="text-align:left">${esc(p.n)} · <b>${fmt(p.price)}</b></button>`).join('')}</div>`:''}
    <label class="l">Friend</label>
    ${friends.length?`<div class="opts" style="flex-direction:column;align-items:stretch">${friends.map(n=>`<button data-a="treatFriend" data-v="${n.id}" class="${f.friend===n.id?'on':''}" style="text-align:left">${n.em} ${esc(n.n)} · ${relLabel(n)}</button>`).join('')}</div>`
      :'<div class="card empty">No friends yet. Meet people and accept friend requests first.</div>'}
    <label class="l">Note (optional)</label>
    <div class="field"><input type="text" id="treat-note" maxlength="120" placeholder="e.g. Lunch after market" value="${esc(f.note||'')}"></div>
    ${b&&prod&&f.friend?`<div class="card" style="margin-top:12px"><div class="row sp"><span class="muted">They would cover</span><b>${fmt(prod.price)}</b></div>
      <div class="muted tiny">${esc(prod.n)} at ${esc(b.name)}</div></div>`:''}
    <button class="btn" style="margin-top:14px" data-a="treatSend">${f.mode==='suggest'?'Send suggestion':'Send request'}</button>`;
}
function treatsInboxSheet(){
  const incoming=pendingTreatsIn();
  const outgoing=pendingTreatsOut();
  const done=(G.treatReqs||[]).filter(t=>t.status!=='pending').slice(-8).reverse();
  let h=`<div class="sec" style="margin-top:0">Treats<small>Friends paying for local activities</small></div>`;
  h+=`<div class="section-label">Requests for you</div>`;
  if(!incoming.length) h+=`<div class="card empty">No one is asking you to cover a treat right now.</div>`;
  else incoming.forEach(t=>{
    const from=npc(t.from); const b=bizById(t.biz);
    h+=`<div class="inv-card"><b>${from?from.em+' '+esc(from.n):'Friend'}</b>
      <div class="muted sm">${t.mode==='suggest'?'Suggested':'Asked you to pay for'} <b>${esc(t.productName)}</b> at ${b?esc(b.name):'a shop'} · ${fmt(t.price)}</div>
      ${t.note?`<div class="tiny muted" style="margin-top:4px">“${esc(t.note)}”</div>`:''}
      <div class="row" style="gap:8px;margin-top:10px">
        <button class="btn green sm" style="flex:1" data-a="treatAccept" data-id="${t.id}">Pay ${fmt(t.price)}</button>
        <button class="btn ghost sm" style="flex:1" data-a="treatReject" data-id="${t.id}">Decline</button>
      </div></div>`;
  });
  h+=`<div class="section-label">Your open requests</div>`;
  if(!outgoing.length) h+=`<div class="muted sm px">None pending.</div>`;
  else outgoing.forEach(t=>{
    const to=npc(t.to); const b=bizById(t.biz);
    h+=`<div class="card"><b>${esc(t.productName)}</b> · ${fmt(t.price)}
      <div class="muted sm">Waiting on ${to?esc(to.n):'friend'} · ${b?esc(b.name):''}</div></div>`;
  });
  if(done.length){
    h+=`<div class="section-label">Recent</div>`;
    done.forEach(t=>{
      h+=`<div class="muted sm px" style="margin-bottom:6px">${t.status==='accepted'?'✓':'✗'} ${esc(t.productName)} · ${fmt(t.price)} · Day ${t.resolved||t.day}</div>`;
    });
  }
  h+=`<button class="btn" style="margin-top:12px" data-a="treatOpen">＋ New request</button>`;
  return h;
}

function notesSheet(){const tr=typeof pendingTreatsIn==='function'?pendingTreatsIn():[];return `<h2>Notifications</h2>${tr.length?`<div class="warnbox" style="margin:10px 0">${tr.length} treat request${tr.length>1?'s':''} waiting — <button class="btn sm" data-a="treatsOpen">Review</button></div>`:''}<div style="margin-top:12px">${G.notes.length?G.notes.slice(0,30).map(n=>`<div class="note ${n.kind}" style="margin:0 0 8px"><div class="tiny muted">Day ${n.day}</div>${esc(n.txt)}</div>`).join(''):'<div class="muted">Nothing yet.</div>'}</div>`}
function jobsSheet(){return `<h2>Today's openings</h2><div class="muted sm" style="margin:4px 0 12px">Pick one. You can quit any time.</div>${JOBS.map(j=>{const o=G.openJobs.includes(j.id);return `<button class="act" data-a="hire" data-id="${j.id}" ${o?'':'disabled'}><div class="ic">${j.ic}</div><div><b>${j.n}</b><small>${fmt(j.pay)}/day · −${j.en} energy · ${o?j.d:'Not hiring today'}</small></div></button>`}).join('')}`}

/* ============ GROUPS UI ============
   Screens only call the engine functions above. Hiding a button here is a convenience; the engine is what enforces permissions. */
const ROLEL={owner:'👑 Owner',admin:'🛡️ Admin',mod:'🔧 Moderator',member:'Member'};
const rolePill=r=>`<span class="pill ${r==='member'?'wait':'ok'}">${ROLEL[r]}</span>`;
const npcTag=id=>id==='player'?'':'<span class="pill wait" title="Simulated neighbour, not a real person">NPC</span>';
const visPill=g=>g.vis==='public'?'<span class="pill ok">🌍 Public</span>':`<span class="pill wait">🔒 Private${g.disc?' · findable':''}</span>`;
const GO=(o,k,vals,cur,lab)=>`<div class="opts">${vals.map(v=>`<button data-a="g_set" data-o="${o}" data-k="${k}" data-v="${v}" class="${String(cur)===String(v)?'on':''}">${lab?lab(v):esc(v)}</button>`).join('')}</div>`;
const GT=(k,ph,max,def,enter)=>`<div class="field"><input type="text" data-f="${k}" maxlength="${max}" placeholder="${esc(ph)}" value="${esc(UI.gi[k]!==undefined?UI.gi[k]:(def||''))}" ${enter?`data-enter="${enter}"`:''} autocomplete="off"></div>`;
const dayRel=d=>d===G.day?'today':d===G.day+1?'tomorrow':'Day '+d;
const JOINL={open:'Open: anyone can join',approval:'Ask an admin first',invite:'Invitation only'};
const CHL={work:'work shifts',talk:'conversations',shop:'shop sessions'};
const avOf=id=>id==='player'?avatar(G.p.gender):(npc(id)?npc(id).em:'🧑🏾');

function gcardRow(x,extra){
 return `<button type="button" class="g-card" data-a="g_open" data-id="${x.id}"><div class="g-av ${x.photo?'has-photo':''}">${x.photo?`<img src="${x.photo}" alt="">`:x.av}</div><div class="meta"><b>${esc(x.name)}</b><div class="l">${esc(x.cat)} · ${x.count} member${x.count===1?'':'s'}${x.area?' · '+esc(x.area):''}${extra?' · '+extra:''}</div></div>${x.vis==='public'?'<span class="pill ok">Public</span>':'<span class="pill wait">Private</span>'}</button>`;
}

function groupsView(){const mine=G.groups.filter(g=>!g.dead&&g.mem.player);
 const invs=[];G.groups.forEach(g=>{if(!g.dead)g.inv.forEach(i=>{if(i.to==='player'&&invState(i)==='pending')invs.push({g,i})})});
 const q=(UI.gi.q||'').trim(),cat=UI.gcat||'';let disc='';
 if(q||cat){const r=searchGroups(q,cat);disc=`<div class="section-label">Results · ${r.length}</div>${r.length?r.map(x=>gcardRow(x)).join(''):'<div class="card empty"><div class="big">🔎</div>Nothing found. Try another word, or create the group yourself.</div>'}`}
 else{const S=discoverSections(),seen=new Set(),sect=(t,s,l)=>{l=l.filter(x=>!seen.has(x.id));l.forEach(x=>seen.add(x.id));return l.length?`<div class="section-label">${t}</div><div class="muted tiny px" style="margin:-2px 0 8px">${s}</div>${l.map(x=>gcardRow(x,x.via?'via '+esc(x.via.join(', ')):'')).join('')}`:''};
  disc=sect('Friends are in','Public groups your friends chose to show',S.friends)+sect('For your interests','From interests you picked below',S.rec)+sect('Near you','Only if you chose an area',S.nearby)+sect('Happening soon','Meetups and challenges',S.game)+sect('Business & creators','Communities for people who make and sell',S.biz);
  if(!disc)disc='<div class="card empty"><div class="big">🏘️</div>Nothing new to suggest.<div class="muted sm" style="margin-top:6px">Pick interests below, search, or create a group.</div></div>'}
 return `<div class="sec">Groups<small>Communities for friends and shared activities — free to join. Not an Ajo.</small></div>
 <div class="note-sep">Members marked NPC are simulated. Real player-to-player groups need the online version. Joining a group never enrolls you in Ajo money circles.</div>
 <div class="px row" style="gap:10px;margin:10px 0"><button class="btn" data-a="g_new">＋ Create group</button><button class="btn ghost" data-a="g_code">Join with code</button></div>
 ${invs.length?`<div class="section-label">Invitations · ${invs.length}</div><div class="muted tiny px" style="margin-bottom:8px">Nothing happens until you accept.</div>${invs.map(({g,i})=>`<div class="inv-card"><b>${esc(g.name)}</b><div class="muted sm" style="margin-top:4px">From ${esc(nm(i.by))} · expires Day ${i.exp}</div><div class="row" style="margin-top:12px;gap:8px"><button class="btn sm green" style="flex:1" data-a="g_ans" data-id="${g.id}" data-i="${i.id}" data-y="1">Accept</button><button class="btn sm ghost" style="flex:1" data-a="g_ans" data-id="${g.id}" data-i="${i.id}" data-y="0">Decline</button></div></div>`).join('')}`:''}
 <div class="section-label">My groups · ${mine.length}</div>
 ${mine.length?mine.map(g=>gcardRow(glimpse(g),ROLEL[g.mem.player.role])).join(''):'<div class="card empty"><div class="big">✨</div>You are not in a group yet.<div class="muted sm" style="margin-top:6px">Create one for your street, hustle, or friends — any player can host.</div><button class="btn sm" style="margin-top:12px" data-a="g_new">Create a group</button></div>'}
 <div class="section-label">Discover</div>
 <div class="card flat" style="margin:8px 12px">${GT('q','Search by name or interest',30,'','g_search')}<div class="row" style="margin-top:8px;gap:8px"><button class="btn sm" data-a="g_search">Search</button>${q||cat?'<button class="btn sm ghost" data-a="g_clear">Clear</button>':''}</div></div>
 <div class="seg">${G_CATS.map(c=>`<button data-a="g_cat" data-v="${c}" class="${cat===c?'on':''}">${c}</button>`).join('')}</div>
 ${disc}
 <section class="card"><b>Your interests</b><div class="muted tiny">Stored on this device only — used to suggest groups.</div><div class="opts">${G_CATS.map(c=>`<button data-a="g_int" data-v="${c}" class="${G.p.ints.includes(c)?'on':''}">${c}</button>`).join('')}</div>
 <label class="l">Show groups near me</label><div class="muted tiny">Off by default. No GPS: you pick an area yourself.</div><div class="opts"><button data-a="g_area" data-v="" class="${G.p.shareArea?'':'on'}">Off</button>${G_AREAS.map(a=>`<button data-a="g_area" data-v="${a}" class="${G.p.area===a?'on':''}">${a}</button>`).join('')}</div></section>`}

const gpostHtml=(g,p,isRep,staff)=>{
  if(p.kind==='poll'){
    const total=(p.options||[]).reduce((s,o)=>s+(o.votes||[]).length,0)||1;
    return `<div class="msg poll"><div class="by">📊 ${esc(nm(p.by))} · Day ${p.day}</div><b>${esc(p.txt)}</b>
      ${(p.options||[]).map(o=>{const n=(o.votes||[]).length;const on=(o.votes||[]).includes('player');
        return `<button class="wa-poll-opt ${on?'on':''}" style="margin-top:6px" data-a="g_vote" data-id="${g.id}" data-p="${p.id}" data-o="${o.id}">${esc(o.t)} · ${n}</button>`;}).join('')}
    </div>`;
  }
  return `<div class="msg ${isRep?'reply':''} ${p.kind==='announce'?'ann':''}"><div class="by">${p.kind==='announce'?'📣 ':''}${esc(nm(p.by))} ${npcTag(p.by)} <span class="muted">· Day ${p.day}</span></div>${p.hid?'<i class="muted">[hidden by a moderator]</i> ':''}${esc(p.txt)}${staff===null?'':`<div class="mact">${!isRep&&p.kind==='msg'?`<button data-a="g_reply" data-p="${p.id}">Reply</button>`:''}${p.by!=='player'?`<button data-a="g_rep" data-p="${p.id}">Report</button>`:''}${staff&&!p.hid?`<button data-a="g_hide" data-p="${p.id}">Hide</button>`:''}</div>${UI.gconf==='rep:'+p.id?`<div class="opts">${['Spam','Abuse or bullying','Scam','Other'].map(r=>`<button data-a="g_report" data-p="${p.id}" data-r="${r}">${r}</button>`).join('')}</div>`:''}`}</div>`;
};

function grpSheet(id){const v=viewGroup(id);if(!v)return `<h2>Group unavailable</h2><div class="muted sm" style="margin-top:8px">This group is private, or it does not exist.</div>`;
 const g=grp(id),head=`<div class="row" style="margin:6px 0 4px"><div class="av ${g&&g.photo?'has-photo':''}" style="width:56px;height:56px;font-size:32px">${gFace(g,56)}</div><div style="min-width:0"><h2>${esc(v.name)}</h2><div class="muted sm">${esc(v.cat)} · ${v.count} member${v.count===1?'':'s'}${v.area?' · '+esc(v.area):''}</div></div></div><div style="margin-bottom:8px">${visPill(v)}${v.member?rolePill(v.role):''}${(v.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`;
 if(!v.member)return head+gNon(v,g);
 const staff=['mod','admin','owner'].includes(v.role),tabs=[['home','Home'],['chat','Chat'],['events','Activities'],['people','People']].concat(staff?[['manage','Manage']]:[]),tab=tabs.some(t=>t[0]===UI.gt)?UI.gt:'home';
 return head+`<div class="seg" style="margin:8px 0">${tabs.map(([k,l])=>`<button data-a="g_tab" data-v="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>`+({home:gHome,chat:gChat,events:gEvents,people:gPeople,manage:gManage}[tab])(g,v)}

function gNon(v,g){const di=g.inv.find(i=>i.to==='player'&&invState(i)==='pending');let act;
 if(di)act=`<div class="row"><button class="btn green" data-a="g_ans" data-id="${v.id}" data-i="${di.id}" data-y="1">Accept invitation</button><button class="btn ghost" data-a="g_ans" data-id="${v.id}" data-i="${di.id}" data-y="0">Decline</button></div>`;
 else if(v.join==='open')act=`<button class="btn" data-a="g_join" data-id="${v.id}">Join group</button>`;
 else if(v.join==='approval')act=g.req.includes('player')?`<button class="btn" disabled>Request sent. Waiting for an admin.</button>`:`<button class="btn" data-a="g_join" data-id="${v.id}">Request to join</button>`;
 else act=`<div class="note">This group is invite-only. Ask a member for an invitation or a code.</div>`;
 return `<div class="muted sm">${esc(v.desc)||'No description yet.'}</div>
 ${v.gated?'<div class="note grp" style="margin:10px 0">Messages, members and activities are only visible to members.</div>':''}
 ${v.rules&&v.rules.length?`<section class="card"><b>📜 Rules</b>${v.rules.map((r,i)=>`<div class="sm" style="margin-top:6px">${i+1}. ${esc(r)}</div>`).join('')}</section>`:''}
 ${v.announcements&&v.announcements.length?`<section class="card"><b>📣 Announcements</b><div style="margin-top:8px">${v.announcements.map(p=>gpostHtml(g,p,false,null)).join('')}</div></section>`:''}
 ${v.events&&v.events.length?`<section class="card"><b>🗓️ Coming up</b>${v.events.slice(0,3).map(e=>`<div class="tx"><span>${esc(e.title)}</span><span class="muted tiny">${e.kind==='meetup'?dayRel(e.day):'until Day '+e.dl}</span></div>`).join('')}</section>`:''}
 <div style="margin-top:12px">${act}</div>`}

function gHome(g,v){const me=rk(g,'player'),canInv=gcan(g,'player','invite')&&!(me<2&&g.memInvite==='admins'),props=g.ajoP.filter(p=>p.st==='proposed'),m=g.mem.player,hand=gcan(g,'player','editInfo');
 const succ=g.owner==='player'?nextOwner(g,'player'):null;
 const wa=v.waLink||g.waLink||'';
 return `<div class="muted sm">${esc(v.desc)||'No description yet.'}</div>
 ${wa?`<a class="btn green" style="margin-top:12px;display:block;text-decoration:none" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">💬 Join WhatsApp group</a>
 <div class="muted tiny" style="margin-top:6px">Opens the organizer’s WhatsApp group invite in a new tab.</div>`:''}
 ${canInv?`<button class="btn" style="margin-top:12px" data-a="g_inv" data-id="${g.id}">＋ Invite friends</button>`:''}
 <button class="btn" style="margin-top:8px" data-a="grpChatOpen" data-id="${g.id}">💬 Open group chat</button>
 ${v.rules.length?`<section class="card"><b>📜 Rules</b>${v.rules.map((r,i)=>`<div class="sm" style="margin-top:6px">${i+1}. ${esc(r)}</div>`).join('')}</section>`:''}
 <section class="card"><b>📣 Announcements</b><div style="margin-top:8px">${v.announcements.length?v.announcements.map(p=>gpostHtml(g,p,false,null)).join(''):'<div class="muted sm">No announcements yet.'+(hand?' Post one from Manage.':'')+'</div>'}</div></section>
 <section class="card"><b>🗓️ Coming up</b>${v.events.length?v.events.slice(0,3).map(e=>`<div class="tx"><span>${e.kind==='meetup'?'🗓️':'🏆'} ${esc(e.title)}</span><span class="muted tiny">${e.kind==='meetup'?dayRel(e.day):'until Day '+e.dl}</span></div>`).join('')+`<button class="btn ghost sm" style="margin-top:8px" data-a="g_tab" data-v="events">See activities</button>`:'<div class="muted sm" style="margin-top:6px">Nothing planned yet.</div>'}</section>
 <section class="card"><b>🤝 Ajo circles</b><div class="muted tiny" style="margin:4px 0 8px">A group is for friends and fun. An Ajo is a separate savings circle with real contributions. Being in this group never puts you in an Ajo and nothing is paid from here.</div>
 ${v.ajos.map(a=>`<button class="act" data-a="ajoOpen" data-id="${a.id}"><div class="ic">🤝</div><div><b>${esc(a.name)}</b><small>${fmt(a.amt)} every ${a.freq} days · ${a.count}/${a.size} joined · ${a.status}</small></div><span class="go">›</span></button>`).join('')}
 ${props.map(p=>`<div class="card" style="background:var(--card);margin:8px 0"><b>📌 ${esc(p.name)}</b><div class="muted sm">Proposed by ${esc(nm(p.by))} · ${fmt(p.amt)} every ${p.freq} days · ${p.size} people · pot ${fmt(p.amt*p.size)}</div><div class="tiny muted" style="margin-top:4px">${p.int.length} interested. Interest is not a commitment. Nothing is owed.</div><div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn sm ${p.int.includes('player')?'':'ghost'}" data-a="g_int2" data-p="${p.id}">${p.int.includes('player')?'Interested ✓':'I want to read the terms'}</button>${p.by==='player'||hand?`<button class="btn sm green" data-a="g_mkajo" data-p="${p.id}">Set up this Ajo</button><button class="btn sm ghost" data-a="g_closep" data-p="${p.id}">Close</button>`:''}</div></div>`).join('')}
 ${!props.length?`<button class="btn ghost sm" data-a="g_ajo">Propose an Ajo to this group</button>`:''}</section>
 ${g.vis==='public'?`<button class="btn ghost" style="margin-top:8px" data-a="g_show">${m.show?'✓ Shown on my profile. Tap to hide':'Show this group on my profile'}</button>`:'<div class="muted tiny" style="margin-top:8px">Private group: it never appears on your profile.</div>'}
 <button class="btn ${UI.gconf==='leave'?'red':'ghost'}" style="margin-top:8px" data-a="g_leave">${UI.gconf==='leave'?'Tap again to leave':'Leave group'}</button>
 <div class="muted tiny" style="margin-top:6px">Leaving a group does not change any Ajo you joined or anything you owe.${succ?' You are the owner: '+esc(nm(succ))+' would take over.':''}</div>`}

function gChat(g,v){
 return `<div class="card"><b>Group chat</b><div class="muted sm" style="margin:8px 0 12px">WhatsApp-style chat for members — messages and polls.</div>
  <button class="btn" data-a="grpChatOpen" data-id="${g.id}">💬 Open group chat</button></div>
  <div class="muted tiny" style="margin-top:10px">Be kind. Report abuse. Neighbours may reply offline.</div>`}

function gEvents(g,v){const adm=rk(g,'player')>=3,evs=g.evs.filter(e=>G.day<=e.dl||e.done).sort((a,b)=>(a.day||a.dl)-(b.day||b.dl)),E=UI.ge;
 const card=e=>{const going=e.going.includes('player'),sim=e.going.filter(m=>m!=='player').length;
  if(e.kind==='meetup'){const att=e.att.includes('player');return `<div class="card"><div class="row sp"><b>🗓️ ${esc(e.title)}</b><span class="pill wait">${dayRel(e.day)}</span></div><div class="muted sm">${LOCS[e.loc].ic} ${LOCS[e.loc].n} · ${e.going.length} going (${sim} simulated)</div><div class="row" style="margin-top:8px;flex-wrap:wrap">${att?'<span class="pill ok">You went ✓</span>':going?(e.day===G.day?(G.p.loc===e.loc?`<button class="btn sm green" data-a="g_att" data-e="${e.id}">Join in now (2h)</button>`:`<button class="btn sm" data-a="goto" data-to="${e.loc}">Go there</button>`):'<span class="pill ok">You are going</span>'):`<button class="btn sm" data-a="g_rsvp" data-e="${e.id}" data-y="1">I will come</button>`}${going&&!att&&e.day>=G.day?`<button class="btn sm ghost" data-a="g_rsvp" data-e="${e.id}" data-y="0">Cancel</button>`:''}</div></div>`}
  const t=gTotal(e);return `<div class="card"><div class="row sp"><b>🏆 ${esc(e.title)}</b><span class="pill ${e.done?'ok':'wait'}">${e.done?'Done ✓':'until Day '+e.dl}</span></div><div class="muted sm">Team goal: ${e.target} ${CHL[e.type]} together</div>${bar(Math.min(100,t/e.target*100),'#22c177')}<div class="tiny muted" style="margin-top:4px">${t}/${e.target} · you added ${e.prog.player||0} · other contributions are simulated</div>${!e.done&&!going?`<button class="btn sm" style="margin-top:8px" data-a="g_rsvp" data-e="${e.id}" data-y="1">Join the challenge</button>`:''}</div>`};
 return (evs.length?evs.map(card).join(''):'<div class="card muted center">No activities yet.'+(adm?' Plan a meetup or challenge below.':'')+'</div>')+
 `<div class="muted tiny">Meetups happen in town: be at the place on the day. Challenges count your own work, chats and shop sessions. Everyone else here is simulated.</div>`+
 (adm?`<section class="card"><b>＋ Plan something</b>${GT('etitle','Title, e.g. Friday jollof',40)}<label class="l">Type</label>${GO('ge','kind',['meetup','challenge'],E.kind,v=>v==='meetup'?'🗓️ Meetup':'🏆 Challenge')}
 ${E.kind==='meetup'?`<label class="l">Where</label>${GO('ge','loc',G_LOCS,E.loc,v=>LOCS[v].ic+' '+LOCS[v].n)}<label class="l">When</label>${GO('ge','off',[0,1,2,3,7],E.off,v=>+v===0?'Today':'in '+v+' day'+(+v===1?'':'s'))}`:`<label class="l">Goal</label>${GO('ge','type',['work','talk','shop'],E.type,v=>CHL[v])}<label class="l">Team total</label>${GO('ge','target',[5,10,20],E.target)}<label class="l">Runs for</label>${GO('ge','dur',[3,7,14],E.dur,v=>v+' days')}`}
 <button class="btn" style="margin-top:8px" data-a="g_evmake">Create</button></section>`:'')}

function gPeople(g,v){const L=memberList(g.id);if(!L)return '';if(L.hidden)return `<div class="note">The member list is visible to admins only. ${L.count} members.</div>`;
 const me=rk(g,'player');
 return `<div class="muted tiny" style="margin-bottom:8px">${L.length} members · ${L.filter(x=>x.npc).length} simulated (NPC). No contact details are stored. Blocking hides someone's posts and removes them from groups you own.</div>`+
 L.map(x=>{const blk=G.blk.includes(x.id),r=rk(g,x.id);return `<div class="card" style="margin:0 0 8px"><div class="row sp"><div class="row"><span style="font-size:24px">${avOf(x.id)}</span><div><b>${x.id==='player'?'You':esc(x.name)}</b> ${npcTag(x.id)}<div class="tiny muted">Joined Day ${x.joined}</div></div></div>${rolePill(x.role)}</div>
 ${x.id!=='player'?`<div class="row" style="margin-top:8px;flex-wrap:wrap">${me===4&&x.role!=='owner'?['admin','mod','member'].filter(q=>q!==x.role).map(q=>`<button class="btn sm ghost" data-a="g_role" data-u="${x.id}" data-r="${q}">${q==='admin'?'Make admin':q==='mod'?'Make moderator':'Make member'}</button>`).join(''):''}${me>=3&&r<me?`<button class="btn sm ghost" data-a="g_rm" data-u="${x.id}">Remove</button><button class="btn sm red" data-a="g_ban" data-u="${x.id}">Ban</button>`:''}<button class="btn sm ghost" data-a="${blk?'g_unblock':'g_block'}" data-u="${x.id}">${blk?'Unblock':'Block'}</button></div>`:''}</div>`}).join('')}

function gManage(g,v){const me=rk(g,'player'),adm=me>=3,own=me===4,reps=g.reps.filter(r=>r.st==='open');
 let h=`<section class="card"><b>🖼️ Group photo</b>
  <div class="row" style="margin-top:10px;gap:12px;align-items:center">
    <div class="av ${g.photo?'has-photo':''}" style="width:72px;height:72px;font-size:36px">${gFace(g,72)}</div>
    <div style="flex:1;min-width:0">
      ${me>=2?`<label class="btn sm ghost" style="display:inline-block;cursor:pointer">Upload photo
        <input type="file" accept="image/*" data-gphoto="${g.id}" style="display:none">
      </label>
      ${g.photo?`<button class="btn sm ghost" style="margin-left:6px" data-a="g_photoClear" data-id="${g.id}">Remove</button>`:''}
      <div class="tiny muted" style="margin-top:6px">Admins only. Stored on this device until the backend is connected.</div>`
      :`<div class="muted sm">Only admins can change the group photo.</div>`}
    </div>
  </div>
 </section>
 <section class="card"><b>🚩 Reports (${reps.length})</b>${reps.length?reps.map(r=>{const p=g.posts.find(x=>x.id===r.pid);return `<div style="margin-top:10px"><div class="tiny muted">${esc(nm(r.by))} reported ${esc(nm(r.target))}: ${esc(r.why)}</div><div class="msg" style="margin:6px 0">${p?esc(p.txt):'[post gone]'}</div><div class="row" style="flex-wrap:wrap"><button class="btn sm ghost" data-a="g_review" data-r="${r.id}" data-x="dismiss">Dismiss</button>${p&&!p.hid?`<button class="btn sm" data-a="g_review" data-r="${r.id}" data-x="hide">Hide post</button>`:''}${adm?`<button class="btn sm ghost" data-a="g_review" data-r="${r.id}" data-x="remove">Remove member</button><button class="btn sm red" data-a="g_review" data-r="${r.id}" data-x="ban">Ban</button>`:''}</div></div>`}).join(''):'<div class="muted sm" style="margin-top:6px">No open reports.</div>'}</section>`;
 if(!adm)return h+'<div class="note">Moderators review reports and hide posts. Settings belong to admins and the owner.</div>';
 h+=`<section class="card"><b>🙋 Join requests (${g.req.length})</b>${g.req.length?g.req.map(u=>`<div class="tx"><span>${avOf(u)} ${esc(nm(u))} ${npcTag(u)}</span><span class="row"><button class="btn sm green" data-a="g_apv" data-u="${u}" data-y="1">Approve</button><button class="btn sm ghost" data-a="g_apv" data-u="${u}" data-y="0">Decline</button></span></div>`).join(''):'<div class="muted sm" style="margin-top:6px">No one is waiting.</div>'}</section>
 <button class="btn ghost" style="margin:0 0 12px" data-a="g_inv" data-id="${g.id}">Invitations: friends, links and codes</button>
 <section class="card"><b>📣 Announcement</b><div style="margin-top:8px">${GT('ann','Tell the group something important',280,'','g_ann')}</div><button class="btn sm" style="margin-top:8px" data-a="g_ann">Post announcement</button></section>`;
 const S={desc:g.desc,av:g.av,cat:g.cat,memInvite:g.memInvite,join:g.join,roster:g.roster,vis:g.vis,disc:g.disc,...(UI.gs||{})},pub=S.vis==='public';
 h+=`<section class="card"><b>⚙️ Settings</b><label class="l">Picture</label>${GO('gs','av',G_AVS,S.av,v=>v)}
 <label class="l">Member limit</label>
 <div class="field-row"><input type="number" data-f="smax" min="3" max="60" step="1" value="${UI.gi.smax!==undefined?esc(String(UI.gi.smax)):(g.maxMembers||30)}"><span class="field-hint">${gcount(g)} / ${gCap(g)} now</span></div>
 <div class="muted tiny">Cannot go below current members. Hard max is 60.</div>
 <label class="l">About</label>${GT('sdesc','Description',240,g.desc)}<label class="l">Rules</label>${[0,1,2].map(i=>GT('sr'+i,'Rule '+(i+1),100,g.rules[i]||'')).join('<div style="height:6px"></div>')}
 <label class="l">Main interest</label>${GO('gs','cat',G_CATS,S.cat)}<label class="l">How people join</label>${GO('gs','join',pub?['open','approval']:['invite','approval'],pub?(S.join==='approval'?'approval':'open'):(S.join==='approval'?'approval':'invite'),v=>JOINL[v])}
 <label class="l">Who can invite</label>${GO('gs','memInvite',['members','admins'],S.memInvite,v=>v==='members'?'Any member':'Only admins')}<label class="l">Who sees the member list</label>${GO('gs','roster',['members','admins'],S.roster,v=>v==='members'?'All members':'Only admins')}
 ${own?`<label class="l">Visibility (owner only)</label>${GO('gs','vis',['public','private'],S.vis,v=>v==='public'?'🌍 Public':'🔒 Private')}<div class="muted tiny">${S.vis==='public'?'Announcements and the description become visible to everyone. Chat and members stay private.':'Hidden from search and from profiles.'}</div>${S.vis==='private'?`<label class="l">Findable in search?</label>${GO('gs','disc',[false,true],S.disc,v=>v?'Yes, invite-discoverable':'No, hidden')}`:''}`:''}
 <label class="l">WhatsApp group link</label>
 <div class="field"><input type="url" data-f="swa" value="${esc((UI.gi.swa!==undefined?UI.gi.swa:(g.waLink||'')))}" placeholder="https://chat.whatsapp.com/…" autocomplete="off"></div>
 <div class="muted tiny">Members will see a “Join WhatsApp group” button. Only admins can change this.</div>
 <button class="btn" style="margin-top:12px" data-a="g_save">Save changes</button></section>`;
 if(own){const admins=Object.keys(g.mem).filter(m=>g.mem[m].role==='admin'),tx=UI.gs&&UI.gs.tx;
  h+=`<section class="card"><b>👑 Owner</b><label class="l">Transfer ownership to an admin</label>${admins.length?GO('gs','tx',admins,tx,id=>esc(nm(id))):'<div class="muted sm">Make someone an admin first (People tab).</div>'}${GT('tconf','Type "'+g.name+'" to confirm',30)}<button class="btn ghost sm" style="margin-top:8px" data-a="g_transfer">Transfer ownership</button>
  <label class="l" style="margin-top:16px">Delete this group</label><div class="muted tiny">Deletes the group and its chat. Any Ajo circle linked to it is not touched.</div>${GT('dconf','Type the group name to confirm',30)}<button class="btn red sm" style="margin-top:8px" data-a="g_delete">Delete group</button></section>`}
 return h}

function gnewSheet(){const f=UI.gc,pub=f.vis==='public',jn=pub?(f.join==='approval'?'approval':'open'):(f.join==='approval'?'approval':'invite');
 return `<h2>Create a group</h2><div class="muted sm" style="margin-top:4px">Free, for friends and shared fun. It is not an Ajo.</div>
 <label class="l">Name</label>${GT('name','e.g. Kano Entrepreneurs',30)}
 <label class="l">Member limit</label>
 <div class="field-row"><input type="number" data-f="gmax" min="3" max="60" step="1" value="${UI.gi.gmax!==undefined?esc(String(UI.gi.gmax)):(f.maxMembers||30)}" placeholder="30"><span class="field-hint">3–60 people</span></div>
 <div class="muted tiny" style="margin-bottom:4px">You can change this later in group Settings.</div>
 <label class="l">Picture</label>${GO('gc','av',G_AVS,f.av,v=>v)}<label class="l">About</label>${GT('desc','What is this group for?',240)}
 <label class="l">WhatsApp group link (optional)</label>
 <div class="field"><input type="url" data-f="wa" value="${esc(UI.gi.wa||'')}" placeholder="https://chat.whatsapp.com/…" autocomplete="off"></div>
 <div class="muted tiny">If you already have a WhatsApp group, paste the invite link so members can join it.</div>
 <label class="l">Main interest</label>${GO('gc','cat',G_CATS,f.cat)}<label class="l">More interests (up to 3)</label><div class="opts">${G_CATS.filter(c=>c!==f.cat).map(c=>`<button data-a="g_ctag" data-v="${c}" class="${(f.tags||[]).includes(c)?'on':''}">${c}</button>`).join('')}</div>
 <label class="l">Who can find it?</label>${GO('gc','vis',['public','private'],f.vis,v=>v==='public'?'🌍 Public':'🔒 Private')}<div class="muted tiny">${pub?'Anyone can find it and read the description and announcements. Chat and members stay for members only.':'Hidden from search. People need an invitation. Chat, members and activities are for members only.'}</div>
 ${pub?'':`<label class="l">Let people find it in search?</label>${GO('gc','disc',[false,true],f.disc,v=>v?'Yes, invite-discoverable':'No, hidden')}`}
 <label class="l">How people join</label>${GO('gc','join',pub?['open','approval']:['invite','approval'],jn,v=>JOINL[v])}<label class="l">Who can invite</label>${GO('gc','memInvite',['members','admins'],f.memInvite,v=>v==='members'?'Any member':'Only admins')}
 <label class="l">Rules (optional)</label>${GT('rule1','Rule 1',100)}<div style="height:6px"></div>${GT('rule2','Rule 2',100)}<button class="btn" style="margin-top:14px" data-a="g_make">Create group</button>`}

function gcodeSheet(){return `<h2>Join with a code</h2><div class="muted sm" style="margin:4px 0 10px">Enter an invitation code such as KANO-AB12CD. Wrong guesses are limited each day.</div>${GT('code','KANO-XXXXXX',12,'','g_redeem')}<button class="btn" style="margin-top:12px" data-a="g_redeem">Join</button><div class="note" style="margin:14px 0 0">Codes made here work on this device. Sharing between real players needs the online version.</div>`}

function ginvSheet(id){const g=grp(id);if(!g||!gcan(g,'player','invite')||(rk(g,'player')<2&&g.memInvite==='admins'))return '<h2>Not available</h2><div class="muted sm">You cannot invite people to this group.</div>';
 const cands=G.npcs.filter(n=>n.met&&!g.mem[n.id]&&!g.ban.includes(n.id)&&!G.blk.includes(n.id)&&!g.inv.some(i=>i.to===n.id&&invState(i)==='pending')).sort((a,b)=>b.rel-a.rel),sel=UI.gsel,adm=rk(g,'player')>=3;
 const mineInv=g.inv.filter(i=>i.to!=='player'&&(i.by==='player'||adm)).slice().reverse(),L=UI.gl;
 return `<button class="btn ghost sm" data-a="g_back">← Back to group</button><h2 style="margin-top:10px">Invite to ${esc(g.name)}</h2>
 <section class="card"><b>👥 Friends you know</b><div class="muted tiny" style="margin:4px 0 8px">Only people you have met in the game. Your phone contacts are never read.</div>
 ${cands.length?`<div class="opts">${cands.map(n=>`<button data-a="g_tog" data-u="${n.id}" class="${sel.includes(n.id)?'on':''}">${n.em} ${n.n}</button>`).join('')}</div><button class="btn sm" data-a="g_sendinv" ${sel.length?'':'disabled'}>Send ${sel.length||''} invitation${sel.length===1?'':'s'}</button>`:'<div class="muted sm">Everyone you know is already here, or you have not met anyone yet.</div>'}</section>
 <section class="card"><b>🔗 Invitation link or code</b><div class="muted tiny" style="margin:4px 0 4px">Expires and can be revoked at any time.</div><label class="l">Valid for</label>${GO('gl','ttl',[1,7,30],L.ttl,v=>v+' day'+(+v===1?'':'s'))}<label class="l">Max uses</label>${GO('gl','max',[1,5,10,25],L.max)}<button class="btn sm" data-a="g_link">Create code</button></section>
 <section class="card"><b>Sent invitations (${mineInv.length})</b>${mineInv.length?mineInv.map(i=>{const s=invState(i),who=i.to?esc(nm(i.to))+' '+npcTag(i.to):'Code <b>'+i.code+'</b> ('+i.uses+'/'+i.max+' used)';
  return `<div class="tx" style="display:block"><div class="row sp"><span class="sm">${who}</span><span class="pill ${s==='accepted'?'ok':s==='pending'?'wait':'no'}">${s}</span></div><div class="tiny muted">Sent Day ${i.day}${i.acc.length?' · accepted Day '+i.acc[i.acc.length-1].day+(i.acc.length>1?' (+'+(i.acc.length-1)+' more)':''):''}${s==='pending'?' · expires Day '+i.exp:''}</div>
  <div class="row" style="margin-top:6px;flex-wrap:wrap">${s==='pending'&&!i.to?`<button class="btn sm" data-a="g_share" data-c="${i.code}">Share</button>`:''}${s==='pending'?`<button class="btn sm ghost" data-a="g_revoke" data-i="${i.id}">Revoke</button>`:''}${(s==='declined'||s==='expired')&&!i.rev?`<button class="btn sm ghost" data-a="g_resend" data-i="${i.id}">Resend</button>`:''}</div></div>`}).join(''):'<div class="muted sm" style="margin-top:6px">No invitations yet.</div>'}</section>`}

function gajoSheet(id){const g=grp(id);if(!g)return '<h2>Not available</h2>';const p=UI.gp;
 return `<button class="btn ghost sm" data-a="g_back">← Back to group</button><h2 style="margin-top:10px">Propose an Ajo</h2>
 <div class="warnbox" style="margin:10px 0">This is only a suggestion. Nobody joins, nobody pays, nothing is owed. If you go ahead, a separate Ajo circle is created with its own members, rules and payments, and each person decides for themselves whether to join.</div>
 <label class="l">Name</label>${GT('pname','Ajo name',24,g.name+' Ajo')}
 <label class="l">People in the circle</label>
 <div class="field-row"><input type="number" data-f="psize" min="3" max="12" step="1" value="${UI.gi.psize!==undefined?esc(String(UI.gi.psize)):p.size}"><span class="field-hint">3–12 members</span></div>
 <div class="opts" style="margin-top:6px">${[3,4,5,6,8,10].map(n=>`<button data-a="g_set" data-o="gp" data-k="size" data-v="${n}" class="${+p.size===n?'on':''}">${n}</button>`).join('')}</div>
 <label class="l">Contribution amount (₦)</label>
 <div class="field-row"><input type="number" data-f="pamt" min="500" max="500000" step="500" value="${UI.gi.pamt!==undefined?esc(String(UI.gi.pamt)):p.amt}"><span class="field-hint">Type any amount</span></div>
 <div class="opts" style="margin-top:6px">${[1000,2000,5000,10000,20000,50000].map(n=>`<button data-a="g_set" data-o="gp" data-k="amt" data-v="${n}" class="${+p.amt===n?'on':''}">${fmt(n)}</button>`).join('')}</div>
 <label class="l">Every</label>${GO('gp','freq',[3,7,14],p.freq,v=>v+' days')}
 <div class="card" style="background:var(--card)"><div class="row sp"><span class="muted">Pot per round</span><b>${fmt((UI.gi.pamt!==undefined?+UI.gi.pamt:p.amt)*(UI.gi.psize!==undefined?+UI.gi.psize:p.size))}</b></div><div class="muted tiny">Organizer sets size and contribution. Needs Trust 40+.</div></div><button class="btn" data-a="g_propose">Share this proposal</button>`}

function gstatsV(){const m=groupMetrics(),pc=x=>x==null?'n/a':Math.round(x*100)+'%',row=(l,v)=>`<div class="tx"><span>${l}</span><b>${v}</b></div>`;
 return `<section class="card"><b>🏘️ Group health</b><div class="muted tiny" style="margin:4px 0 8px">Kept on this device only. Chat from simulated neighbours (NPC) is not counted. Participation matters more than invitations.</div>${row('Groups you are in',m.groups)}${row('Active in the last 7 days',m.activeThisWeek)}${row('Groups where you posted lately',m.conversational)}${row('Activities completed',m.activities)}${row('First interactions',m.firstInteractions)}${row('Came back after 7+ days away',m.returned7)}${row('Went quiet (14+ days)',m.inactive)}</section>
 <section class="card"><b>Invitations and joining</b>${row('Groups created',m.created)}${row('Invitations sent',m.sent)}${row('Invitations accepted',m.accepted)}${row('Acceptance rate',pc(m.acceptRate))}${row('Invited by a regular member',m.memberInvites)}${row('Join requests',m.requests)}${row('Approved',m.approved)}</section>`}

function gShare(code,gid){const g=grp(gid);if(!g)return;const url=location.href.split('#')[0]+'#join='+code,text='Join "'+g.name+'" on Kano City with code '+code;
 if(navigator.share){navigator.share({title:g.name,text,url}).catch(()=>{});return}
 const done=m=>{fx(m,'warm');render()};try{navigator.clipboard.writeText(text+' '+url).then(()=>done('Invitation copied. Paste it into any chat.'),()=>done('Copy this code: '+code))}catch(e){done('Copy this code: '+code)}}
function deepLink(){if(!G)return;let h='';try{h=(location.hash||'').slice(1)}catch(e){}
 const m=h.match(/^(join|g|ajo)=([\w-]+)$/i);if(!m)return;
 try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
 if(m[1].toLowerCase()==='ajo'){
   UI.tab='ajo';UI.modal={t:'ajoCode'};UI.gi.ajoCode=m[2].toUpperCase();render();return;
 }
 UI.tab='groups';
 if(m[1]==='join'){UI.modal={t:'gcode'};UI.gi.code=m[2].toUpperCase()}
 else{UI.modal={t:'grp',id:m[2]};UI.gt='home'}
}

function gClick(a,d){const M=UI.modal||{};
 switch(a){
  case 'g_open':UI.modal={t:'grp',id:d.id};UI.gt='home';UI.gi.replyTo=null;UI.gs=null;UI.gconf=null;visitGroup(d.id);commit();break;
  case 'g_photoClear':run(clearGroupPhoto,d.id);break;
  case 'g_tab':if(d.v==='chat'&&UI.modal&&UI.modal.id){UI.modal={t:'grpChat',id:UI.modal.id};render();break}UI.gt=d.v;UI.gconf=null;UI.gs=null;render();break;
  case 'g_back':UI.modal={t:'grp',id:M.id};render();break;
  case 'g_set':{const o=UI[d.o]||(UI[d.o]={});o[d.k]=d.v==='true'?true:d.v==='false'?false:d.v;if(d.o==='gp'&&d.k==='size')delete UI.gi.psize;if(d.o==='gp'&&d.k==='amt')delete UI.gi.pamt;render();break}
  case 'g_cat':UI.gcat=UI.gcat===d.v?'':d.v;render();break;
  case 'g_search':render();break;
  case 'g_clear':UI.gcat='';UI.gi.q='';render();break;
  case 'g_int':{const l=G.p.ints,i=l.indexOf(d.v);if(i<0)l.push(d.v);else l.splice(i,1);commit();break}
  case 'g_area':G.p.area=d.v||null;G.p.shareArea=!!d.v;commit();break;
  case 'g_new':UI.modal={t:'gnew'};render();break;
  case 'g_ctag':{const t=UI.gc.tags=UI.gc.tags||[],i=t.indexOf(d.v);if(i>=0)t.splice(i,1);else if(t.length<3)t.push(d.v);render();break}
  case 'g_make':{const f=UI.gc,i=UI.gi,id=createGroup({...f,name:i.name,desc:i.desc,rules:[i.rule1,i.rule2],maxMembers:parseInt(i.gmax)||f.maxMembers||30,waLink:i.wa||''});if(id){['name','desc','rule1','rule2','gmax','wa'].forEach(k=>delete UI.gi[k]);UI.gc.tags=[];UI.modal={t:'grp',id};UI.gt='home';UI.tab='groups'}commit();break}
  case 'g_code':UI.modal={t:'gcode'};render();break;
  case 'g_redeem':{const id=redeemCode(UI.gi.code);if(id){UI.gi.code='';UI.modal={t:'grp',id};UI.gt='home'}commit();break}
  case 'g_join':run(joinGroup,d.id);break;
  case 'g_ans':run(answerInvite,d.id,d.i,d.y==='1');break;
  case 'g_leave':if(UI.gconf!=='leave'){UI.gconf='leave';render()}else{UI.gconf=null;if(leaveGroup(M.id,'player'))UI.modal=null;commit()}break;
  case 'g_show':{const g=grp(M.id);if(g&&g.mem.player)setShow(M.id,'player',!g.mem.player.show);commit();break}
  case 'grpChatOpen':UI.gi.pollOpen=false;UI.modal={t:'grpChat',id:d.id};render();break;
  case 'grpChatBack':UI.modal={t:'grp',id:d.id};UI.gt='home';render();break;
  case 'g_chatSend':{
    if(!UI.gi)UI.gi={};
    const gid=d.id||(UI.modal&&UI.modal.id);
    const t=((document.getElementById('grp-chat-in')||{}).value||UI.gi.msg||'').trim();
    if(!gid){fx('Open a group chat first.','warn');flush();break}
    if(!t){fx('Write a message.','warn');flush();break}
    if(gpost(gid,'player',t)){UI.gi.msg='';const inp=document.getElementById('grp-chat-in');if(inp)inp.value=''}
    commit();break}
  case 'g_voice':{
    const gid=d.id||(UI.modal&&UI.modal.id);
    if(!gid){fx('Open a group chat first.','warn');flush();break}
    groupVoice(gid);commit();break}
  case 'g_quick':{const gid=d.id||(UI.modal&&UI.modal.id);if(gid&&gpost(gid,'player',d.t))commit();break}
  case 'g_pollOpen':if(!UI.gi)UI.gi={};UI.gi.pollOpen=true;UI.gi.pollQ='';UI.gi.pollOpts=['','',''];render();break;
  case 'g_pollCancel':if(UI.gi)UI.gi.pollOpen=false;render();break;
  case 'g_pollSend':{
    if(!UI.gi)UI.gi={};
    const gid=d.id||(UI.modal&&UI.modal.id);
    const q=((document.getElementById('poll-q')||{}).value||UI.gi.pollQ||'').trim();
    const opts=[1,2,3].map(i=>((document.getElementById('poll-o'+i)||{}).value||'')).map(s=>s.trim()).filter(Boolean);
    if(!gid){fx('Open a group chat first.','warn');flush();break}
    if(!q){fx('Write a poll question.','warn');flush();break}
    if(opts.length<2){fx('Add at least two options.','warn');flush();break}
    const id=createGroupPoll(gid,q,opts);
    if(id){UI.gi.pollOpen=false;UI.gi.pollQ='';UI.gi.pollOpts=['','',''];fx('Poll posted','good')}
    commit();break}
  case 'g_vote':run(votePoll,d.id||(UI.modal&&UI.modal.id),d.p,d.o);break;
  case 'g_send':{if(gpost(M.id,'player',UI.gi.msg,{parent:UI.gi.replyTo||null})){UI.gi.msg='';UI.gi.replyTo=null}commit();break}
  case 'g_reply':UI.gi.replyTo=d.p;render();break;
  case 'g_cancelreply':UI.gi.replyTo=null;render();break;
  case 'g_rep':UI.gconf=UI.gconf==='rep:'+d.p?null:'rep:'+d.p;render();break;
  case 'g_report':UI.gconf=null;run(reportPost,M.id,'player',d.p,d.r);break;
  case 'g_hide':run(hidePost,M.id,'player',d.p);break;
  case 'g_rsvp':run(rsvp,M.id,'player',d.e,d.y==='1');break;
  case 'g_att':run(attendEvent,M.id,d.e);break;
  case 'g_evmake':{const e=UI.ge;if(createEvent(M.id,'player',{title:UI.gi.etitle,kind:e.kind,loc:e.loc,type:e.type,target:e.target,off:e.kind==='challenge'?e.dur:e.off}))delete UI.gi.etitle;commit();break}
  case 'g_role':run(setRole,M.id,'player',d.u,d.r);break;
  case 'g_rm':run(removeMember,M.id,'player',d.u,false);break;
  case 'g_ban':run(removeMember,M.id,'player',d.u,true);break;
  case 'g_block':run(blockUser,d.u);break;
  case 'g_unblock':run(unblockUser,d.u);break;
  case 'g_apv':run(approveRequest,M.id,'player',d.u,d.y==='1');break;
  case 'g_ann':{if(gpost(M.id,'player',UI.gi.ann,{kind:'announce'}))UI.gi.ann='';commit();break}
  case 'g_review':run(reviewReport,M.id,'player',d.r,d.x);break;
  case 'g_save':{const g=grp(M.id);if(!g)break;const S={...g,...(UI.gs||{})},gi=UI.gi,rules=[0,1,2].map(i=>gi['sr'+i]!==undefined?gi['sr'+i]:(g.rules[i]||''));
   const patch={desc:gi.sdesc!==undefined?gi.sdesc:g.desc,rules,av:S.av,cat:S.cat,memInvite:S.memInvite,join:S.join,roster:S.roster};
   if(gi.smax!==undefined)patch.maxMembers=parseInt(gi.smax);
   if(gi.swa!==undefined)patch.waLink=gi.swa;
   if(rk(g,'player')===4){patch.vis=S.vis;patch.disc=S.disc}
   if(editGroup(M.id,'player',patch)){UI.gs=null;['sdesc','sr0','sr1','sr2','smax','swa'].forEach(k=>delete gi[k]);fx('Saved.','warm')}commit();break}
  case 'g_transfer':{if(transferOwnership(M.id,'player',UI.gs&&UI.gs.tx,UI.gi.tconf)){UI.gs=null;UI.gi.tconf=''}commit();break}
  case 'g_delete':{if(deleteGroup(M.id,'player',UI.gi.dconf)){UI.modal=null;UI.gi.dconf=''}commit();break}
  case 'g_inv':UI.modal={t:'ginv',id:d.id||M.id};UI.gsel=[];render();break;
  case 'g_tog':{const i=UI.gsel.indexOf(d.u);if(i<0)UI.gsel.push(d.u);else UI.gsel.splice(i,1);render();break}
  case 'g_sendinv':{inviteMany(M.id,'player',UI.gsel);UI.gsel=[];commit();break}
  case 'g_link':run(createInvite,M.id,'player',{ttl:UI.gl.ttl,max:UI.gl.max});break;
  case 'g_revoke':run(revokeInvite,M.id,'player',d.i);break;
  case 'g_resend':run(resendInvite,M.id,'player',d.i);break;
  case 'g_share':gShare(d.c,M.id);break;
  case 'g_ajo':UI.modal={t:'gajo',id:M.id};render();break;
  case 'g_propose':{const gi=UI.gi;const size=gi.psize!==undefined?+gi.psize:UI.gp.size;const amt=gi.pamt!==undefined?+gi.pamt:UI.gp.amt;if(proposeAjo(M.id,'player',{...UI.gp,name:gi.pname,size,amt})){UI.modal={t:'grp',id:M.id};UI.gt='home';['pname','psize','pamt'].forEach(k=>delete UI.gi[k])}commit();break}
  case 'g_int2':{const g=grp(M.id),p=g&&g.ajoP.find(x=>x.id===d.p);if(p)expressInterest(M.id,'player',d.p,!p.int.includes('player'));commit();break}
  case 'g_mkajo':{const r=ajoFromProposal(M.id,'player',d.p);if(r){UI.modal={t:'ajo',id:r};UI.tab='ajo'}commit();break}
  case 'g_closep':run(dismissProposal,M.id,'player',d.p);break;
 }}

/* ---- feedback ---- */
function flush(){const q=FX.splice(0);if(!q.length)return;let i=0,ti=0;const cash=document.getElementById('cash');
 q.forEach(f=>{
  if(f.k==='gain'||f.k==='loss'){const r=cash?cash.getBoundingClientRect():{left:120,top:40,width:100};const el=document.createElement('div');el.className='float '+f.k;el.textContent=f.t;el.style.left=(r.left+r.width/2-40)+'px';el.style.top=(r.top+30+i*4)+'px';el.style.animationDelay=(i*.15)+'s';document.body.appendChild(el);setTimeout(()=>el.remove(),1800+i*150);i++;if(cash){cash.classList.add('pulse');setTimeout(()=>cash.classList.remove('pulse'),250)}}
  else if(f.k==='trust'||f.k==='trustdn'||f.k==='rep'){const r=document.getElementById(f.k==='rep'?'chR':'chT'),b=r?r.getBoundingClientRect():{left:300,top:60};const el=document.createElement('div');el.className='float '+f.k;el.textContent=f.t;el.style.left=Math.max(8,Math.min(innerWidth-170,b.left-60))+'px';el.style.top=(b.top+36+i*4)+'px';el.style.animationDelay=(i*.15)+'s';document.body.appendChild(el);setTimeout(()=>el.remove(),1800+i*150);i++}
  else if(f.k==='payout'){const [t,a]=f.t.split('|');const el=document.createElement('div');el.className='payout';el.innerHTML=`<div><span>AJO PAYOUT</span><b>+${a}</b>🎉🛺💸</div>`;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
  else{if(ti>=3)return;const c=document.getElementById('toasts'),el=document.createElement('div');el.className='toast '+f.k;el.textContent=f.t;c.appendChild(el);setTimeout(()=>el.remove(),3400);ti++}})}

/* ---- input ---- */
const run=(fn,...a)=>{fn(...a);commit()};
document.addEventListener('change',e=>{
  if(e.target&&(e.target.id==='f-ajo-size'||e.target.id==='f-ajo-amt'||e.target.id==='f-ajo-freq')&&UI.modal&&UI.modal.t==='ajoNew'){
    if(e.target.id==='f-ajo-size')UI.ajoNew.size=+e.target.value||UI.ajoNew.size;
    if(e.target.id==='f-ajo-amt')UI.ajoNew.amt=+e.target.value||UI.ajoNew.amt;
    if(e.target.id==='f-ajo-freq')UI.ajoNew.freq=+e.target.value||UI.ajoNew.freq;
    render();
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='f-name')UI.form.name=e.target.value;
  if(e.target.id==='f-age')UI.form.age=e.target.value;
  if(e.target.id==='f-ajo')UI.ajoNew.name=e.target.value;
  if(e.target.id==='f-ajo-size'){UI.ajoNew.size=+e.target.value||UI.ajoNew.size;UI.gi.ajoSize=e.target.value}
  if(e.target.id==='f-ajo-amt'){UI.ajoNew.amt=+e.target.value||UI.ajoNew.amt;UI.gi.ajoAmt=e.target.value}
  if(e.target.id==='f-ajo-freq'){UI.ajoNew.freq=+e.target.value||UI.ajoNew.freq;UI.gi.ajoFreq=e.target.value}
  if(e.target.dataset&&e.target.dataset.f)UI.gi[e.target.dataset.f]=e.target.value
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.enter){const b=document.querySelector('[data-a="'+e.target.dataset.enter+'"]');if(b)b.click()}});
document.addEventListener('change',e=>{
  const inp=e.target;
  if(inp&&inp.matches&&inp.matches('input[type=file][data-gphoto]')){
    const gid=inp.getAttribute('data-gphoto');
    const file=inp.files&&inp.files[0];
    if(!file||!gid)return;
    if(file.size>700000){fx('Image too large (max ~700KB).','warn');flush();return}
    const reader=new FileReader();
    reader.onload=()=>{if(setGroupPhoto(gid,reader.result))commit();};
    reader.onerror=()=>{fx('Could not read image.','warn');flush()};
    reader.readAsDataURL(file);
    inp.value='';
  }
});
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||el.disabled)return;const d=el.dataset,a=d.a;
 if(a==='closeBack'){if(e.target===el){UI.modal=null;render()}return}
 if(a!=='reset')UI.confirmReset=false;
 switch(a){
  case 'gender':UI.form.gender=d.v;UI.avForm=Object.assign(defaultAvatar(d.v),{skin:(UI.avForm&&UI.avForm.skin)||defaultAvatar(d.v).skin,hairColor:(UI.avForm&&UI.avForm.hairColor)||'black',gender:d.v});render();break;
  
  case 'avOpen':UI.avForm=Object.assign({},G.p.avatar||defaultAvatar(G.p.gender));UI.avCat='skin';UI.modal={t:'avatar'};render();break;
  case 'avOpenCreate':{const g=(UI.form&&UI.form.gender)||'Male';UI.avForm=Object.assign({},defaultAvatar(g),UI.avForm||{},{gender:g});UI.avCat='skin';UI.modal={t:'avatar',create:true};render();break}
  case 'avCat':UI.avCat=d.v;render();break;
  case 'avSet':if(!UI.avForm)UI.avForm=defaultAvatar(UI.form.gender);UI.avForm[d.k]=d.v;UI.avForm.gender=(G&&G.p&&G.p.gender)||UI.form.gender||UI.avForm.gender;render();break;
  case 'avRandom':{
    const rnd=arr=>arr[Math.floor(Math.random()*arr.length)].id;
    UI.avForm={skin:rnd(AV.skin),face:rnd(AV.face),hair:rnd(AV.hair),hairColor:rnd(AV.hairColor),eyes:rnd(AV.eyes),brows:rnd(AV.brows),nose:rnd(AV.nose),mouth:rnd(AV.mouth),facial:rnd(AV.facial),accessory:rnd(AV.accessory),top:rnd(AV.top)};
    render();break}
  case 'avSave':setAvatar(UI.avForm);UI.modal=null;fx('Look saved','good');commit();break;
  case 'avSaveCreate':UI.avForm=UI.avForm||defaultAvatar(UI.form.gender);UI.modal=null;render();break;
  case 'finishSetup':markOnboarded();UI.modal=null;commit();break;
  case 'introMute':{
    const next=!((UI.introMuted!=null)?UI.introMuted:getIntroMuted());
    setIntroMuted(next);
    if(!next) playIntroAudio();
    render();
  }break;
  case 'authRegister':UI.authMode='register';UI.regStep=1;playIntroAudio();render();break;
  case 'authLogin':UI.authMode=null;render();break;
  case 'loginContinue':{
    (async()=>{
      try{
        if(typeof api!=='undefined'&&api.online){
          const session=await api.getSession();
          if(session){
            const remote=await api.pullState();
            if(remote&&remote.p){G=remote;migrate();UI.tab='life';UI.authMode=null;commit();return}
          }
        }
      }catch(e){console.warn(e)}
      const s=await Store.load();
      const acc=Account.load();
      if(s&&s.p){G=s;migrate();UI.tab='life';UI.authMode=null;render();return}
      if(acc){
        newGame(acc.name||acc.username,acc.age||24,acc.gender||'Male',{username:acc.username,interests:acc.interests||[],businessStatus:acc.businessStatus||'none'});
        if(acc.avatar) setAvatar(acc.avatar);
        UI.tab='life';UI.authMode=null;commit();
      } else {UI.authMode='register';render()}
    })();
  }break;
  case 'onlineLogin':{
    (async()=>{
      const email=(document.getElementById('f-email')||{}).value||'';
      const password=(document.getElementById('f-password')||{}).value||'';
      if(!email||!password){fx('Enter email and password.','warn');flush();return}
      fx('Signing in…','warm');flush();
      const res=await api.signIn({email,password});
      if(res.error){fx(res.error,'warn');flush();return}
      const remote=await api.pullState();
      if(remote&&remote.p){G=remote;migrate()}
      else {
        const acc=Account.load();
        const s=await Store.load();
        if(s&&s.p){G=s;migrate()}
        else if(acc){newGame(acc.name||acc.username,acc.age||24,acc.gender||'Male',{username:acc.username,interests:acc.interests||[],businessStatus:acc.businessStatus||'none'})}
      }
      if(G&&G.p&&!G.p.onboarded) markOnboarded();
      UI.tab='life';UI.authMode=null;UI.modal=null;commit();
      try{
        if(typeof api!=='undefined'&&api.online){
          await api.hydrateCloud();
          await api.syncWalletToGame();
        }
      }catch(e){}
      commit();
      fx('Signed in','good');
    })();
  }break;
  case 'onlineRegister':{
    (async()=>{
      const email=((document.getElementById('f-email')||{}).value||UI.form.email||'').trim();
      const password=(document.getElementById('f-password')||{}).value||'';
      const username=((document.getElementById('f-username')||{}).value||UI.form.username||'').trim().replace(/^@/,'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20);
      const name=((document.getElementById('f-name')||{}).value||UI.form.name||username).trim();
      const ageEl=document.getElementById('f-age');
      if(ageEl&&ageEl.value) UI.form.age=ageEl.value;
      UI.form.username=username;UI.form.name=name;UI.form.email=email;
      if(username.length<3){fx('Username needs at least 3 characters.','warn');flush();return}
      if(typeof api==='undefined'||!api.online){fx('Online mode is not configured.','warn');flush();return}
      fx('Creating account…','warm');flush();
      const res=await api.signUp({email,password,username,displayName:name});
      if(res.error){fx(res.error,'warn');flush();return}
      if(res.session) fx('Account created — finish your profile.','good');
      else fx('Check your email to confirm, then sign in.','warm');
      UI.regStep=2;render();
    })();
  }break;
  case 'logout':
  case 'signOut':{
    (async()=>{
      try{
        // Save before leaving
        if(G){await Store.save(); if(typeof api!=='undefined'&&api.online) await api.pushState(G)}
      }catch(e){}
      try{if(typeof api!=='undefined'&&api.online) await api.signOut()}catch(e){}
      G=null;
      UI.modal=null;UI.authMode=null;UI.tab='life';UI.regStep=1;
      UI.more='settings';
      render();
      fx('Logged out. Your progress is saved.','warm');
    })();
  }break;
  case 'regBack':UI.regStep=Math.max(1,(UI.regStep||1)-1);render();break;
  case 'regInterest':{
    const list=UI.form.interests=UI.form.interests||[];
    const i=list.indexOf(d.v);
    if(i>=0) list.splice(i,1);
    else if(list.length<6) list.push(d.v);
    else fx('Pick up to 6 interests.','warn');
    render();break;
  }
  case 'regBizStatus':UI.form.businessStatus=d.v;render();break;
  case 'regNext':{
    const step=UI.regStep||1;
    if(step===1){
      const u=(document.getElementById('f-username')||{}).value||UI.form.username||'';
      const n=(document.getElementById('f-name')||{}).value||UI.form.name||'';
      const age=parseInt((document.getElementById('f-age')||{}).value||UI.form.age)||24;
      const user=u.trim().replace(/^@/,'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20);
      if(user.length<3){fx('Username needs at least 3 characters.','warn');flush();break}
      UI.form.username=user;
      UI.form.name=(n.trim()||user).slice(0,20);
      UI.form.age=Math.max(18,Math.min(60,age));
      UI.regStep=2;render();break;
    }
    if(step===2){
      if(!(UI.form.interests||[]).length){fx('Pick at least one interest.','warn');flush();break}
      UI.regStep=3;render();break;
    }
    if(step===3){
      if(!UI.form.businessStatus){fx('Choose your work or business status.','warn');flush();break}
      UI.regStep=4;render();break;
    }
  }break;
  case 'begin':{
    const f=UI.form;
    const user=(f.username||'').trim().replace(/^@/,'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20);
    const n=(f.name||user||'').trim();
    if(!user||user.length<3){UI.regStep=1;fx('Set a username first.','warn');render();break}
    if(!(f.interests||[]).length){UI.regStep=2;fx('Pick your interests.','warn');render();break}
    if(!f.businessStatus){UI.regStep=3;fx('Choose business status.','warn');render();break}
    const age=Math.max(18,Math.min(60,parseInt(f.age)||24));
    try{
      newGame(n,age,f.gender||'Male',{username:user,interests:f.interests,businessStatus:f.businessStatus});
      if(UI.avForm){UI.avForm.gender=f.gender||'Male';setAvatar(UI.avForm)} else setAvatar(defaultAvatar(f.gender||'Male'));
      // Production: start from real wallet (0 until top-up), not demo cash
      if(typeof api!=='undefined'&&api.online){G.p.cash=0}
      markOnboarded();
      Account.save({
        username:user,name:n,age,gender:f.gender||'Male',
        interests:(f.interests||[]).slice(),businessStatus:f.businessStatus,
        avatar:G.p.avatar,created:Date.now()
      });
      UI.tab='life';UI.authMode=null;UI.regStep=1;UI.modal=null;
      commit();
      (async()=>{
        try{
          if(typeof api!=='undefined'&&api.online){
            await api.syncWalletToGame();
            await api.pushState(G);
            commit();
          }
        }catch(e){console.warn('post-begin sync',e)}
      })();
    }catch(err){
      console.error(err);
      fx('Could not start — try again.','warn');
      flush();render();
    }
  }break;
  case 'tab':UI.tab=(d.v==='groups'?'ajo':d.v);UI.modal=null;render();break;
  case 'townMode':UI.townMode=d.v==='city'?'live':d.v;render();break;
  case 'homeEdit':{
    const h=G.p.home||{};
    UI.homeForm={
      area:h.area||'Fagge',label:h.label||'',style:h.style||'compound',
      lat:h.lat!=null?h.lat:null,lng:h.lng!=null?h.lng:null,address:h.address||'',detecting:false
    };
    UI.modal={t:'home'};render();
    if(UI.homeForm.lat==null&&navigator.geolocation){
      UI.homeForm.detecting=true;render();
      detectUserLocation(async(lat,lng)=>{
        UI.homeForm.lat=lat;UI.homeForm.lng=lng;
        UI.homeForm.area=nearestArea(lat,lng);
        UI.homeForm.detecting=false;
        const geo=await reverseGeocode(lat,lng);
        if(geo.address) UI.homeForm.address=geo.address;
        if(!UI.homeForm.label&&geo.address) UI.homeForm.label=geo.address.split(',')[0].trim().slice(0,40);
        fx('Location detected — review and save.','good');
        render();
      },msg=>{UI.homeForm.detecting=false;fx(msg,'warn');render()});
    }
  }break;
  case 'homeDetect':{
    UI.homeForm=UI.homeForm||{};
    UI.homeForm.detecting=true;render();
    detectUserLocation(async(lat,lng)=>{
      UI.homeForm.lat=lat;UI.homeForm.lng=lng;
      UI.homeForm.area=nearestArea(lat,lng);
      UI.homeForm.detecting=false;
      const geo=await reverseGeocode(lat,lng);
      if(geo.address) UI.homeForm.address=geo.address;
      fx('Address filled from your map location.','good');
      render();
    },msg=>{UI.homeForm.detecting=false;fx(msg,'warn');render()});
  }break;
  case 'homeArea':UI.homeForm.area=d.v;render();break;
  case 'homeStyle':UI.homeForm.style=d.v;render();break;
  case 'homeSave':{
    const label=(document.getElementById('hf-label')||{}).value||(UI.homeForm&&UI.homeForm.label)||'';
    const address=(document.getElementById('hf-address')||{}).value||(UI.homeForm&&UI.homeForm.address)||'';
    const f=UI.homeForm||{};
    if(setHome(f.area,label,f.style,{lat:f.lat,lng:f.lng,address,detected:f.lat!=null})){
      UI.modal=null;
      if(typeof setupSteps==='function'&&setupSteps().every(s=>s.ok))markOnboarded();
      commit();
    } else render();
    break}

  case 'spotAdd':UI.spotForm={name:'',area:(G.p.home&&G.p.home.area)||'Fagge',label:'',ic:'📍',note:'',loc:G.p.loc!=='home'?G.p.loc:'market',img:'',lat:null,lng:null,address:''};UI.modal={t:'spotAdd'};render();break;
  case 'mapTogglePeople':UI.mapShowPeople=!(UI.mapShowPeople!==false);render();break;
  case 'mapTogglePlaces':UI.mapShowPlaces=!(UI.mapShowPlaces!==false);render();break;
  case 'mapToggleBiz':UI.mapShowBiz=!(UI.mapShowBiz!==false);render();break;
  case 'mapLocate':{
    fx('Finding you on the map…','good');
    detectUserLocation(async(lat,lng)=>{
      const area=nearestArea(lat,lng);
      const geo=await reverseGeocode(lat,lng);
      // Always remember last known position on the player
      G.p.lat=lat;G.p.lng=lng;
      if(_liveMap){
        _liveMap.setView([lat,lng],16);
        L.circleMarker([lat,lng],{radius:9,color:'#5b8cff',fillColor:'#5b8cff',fillOpacity:0.7})
          .addTo(_liveMap).bindPopup(geo.address?('You · '+geo.address):'You are here').openPopup();
      }
      // If home not set, auto-fill address from map
      if(!(G.p.home&&G.p.home.done)){
        UI.homeForm={
          area,label:(geo.address||'').split(',')[0].trim().slice(0,40),
          style:'compound',lat,lng,address:geo.address||'',detecting:false
        };
        fx('We found your place — save it as your address?','warm');
        UI.modal={t:'home'};
        commit();
        return;
      }
      // Home exists: update coords/address quietly if user relocated
      if(G.p.home){
        G.p.home.lat=lat;G.p.home.lng=lng;
        if(geo.address) G.p.home.address=geo.address;
        if(area) {G.p.home.area=area;G.p.area=area}
      }
      fx(geo.address?('You are near '+geo.address):('Located in '+area),'good');
      commit();
    },msg=>{fx(msg,'warn');flush()});
  }break;
  case 'spotGeo':{
    fx('Finding you…','good');
    detectUserLocation(async(lat,lng)=>{
      UI.spotForm.lat=lat;UI.spotForm.lng=lng;
      UI.spotForm.area=nearestArea(lat,lng);
      const geo=await reverseGeocode(lat,lng);
      if(geo.address) UI.spotForm.address=geo.address;
      if(!UI.spotForm.name) UI.spotForm.name=(geo.address||'').split(',')[0].trim().slice(0,28)||'My spot';
      fx('Spot location filled from your map position.','good');
      render();
    },msg=>{fx(msg,'warn');flush()});
  }break;
  case 'spotVisit':{
    if(visitSpot(d.id)){UI.modal=null;UI.tab='town';UI.townMode='live';UI.mapFocus=d.id;commit()}
  }break;
  case 'spotShowMap':{
    UI.modal=null;UI.tab='town';UI.townMode='live';UI.mapFocus=d.id;render();
  }break;
  case 'spotArea':UI.spotForm.area=d.v;render();break;
  case 'spotLoc':UI.spotForm.loc=d.v;render();break;
  case 'spotIc':UI.spotForm.ic=d.v;render();break;
  case 'spotSave':{
    const name=(document.getElementById('sf-name')||{}).value||UI.spotForm.name;
    const label=(document.getElementById('sf-label')||{}).value||UI.spotForm.label;
    const note=(document.getElementById('sf-note')||{}).value||UI.spotForm.note;
    const imgEl=document.getElementById('sf-img');
    const img=(imgEl&&imgEl.value)||UI.spotForm.img||'';
    const setDaily=!!(document.getElementById('sf-daily')||{}).checked;
    const s=addSpot({name,area:UI.spotForm.area,label,ic:UI.spotForm.ic,note,loc:UI.spotForm.loc,img,lat:UI.spotForm.lat,lng:UI.spotForm.lng,address:UI.spotForm.address});
    if(s){
      if(setDaily) setDailyPlaceFromSpot(s.id, note||'');
      UI.modal={t:'spot',id:s.id};UI.townMode='live';UI.mapFocus=s.id;commit();
    } else render();
  }break;
  case 'spotOpen':UI.modal={t:'spot',id:d.id};render();break;
  case 'spotRemove':run(removeSpot,d.id);UI.modal=null;break;
  case 'friendReq':run(sendFriendRequest,d.id);break;
  case 'friendAccept':run(acceptFriendRequest,d.id);break;
  case 'friendReject':run(rejectFriendRequest,d.id);break;
  case 'friendCancel':run(cancelFriendRequest,d.id);break;
  case 'nearbyToggle':G.p.nearbyOptIn=!G.p.nearbyOptIn;if(G.p.nearbyOptIn&&!(G.p.home&&G.p.home.done)){fx('Set your home area first.','warm');G.p.nearbyOptIn=false;UI.modal={t:'home'};render();break}note(G.p.nearbyOptIn?'Nearby enabled for your area.':'Nearby disabled.');commit();break;
  
  case 'workEdit':UI.workForm={cat:(G.p.work&&G.p.work.cat)||'Trader',title:(G.p.work&&G.p.work.title)||''};UI.modal={t:'work'};render();break;
  case 'workCat':if(!UI.workForm)UI.workForm={cat:'Trader',title:''};UI.workForm.cat=d.v;render();break;
  case 'workSave':{
    const title=(document.getElementById('wf-title')||{}).value||(UI.workForm&&UI.workForm.title)||'';
    const cat=(UI.workForm&&UI.workForm.cat)||'Other';
    if(setWorkProfile(cat,title)){UI.modal=null;if(setupSteps().every(s=>s.ok))markOnboarded();commit()} else render();
    break}
  case 'storeAvOpen':UI.storeAvForm=Object.assign({},storeAvatarFromBiz(playerBiz()||{cat:'Other'}));UI.modal={t:'storeAvatar'};render();break;
  case 'storeAvOpenCreate':UI.storeAvForm=Object.assign({},(UI.storeAvForm&&UI.storeAvForm.kind==='building')?UI.storeAvForm:defaultStoreAvatar((UI.bizForm&&UI.bizForm.cat)||'Other'));UI.modal={t:'storeAvatar',create:true};render();break;
  case 'storeAvSet':if(!UI.storeAvForm||UI.storeAvForm.kind!=='building')UI.storeAvForm=defaultStoreAvatar('Other');UI.storeAvForm[d.k]=(d.k==='window'?(d.v==='1'||d.v===1||d.v===true):d.v);UI.storeAvForm.kind='building';UI.storeAvForm.store=true;render();break;
  case 'storeAvRandom':{
    const styles=['shop','kiosk','stall','boutique','container'], walls=['cream','sand','red','blue','green','yellow','white'], roofs=['tin','flat','awning'], signs=['board','painted','none'], doors=['open','closed','curtain'];
    const pick=a=>a[Math.floor(Math.random()*a.length)];
    UI.storeAvForm={store:true,kind:'building',style:pick(styles),wall:pick(walls),roof:pick(roofs),sign:pick(signs),door:pick(doors),window:Math.random()>.3,ic:'🏪'};
    render();break;
  }
  
  case 'storeAvSave':{
    if(UI.modal&&UI.modal.create){/* keep on form */}
    else if(playerBiz())setStoreAvatar(UI.storeAvForm);
    UI.modal=playerBiz()?{t:'bizManage'}:{t:'bizManage'};
    commit();break}
  case 'bizManage':UI.bizForm={name:'',cat:'Provisions',area:(G.p.home&&G.p.home.area)||'Fagge',label:'',bio:''};UI.modal={t:'bizManage'};render();break;
  case 'bizCat':UI.bizForm.cat=d.v;render();break;
  case 'bizArea':UI.bizForm.area=d.v;render();break;
  case 'bizCreate':{
    const name=(document.getElementById('bf-name')||{}).value||UI.bizForm.name;
    const label=(document.getElementById('bf-label')||{}).value||UI.bizForm.label;
    const bio=(document.getElementById('bf-bio')||{}).value||UI.bizForm.bio;
    const b=createPlayerBiz({name,cat:UI.bizForm.cat,area:UI.bizForm.area,label,bio,ic:'🏪',avatar:(UI.storeAvForm&&UI.storeAvForm.kind==='building')?UI.storeAvForm:defaultStoreAvatar(UI.bizForm.cat||'Other')});
    if(b){UI.storeAvForm=null;UI.modal={t:'biz',id:b.id};commit()} else render();
    break}
  case 'bizOpen':UI.modal={t:'biz',id:d.id};render();break;
  case 'visitBiz':run(requestBizVisit,d.id);break;
  case 'circleBuy':run(buyWithCircleCredit,d.biz,d.prod,d.ajo);break;

  case 'treatOpen':UI.treatForm={biz:null,product:null,friend:null,note:'',mode:'request'};UI.modal={t:'treat'};render();break;
  case 'treatOpenFriend':UI.treatForm={biz:null,product:null,friend:d.id,note:'',mode:'request'};UI.modal={t:'treat'};render();break;
  case 'treatOpenBiz':UI.treatForm={biz:d.id,product:null,friend:null,note:'',mode:'request'};UI.modal={t:'treat'};render();break;
  case 'treatsOpen':UI.modal={t:'treats'};render();break;
  case 'treatMode':UI.treatForm.mode=d.v;render();break;
  case 'treatBiz':UI.treatForm.biz=d.v;UI.treatForm.product=null;render();break;
  case 'treatProd':UI.treatForm.product=d.v;render();break;
  case 'treatFriend':UI.treatForm.friend=d.v;render();break;
  case 'treatSend':{
    const f=UI.treatForm||{};
    const note=(document.getElementById('treat-note')||{}).value||f.note;
    const b=f.biz?bizById(f.biz):null;
    const prods=b?bizProducts(b):[];
    const pid=f.product||(prods[0]&&prods[0].id);
    if(requestTreat({to:f.friend,bizId:f.biz,productId:pid,note,mode:f.mode})){UI.modal={t:'treats'};commit()} else render();
  }break;
  case 'treatAccept':run(acceptTreat,d.id);break;
  case 'treatReject':run(rejectTreat,d.id);break;

  case 'interestBiz':run(interestBiz,d.id);break;
  case 'approveVisit':run(approveBizVisit,d.vid,d.y==='1');break;
  case 'trustAct':run(trustActivity,d.id,d.g);break;
  case 'buyBiz':run(buyAtBiz,d.id,d.p);break;
  case 'chatOpen':UI.chatWith=d.id;UI.chatText='';UI.modal={t:'dmChat',id:d.id};render();break;
  case 'chatGame':run(chatGame,d.id,d.g);break;
  case 'chatSend':{
    const t=(document.getElementById('chat-in')||{}).value||UI.chatText;
    chatSend(d.id,t);UI.chatText='';commit();
    break}
  case 'chatVoice':run(chatVoice,d.id);break;
  case 'playVoice':{
    const sec=Math.max(1,parseInt(d.sec)||3);
    fx('Playing voice note · '+sec+'s','warm');
    const btn=document.querySelector('.wa-voice.playing')||null;
    document.querySelectorAll('.wa-voice').forEach(b=>b.classList.remove('playing'));
    if(el&&el.classList){el.classList.add('playing');setTimeout(()=>el.classList.remove('playing'),sec*1000)}
    flush();break}

  
  case 'dailyPlaceOpen':UI.dailyPlaceForm={loc:(myDailyPlace()&&myDailyPlace().loc)||G.p.loc||'market',note:(myDailyPlace()&&myDailyPlace().note)||''};UI.gi.dailyPlaceNote=UI.dailyPlaceForm.note||'';UI.modal={t:'dailyPlace'};render();break;
  case 'dailyPlaceLoc':if(!UI.dailyPlaceForm)UI.dailyPlaceForm={};UI.dailyPlaceForm.loc=d.v;UI.dailyPlaceForm.spotId=null;render();break;
  case 'dailyPlaceSpot':{
    if(!UI.dailyPlaceForm) UI.dailyPlaceForm={};
    UI.dailyPlaceForm.spotId=d.id;
    UI.dailyPlaceForm.loc=null;
    render();
  }break;
  case 'dailyPlaceSave':{
    const note=UI.gi.dailyPlaceNote||(UI.dailyPlaceForm&&UI.dailyPlaceForm.note)||'';
    const spotId=UI.dailyPlaceForm&&UI.dailyPlaceForm.spotId;
    let ok=false;
    if(spotId) ok=setDailyPlaceFromSpot(spotId,note);
    else {
      const loc=(UI.dailyPlaceForm&&UI.dailyPlaceForm.loc)||G.p.loc||'market';
      ok=setDailyPlace(loc,note);
    }
    if(ok){UI.modal=null;delete UI.gi.dailyPlaceNote;commit()} else {flush();render()}
  }break;
  case 'spotSetDaily':{
    if(setDailyPlaceFromSpot(d.id,'')) commit(); else {flush();render()}
  }break;
  case 'dailyPlaceClear':run(clearDailyPlace);UI.modal=null;break;
  case 'visitRequest':run(requestVisit,d.id,'');break;
  case 'visitAns':run(answerVisitReq,d.id,d.y==='1');break;

  case 'peopleFilter':UI.peopleFilter=d.v;render();break;
  case 'tabAjo':UI.tab='ajo';render();break;
  case 'more':UI.more=d.v;render();break;
  case 'notes':UI.modal={t:'notes'};G.notes.forEach(n=>n.read=true);commit();break;
  case 'close':UI.modal=null;render();break;
  case 'jobs':UI.modal={t:'jobs'};render();break;
  case 'hire':if(hire(d.id))UI.modal=null;commit();break;
  case 'work':run(work);break;case 'quit':run(quit);break;
  case 'sleep':UI.modal=null;run(sleep);break;
  case 'statHint':{const k=d.k;const hints={energy:G.p.energy<=30?'Low energy — rest at Home.':'Energy drops as you act. Rest at Home to recover.',hunger:G.p.hunger>=70?'Hungry — cook, snack, or eat out.':'Hunger rises over time. Eat before work.',mood:'Mood rises with social time, food, and family calls.',trust:'Trust rises when you chat, visit, keep promises and pay Ajo on time. It falls when you miss.',rep:'Reputation is how the wider community sees you — generosity, completed circles, fair trade.'};fx(hints[k]||'','warm');flush();break}
  case 'travel':case 'goto':UI.modal=null;if(travel(d.to))UI.tab='town';commit();break;
  case 'cook':run(cook);break;case 'rest':run(rest);break;case 'call':run(call);break;
  case 'snack':run(snack);break;case 'eat':run(eat);break;case 'gig':run(gig);break;
  case 'hang':run(hang);break;case 'round':run(round_);break;case 'boast':run(boast);break;
  case 'dep':run(deposit,+d.n);break;case 'wd':run(withdraw,+d.n);break;
  case 'bizStart':run(bizStart);break;case 'bizBuy':run(bizBuy,+d.n);break;case 'bizTend':run(bizTend);break;
  case 'opp':run(opp);break;
  case 'meet':{const h=here().sort((x,y)=>(x.met?1:0)-(y.met?1:0));if(h.length){UI.modal={t:'npc',id:h[0].id};render()}break}
  case 'npc':UI.modal={t:'npc',id:d.id};render();break;
  case 'talk':run(talk,d.id);break;case 'eatw':run(eatWith,d.id);break;case 'helpn':run(help,d.id,+d.n);break;
  case 'keep':run(keepPromise,+d.id);break;
  case 'ev':run(pickEvent,+d.i);break;
  case 'ajoOpen':UI.ajoTab='home';UI.modal={t:'ajo',id:d.id};render();break;
  case 'ajoChatOpen':UI.modal={t:'ajoChat',id:d.id};render();break;
  case 'ajoChatBack':UI.ajoTab='home';UI.modal={t:'ajo',id:d.id};render();break;
  case 'ajoNew':UI.modal={t:'ajoNew'};render();break;
  case 'anset':UI.ajoNew[d.k]=(d.k==='purpose'?d.v:+d.v);if(d.k==='size')delete UI.gi.ajoSize;if(d.k==='amt')delete UI.gi.ajoAmt;if(d.k==='freq')delete UI.gi.ajoFreq;render();break;
  case 'ajoCreate':case 'ajoMake':{const nameEl=document.getElementById('f-ajo');const f=UI.ajoNew;if(nameEl&&nameEl.value)f.name=nameEl.value;
    const sizeEl=document.getElementById('f-ajo-size'),amtEl=document.getElementById('f-ajo-amt'),freqEl=document.getElementById('f-ajo-freq');
    const size=sizeEl&&sizeEl.value!==''?+sizeEl.value:(UI.gi.ajoSize!==undefined?+UI.gi.ajoSize:f.size);
    const amt=amtEl&&amtEl.value!==''?+amtEl.value:(UI.gi.ajoAmt!==undefined?+UI.gi.ajoAmt:f.amt);
    const freq=freqEl&&freqEl.value!==''?+freqEl.value:(UI.gi.ajoFreq!==undefined?+UI.gi.ajoFreq:f.freq);
    f.size=size;f.amt=amt;f.freq=freq;
    const id=createAjo((f.name||'Kano Hustlers').trim(),size,amt,freq,{purpose:f.purpose||'general',reason:UI.gi.ajoReason||''});
    if(id){UI.ajoTab='home';UI.modal={t:'ajo',id};['ajoSize','ajoAmt','ajoFreq','ajoReason'].forEach(k=>delete UI.gi[k])}
    commit();break}
  case 'ajoRequest':UI.modal={t:'ajoJoin',id:d.id};UI.gi.ajoJoinReason='';render();break;
  case 'ajoRequestSend':{
    const reason=UI.gi.ajoJoinReason||'';
    if(requestJoinAjo(d.id,reason)){delete UI.gi.ajoJoinReason;UI.modal={t:'ajo',id:d.id};UI.ajoTab='home'}
    commit();break}
  
  case 'ajoCodeOpen':UI.gi.ajoCode='';UI.gi.ajoCodeReason='';UI.modal={t:'ajoCode'};render();break;
  case 'ajoShareOpen':UI.modal={t:'ajoShare',id:d.id};render();break;
  case 'ajoCodeTtl':UI.gi.ajoCodeTtl=+d.v;render();break;
  case 'ajoCodeMax':UI.gi.ajoCodeMax=+d.v;render();break;
  case 'ajoCodeCreate':{
    const inv=createAjoInviteCode(d.id,{ttl:UI.gi.ajoCodeTtl||14,max:UI.gi.ajoCodeMax||10});
    if(inv) commit(); else {flush();render()}
  }break;
  case 'ajoCodeRevoke':run(revokeAjoCode,d.id,d.r);break;
  case 'ajoCodeShare':ajoShare(d.c,d.id);break;
  case 'ajoCodeCopy':{
    const c=String(d.c||'').toUpperCase();
    try{navigator.clipboard.writeText(c).then(()=>fx('Code copied','warm'),()=>fx(c,'warm'))}catch(e){fx(c,'warm')}
  }break;
  case 'ajoCodeRedeem':{
    const el=document.getElementById('f-ajo-code');
    const code=(el&&el.value)||UI.gi.ajoCode||'';
    const reason=UI.gi.ajoCodeReason||'';
    const id=redeemAjoCode(code,reason);
    if(id){UI.gi.ajoCode='';UI.gi.ajoCodeReason='';UI.modal={t:'ajo',id};UI.ajoTab='home';commit()}
    else {flush();render()}
  }break;

  case 'ajoCat':UI.acat=d.v||'';render();break;
  case 'ajoAnsReq':run(answerJoinReq,d.id,d.r,d.y==='1');break;
  case 'ajoChatSend':{const t=(document.getElementById('ajo-chat-in')||{}).value||'';run(ajoChatSend,d.id,t);break}
  case 'ajoAct':run(ajoQuickAct,d.id,d.k);break;
  case 'ajoVis':run(setAjoVis,d.id,d.v);break;
  case 'ajoTab':if(d.v==='chat'&&UI.modal&&UI.modal.id){UI.modal={t:'ajoChat',id:UI.modal.id};render();break}UI.ajoTab=d.v;render();break;
  case 'ajoGameStart':{
    UI.ajoTab='games';
    const fn=window.startCircleGame||(typeof startCircleGame==='function'?startCircleGame:null);
    if(!fn){fx('Games not loaded — hard-refresh the app.','warn');flush();break}
    if(fn(d.id,d.v)) commit(); else {flush();render()}
  }break;
  
  case 'moraPick':UI.moraFrom=+d.v;render();break;
  case 'yotePick':UI.yoteFrom=+d.v;render();break;
  case 'noop':break;

  case 'ajoGamePlay':{
    const fn=window.playCircleGame||(typeof playCircleGame==='function'?playCircleGame:null);
    if(!fn){fx('Games not loaded — hard-refresh.','warn');flush();break}
    if(fn(d.id,d.v)) commit(); else {flush();render()}
  }break;
  case 'ajoGameScramble':{
    const v=(document.getElementById('ajo-scramble')||{}).value||'';
    const fn=window.playCircleGame||(typeof playCircleGame==='function'?playCircleGame:null);
    if(!fn){fx('Games not loaded — hard-refresh.','warn');flush();break}
    if(fn(d.id,v)) commit(); else {flush();render()}
  }break;
  case 'ajoGameSkip':{
    const fn=window.skipCircleGame||(typeof skipCircleGame==='function'?skipCircleGame:null);
    if(fn){fn(d.id);commit()} else render();
  }break;
  case 'pickStone':run(pickStone,d.id,d.s);break;
  case 'rollStones':{
    const a=ajoOf(d.id);
    if(!a){fx('Circle not found','warn');break}
    if(!stonesReady(a)){fx('Everyone still needs a stone','warn');break}
    if(a.rolled){fx('Already rolled','warn');break}
    // Visual shuffle so every participant sees the draw
    UI.stoneAnim={id:d.id,t:Date.now()};
    render();
    let frames=0;
    const tick=()=>{
      frames++;
      if(frames<12){render();setTimeout(tick,120);return}
      UI.stoneAnim=null;
      if(rollStones(d.id)){fx('Order locked — organizer first','good');commit()}
      else {flush();render()}
    };
    setTimeout(tick,150);
  }break;
  case 'join':run(joinAjo,d.id);break;
  case 'inv':run(invite,d.id,d.n);break;
  case 'req':run(reqPriority,d.id,d.r);break;
  case 'vote':run(voteNom,d.id,d.y==='1');break;
  case 'start':case 'ajoStart':run(startAjo,d.id);break;
  
  
  case 'kycOpen':UI.modal={t:'kyc'};render();break;
  case 'bankOpen':UI.modal={t:'bank'};render();break;
  case 'wdOpen':UI.wdAmt=Math.min(5000,G.p.cash|0);UI.modal={t:'withdraw'};render();break;
  case 'wdAmt':UI.wdAmt=+d.v;render();break;
  case 'bankCode':UI.gi.bankCode=d.v;UI.gi.bankLabel=d.n;render();break;
  case 'kycSubmit':{
    (async()=>{
      const nin=UI.gi.kycNin||'';
      const fullName=UI.gi.kycName||G.p.name||'';
      if(typeof api!=='undefined'&&api.online&&api.userId){
        fx('Submitting NIN…','warm');flush();
        const res=await api.submitKyc({nin,fullName});
        if(res.error){fx(res.error,'warn');flush();return}
        submitKycLocal(nin,fullName);
        if(res.status) G.p.kyc.status=res.status;
        UI.modal=null;delete UI.gi.kycNin;commit();
        fx(res.message||'Submitted','good');
      } else {
        if(submitKycLocal(nin,fullName)){UI.modal=null;delete UI.gi.kycNin;commit()}
        else {flush();render()}
      }
    })();
  }break;
  case 'bankSave':{
    (async()=>{
      const bankCode=UI.gi.bankCode||(G.p.bank&&G.p.bank.bankCode)||'058';
      const bankName=UI.gi.bankLabel||(G.p.bank&&G.p.bank.bankName)||'Bank';
      const accountNumber=UI.gi.bankAcct||'';
      const accountName=UI.gi.bankName||G.p.name||'';
      if(typeof api!=='undefined'&&api.online&&api.userId){
        fx('Saving bank…','warm');flush();
        const res=await api.saveBankAccount({bankCode,bankName,accountNumber,accountName});
        if(res.error){fx(res.error,'warn');flush();return}
        saveBankLocal(bankCode,bankName,accountNumber,accountName);
        UI.modal=null;commit();
        fx('Bank saved','good');
      } else {
        if(saveBankLocal(bankCode,bankName,accountNumber,accountName)){UI.modal=null;commit()}
        else {flush();render()}
      }
    })();
  }break;
  case 'wdGo':{
    (async()=>{
      const el=document.getElementById('f-wd');
      const amt=el&&el.value!==''?+el.value:(UI.wdAmt||0);
      if(typeof api!=='undefined'&&api.online&&api.userId){
        fx('Requesting withdrawal…','warm');flush();
        const res=await api.requestWithdraw(amt);
        if(res.error){fx(res.error,'warn');flush();return}
        // Mirror debit locally
        if(typeof res.balance==='number') G.p.cash=Math.floor(res.balance);
        else spend(amt,'Withdrawal to bank','withdraw');
        UI.modal=null;commit();
        try{await api.syncWalletToGame()}catch(e){}
        commit();
        fx(res.message||('Withdraw '+fmt(amt)),'good');
      } else {
        if(withdrawLocal(amt)){UI.modal=null;commit()}
        else {flush();render()}
      }
    })();
  }break;

  case 'topUpOpen':UI.topUpAmt=5000;UI.modal={t:'topup'};render();break;
  case 'topUpAmt':UI.topUpAmt=+d.v;render();break;
  case 'topUpGo':{
    const el=document.getElementById('f-topup');
    const amt=el&&el.value!==''?+el.value:(UI.topUpAmt||0);
    (async()=>{
      try{
        if(typeof api==='undefined'||!api.online){fx('Sign in online to top up','warn');flush();render();return}
        fx('Opening secure checkout…','warm');
        const res=await api.createTopUpCheckout(amt);
        if(res.error){fx(res.error,'warn');flush();render();return}
        if(res.checkout_url){
          UI.modal=null;render();
          location.href=res.checkout_url;
          return;
        }
        fx('Could not start payment','warn');flush();render();
      }catch(err){fx(String(err.message||err),'warn');flush();render()}
    })();
  }break;
  case 'ajoClaim':if(claimAjoPayout(d.id,UI.gi.ajoUseReason||'')){delete UI.gi.ajoUseReason}commit();break;

  case 'pay':run(payAjo,d.id);break;
  case 'debt':run(payDebt,+d.id);break;
  case 'reset':if(!UI.confirmReset){UI.confirmReset=true;render()}else{Store.clear();Account.clear();G=null;UI.confirmReset=false;UI.modal=null;UI.tab='life';UI.authMode=null;UI.regStep=1;UI.form={name:'',username:'',age:24,gender:'Male',interests:[],businessStatus:''};render()}break;
  case 'g_open':
    UI.modal={t:'grp',id:d.id};UI.gt='home';UI.gi.replyTo=null;UI.gs=null;UI.gconf=null;
    try{if(typeof visitGroup==='function')visitGroup(d.id)}catch(err){}
    commit();break;
  
  case 'giftsOpen':UI.modal={t:'gifts'};UI.giftResult=null;UI.giftSpinning=false;render();break;
  case 'giftWheelOpen':UI.modal={t:'giftWheel'};UI.giftResult=null;UI.giftSpinning=false;render();break;
  case 'giftReadyOpen':
    if(G.p.giftIntro){UI.modal={t:'gifts'};render();break}
    UI.modal={t:'giftReady'};render();break;
  case 'giftReadyGo':G.p.giftIntro=true;UI.modal={t:'giftWheel'};commit();break;
  case 'giftSpin':{
    if(UI.giftSpinning)break;
    UI.giftSpinning=true;UI.giftResult=null;render();
    setTimeout(()=>{
      const res=spinCommunityWheel();
      UI.giftSpinning=false;
      if(res&&res.msg){UI.giftResult=res.msg;fx(res.msg,'good')}
      commit();
    },1800);
  }break;
  case 'giftClaim':
  case 'giftAttend':{
    if(attendExperience(+d.i)){UI.modal={t:'gifts'};commit()} else {flush();render()}
  }break;

  default:if(a&&a.indexOf('g_')===0){try{gClick(a,d)}catch(err){fx('Could not open that.','warn');flush()}}
    else if(a){console.warn('Unhandled action',a)}
 }});
addEventListener('hashchange',()=>{deepLink();render()});



// Boot after DOM is ready
export async function startApp() {
  try {
    if (typeof Store === 'undefined' || typeof boot !== 'function') {
      throw new Error('Game engine failed to load (Store/boot missing).');
    }
    await boot();
    // Sync real wallet + handle Bachs return
    try {
      if (typeof api !== 'undefined' && api.online) {
        await api.syncWalletToGame();
        const q = new URLSearchParams(location.search || '');
        if (q.get('payment') === 'success') {
          fx('Payment received — refreshing balance…', 'good');
          // Webhook may lag a moment; poll briefly
          for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 800));
            await api.syncWalletToGame();
            if (G && G.p) break;
          }
          commit();
          history.replaceState({}, '', location.pathname || '/');
        } else if (q.get('payment') === 'cancelled') {
          fx('Payment cancelled', 'warn');
          history.replaceState({}, '', location.pathname || '/');
          render();
        } else {
          render();
        }
      }
    } catch (e) { console.warn('wallet sync', e); }
  } catch (err) {
    console.error(err);
    const el = document.getElementById('app');
    if (el) {
      el.innerHTML = `<div style="padding:24px;font-family:system-ui;color:#f6f2ff;max-width:400px;margin:40px auto">
        <h1 style="color:#ffc928;font-size:22px">Could not start Ajoloop</h1>
        <p style="color:#b6add9;line-height:1.45">${String(err && err.message || err)}</p>
        <p style="color:#b6add9;font-size:13px">Try a hard refresh. If this persists, open <code>kano-city.html</code> or redeploy the latest build.</p>
      </div>`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
