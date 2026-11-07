import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stateOf } from '../lib/state.mjs';

function project({ framed = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'f3-state-'));
  const w = (f, t) => { mkdirSync(join(dir, f, '..'), { recursive: true }); writeFileSync(join(dir, f), t); };
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  if (framed) w('openspec/config.yaml', 'schema: f3\ncontext: |\n  Design tool:\n    Penpot, skill ux-penpot\n');
  w('BACKLOG.md', '# Backlog\n\n## B-001 Export\n\n- Status: open\n\n## B-002 Import\n\n- Status: in-progress add-import\n');
  w('arch/decisions.md', '## A-001 Stack\n\n- Status: active\n');
  w('openspec/changes/add-import/proposal.md', '# p\n');
  w('openspec/changes/add-import/clarification.md', '# c\n');
  w('openspec/changes/add-import/tasks.md', '## 1. Work\n\n- [x] 1.1 a\n- [ ] 1.2 b\n\n## 2. Acceptance fixes, pass 01\n\n- [ ] 2.1 c\n');
  w('openspec/changes/add-import/validations/amigos.md', 'ok\n');
  w('openspec/changes/empty-one/.keep', '');
  w('openspec/changes/archive/old/proposal.md', '');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], { cwd: dir });
  return dir;
}

function inDir(dir, fn) {
  const cwd = process.cwd();
  process.chdir(dir);
  try { return fn(); } finally { process.chdir(cwd); }
}

const framed = project();
const s = (cmd, args) => inDir(framed, () => stateOf(cmd, args));

test('propose lists the changes in progress and the backlog', () => {
  const r = s('propose');
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Project schema: schema: f3/);
  assert.match(r.stdout, /add-import: clarification\.md proposal\.md validations\/amigos\.md/);
  assert.match(r.stdout, /empty-one: \(empty\)/);
  assert.doesNotMatch(r.stdout, /archive|old/);
  assert.match(r.stdout, /## B-001 Export - Status: open/);
});

test('dev shows branch, uncommitted files, unchecked tasks and fix groups', () => {
  const r = s('dev', 'add-import');
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Current branch: main/);
  assert.match(r.stdout, /Uncommitted files: none/);
  assert.match(r.stdout, /Unchecked tasks: 2/);
  assert.match(r.stdout, /Fix groups: ## 2\. Acceptance fixes, pass 01/);
});

test('dev on a change without tasks', () => {
  const r = s('dev', 'empty-one');
  assert.match(r.stdout, /Unchecked tasks: tasks\.md absent/);
  assert.match(r.stdout, /Fix groups: none/);
});

test('acceptance, archive, design, design-review, tres-amigos, ux-design', () => {
  assert.match(s('acceptance', 'add-import').stdout, /openspec\/changes\/add-import\/acceptance: absent/);
  assert.match(s('archive', 'add-import').stdout, /Acceptance reports of the change: openspec\/changes\/add-import\/acceptance: absent/);
  const design = s('design', 'add-import');
  assert.equal(design.code, 0, design.stderr);
  assert.match(design.stdout, /Progress of OpenSpec/);
  assert.match(design.stdout, /## A-001 Stack - Status: active/);
  assert.match(s('design-review', 'add-import').stdout, /validations: amigos\.md/);
  assert.match(s('tres-amigos', 'add-import').stdout, /Path of the spec-practice skill: .*skills\/spec-practice\/SKILL\.md/);
  assert.match(s('ux-design', 'add-import').stdout, /Design tool named by the context: Penpot, skill ux-penpot/);
  assert.equal(s('ux-design', 'add-import conformity').code, 0);
});

test('invalid, unknown or missing change identifier: error with the changes in progress', () => {
  for (const arg of ['', 'nope', '../etc', 'Add-Import', "x'; touch pwned; echo '"]) {
    const r = s('dev', arg);
    assert.equal(r.code, 1, arg);
    assert.match(r.stderr, /Changes in progress: add-import, empty-one\./, arg);
  }
});

test('extra argument or unknown mode', () => {
  assert.match(s('dev', 'add-import extra').stderr, /Too many arguments: "extra"/);
  assert.match(s('ux-design', 'add-import review').stderr, /Unknown mode "review"/);
  assert.match(s('ux-design', 'add-import conformity more').stderr, /Too many arguments/);
});

test('a project that is not framed stops every command but init', () => {
  const bare = project({ framed: false });
  for (const cmd of ['propose', 'dev', 'ux-tokens']) {
    const r = inDir(bare, () => stateOf(cmd, 'add-import'));
    assert.equal(r.code, 1, cmd);
    assert.match(r.stderr, /not framed with f3.*f3 init/);
  }
  const init = inDir(bare, () => stateOf('init'));
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /openspec\/config\.yaml: absent/);
  assert.match(init.stdout, /Git repository: true/);
  assert.match(init.stdout, /OpenSpec skills installed in the project \(\.claude\/skills\): absent/);
});

test('init marks the f3 files', () => {
  const r = inDir(framed, () => stateOf('init'));
  assert.match(r.stdout, /openspec\/config\.yaml: present \(f3 marker\)/);
  assert.match(r.stdout, /CLAUDE\.md: absent/);
});

test('unknown command', () => {
  assert.equal(stateOf('nope').code, 1);
});
