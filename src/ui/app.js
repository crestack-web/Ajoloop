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
const UI={tab:'life',modal:null,form:{name:'',age:24,gender:'Male'},ajoNew:{name:'Kano Hustlers',size:5,amt:5000,freq:7},more:'ledger',prog:0,confirmReset:false,townMode:'map',gi:{},gc:{av:'🏘️',cat:'Friends & Family',tags:[],vis:'public',disc:false,join:'open',memInvite:'members'},ge:{kind:'meetup',loc:'restaurant',off:1,type:'talk',target:10,dur:7},gs:null,gp:{size:5,amt:5000,freq:7},gl:{ttl:7,max:10},gt:'home',gcat:'',gconf:null,gsel:[]};
const col=v=>v>=65?'#22c177':v>=35?'#ffc928':'#ff5a6b';
const colH=v=>v<=35?'#22c177':v<=65?'#ffc928':'#ff5a6b';
const bar=(v,c)=>`<div class="bar"><i style="width:${Math.round(v)}%;background:${c}"></i></div>`;
const trustTier=v=>v>=85?'Rock solid':v>=65?'Reliable':v>=45?'Fair':v>=25?'Shaky':'Not trusted';
const repTier=v=>v>=85?'Big name':v>=65?'Respected':v>=45?'Known':v>=25?'Doubted':'Disliked';
const relLabel=n=>n.rel>=80?'Trusted Friend':n.rel>=60?'Friend':n.rel>=35?(n.tags.some(t=>['ambitious','wealthy','opportunistic'].includes(t))?'Business Contact':'Acquaintance'):'Low Trust';
const titleFor=()=>{const s=(G.p.trust+G.p.rep)/2+Math.min(20,netWorth()/5000);return s>=85?'Community Pillar':s>=68?'Trusted Name':s>=50?'Known Face':'Street Hustler'};
const avatar=g=>g==='Female'?'👩🏾':g==='Male'?'👨🏾':'🧑🏾';

async function boot(){const s=await Store.load();if(s&&s.p){G=s;migrate()}deepLink();render();setInterval(()=>{if(!G||G.ev||UI.modal)return;UI.prog++;const hb=document.getElementById('hb');if(hb)hb.style.width=(UI.prog/60*100)+'%';if(UI.prog>=60){UI.prog=0;tick(1);commit()}},1000)}
function commit(){Store.save();render()}

function render(){
 if(!G){app.innerHTML=createView();return}
 const sc0=document.getElementById('sheet'),st0=sc0?sc0.scrollTop:0;
 app.innerHTML=hud()+'<main>'+({life:lifeView,town:townView,people:peopleView,groups:groupsView,ajo:ajoView,more:moreView}[UI.tab])()+'</main>'+navHtml()+sheetHtml();
 if(st0){const s1=document.getElementById('sheet');if(s1)s1.scrollTop=st0}
 flush()}

function createView(){const f=UI.form;return `<div class="title"><div class="road"><span>🚌</span><span>🛺</span></div>
<div class="brand-mark">AJO LOOP</div>
<h1>Kano City</h1><p>Live a Nigerian life. Build your circle. Guard your name.</p>
<div class="card flat"><label class="l" style="margin-top:0">Your name</label><input type="text" id="f-name" maxlength="16" placeholder="e.g. Abubakar" value="${esc(f.name)}" autocomplete="off">
<label class="l">Age</label><input type="number" id="f-age" min="18" max="60" value="${f.age}">
<label class="l">I am</label><div class="opts">${['Male','Female','Other'].map(g=>`<button data-a="gender" data-v="${g}" class="${f.gender===g?'on':''}">${g}</button>`).join('')}</div>
<button class="btn" data-a="begin" style="margin-top:8px">Start with ₦20,000</button></div>
<p class="tiny center muted">Virtual game cash on this device — not real-money Ajo.</p></div>`}

function hud(){const p=G.p,unread=G.notes.filter(n=>!n.read).length,loc=LOCS[p.loc];
 return `<header class="hud"><div class="r1"><div class="day">Day ${G.day} · ${WD[(G.day-1)%7]}<span>${String(G.hour).padStart(2,'0')}:00 · ${loc.ic} ${loc.n}</span></div><div class="center"><span class="cash-label">Cash (game)</span><div class="cash sm" id="cash">${fmt(p.cash)}</div></div><button class="bell" data-a="notes" aria-label="Notifications">🔔${unread?`<b>${unread}</b>`:''}</button></div>
 <div class="r2"><div class="stat-tap" data-a="statHint" data-k="energy" title="Energy"><div class="mini">⚡ Energy</div>${bar(p.energy,col(p.energy))}</div><div class="stat-tap" data-a="statHint" data-k="hunger" title="Hunger"><div class="mini">🍲 Hunger</div>${bar(p.hunger,colH(p.hunger))}</div><div class="stat-tap" data-a="statHint" data-k="mood" title="Mood"><div class="mini">😊 Mood</div>${bar(p.happiness,col(p.happiness))}</div><span class="chip t" id="chT">🤝 ${Math.round(p.trust)}</span><span class="chip rp" id="chR">⭐ ${Math.round(p.rep)}</span></div>
 <div class="hb"><i id="hb" style="width:${UI.prog/60*100}%"></i></div></header>`}

