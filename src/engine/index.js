/**
 * Engine loader — evaluates the classic game engine so UI (ES modules) can see it.
 * `let`/`const` at top level are NOT visible to ES modules as free variables;
 * we rewrite shared bindings to `var` so they become global object properties.
 */
import engineSource from './game.js?raw';

let loaded = false;

const GLOBAL_CONSTS = [
  'KEY','WD','LOCS','JOBS','NP0','LINES','SHOP_COST','UNIT_COST','UNIT_PRICE',
  'AJO_BLOCK','RENT','LIVING','LATE','G_CATS','G_AVS','G_AREAS','G_LOCS','G_MAX',
  'ROLE_RANK','PERMS','NPC_CATS','CHAT','REPLY','ROLEL','NEEDS','EV','SEED',
  'KANO_MAP','BIZ_CATS','HOME_STYLES','AJO_FEE_PCT','STONES'
];

function prepareSource(raw) {
  let src = String(raw)
    .replace(/^\/\/#ENGINE-START\r?\n?/, '')
    .replace(/\r?\n?\/\/#ENGINE-END\s*$/, '');
  src = src.replace(/\blet G\s*=\s*null\s*;\s*const FX\s*=\s*\[\s*\]\s*;/, 'var G=null; var FX=[];');
  src = src.replace(/\bconst Store\s*=/, 'var Store=');
  for (const name of GLOBAL_CONSTS) {
    src = src.replace(new RegExp(String.raw`\bconst ${name}\s*=`), `var ${name}=`);
  }
  const ARROWS = [
    'clamp','ri','pick','shuffle','fmt','hash','npc','nm','ajoOf','metNpcs','period',
    'npcLoc','here','canTime','netWorth','blocked','myAjos','dueDay','cyc','col','colH',
    'fx','no','ledger','spend','earn'
  ];
  for (const name of ARROWS) {
    src = src.replace(new RegExp(String.raw`\bconst ${name}\s*=`), `var ${name}=`);
  }
  return src;
}

export function loadEngine() {
  if (loaded) return;
  const src = prepareSource(engineSource);
  (0, eval)(src);
  const g = globalThis;
  if (typeof G !== 'undefined') g.G = G;
  if (typeof FX !== 'undefined') g.FX = FX;
  if (typeof Store !== 'undefined') g.Store = Store;
  loaded = true;
}

export function isEngineLoaded() {
  return loaded;
}
