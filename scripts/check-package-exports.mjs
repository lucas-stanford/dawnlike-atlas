#!/usr/bin/env node
/**
 * check-package-exports — publish-time sanity check.
 *
 * Verifies that every path reachable from `package.json#exports`
 *   1. exists on disk, and
 *   2. is covered by a `files` entry, so it actually lands in the
 *      published tarball.
 *
 * The failure this catches is nasty and silent: `npm publish` succeeds,
 * the package installs fine, and the import blows up only in a
 * consumer's build. Run via `node scripts/check-package-exports.mjs`.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

/** Flatten the `exports` map into a list of relative file paths. */
function collectExportTargets(node, out = []) {
  if (typeof node === 'string') {
    if (node.startsWith('./')) out.push(node.slice(2));
    return out;
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) collectExportTargets(value, out);
  }
  return out;
}

const targets = [...new Set(collectExportTargets(pkg.exports ?? {}))];
if (pkg.main?.startsWith('./')) targets.push(pkg.main.slice(2));
else if (pkg.main) targets.push(pkg.main);

const files = pkg.files ?? [];
const problems = [];

/** Is `target` inside one of the `files` entries? */
const isPacked = (target) =>
  // package.json is always included by npm.
  target === 'package.json' ||
  files.some((entry) => target === entry || target.startsWith(`${entry}/`));

for (const target of targets) {
  const abs = path.join(root, target);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    problems.push(`missing on disk:   ./${target}`);
    continue;
  }
  if (!isPacked(target)) {
    problems.push(`not in "files":    ./${target}`);
  }
}

// Every `files` entry should itself exist, or the tarball silently
// drops whatever the author meant to ship.
for (const entry of files) {
  if (!existsSync(path.join(root, entry))) {
    problems.push(`"files" entry missing on disk: ${entry}`);
  }
}

if (problems.length) {
  console.error('package.json export/files check FAILED:\n');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}

console.log(`✓ ${targets.length} export target(s) present and packed.`);
