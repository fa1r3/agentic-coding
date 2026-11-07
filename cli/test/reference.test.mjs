// Non-regression comparison with the two references (analysis 4.9, R13): the full view of each tool,
// written by install.sh --render from the real sources, is compared with diff -ru to modules/ of its
// reference tag, and the diff must equal the expected diff versioned in tests/ref/<tool>.diff.
// Every intended difference is written there before the change that makes it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { renderFiles } from '../lib/render.mjs';

const TOOLKIT = resolve(import.meta.dirname, '..', '..');
const REFERENCES = { claude: 'ref/claude-code', opencode: 'ref/opencode' };

// diff -ru between a/ (the reference) and b/ (the render), without the dates of the file headers.
function actualDiff(dir) {
  const r = spawnSync('diff', ['-ru', 'a', 'b'], { cwd: dir, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  if (r.status !== 0 && r.status !== 1) throw new Error(`diff failed: ${r.stderr || r.error?.message}`);
  return r.stdout.replace(/^(---|\+\+\+) (\S+)\t.*$/gm, '$1 $2');
}

const work = mkdtempSync(join(tmpdir(), 'f3-reference-'));
const env = { ...process.env };
delete env.F3_TOOLKIT_ROOT; // the real sources, not the fixtures
const rendered = spawnSync('bash', [join(TOOLKIT, 'install.sh'), '--render', join(work, 'views')], { env, encoding: 'utf8' });

for (const [tool, tag] of Object.entries(REFERENCES)) {
  test(`the render of ${tool} differs from ${tag} exactly as tests/ref/${tool}.diff says`, () => {
    assert.equal(rendered.status, 0, `install.sh --render failed: ${rendered.stderr}`);
    const dir = join(work, tool);
    mkdirSync(dir);
    try {
      execFileSync('bash', ['-c', 'set -o pipefail; git -C "$1" archive --prefix=a/ "$2:modules" | tar -x -C "$3"', '_', TOOLKIT, tag, dir], { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`cannot read modules/ of the tag ${tag} (is it in this clone?): ${error.stderr}`);
    }
    renameSync(join(work, 'views', tool), join(dir, 'b'));
    const actual = actualDiff(dir);
    const expected = readFileSync(join(TOOLKIT, 'tests', 'ref', `${tool}.diff`), 'utf8');
    if (actual !== expected) {
      const file = join(work, `${tool}.diff`);
      writeFileSync(file, actual);
      assert.fail(`the diff with ${tag} is not the expected one: compare ${file} with tests/ref/${tool}.diff`);
    }
  });
}

// The fixtures are the agents and commands of ref/claude-code converted to the format of the sources:
// rendered for Claude Code with the tools/ of the toolkit, they must give back those files exactly.
test('the Claude Code render of the fixtures gives back the agents and commands of ref/claude-code', () => {
  const root = mkdtempSync(join(tmpdir(), 'f3-roundtrip-'));
  cpSync(join(import.meta.dirname, 'fixtures', 'modules'), join(root, 'modules'), { recursive: true });
  cpSync(join(TOOLKIT, 'tools'), join(root, 'tools'), { recursive: true });
  const files = renderFiles('claude', root);
  assert.equal(files.length, 17);
  for (const { path, content } of files) {
    const reference = execFileSync('git', ['-C', TOOLKIT, 'show', `ref/claude-code:modules/${path}`], { encoding: 'utf8' });
    assert.equal(content, reference, path);
  }
});
