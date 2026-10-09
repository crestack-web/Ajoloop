/**
 * Engine loader — evaluates the classic game engine in global scope.
 * UI and tests rely on globals: G, FX, Store, LOCS, JOBS, etc.
 */
import engineSource from './game.js?raw';

let loaded = false;

export function loadEngine() {
  if (loaded) return;
  const src = String(engineSource)
    .replace(/^\/\/#ENGINE-START\r?\n?/, '')
    .replace(/\r?\n?\/\/#ENGINE-END\s*$/, '');
  // Indirect eval → global scope (browser + Node with --experimental-vm-modules still needs care)
  (0, eval)(src);
  loaded = true;
}

export function isEngineLoaded() {
  return loaded;
}
