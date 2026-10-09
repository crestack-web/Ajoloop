/**
 * Launch smoke test — core product flow offline.
 */
const fs = require('fs');
const path = require('path');
const engPath = path.join(__dirname, '../src/engine/game.js');
let src = fs.readFileSync(engPath, 'utf8')
  .replace(/^\/\/#ENGINE-START\r?\n?/, '')
  .replace(/\r?\n?\/\/#ENGINE-END\s*$/, '');
src = src.replace(/\blet G\s*=\s*null\s*;\s*const FX\s*=\s*\[\s*\]\s*;/, 'var G=null; var FX=[];');
src = src.replace(/\bconst Store\s*=/, 'var Store=');
const names = ['KEY','WD','LOCS','JOBS','NP0','LINES','SHOP_COST','UNIT_COST','UNIT_PRICE','AJO_BLOCK','RENT','LIVING','LATE','G_CATS','G_AVS','G_AREAS','G_LOCS','G_MAX','ROLE_RANK','PERMS','NPC_CATS','CHAT','REPLY','ROLEL','NEEDS','EV','SEED','KANO_MAP','BIZ_CATS','HOME_STYLES','AJO_FEE_PCT','STONES'];
for (const n of names) src = src.replace(new RegExp('\\bconst ' + n + '\\s*='), 'var ' + n + '=');
const arrows = ['clamp','ri','pick','shuffle','fmt','hash','npc','nm','ajoOf','metNpcs','period','npcLoc','here','canTime','netWorth','blocked','myAjos','dueDay','cyc','fx','no','ledger','spend','earn'];
for (const n of arrows) src = src.replace(new RegExp('\\bconst ' + n + '\\s*='), 'var ' + n + '=');
global.window = global;
global.localStorage = { getItem(){return null}, setItem(){}, removeItem(){} };
(0, eval)(src);

let fails = 0;
function ok(c, m) { if (!c) { console.error('FAIL', m); fails++; } else console.log('OK', m); }

newGame('Launch', 30, 'Female');
ok(!!G && G.p.name === 'Launch', 'newGame');
startDemoPath();
ok(G.demo === true, 'demo on');
ok(G.p.home && G.p.home.done, 'home set');
ok(G.npcs.filter(n => n.met).length >= 3, 'neighbours met');

const cash0 = G.p.cash;
travel('market');
ok(G.p.cash === cash0, 'free travel');

const pub = publicAjos();
ok(pub.length >= 1, 'public ajos listed');
requestJoinAjo(pub[0].id);
ok(ajoOf(pub[0].id).members.includes('player'), 'join public ajo');
ajoChatSend(pub[0].id, 'Hello circle');
ok((ajoOf(pub[0].id).chat || []).length >= 1, 'circle chat');

const id = createAjo('Launch Circle', 4, 5000, 7);
ok(!!id, 'create ajo');
demoFillAjo(id);
ok(ajoOf(id).status === 'stones', 'stones phase');
rollStones(id);
startAjo(id);
demoAdvanceToPayout(id);
const po = ajoOf(id).payouts[0];
ok(po && po.to === 'player' && po.fee > 0, 'round1 fee + payout');

const shop = G.bizs.find(b => b.owner !== 'player');
requestBizVisit(shop.id);
ok(G.visits.some(v => v.biz === shop.id && v.st === 'approved'), 'visit approved');

const checks = demoChecklist();
ok(checks.filter(c => c.ok).length >= 5, 'checklist progressing');

console.log(fails ? `\n${fails} smoke failures` : '\nAll smoke checks passed');
process.exit(fails ? 1 : 0);
