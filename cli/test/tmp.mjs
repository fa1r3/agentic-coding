// Temporary folders of a test file: made in the temporary folder of the system, removed once all the
// tests of the file have ended.
import { after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const made = [];

export function tempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
}

after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});
