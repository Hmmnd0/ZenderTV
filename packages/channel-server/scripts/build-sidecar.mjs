#!/usr/bin/env node
/**
 * Builds the channel server as a self-contained binary and places it in
 * packages/broadcaster/src-tauri/binaries/ with the Tauri-expected triple suffix.
 *
 * Steps:
 *   1. esbuild: bundle ESM → CJS (inlines all node_modules)
 *   2. @yao-pkg/pkg: compile CJS + Node.js runtime → native binary
 *   3. Move to src-tauri/binaries/channel-server-<rust-triple>[.exe]
 */

import { build } from 'esbuild';
import { execSync } from 'child_process';
import { mkdirSync, renameSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot    = join(__dirname, '..');            // packages/channel-server
const distDir    = join(pkgRoot, 'dist');
const binDir     = join(pkgRoot, '..', 'broadcaster', 'src-tauri', 'binaries');

mkdirSync(distDir, { recursive: true });
mkdirSync(binDir,  { recursive: true });

// ── 1. Bundle with esbuild ──────────────────────────────────────────────────
console.log('esbuild: bundling channel server…');
await build({
  entryPoints: [join(pkgRoot, 'src', 'index.js')],
  bundle:   true,
  platform: 'node',
  target:   'node20',
  format:   'cjs',
  outfile:  join(distDir, 'server.cjs'),
  // No native modules remain after chokidar was replaced with fs.watch()
});
console.log('esbuild: done');

// ── 2. Detect current Rust target triple ────────────────────────────────────
let targetTriple;
try {
  targetTriple = execSync('rustc -vV', { encoding: 'utf8' })
    .match(/host:\s*(.+)/)?.[1]?.trim();
} catch {
  throw new Error('rustc not found — install Rust from https://rustup.rs');
}
if (!targetTriple) throw new Error('Could not parse rustc -vV output');
console.log('Rust target:', targetTriple);

// ── 3. Map Rust triple → pkg OS/arch target ─────────────────────────────────
function toPkgTarget(triple) {
  if (triple.includes('aarch64') && triple.includes('darwin'))  return 'node20-macos-arm64';
  if (triple.includes('x86_64')  && triple.includes('darwin'))  return 'node20-macos-x64';
  if (triple.includes('x86_64')  && triple.includes('linux'))   return 'node20-linux-x64';
  if (triple.includes('aarch64') && triple.includes('linux'))   return 'node20-linux-arm64';
  if (triple.includes('windows'))                               return 'node20-win-x64';
  throw new Error(`No pkg target mapping for triple: ${triple}`);
}

const pkgTarget  = toPkgTarget(targetTriple);
const isWindows  = targetTriple.includes('windows');
const ext        = isWindows ? '.exe' : '';
const pkgOut     = join(distDir, `channel-server${ext}`);
const finalName  = `channel-server-${targetTriple}${ext}`;
const finalPath  = join(binDir, finalName);

// ── 4. Compile with pkg ─────────────────────────────────────────────────────
console.log(`pkg: compiling for ${pkgTarget}…`);
execSync(
  `npx --yes @yao-pkg/pkg "${join(distDir, 'server.cjs')}" --target ${pkgTarget} --output "${pkgOut}"`,
  { stdio: 'inherit', cwd: pkgRoot },
);

// ── 5. Move to broadcaster's binaries folder ─────────────────────────────────
if (existsSync(finalPath)) unlinkSync(finalPath);
renameSync(pkgOut, finalPath);

console.log(`\nSidecar ready: src-tauri/binaries/${finalName}`);
console.log('Run "npm run tauri build" in packages/broadcaster to bundle it.');
