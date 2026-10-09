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
  'ROLE_RANK','PERMS','NPC_CATS','CHAT','REPLY','ROLEL','NEEDS','EV','SEED'
];

function prepareSource(raw) {
  let src = String(raw)
    .replace(/^\/\/#ENGINE-START\r?\n?/, '')
    .replace(/\r?\n?\/\/#ENGINE-END\s*$/, '');
  // Core mutable state + Store must be var (global object props)
  src = src.replace(/\blet G\s*=\s*null\s*;\s*const FX\s*=\s*\[\s*\]\s*;/, 'var G=null; var FX=[];');
  src = src.replace(/\bconst Store\s*=/, 'var Store=');
  for (const name of GLOBAL_CONSTS) {
    src = src.replace(new RegExp(String.raw`\bconst ${name}\s*=`), `var ${name}=`);
  }
  // Helper consts used widely by UI (fmt, clamp, etc. are const arrow/fn)
  // function declarations are already global; const arrows need var:
  const ARROWS = ['clamp','ri','pick','shuffle','fmt','hash','npc','nm','ajoOf','metNpcs','period','npcLoc','here','canTime','netWorth','blocked','myAjos','dueDay','cyc','col','colH'];
  for (const name of ARROWS) {
    src = src.replace(new RegExp(String.raw`\bconst ${name}\s*=`), `var ${name}=`);
  }
  return src;
}

export function loadEngine() {
  if (loaded) return;
  const src = prepareSource(engineSource);
  // Indirect eval → global scope; var bindings attach to globalThis
  (0, eval)(src);
  // Explicit mirror (belt and braces)
  const g = globalThis;
  if (typeof G !== 'undefined') g.G = G;
  if (typeof FX !== 'undefined') g.FX = FX;
  if (typeof Store !== 'undefined') g.Store = Store;
  loaded = true;
}

export function isEngineLoaded() {
  return loaded;
}
