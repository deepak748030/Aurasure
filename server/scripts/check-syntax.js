'use strict';

/**
 * Recursively `node --check`s every .js file under src/ and scripts/.
 * Used by `npm run check` to catch syntax errors without a full test run.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIRS = [path.join(__dirname, '..', 'src'), path.join(__dirname, '..', 'scripts')];
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
}

DIRS.forEach(walk);
files.push(__filename);

let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log('ok   ', path.relative(path.join(__dirname, '..'), file));
  } catch (err) {
    failed += 1;
    console.error('FAIL ', path.relative(path.join(__dirname, '..'), file));
    console.error(String(err.stderr || err.message));
  }
}

if (failed) {
  console.error(`\n${failed} file(s) failed syntax check`);
  process.exit(1);
}
console.log(`\nAll ${files.length} files passed syntax check ✓`);
