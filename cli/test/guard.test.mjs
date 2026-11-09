import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

// The toolkit reads the test fixtures, not the real sources: set before it is loaded, inherited by f3.
process.env.F3_TOOLKIT_ROOT = join(import.meta.dirname, 'fixtures');
const { promptVerdict } = await import('../lib/guard.mjs');
const { RESERVED, commands, parseFrontmatter } = await import('../lib/toolkit.mjs');

const F3 = join(import.meta.dirname, '..', 'f3.mjs');
const root = mkdtempSync(join(tmpdir(), 'f3-guard-'));
// Claude Code gives its hooks the project folder in CLAUDE_PROJECT_DIR.
const run = (args, input, env = { CLAUDE_PROJECT_DIR: root }) => spawnSync('node', [F3, ...args], { input, encoding: 'utf8', cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: undefined, ...env } });

test('f3 guard denies with exit code 2 and the reason on stderr', () => {
  const r = run(['guard', 'analyst'], JSON.stringify({ tool_name: 'Write', tool_input: { file_path: 'src/a.js' }, cwd: root }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /analyst may not edit src\/a\.js/);
});

test('f3 guard gives no decision for a permitted call', () => {
  const r = run(['guard', 'analyst'], JSON.stringify({ tool_name: 'Write', tool_input: { file_path: 'openspec/changes/a/proposal.md' }, cwd: root }));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('f3 guard answers "ask" in JSON', () => {
  const r = run(['guard', 'ux'], JSON.stringify({ tool_name: 'Write', tool_input: { file_path: 'ux/brief.md' }, cwd: root }));
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
});

test('f3 guard fails closed: unreadable input, unknown agent', () => {
  for (const [args, input] of [[['guard', 'analyst'], 'not json'], [['guard', 'nobody'], '{"tool_name":"Read","tool_input":{}}'], [['guard'], '{}']]) {
    const r = run(args, input);
    assert.equal(r.status, 2, `${args} ${input}`);
    assert.match(r.stderr, /f3 guard failed: .* the call is refused/);
  }
});

test('f3 guard reads the rules against the project folder, not the current folder of the session (E9)', () => {
  mkdirSync(join(root, 'tests', 'e2e'), { recursive: true });
  mkdirSync(join(root, 'openspec', 'changes', 'a'), { recursive: true });
  const write = (agent, path, cwd) => run(['guard', agent], JSON.stringify({ tool_name: 'Write', tool_input: { file_path: path }, cwd }));
  // After a cd into a subfolder, the developer still may not edit the end-to-end tests nor the specs.
  for (const cwd of [join(root, 'tests'), join(root, 'openspec', 'changes', 'a')]) {
    const r = write('developer', join(root, 'tests', 'e2e', 'steps.js'), cwd);
    assert.equal(r.status, 2, cwd);
    assert.match(r.stderr, /developer may not edit tests\/e2e\/steps\.js/);
    assert.equal(write('developer', join(root, 'openspec', 'changes', 'a', 'proposal.md'), cwd).status, 2, cwd);
  }
  // And the analyst may still write in the change, by an absolute path or one relative to the current folder.
  const change = join(root, 'openspec', 'changes', 'a');
  assert.equal(write('analyst', join(change, 'proposal.md'), change).status, 0);
  assert.equal(write('analyst', 'proposal.md', change).status, 0);
  assert.equal(write('analyst', 'src/a.js', join(root, 'tests')).status, 2);
});

test('f3 guard resolves the paths of a shell search against the current folder', () => {
  mkdirSync(join(root, 'tests'), { recursive: true });
  const search = (command, cwd) => run(['guard', 'tester'], JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd }));
  assert.equal(search('grep -r x e2e', join(root, 'tests')).status, 0);
  const r = search('grep -r x ../src', join(root, 'tests'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not in src/);
});

test('f3 guard refuses every call without CLAUDE_PROJECT_DIR', () => {
  const r = run(['guard', 'analyst'], JSON.stringify({ tool_name: 'Write', tool_input: { file_path: 'openspec/changes/a/proposal.md' }, cwd: root }), {});
  assert.equal(r.status, 2);
  assert.match(r.stderr, /f3 guard failed: CLAUDE_PROJECT_DIR is not set — the call is refused/);
});

test('f3 guard-prompt blocks an f3 command typed under another agent, with the command to run', () => {
  const r = run(['guard-prompt'], JSON.stringify({ prompt: '/f3-propose invoice export' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /\/f3-propose runs as the analyst agent.*f3 propose invoice export/s);
});

test('f3 guard-prompt lets through the right agent, other prompts, and its own errors', () => {
  assert.equal(run(['guard-prompt'], JSON.stringify({ prompt: '/f3-propose x', agent_type: 'analyst' })).status, 0);
  assert.equal(run(['guard-prompt'], JSON.stringify({ prompt: 'hello' })).status, 0);
  assert.equal(run(['guard-prompt'], JSON.stringify({ prompt: '/f3-unknown x' })).status, 0);
  assert.equal(run(['guard-prompt'], 'not json').status, 0);
});

test('every command declares its agent, and none uses a reserved name', () => {
  const table = commands();
  assert.equal(Object.keys(table).length, 12);
  for (const [step, c] of Object.entries(table)) {
    assert.ok(['analyst', 'architect', 'developer', 'tester', 'ux'].includes(c.agent), step);
    assert.ok(!RESERVED.includes(step), step);
  }
  assert.equal(promptVerdict('/f3-dev x', 'developer', table), null);
  assert.match(promptVerdict('/f3-dev x', 'analyst', table), /runs as the developer agent/);
});

test('frontmatter parser: scalars, nested tables, quoted keys, lists skipped', () => {
  const fm = parseFrontmatter('---\nname: a\ndescription: "x: y"\nf3-permission:\n  edit:\n    "*": deny\n    "a/*": allow\n  bash: deny\nhooks:\n  PreToolUse:\n    - matcher: "Edit"\n      hooks:\n        - type: command\nafter: z\n---\nbody');
  assert.deepEqual(fm['f3-permission'], { edit: { '*': 'deny', 'a/*': 'allow' }, bash: 'deny' });
  assert.equal(fm.description, 'x: y');
  assert.equal(fm.after, 'z');
});