function navHtml(){const dueAjo=G.ajos.some(a=>a.status==='active'&&a.members.includes('player')&&!cyc(a,'player')&&G.day>=dueDay(a)-1);
 const gInv=G.groups.some(g=>!g.dead&&g.inv.some(i=>i.to==='player'&&invState(i)==='pending'));
 const t=[['life','🏠','Life'],['town','🗺️','Town'],['people','👥','People'],['groups','🏘️','Groups'],['ajo','🤝','Ajo'],['more','☰','More']];
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
function lifeView(){const p=G.p,j=JOBS.find(x=>x.id===p.job),met=G.npcs.filter(n=>n.met).sort((a,b)=>b.rel-a.rel);
 const aj=myAjos().filter(a=>a.status==='active')[0];
 const debts=G.debts.filter(d=>d.m==='player'&&!d.paid);
 const acts=nextActions();
 const loc=LOCS[p.loc];
 return `<section class="card hero"><div class="row"><div class="av">${avatar(p.gender)}</div><div style="min-width:0;flex:1"><h2>${esc(p.name)}</h2><div class="muted sm">${titleFor()} · ${p.age} · ${j?j.n:'Looking for work'}</div><div class="loc-chip" style="margin-top:8px"><span class="dot-live"></span>${loc.ic} ${loc.n}</div></div></div>
 <div class="quote">Money gets you things. Trust gets you opportunities.</div></section>
 ${blocked()?`<div class="warnbox">🚫 People are wary of you. You cannot start or join an Ajo for ${p.blockedUntil-G.day} more day(s). Pay what you owe to repair your name.</div>`:''}
 ${acts.length?`<div class="section-label">Suggested next</div><div class="px">${acts.map(a=>{
   const ds=[a.a?`data-a="${a.a}"`:'' ,a.to?`data-to="${a.to}"`:'' ,a.v?`data-v="${a.v}"`:''].filter(Boolean).join(' ');
   return `<button class="next-act" ${ds}><div class="ic">${a.ic}</div><div><b>${a.l}</b><small>${a.s}</small></div><span class="go">›</span></button>`;
 }).join('')}</div>`:''}
 <div class="section-label">Community standing <span class="badge-game">Game</span></div>
 <div class="grid2 px"><div class="card trust-card"><div class="muted sm" style="font-weight:800">Trust</div>${gauge(p.trust,col(p.trust))}<b>${trustTier(p.trust)}</b><div class="why">Kept promises, on-time Ajo, showing up for work. Missed payments hurt this.</div></div>
 <div class="card trust-card"><div class="muted sm" style="font-weight:800">Reputation</div>${gauge(p.rep,col(p.rep))}<b>${repTier(p.rep)}</b><div class="why">How the wider town sees you — generosity, business, completing circles.</div></div></div>
 <div class="section-label">Virtual money <span class="badge-game">Game cash</span></div>
 <section class="card"><div class="row sp"><b>💰 Wallet</b><span class="chip">Net ${fmt(netWorth())}</span></div>
 <div class="money-row"><span class="label">Cash in hand</span><span class="val gold">${fmt(p.cash)}</span></div>
 <div class="money-row"><span class="label">Bank savings</span><span class="val">${fmt(p.savings)}</span></div>
 ${G.biz?`<div class="money-row"><span class="label">Shop stock (${G.biz.stock})</span><span class="val">${fmt(Math.round(G.biz.stock*G.biz.avg))}</span></div>`:''}
 <div class="tiny muted" style="margin-top:8px">This is simulation money on this device. It is not real-money Ajo.</div></section>
 <div class="section-label">Your circle</div>
 <section class="card"><div class="row sp"><b>👥 People</b><button class="btn sm ghost" data-a="tab" data-v="people">See all</button></div>
 <div class="row sp" style="margin:6px 0 10px"><span class="muted sm">${met.length} met</span><span class="muted sm">${met.filter(n=>n.rel>=60).length} close</span></div>
 ${met.length?met.slice(0,3).map(n=>`<button class="row sp sm" style="margin-top:6px;width:100%;background:none;text-align:left" data-a="npc" data-id="${n.id}"><span>${n.em} ${n.n}</span><span class="muted">${relLabel(n)}</span></button>`).join(''):'<div class="empty"><div class="big">👋</div>Nobody yet. Go to the Market and say hello.</div>'}</section>
 <section class="card"><div class="row sp"><b>🤝 Ajo</b><span class="badge-ajo">Separate from game cash</span></div>
 ${aj?`<div class="money-row" style="margin-top:8px"><span class="label">${esc(aj.name)}</span><span class="val">${fmt(aj.amt)}</span></div><div class="money-row"><span class="label">Next contribution</span><span class="val">${cyc(aj,'player')?'Paid ✓':'Day '+dueDay(aj)}</span></div><button class="btn ghost sm" style="margin-top:8px" data-a="tabAjo">Open Ajo</button>`
 :`<div class="muted sm" style="margin-top:8px">${myAjos().length?'Your circle is getting ready.':'Build trust, then visit the Ajo Center. Joining is never automatic from a social group.'}</div>`}
 ${debts.length?`<div class="warnbox" style="margin:10px 0 0">You owe ${fmt(debts.reduce((s,d)=>s+d.amt,0))} on Ajo contributions.</div>`:''}</section>
 <section class="card"><b>🛒 Business</b>${G.biz?`<div class="money-row" style="margin-top:8px"><span class="label">Mini Shop · ${G.biz.stock} in stock</span><span class="val">Profit ${fmt(G.biz.profit)}</span></div>`:`<div class="muted sm" style="margin-top:6px">No business yet. Work → save → open a Mini Shop for ${fmt(SHOP_COST)} at the Market.</div>`}</section>
 ${G.promises.length?`<section class="card"><b>🤞🏾 Promises</b>${G.promises.map(pr=>`<div class="row sp" style="margin-top:8px"><span class="sm">${npc(pr.npc).n} · ${fmt(pr.amt)} by Day ${pr.due}</span><button class="btn sm" data-a="keep" data-id="${pr.id}">Keep it</button></div>`).join('')}</section>`:''}`}

function locMeta(id){
 const M={
  home:{tags:['Rest','Food'],blurb:'Recover energy and cook cheap meals.'},
  market:{tags:['Trade','Shop','Social'],blurb:'Stock a stall, snack, and meet traders.'},
  restaurant:{tags:['Food','Social'],blurb:'Eat well and share a table with neighbours.'},
  park:{tags:['Transport','Gig'],blurb:'Cheaper keke rides and quick errand money.'},
  work:{tags:['Jobs','Pay'],blurb:'Clock in for salary or pick a new role.'},
  bank:{tags:['Savings'],blurb:'Park game cash safely for bigger goals.'},
  social:{tags:['Mood','Reputation'],blurb:'Hang out, buy a round, shape your name.'},
  ajo:{tags:['Ajo circles'],blurb:'Join or host rotating savings — separate from game cash.'}
 };
 return M[id]||{tags:[],blurb:''};
}
function travelInfo(to){
 if(to===G.p.loc) return null;
 const fare=G.p.loc==='park'?100:200;
 const canRide=G.p.cash>=fare;
 return {fare,hours:canRide?1:2,mode:canRide?'keke':'walk',canRide};
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

function townView(){const L=LOCS[G.p.loc],meta=locMeta(G.p.loc),acts=locActions(),hn=here();
 const order=['home','market','restaurant','park','_c','work','bank','social','ajo'];
 const mode=UI.townMode||'map';
 const tile=id=>{
  if(id==='_c')return `<div class="tile center"><div>✦</div><b>KANO</b></div>`;
  const l=LOCS[id],h=G.p.loc===id,n=G.npcs.filter(x=>npcLoc(x)===id).length;
  return `<button class="tile ${h?'here':''}" data-a="travel" data-to="${id}" ${h?'disabled':''} aria-label="${l.n}${h?' (you are here)':''}"><span class="ti">${l.ic}</span><b>${l.n}</b>${h?'<em class="me">You</em>':`<small class="${n?'busy':''}">${n?n+' here':'—'}</small>`}</button>`;
 };
 const dirItem=id=>{
  const l=LOCS[id],h=G.p.loc===id,n=G.npcs.filter(x=>npcLoc(x)===id).length,m=locMeta(id),info=travelInfo(id);
  const trail=h?'You are here':(info?(info.mode==='keke'?`Keke ${fmt(info.fare)} · ${info.hours}h`:`Walk · ${info.hours}h`):'');
  return `<button class="dir-item ${h?'here':''}" data-a="${h?'':'travel'}" ${h?'disabled':`data-to="${id}"`}><div class="di-ic">${l.ic}</div><div style="min-width:0;flex:1"><b>${l.n}</b><div class="tiny muted">${m.blurb}</div><div class="tiny muted" style="margin-top:2px">${n?n+' people · ':''}${trail}</div></div><span class="go">${h?'●':'›'}</span></button>`;
 };
 const groups=[['needs','Look after yourself'],['work','Work & money'],['social','People & vibe'],['rest','End the day'],['do','Here']];
 const grouped=groups.map(([g,label])=>{
  const list=acts.filter(a=>a.g===g);
  if(!list.length) return '';
  return `<div class="act-group"><div class="ag-label">${label}</div>${list.map(actButton).join('')}</div>`;
 }).join('');
 const openJobs=G.openJobs?G.openJobs.length:0;
 return `<div class="sec">Town<small>Eight places. Travel costs game cash and time.</small></div>
 <div class="town-tabs"><button data-a="townMode" data-v="map" class="${mode==='map'?'on':''}">Map</button><button data-a="townMode" data-v="list" class="${mode==='list'?'on':''}">All places</button></div>
 ${mode==='map'?`<div class="map-wrap"><div class="map">${order.map(tile).join('')}</div><div class="map-legend"><span>Tap a tile to travel</span><span>Keke ₦200 · from Park ₦100</span></div></div>`
 :`<div class="dir-list">${['home','market','restaurant','park','work','bank','social','ajo'].map(dirItem).join('')}</div>`}
 <section class="card"><div class="place-hero"><div class="ph-ic">${L.ic}</div><div style="min-width:0;flex:1"><h2>${L.n}</h2><div class="muted sm">${L.d}</div><div class="place-meta">${meta.tags.map(t=>`<span class="place-tag hot">${t}</span>`).join('')}${hn.length?`<span class="place-tag people">${hn.length} here now</span>`:'<span class="place-tag">Quiet now</span>'}${G.p.loc==='work'&&openJobs?`<span class="place-tag hot">${openJobs} jobs open</span>`:''}</div>
 <div class="travel-hint">You are here · ${String(G.hour).padStart(2,'0')}:00 · Day ${G.day}. ${meta.blurb}</div></div></div></section>
 ${acts.length?grouped:'<div class="card empty"><div class="big">🗺️</div>Nothing to do here right now.</div>'}
 <div class="sec">People here<small>${hn.length?'Tap someone to talk, share a meal, or help.':'Nobody on this block right now. Neighbours move during the day.'}</small></div>
 ${hn.length?hn.map(personRow).join(''):'<div class="card empty"><div class="big">🚶</div>Empty for the moment.<div class="muted sm" style="margin-top:6px">Try the Market mid-morning or Suya Spot in the evening.</div></div>'}`}

function personRow(n){return `<button class="person" data-a="npc" data-id="${n.id}"><div class="av">${n.em}</div><div class="meta"><b>${n.n}</b><div class="l">${n.occ}${n.met?' · '+relLabel(n):' · New face'}</div></div>${n.met?`<div class="score" style="color:${col(n.rel)}">${Math.round(n.rel)}</div>`:'<span class="chip">?</span>'}</button>`}

function peopleView(){const met=G.npcs.filter(n=>n.met).sort((a,b)=>b.rel-a.rel),un=G.npcs.filter(n=>!n.met);
 return `<div class="sec">People<small>${met.length} of ${G.npcs.length} known · relationships are earned in town</small></div>
 ${met.length?`<div class="section-label">Your network</div>${met.map(personRow).join('')}`:'<div class="card empty"><div class="big">👋</div>No friends yet.<div class="muted sm" style="margin-top:8px">Go to Kasuwa Market or Mama Put and say hello.</div><button class="btn sm" style="margin-top:12px" data-a="goto" data-to="market">Go to Market</button></div>'}
 ${un.length?`<div class="section-label">Around town</div><div class="muted tiny px" style="margin-bottom:6px">You have not met them yet — find them at their usual spots.</div>${un.map(n=>`<div class="person" style="opacity:.8"><div class="av">${n.em}</div><div class="meta"><b>${n.n}</b><div class="l">${n.occ}</div></div><span class="chip">${LOCS[n.spots[0]].ic} ${LOCS[n.spots[0]].n}</span></div>`).join('')}`:''}`}

function ajoView(){const mine=myAjos(),open=G.ajos.filter(a=>a.status==='open'&&a.host!=='player'&&!a.members.includes('player')),done=G.ajos.filter(a=>a.status==='done'&&a.members.includes('player')),debts=G.debts.filter(d=>d.m==='player'&&!d.paid);
 return `<div class="sec">Ajo<small>Save together. Everyone pays in; one person takes the pot each round. It only works on trust.</small></div>
 ${G.p.loc!=='ajo'?'<div class="note">You are not at the Ajo Center. You can view and pay from here, but creating, joining and voting need a visit.</div>':''}
 ${blocked()?`<div class="warnbox">🚫 Blocked from new Ajo for ${G.p.blockedUntil-G.day} more day(s). Pay what you owe.</div>`:''}
 ${debts.map(d=>`<div class="card"><div class="row sp"><div><b>Debt: ${fmt(d.amt)}</b><div class="muted sm">${esc(ajoOf(d.ajo).name)} · owed to ${nm(d.to)}</div></div><button class="btn sm red" data-a="debt" data-id="${d.id}">Pay</button></div></div>`).join('')}
 ${mine.map(ajoCard).join('')}
 <div class="px" style="margin-top:12px"><button class="btn" data-a="ajoNew">＋ Create an Ajo</button></div>
 ${open.length?`<div class="sec">Open to join<small>Needs Trust 40+ and a friendly host (or an invite)</small></div>${open.map(a=>{const why=joinCheck(a),h=npc(a.host);return `<button class="person" data-a="ajoOpen" data-id="${a.id}"><div class="av">${h.em}</div><div class="meta"><b>${esc(a.name)}</b><div class="l">${h.n}'s Ajo · ${fmt(a.amt)} / ${a.freq} days · ${a.members.length}/${a.size}</div></div>${a.invited?'<span class="pill ok">Invited</span>':why?'<span class="pill wait">Locked</span>':'<span class="pill ok">Open</span>'}</button>`}).join('')}`:''}
 ${done.length?`<div class="sec">Completed</div>${done.map(ajoCard).join('')}`:''}`}

function ajoCard(a){const st={open:'Gathering members',voting:'Voting',active:'Running',done:'Complete'}[a.status];const mem=a.members.length;
 let line='';if(a.status==='active'){const d=dueDay(a);line=`<div class="row sp sm" style="margin-top:8px"><span class="muted">Cycle ${a.cycle+1}/${a.size} · due Day ${d}</span><span>→ ${nm(a.order[a.cycle])}</span></div>`}
 if(a.group&&grp(a.group)&&grp(a.group).mem.player)line+='<div class="tiny muted" style="margin-top:6px">🏘️ Suggested in the group '+esc(grp(a.group).name)+'. Separate from group membership.</div>';
 return `<button class="card" style="width:calc(100% - 24px);text-align:left;display:block" data-a="ajoOpen" data-id="${a.id}"><div class="row sp"><b style="font-size:17px">${esc(a.name)}</b><span class="pill wait">${st}</span></div><div class="muted sm" style="margin-top:4px">${fmt(a.amt)} every ${a.freq} days · pot ${fmt(a.amt*a.size)} · ${mem}/${a.size} members</div>${line}</button>`}

function moreView(){const seg=[['ledger','Money'],['rep','Trust & Rep'],['journey','Journey'],['shop','Shop'],['gstats','Groups'],['settings','Settings']];
 return `<div class="seg">${seg.map(([k,l])=>`<button data-a="more" data-v="${k}" class="${UI.more===k?'on':''}">${l}</button>`).join('')}</div>`+({ledger:ledgerV,rep:repV,journey:journeyV,shop:shopV,gstats:gstatsV,settings:settingsV}[UI.more])()}
function ledgerV(){return `<section class="card">${G.tx.length?G.tx.slice(0,40).map(t=>`<div class="tx"><div><b>${esc(t.label)}</b><div class="tiny muted">Day ${t.day} · ${t.cat}</div></div><span class="${t.amount>0?'pos':'neg'}">${t.amount>0?'+':'−'}${fmt(t.amount)}</span></div>`).join(''):'<div class="muted">No transactions yet.</div>'}</section>`}
function repV(){const mk=(arr,l)=>`<section class="card"><b>${l}</b>${arr.length?arr.slice(0,12).map(h=>`<div class="tx"><div>${esc(h.why)}<div class="tiny muted">Day ${h.day} → ${h.v}</div></div><span class="${h.d>0?'pos':'neg'}">${h.d>0?'+':''}${h.d}</span></div>`).join(''):'<div class="muted sm" style="margin-top:6px">Nothing yet.</div>'}</section>`;return mk(G.th,'🤝 Trust history')+mk(G.rh,'⭐ Reputation history')}
function spark(arr,c,l){if(arr.length<2)return `<div class="muted sm">${l}: more days needed</div>`;const w=300,h=60,mx=Math.max(...arr,1),mn=Math.min(...arr,0),r=mx-mn||1;const pts=arr.map((v,i)=>`${(i/(arr.length-1)*w).toFixed(1)},${(h-4-(v-mn)/r*(h-8)).toFixed(1)}`).join(' ');return `<div style="margin:10px 0"><div class="row sp sm"><b>${l}</b><span class="muted">${arr[arr.length-1].toLocaleString('en-US')}</span></div><svg viewBox="0 0 ${w} ${h}" width="100%" height="60" preserveAspectRatio="none"><polyline fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/></svg></div>`}
function journeyV(){const s=G.snap.concat([{day:G.day,nw:netWorth(),trust:Math.round(G.p.trust),rep:Math.round(G.p.rep)}]);const ms=Object.values(G.mile).sort((a,b)=>b.day-a.day);
 return `<section class="card"><b>📈 Your life so far</b>${spark(s.map(x=>x.nw),'#ffc928','Net worth (₦)')}${spark(s.map(x=>x.trust),'#22c177','Trust')}${spark(s.map(x=>x.rep),'#5cc8ff','Reputation')}</section>
 <section class="card"><b>🏁 Milestones</b>${ms.length?ms.map(m=>`<div class="tx"><span>${esc(m.txt)}</span><span class="muted tiny">Day ${m.day}</span></div>`).join(''):'<div class="muted sm">Your story starts now.</div>'}</section>`}
function shopV(){const b=G.biz;return b?`<section class="card"><b>🥤 Mini Shop</b><div class="row sp" style="margin-top:8px"><span class="muted">Stock</span><b>${b.stock} drinks</b></div><div class="row sp"><span class="muted">Sold</span><b>${b.sold}</b></div><div class="row sp"><span class="muted">Revenue</span><b>${fmt(b.rev)}</b></div><div class="row sp"><span class="muted">Profit</span><b class="pos">${fmt(b.profit)}</b></div><div class="muted tiny" style="margin-top:8px">Buy at ~${fmt(UNIT_COST)}, sell at ${fmt(UNIT_PRICE)}. Friends send customers.</div></section><section class="card"><b>Shop activity</b>${b.sold||G.btx.length?G.btx.slice(0,15).map(t=>`<div class="tx"><span>${esc(t.txt)}</span><span class="${t.amt>0?'pos':'neg'}">${t.amt>0?'+':'−'}${fmt(t.amt)}</span></div>`).join(''):''}</section>`:`<section class="card"><b>No shop yet</b><div class="muted sm" style="margin-top:6px">Open the Mini Shop at the Market for ${fmt(SHOP_COST)}.</div></section>`}
function settingsV(){return `<section class="card"><b>About this build</b><div class="muted sm" style="margin:6px 0">Ajoloop offline demo. Progress saves on this device only. Virtual cash is not real-money Ajo.</div></section>
<section class="card"><b>Developer</b><div class="muted sm" style="margin:6px 0 10px">Not part of normal play. Skip time for testing.</div><button class="btn ghost dev" data-a="sleep">⏭ Skip to next day</button></section>
<section class="card"><b>Reset game</b><div class="muted sm" style="margin:6px 0 10px">Deletes your life on this device and starts over.</div><button class="btn ${UI.confirmReset?'red':'ghost'}" data-a="reset">${UI.confirmReset?'Tap again to erase everything':'Start a new life'}</button></section>`}

/* ---- sheets ---- */
function sheetHtml(){let h='';
 if(G.ev)return wrap(eventSheet(),true);
 const m=UI.modal;if(!m)return '';
 if(m.t==='npc')h=npcSheet(npc(m.id));if(m.t==='ajo')h=ajoSheet(ajoOf(m.id));if(m.t==='ajoNew')h=ajoNewSheet();if(m.t==='notes')h=notesSheet();if(m.t==='jobs')h=jobsSheet();if(m.t==='grp')h=grpSheet(m.id);if(m.t==='gnew')h=gnewSheet();if(m.t==='gcode')h=gcodeSheet();if(m.t==='ginv')h=ginvSheet(m.id);if(m.t==='gajo')h=gajoSheet(m.id);
 return wrap(h)}
function wrap(h,lock){return `<div class="back" ${lock?'':'data-a="closeBack"'}><div class="sheet" id="sheet">${lock?'':'<button class="x" data-a="close" aria-label="Close">✕</button>'}${h}</div></div>`}

function eventSheet(){const e=G.ev,v=EV[e.id].view(e.d);return `<div class="ev"><div class="big">${v.ic}</div><h2 class="center">${v.t}</h2><p class="center" style="font-weight:700;line-height:1.45">${esc(v.txt)}</p>${v.ch.map((c,i)=>{const dis=c.need&&G.p.cash<c.need?'Need '+fmt(c.need):c.dis||'';return `<button class="btn ${i===0?'':'ghost'}" style="margin-top:10px" data-a="ev" data-i="${i}" ${dis?'disabled':''}>${esc(c.l)}${dis?' ('+dis+')':''}</button>`}).join('')}</div>`}

function npcSheet(n){const here_=npcLoc(n)===G.p.loc,p=G.p;const know=n.rel>=50;
 const wl=n.w>=65?'Well-off':n.w>=40?'Getting by':'Struggling';
 const reads=know?(n.tr>=70?'Reliable. Keeps their word.':n.tr>=45?'Mixed record.':'Not dependable.'):'You do not know them well enough to judge.';
 return `<div class="row"><div class="av" style="width:64px;height:64px;font-size:38px">${n.em}</div><div><h2>${n.n}</h2><div class="muted sm">${n.occ}</div></div></div>
 <div class="muted sm" style="margin:10px 0">${n.bio}</div><div>${n.tags.map(t=>`<span class="tag">${t}</span>`).join('')}<span class="tag">${wl}</span></div>
 ${n.met?`<div class="row sp" style="margin-top:12px"><b>${relLabel(n)}</b><b style="color:${col(n.rel)}">${Math.round(n.rel)}/100</b></div>${bar(n.rel,col(n.rel))}`:'<div class="muted sm" style="margin-top:12px">You have not met yet. Say hello.</div>'}
 <div class="card" style="background:var(--card)"><div class="tiny muted" style="font-weight:800">CAN YOU TRUST THEM?</div><div style="margin-top:4px;font-weight:700">${reads}</div></div>
 ${n.said?`<div class="card" style="background:var(--card2)">“${esc(n.said)}”</div>`:''}
 ${here_?`<button class="btn" data-a="talk" data-id="${n.id}">💬 Talk (1h)</button>
 ${p.loc==='restaurant'?`<button class="btn ghost" style="margin-top:8px" data-a="eatw" data-id="${n.id}">🍛 Eat together — ₦3,000 (you pay)</button>`:''}
 <div class="row" style="margin-top:8px"><button class="btn ghost sm" style="flex:1" data-a="helpn" data-id="${n.id}" data-n="2000" ${p.cash<2000?'disabled':''}>Give ₦2,000</button><button class="btn ghost sm" style="flex:1" data-a="helpn" data-id="${n.id}" data-n="5000" ${p.cash<5000?'disabled':''}>Give ₦5,000</button></div>`
 :`<div class="card" style="background:var(--card)">Right now ${n.n} is at <b>${LOCS[npcLoc(n)].ic} ${LOCS[npcLoc(n)].n}</b>.<button class="btn ghost" style="margin-top:10px" data-a="goto" data-to="${npcLoc(n)}">Go there (₦200 · 1h)</button></div>`}
 ${G.promises.filter(x=>x.npc===n.id).map(pr=>`<button class="btn green" style="margin-top:8px" data-a="keep" data-id="${pr.id}">🤞🏾 Keep promise: bring ${fmt(pr.amt)}</button>`).join('')}
 ${n.hist.length?`<div class="sec" style="margin:16px 0 4px;font-size:15px">Between you two</div>${n.hist.slice(0,5).map(h=>`<div class="tx sm"><span>${esc(h.why)} <span class="muted tiny">Day ${h.day}</span></span><span class="${h.d>0?'pos':'neg'}">${h.d>0?'+':''}${h.d}</span></div>`).join('')}`:''}`}

function ajoNewSheet(){const f=UI.ajoNew,opt=(k,vals,fm)=>`<div class="opts">${vals.map(v=>`<button data-a="anset" data-k="${k}" data-v="${v}" class="${f[k]===v?'on':''}">${fm?fm(v):v}</button>`).join('')}</div>`;
 return `<h2>Create an Ajo</h2><div class="muted sm" style="margin-top:4px">You need ${f.size-1} people who trust you enough to join.</div>
 <label class="l">Name</label><input type="text" id="f-ajo" maxlength="24" value="${esc(f.name)}">
 <label class="l">Members</label>${opt('size',[3,4,5,6])}
 <label class="l">Contribution</label>${opt('amt',[2000,5000,10000],fmt)}
 <label class="l">Every</label>${opt('freq',[3,7,14],v=>v+' days')}
 <div class="card" style="background:var(--card)"><div class="row sp"><span class="muted">Total pot</span><b style="font-size:20px;color:var(--danfo)">${fmt(f.amt*f.size)}</b></div><div class="muted tiny">Everyone receives the pot once.</div></div>
 <button class="btn" data-a="ajoMake" ${G.p.loc!=='ajo'?'disabled':''}>${G.p.loc!=='ajo'?'Visit the Ajo Center to create':'Create Ajo'}</button>`}

function ajoSheet(a){const P=G.p,isMem=a.members.includes('player');let h=`<h2>${esc(a.name)}</h2><div class="muted sm" style="margin:4px 0 10px">${fmt(a.amt)} every ${a.freq} days · ${a.size} members · pot <b style="color:var(--danfo)">${fmt(a.amt*a.size)}</b></div>`;
 const memRows=a.members.map(m=>{const n=m==='player'?null:npc(m),c=a.status==='active'?cyc(a,m):null;const tr=m==='player'?Math.round(P.trust):(n.rel>=50?Math.round(n.tr):'?');
  return `<div class="tx"><div class="row"><span style="font-size:22px">${m==='player'?avatar(P.gender):n.em}</span><div><b>${m==='player'?'You':n.n}</b><div class="tiny muted">Trust ${tr}${m===a.host?' · host':''}</div></div></div>${a.status==='active'?`<span class="pill ${c?(c.st==='paid'?'ok':'no'):'wait'}">${c?(c.st==='paid'?'Paid':'Missed'):'Pending'}</span>`:''}</div>`}).join('');
 h+=`<section class="card"><b>Members (${a.members.length}/${a.size})</b>${memRows}</section>`;
 if(a.status==='open'&&a.host!=='player'){const why=joinCheck(a);h+=`<div class="card" style="background:var(--card)">${why?'🔒 '+why:'✅ You can join. Make sure you can afford '+fmt(a.amt)+' every '+a.freq+' days.'}</div><button class="btn" data-a="join" data-id="${a.id}" ${why||P.loc!=='ajo'?'disabled':''}>${P.loc!=='ajo'&&!why?'Visit the Ajo Center to join':'Join this Ajo'}</button>`}
 if(a.status==='open'&&a.host==='player'){const cands=G.npcs.filter(n=>n.met&&!a.members.includes(n.id)).sort((x,y)=>y.rel-x.rel);h+=`<section class="card"><b>Invite people</b><div class="muted tiny">Closer friends say yes more often. Trust matters too.</div>${cands.length?cands.map(n=>`<div class="tx"><div class="row"><span style="font-size:22px">${n.em}</span><div><b>${n.n}</b><div class="tiny muted">${relLabel(n)} · ${Math.round(n.rel)}</div></div></div><button class="btn sm" data-a="inv" data-id="${a.id}" data-n="${n.id}" ${a.inv[n.id]===G.day?'disabled':''}>Invite</button></div>`).join(''):'<div class="muted sm" style="margin-top:6px">You have not met anyone to invite. Go meet people first.</div>'}</section>`}
 if(a.status==='voting'){
  h+=`<section class="card"><b>📣 Ask for early payout</b>`;
  if(!a.req){h+=`<div class="muted sm" style="margin:4px 0 8px">Members vote on your reason. Relationship and trust decide it.</div>${[['emergency','Family emergency'],['business','Expand my business'],['plain','I just need cash']].map(([k,l])=>`<button class="act" data-a="req" data-id="${a.id}" data-r="${k}"><div class="ic">🙏🏾</div><div><b>${l}</b><small>Chances: ${odds(a,k)}</small></div></button>`).join('')}`}
  else{h+=`<div class="muted sm" style="margin:4px 0">${a.req.reason==='business'?'“I need the money this month to expand my business.”':a.req.reason==='emergency'?'“I have a family emergency.”':'“I just need the money.”'}</div>${a.req.votes.map(v=>`<div class="tx"><span>${nm(v.id)} — <b>${v.y?'Yes':'No'}</b> <span class="tiny muted">${v.why}</span></span><span class="pill ${v.y?'ok':'no'}">${v.y?'Yes':'No'}</span></div>`).join('')}<div style="margin-top:8px;font-weight:900;color:${a.req.passed?'#7dffc4':'#ff9aa5'}">${a.req.passed?'You get priority!':'No priority this time.'}</div>`}
  h+=`</section>`;
  if(a.nom){const n=npc(a.nom.npc);h+=`<section class="card"><b>🗳️ ${n.n} asks for early payout</b><div class="muted sm" style="margin:4px 0 8px">Reason: ${a.nom.reason}.</div>`;
   if(!a.nom.done)h+=`<div class="row"><button class="btn green sm" style="flex:1" data-a="vote" data-id="${a.id}" data-y="1">Support</button><button class="btn red sm" style="flex:1" data-a="vote" data-id="${a.id}" data-y="0">Decline</button></div>`;
   else h+=a.nom.votes.map(v=>`<div class="tx"><span>${nm(v.id)}</span><span class="pill ${v.y?'ok':'no'}">${v.y?'Yes':'No'}</span></div>`).join('')+`<div style="margin-top:8px;font-weight:900">${a.nom.passed?n.n+' goes early.':'Request did not pass.'}</div>`;
   h+=`</section>`}
  h+=`<button class="btn" data-a="start" data-id="${a.id}" ${P.loc!=='ajo'?'disabled':''}>${P.loc!=='ajo'?'Visit the Ajo Center to start':'Start Ajo — first contributions due tomorrow'}</button>`}
 if(a.status==='active'||a.status==='done'){
  h+=`<section class="card"><b>Payout order</b>${a.order.map((m,i)=>`<div class="tx"><span>${i+1}. ${m==='player'?'<b>You</b>':nm(m)} <span class="tiny muted">Day ${a.startDay+i*a.freq}</span></span>${i<a.cycle?`<span class="pill ok">Paid ${fmt(a.payouts[i]?a.payouts[i].amt:0)}</span>`:i===a.cycle&&a.status==='active'?'<span class="pill wait">Next</span>':''}</div>`).join('')}</section>`;
  if(a.status==='active'&&isMem){const paid=cyc(a,'player'),d=dueDay(a);h+=`<div class="muted sm" style="margin-bottom:8px">Remaining cycles: ${a.size-a.cycle}. Due Day ${d}${d-G.day>0?' (in '+(d-G.day)+' days)':' (today)'}. Auto-paid tonight if you have the cash — miss it and you lose trust.</div><button class="btn" data-a="pay" data-id="${a.id}" ${paid?'disabled':''}>${paid?'Paid this cycle ✓':'Contribute '+fmt(a.amt)}</button>`}}
 return h}

function notesSheet(){return `<h2>Notifications</h2><div style="margin-top:12px">${G.notes.length?G.notes.slice(0,30).map(n=>`<div class="note ${n.kind}" style="margin:0 0 8px"><div class="tiny muted">Day ${n.day}</div>${esc(n.txt)}</div>`).join(''):'<div class="muted">Nothing yet.</div>'}</div>`}
function jobsSheet(){return `<h2>Today's openings</h2><div class="muted sm" style="margin:4px 0 12px">Pick one. You can quit any time.</div>${JOBS.map(j=>{const o=G.openJobs.includes(j.id);return `<button class="act" data-a="hire" data-id="${j.id}" ${o?'':'disabled'}><div class="ic">${j.ic}</div><div><b>${j.n}</b><small>${fmt(j.pay)}/day · −${j.en} energy · ${o?j.d:'Not hiring today'}</small></div></button>`}).join('')}`}

/* ============ GROUPS UI ============
   Screens only call the engine functions above. Hiding a button here is a convenience; the engine is what enforces permissions. */
const ROLEL={owner:'👑 Owner',admin:'🛡️ Admin',mod:'🔧 Moderator',member:'Member'};
const rolePill=r=>`<span class="pill ${r==='member'?'wait':'ok'}">${ROLEL[r]}</span>`;
const npcTag=id=>id==='player'?'':'<span class="pill wait" title="Simulated neighbour, not a real person">NPC</span>';
const visPill=g=>g.vis==='public'?'<span class="pill ok">🌍 Public</span>':`<span class="pill wait">🔒 Private${g.disc?' · findable':''}</span>`;
const GO=(o,k,vals,cur,lab)=>`<div class="opts">${vals.map(v=>`<button data-a="g_set" data-o="${o}" data-k="${k}" data-v="${v}" class="${String(cur)===String(v)?'on':''}">${lab?lab(v):esc(v)}</button>`).join('')}</div>`;
const GT=(k,ph,max,def,enter)=>`<input type="text" data-f="${k}" maxlength="${max}" placeholder="${esc(ph)}" value="${esc(UI.gi[k]!==undefined?UI.gi[k]:(def||''))}" ${enter?`data-enter="${enter}"`:''} autocomplete="off">`;
const dayRel=d=>d===G.day?'today':d===G.day+1?'tomorrow':'Day '+d;
const JOINL={open:'Open: anyone can join',approval:'Ask an admin first',invite:'Invitation only'};
const CHL={work:'work shifts',talk:'conversations',shop:'shop sessions'};
const avOf=id=>id==='player'?avatar(G.p.gender):(npc(id)?npc(id).em:'🧑🏾');

function gcardRow(x,extra){return `<button class="person" data-a="g_open" data-id="${x.id}"><div class="av">${x.av}</div><div class="meta"><b>${esc(x.name)}</b><div class="l">${esc(x.cat)} · ${x.count} member${x.count===1?'':'s'}${x.area?' · '+esc(x.area):''}${extra?' · '+extra:''}</div></div>${x.vis==='public'?'<span class="pill ok">Public</span>':'<span class="pill wait">🔒</span>'}</button>`}

function groupsView(){const mine=G.groups.filter(g=>!g.dead&&g.mem.player);
 const invs=[];G.groups.forEach(g=>{if(!g.dead)g.inv.forEach(i=>{if(i.to==='player'&&invState(i)==='pending')invs.push({g,i})})});
 const q=(UI.gi.q||'').trim(),cat=UI.gcat||'';let disc='';
 if(q||cat){const r=searchGroups(q,cat);disc=`<div class="sec">Results<small>${r.length} found</small></div>${r.length?r.map(x=>gcardRow(x)).join(''):'<div class="card muted">Nothing found. Try another word, or start the group yourself.</div>'}`}
 else{const S=discoverSections(),seen=new Set(),sect=(t,s,l)=>{l=l.filter(x=>!seen.has(x.id));l.forEach(x=>seen.add(x.id));return l.length?`<div class="sec">${t}<small>${s}</small></div>${l.map(x=>gcardRow(x,x.via?'friends: '+esc(x.via.join(', ')):'')).join('')}`:''};
  disc=sect('Your friends are in','Public groups your friends chose to show',S.friends)+sect('For your interests','From the interests you picked below',S.rec)+sect('Near you','Only because you chose to share an area',S.nearby)+sect('Happening soon','Meetups and challenges coming up',S.game)+sect('Business & creators','Communities for people who make and sell',S.biz);
  if(!disc)disc='<div class="card muted">Nothing new to suggest. Pick interests below, or search.</div>'}
 return `<div class="sec">Groups<small>Friends, interests and shared activities. Free to join. Never an Ajo by itself.</small></div>
 <div class="note grp">Other members here are simulated neighbours (marked NPC), plus you. Real player-to-player groups need the online version.</div>
 <div class="px row" style="gap:10px;margin:10px 0"><button class="btn" data-a="g_new">＋ Create group</button><button class="btn ghost" data-a="g_code">Join with code</button></div>
 ${invs.length?`<div class="sec">Invitations for you<small>Nothing happens until you accept</small></div>${invs.map(({g,i})=>`<div class="card"><b>${esc(g.name)}</b><div class="muted sm">Invited by ${esc(nm(i.by))} (NPC) · expires Day ${i.exp}</div><div class="row" style="margin-top:10px"><button class="btn sm green" style="flex:1" data-a="g_ans" data-id="${g.id}" data-i="${i.id}" data-y="1">Accept</button><button class="btn sm ghost" style="flex:1" data-a="g_ans" data-id="${g.id}" data-i="${i.id}" data-y="0">Decline</button></div></div>`).join('')}`:''}
 <div class="sec">My groups<small>${mine.length?mine.length+' group'+(mine.length===1?'':'s'):'You are not in any group yet'}</small></div>
 ${mine.length?mine.map(g=>gcardRow(glimpse(g),ROLEL[g.mem.player.role])).join(''):'<div class="card muted">Create one for your friends, your street or your hustle, or join one below.</div>'}
 <div class="sec">Discover</div>
 <div class="card flat" style="margin:8px 12px">${GT('q','Search groups by name or interest',30,'','g_search')}<div class="row" style="margin-top:8px"><button class="btn sm" data-a="g_search">Search</button>${q||cat?'<button class="btn sm ghost" data-a="g_clear">Clear</button>':''}</div></div>
 <div class="seg">${G_CATS.map(c=>`<button data-a="g_cat" data-v="${c}" class="${cat===c?'on':''}">${c}</button>`).join('')}</div>
 ${disc}
 <section class="card"><b>Your interests</b><div class="muted tiny">Used only on this device to suggest groups.</div><div class="opts">${G_CATS.map(c=>`<button data-a="g_int" data-v="${c}" class="${G.p.ints.includes(c)?'on':''}">${c}</button>`).join('')}</div>
 <label class="l">Show groups near me</label><div class="muted tiny">Off by default. No GPS is used: you choose an area yourself.</div><div class="opts"><button data-a="g_area" data-v="" class="${G.p.shareArea?'':'on'}">Off</button>${G_AREAS.map(a=>`<button data-a="g_area" data-v="${a}" class="${G.p.area===a?'on':''}">${a}</button>`).join('')}</div></section>`}

const gpostHtml=(g,p,isRep,staff)=>`<div class="msg ${isRep?'reply':''} ${p.kind==='announce'?'ann':''}"><div class="by">${p.kind==='announce'?'📣 ':''}${esc(nm(p.by))} ${npcTag(p.by)} <span class="muted">· Day ${p.day}</span></div>${p.hid?'<i class="muted">[hidden by a moderator]</i> ':''}${esc(p.txt)}${staff===null?'':`<div class="mact">${!isRep&&p.kind==='msg'?`<button data-a="g_reply" data-p="${p.id}">Reply</button>`:''}${p.by!=='player'?`<button data-a="g_rep" data-p="${p.id}">Report</button>`:''}${staff&&!p.hid?`<button data-a="g_hide" data-p="${p.id}">Hide</button>`:''}</div>${UI.gconf==='rep:'+p.id?`<div class="opts">${['Spam','Abuse or bullying','Scam','Other'].map(r=>`<button data-a="g_report" data-p="${p.id}" data-r="${r}">${r}</button>`).join('')}</div>`:''}`}</div>`;

function grpSheet(id){const v=viewGroup(id);if(!v)return `<h2>Group unavailable</h2><div class="muted sm" style="margin-top:8px">This group is private, or it does not exist.</div>`;
 const g=grp(id),head=`<div class="row" style="margin:6px 0 4px"><div class="av" style="width:56px;height:56px;font-size:32px">${v.av}</div><div style="min-width:0"><h2>${esc(v.name)}</h2><div class="muted sm">${esc(v.cat)} · ${v.count} member${v.count===1?'':'s'}${v.area?' · '+esc(v.area):''}</div></div></div><div style="margin-bottom:8px">${visPill(v)}${v.member?rolePill(v.role):''}${(v.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`;
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
 return `<div class="muted sm">${esc(v.desc)||'No description yet.'}</div>
 ${canInv?`<button class="btn" style="margin-top:12px" data-a="g_inv" data-id="${g.id}">＋ Invite friends</button>`:''}
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

function gChat(g,v){const ps=postsFor(g.id)||[],staff=rk(g,'player')>=2,top=ps.filter(p=>!p.parent).slice(-40),rp=ps.find(p=>p.id===UI.gi.replyTo);
 return `${top.length?top.map(p=>gpostHtml(g,p,false,staff)+ps.filter(c=>c.parent===p.id).map(c=>gpostHtml(g,c,true,staff)).join('')).join(''):'<div class="card muted center">No messages yet. Say hello 👋</div>'}
 <div class="composer">${rp?`<div class="row sp tiny muted" style="margin-bottom:4px"><span>Replying to ${esc(nm(rp.by))}</span><button data-a="g_cancelreply" style="background:none;color:var(--danfo);font-weight:800">Cancel</button></div>`:''}${GT('msg','Write a message',280,'','g_send')}<button class="btn sm" style="margin-top:8px" data-a="g_send">Send</button></div>
 <div class="muted tiny" style="margin-top:8px">Be kind. Report anything abusive. Simulated neighbours (NPC) chat here too.</div>`}

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
 let h=`<section class="card"><b>🚩 Reports (${reps.length})</b>${reps.length?reps.map(r=>{const p=g.posts.find(x=>x.id===r.pid);return `<div style="margin-top:10px"><div class="tiny muted">${esc(nm(r.by))} reported ${esc(nm(r.target))}: ${esc(r.why)}</div><div class="msg" style="margin:6px 0">${p?esc(p.txt):'[post gone]'}</div><div class="row" style="flex-wrap:wrap"><button class="btn sm ghost" data-a="g_review" data-r="${r.id}" data-x="dismiss">Dismiss</button>${p&&!p.hid?`<button class="btn sm" data-a="g_review" data-r="${r.id}" data-x="hide">Hide post</button>`:''}${adm?`<button class="btn sm ghost" data-a="g_review" data-r="${r.id}" data-x="remove">Remove member</button><button class="btn sm red" data-a="g_review" data-r="${r.id}" data-x="ban">Ban</button>`:''}</div></div>`}).join(''):'<div class="muted sm" style="margin-top:6px">No open reports.</div>'}</section>`;
 if(!adm)return h+'<div class="note">Moderators review reports and hide posts. Settings belong to admins and the owner.</div>';
 h+=`<section class="card"><b>🙋 Join requests (${g.req.length})</b>${g.req.length?g.req.map(u=>`<div class="tx"><span>${avOf(u)} ${esc(nm(u))} ${npcTag(u)}</span><span class="row"><button class="btn sm green" data-a="g_apv" data-u="${u}" data-y="1">Approve</button><button class="btn sm ghost" data-a="g_apv" data-u="${u}" data-y="0">Decline</button></span></div>`).join(''):'<div class="muted sm" style="margin-top:6px">No one is waiting.</div>'}</section>
 <button class="btn ghost" style="margin:0 0 12px" data-a="g_inv" data-id="${g.id}">Invitations: friends, links and codes</button>
 <section class="card"><b>📣 Announcement</b><div style="margin-top:8px">${GT('ann','Tell the group something important',280,'','g_ann')}</div><button class="btn sm" style="margin-top:8px" data-a="g_ann">Post announcement</button></section>`;
 const S={desc:g.desc,av:g.av,cat:g.cat,memInvite:g.memInvite,join:g.join,roster:g.roster,vis:g.vis,disc:g.disc,...(UI.gs||{})},pub=S.vis==='public';
 h+=`<section class="card"><b>⚙️ Settings</b><label class="l">Picture</label>${GO('gs','av',G_AVS,S.av,v=>v)}<label class="l">About</label>${GT('sdesc','Description',240,g.desc)}<label class="l">Rules</label>${[0,1,2].map(i=>GT('sr'+i,'Rule '+(i+1),100,g.rules[i]||'')).join('<div style="height:6px"></div>')}
 <label class="l">Main interest</label>${GO('gs','cat',G_CATS,S.cat)}<label class="l">How people join</label>${GO('gs','join',pub?['open','approval']:['invite','approval'],pub?(S.join==='approval'?'approval':'open'):(S.join==='approval'?'approval':'invite'),v=>JOINL[v])}
 <label class="l">Who can invite</label>${GO('gs','memInvite',['members','admins'],S.memInvite,v=>v==='members'?'Any member':'Only admins')}<label class="l">Who sees the member list</label>${GO('gs','roster',['members','admins'],S.roster,v=>v==='members'?'All members':'Only admins')}
 ${own?`<label class="l">Visibility (owner only)</label>${GO('gs','vis',['public','private'],S.vis,v=>v==='public'?'🌍 Public':'🔒 Private')}<div class="muted tiny">${S.vis==='public'?'Announcements and the description become visible to everyone. Chat and members stay private.':'Hidden from search and from profiles.'}</div>${S.vis==='private'?`<label class="l">Findable in search?</label>${GO('gs','disc',[false,true],S.disc,v=>v?'Yes, invite-discoverable':'No, hidden')}`:''}`:''}
 <button class="btn" style="margin-top:12px" data-a="g_save">Save changes</button></section>`;
 if(own){const admins=Object.keys(g.mem).filter(m=>g.mem[m].role==='admin'),tx=UI.gs&&UI.gs.tx;
  h+=`<section class="card"><b>👑 Owner</b><label class="l">Transfer ownership to an admin</label>${admins.length?GO('gs','tx',admins,tx,id=>esc(nm(id))):'<div class="muted sm">Make someone an admin first (People tab).</div>'}${GT('tconf','Type "'+g.name+'" to confirm',30)}<button class="btn ghost sm" style="margin-top:8px" data-a="g_transfer">Transfer ownership</button>
  <label class="l" style="margin-top:16px">Delete this group</label><div class="muted tiny">Deletes the group and its chat. Any Ajo circle linked to it is not touched.</div>${GT('dconf','Type the group name to confirm',30)}<button class="btn red sm" style="margin-top:8px" data-a="g_delete">Delete group</button></section>`}
 return h}

function gnewSheet(){const f=UI.gc,pub=f.vis==='public',jn=pub?(f.join==='approval'?'approval':'open'):(f.join==='approval'?'approval':'invite');
 return `<h2>Create a group</h2><div class="muted sm" style="margin-top:4px">Free, for friends and shared fun. It is not an Ajo.</div>
 <label class="l">Name</label>${GT('name','e.g. Kano Entrepreneurs',30)}<label class="l">Picture</label>${GO('gc','av',G_AVS,f.av,v=>v)}<label class="l">About</label>${GT('desc','What is this group for?',240)}
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
 <label class="l">Name</label>${GT('pname','Ajo name',24,g.name+' Ajo')}<label class="l">People</label>${GO('gp','size',[3,4,5,6],p.size)}<label class="l">Contribution</label>${GO('gp','amt',[2000,5000,10000],p.amt,fmt)}<label class="l">Every</label>${GO('gp','freq',[3,7,14],p.freq,v=>v+' days')}
 <div class="card" style="background:var(--card)"><div class="row sp"><span class="muted">Pot per round</span><b>${fmt(p.amt*p.size)}</b></div><div class="muted tiny">Needs Trust 40+. Setting it up later means a visit to the Ajo Center.</div></div><button class="btn" data-a="g_propose">Share this proposal</button>`}

function gstatsV(){const m=groupMetrics(),pc=x=>x==null?'n/a':Math.round(x*100)+'%',row=(l,v)=>`<div class="tx"><span>${l}</span><b>${v}</b></div>`;
 return `<section class="card"><b>🏘️ Group health</b><div class="muted tiny" style="margin:4px 0 8px">Kept on this device only. Chat from simulated neighbours (NPC) is not counted. Participation matters more than invitations.</div>${row('Groups you are in',m.groups)}${row('Active in the last 7 days',m.activeThisWeek)}${row('Groups where you posted lately',m.conversational)}${row('Activities completed',m.activities)}${row('First interactions',m.firstInteractions)}${row('Came back after 7+ days away',m.returned7)}${row('Went quiet (14+ days)',m.inactive)}</section>
 <section class="card"><b>Invitations and joining</b>${row('Groups created',m.created)}${row('Invitations sent',m.sent)}${row('Invitations accepted',m.accepted)}${row('Acceptance rate',pc(m.acceptRate))}${row('Invited by a regular member',m.memberInvites)}${row('Join requests',m.requests)}${row('Approved',m.approved)}</section>`}

function gShare(code,gid){const g=grp(gid);if(!g)return;const url=location.href.split('#')[0]+'#join='+code,text='Join "'+g.name+'" on Kano City with code '+code;
 if(navigator.share){navigator.share({title:g.name,text,url}).catch(()=>{});return}
 const done=m=>{fx(m,'warm');render()};try{navigator.clipboard.writeText(text+' '+url).then(()=>done('Invitation copied. Paste it into any chat.'),()=>done('Copy this code: '+code))}catch(e){done('Copy this code: '+code)}}
function deepLink(){if(!G)return;let h='';try{h=(location.hash||'').slice(1)}catch(e){}const m=h.match(/^(join|g)=([\w-]+)$/);if(!m)return;try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}UI.tab='groups';if(m[1]==='join'){UI.modal={t:'gcode'};UI.gi.code=m[2].toUpperCase()}else{UI.modal={t:'grp',id:m[2]};UI.gt='home'}}

function gClick(a,d){const M=UI.modal||{};
 switch(a){
  case 'g_open':UI.modal={t:'grp',id:d.id};UI.gt='home';UI.gi.replyTo=null;UI.gs=null;UI.gconf=null;visitGroup(d.id);commit();break;
  case 'g_tab':UI.gt=d.v;UI.gconf=null;UI.gs=null;render();break;
  case 'g_back':UI.modal={t:'grp',id:M.id};render();break;
  case 'g_set':{const o=UI[d.o]||(UI[d.o]={});o[d.k]=d.v==='true'?true:d.v==='false'?false:d.v;render();break}
  case 'g_cat':UI.gcat=UI.gcat===d.v?'':d.v;render();break;
  case 'g_search':render();break;
  case 'g_clear':UI.gcat='';UI.gi.q='';render();break;
  case 'g_int':{const l=G.p.ints,i=l.indexOf(d.v);if(i<0)l.push(d.v);else l.splice(i,1);commit();break}
  case 'g_area':G.p.area=d.v||null;G.p.shareArea=!!d.v;commit();break;
  case 'g_new':UI.modal={t:'gnew'};render();break;
  case 'g_ctag':{const t=UI.gc.tags=UI.gc.tags||[],i=t.indexOf(d.v);if(i>=0)t.splice(i,1);else if(t.length<3)t.push(d.v);render();break}
  case 'g_make':{const f=UI.gc,i=UI.gi,id=createGroup({...f,name:i.name,desc:i.desc,rules:[i.rule1,i.rule2]});if(id){['name','desc','rule1','rule2'].forEach(k=>delete UI.gi[k]);UI.gc.tags=[];UI.modal={t:'grp',id};UI.gt='home';UI.tab='groups'}commit();break}
  case 'g_code':UI.modal={t:'gcode'};render();break;
  case 'g_redeem':{const id=redeemCode(UI.gi.code);if(id){UI.gi.code='';UI.modal={t:'grp',id};UI.gt='home'}commit();break}
  case 'g_join':run(joinGroup,d.id);break;
  case 'g_ans':run(answerInvite,d.id,d.i,d.y==='1');break;
  case 'g_leave':if(UI.gconf!=='leave'){UI.gconf='leave';render()}else{UI.gconf=null;if(leaveGroup(M.id,'player'))UI.modal=null;commit()}break;
  case 'g_show':{const g=grp(M.id);if(g&&g.mem.player)setShow(M.id,'player',!g.mem.player.show);commit();break}
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
   const patch={desc:gi.sdesc!==undefined?gi.sdesc:g.desc,rules,av:S.av,cat:S.cat,memInvite:S.memInvite,join:S.join,roster:S.roster};if(rk(g,'player')===4){patch.vis=S.vis;patch.disc=S.disc}
   if(editGroup(M.id,'player',patch)){UI.gs=null;['sdesc','sr0','sr1','sr2'].forEach(k=>delete gi[k]);fx('Saved.','warm')}commit();break}
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
  case 'g_propose':{if(proposeAjo(M.id,'player',{...UI.gp,name:UI.gi.pname})){UI.modal={t:'grp',id:M.id};UI.gt='home';delete UI.gi.pname}commit();break}
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
document.addEventListener('input',e=>{if(e.target.id==='f-name')UI.form.name=e.target.value;if(e.target.id==='f-age')UI.form.age=e.target.value;if(e.target.id==='f-ajo')UI.ajoNew.name=e.target.value;if(e.target.dataset&&e.target.dataset.f)UI.gi[e.target.dataset.f]=e.target.value});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.enter){const b=document.querySelector('[data-a="'+e.target.dataset.enter+'"]');if(b)b.click()}});
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||el.disabled)return;const d=el.dataset,a=d.a;
 if(a==='closeBack'){if(e.target===el){UI.modal=null;render()}return}
 if(a!=='reset')UI.confirmReset=false;
 switch(a){
  case 'gender':UI.form.gender=d.v;render();break;
  case 'begin':{const n=(UI.form.name||'').trim();if(!n){fx('Enter a name first.','warn');flush();return}const age=Math.max(18,Math.min(60,parseInt(UI.form.age)||24));newGame(n,age,UI.form.gender);UI.tab='life';commit();break}
  case 'tab':UI.tab=d.v;UI.modal=null;render();break;
  case 'townMode':UI.townMode=d.v;render();break;
  case 'tabAjo':UI.tab='ajo';render();break;
  case 'more':UI.more=d.v;render();break;
  case 'notes':UI.modal={t:'notes'};G.notes.forEach(n=>n.read=true);commit();break;
  case 'close':UI.modal=null;render();break;
  case 'jobs':UI.modal={t:'jobs'};render();break;
  case 'hire':if(hire(d.id))UI.modal=null;commit();break;
  case 'work':run(work);break;case 'quit':run(quit);break;
  case 'sleep':UI.modal=null;run(sleep);break;
  case 'statHint':{const k=d.k;const hints={energy:G.p.energy<=30?'Low energy — rest at Home.':'Energy drops as you act. Rest at Home to recover.',hunger:G.p.hunger>=70?'Hungry — cook, snack, or eat out.':'Hunger rises over time. Eat before work.',mood:'Mood rises with social time, food, and family calls.'};fx(hints[k]||'','warm');flush();break}
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
  case 'ajoOpen':UI.modal={t:'ajo',id:d.id};render();break;
  case 'ajoNew':UI.modal={t:'ajoNew'};render();break;
  case 'anset':UI.ajoNew[d.k]=+d.v;render();break;
  case 'ajoMake':{const f=UI.ajoNew,id=createAjo((f.name||'Kano Hustlers').trim(),f.size,f.amt,f.freq);if(id)UI.modal={t:'ajo',id};commit();break}
  case 'join':run(joinAjo,d.id);break;
  case 'inv':run(invite,d.id,d.n);break;
  case 'req':run(reqPriority,d.id,d.r);break;
  case 'vote':run(voteNom,d.id,d.y==='1');break;
  case 'start':run(startAjo,d.id);break;
  case 'pay':run(payAjo,d.id);break;
  case 'debt':run(payDebt,+d.id);break;
  case 'reset':if(!UI.confirmReset){UI.confirmReset=true;render()}else{Store.clear();G=null;UI.confirmReset=false;UI.modal=null;UI.tab='life';render()}break;
  default:if(a.indexOf('g_')===0)gClick(a,d);
 }});
addEventListener('hashchange',()=>{deepLink();render()});



// Boot after DOM is ready
export async function startApp() {
  if (typeof boot === 'function') await boot();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
