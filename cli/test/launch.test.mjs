// The launcher f3 <step> (analysis 4.2, D1, D3), f3 tool and installedTools() (D19). Each test runs f3 in
// a throwaway toolkit (the fixtures and the tools/ of the toolkit), a throwaway HOME where install.sh
// links are simulated, and a PATH whose claude and opencode record how they were called.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import { askTool, parseLaunch, toolCommand } from '../lib/launch.mjs';

const F3 = join(import.meta.dirname, '..', 'f3.mjs');
const FIXTURES = join(import.meta.dirname, 'fixtures', 'modules');
const TOOLS_DIR = join(import.meta.dirname, '..', '..', 'tools');

// A fake tool: records its arguments, F3_LAUNCH and the launch file as it finds it.
const FAKE = `#!/usr/bin/env node
const fs = require('node:fs');
const file = process.env.F3_LAUNCH;
let launch = null;
if (file && fs.existsSync(file)) launch = { content: fs.readFileSync(file, 'utf8'), mode: fs.statSync(file).mode & 0o777, dirMode: fs.statSync(require('node:path').dirname(file)).mode & 0o777 };
fs.appendFileSync(process.env.F3_TEST_RECORD, JSON.stringify({ tool: require('node:path').basename(process.argv[1]), argv: process.argv.slice(2), file, launch }) + '\\n');
process.exit(Number(process.env.F3_TEST_EXIT || 0));
`;

function setup({ installed = ['claude'], local } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'f3-launch-test-'));
  const root = join(base, 'toolkit');
  cpSync(FIXTURES, join(root, 'modules'), { recursive: true });
  cpSync(TOOLS_DIR, join(root, 'tools'), { recursive: true });
  const home = join(base, 'home');
  const dirs = { claude: join(home, '.claude'), opencode: join(home, '.config', 'opencode') };
  for (const tool of installed) {
    mkdirSync(join(dirs[tool], 'agents'), { recursive: true });
    symlinkSync(join(root, 'build', tool, 'openspec', 'agents', 'analyst.md'), join(dirs[tool], 'agents', 'analyst.md'));
  }
  const bin = join(base, 'bin');
  mkdirSync(bin);
  for (const name of ['claude', 'opencode']) {
    writeFileSync(join(bin, name), FAKE);
    chmodSync(join(bin, name), 0o755);
  }
  const project = join(base, 'project');
  mkdirSync(project);
  if (local) {
    mkdirSync(join(project, '.f3'));
    writeFileSync(join(project, '.f3', 'local'), local);
  }
  const tmp = join(base, 'tmp');
  mkdirSync(tmp);
  const record = join(base, 'record.jsonl');
  const env = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, F3_TOOLKIT_ROOT: root, F3_TEST_RECORD: record, TMPDIR: tmp };
  for (const k of ['CLAUDE_CONFIG_DIR', 'XDG_CONFIG_HOME', 'F3_LAUNCH']) delete env[k];
  const f3 = (args, options = {}) => spawnSync('node', [F3, ...args], { cwd: project, env: { ...env, ...options.env }, input: options.input ?? '', encoding: 'utf8' });
  const calls = () => (existsSync(record) ? readFileSync(record, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
  return { root, home, project, tmp, f3, calls, local: () => readFileSync(join(project, '.f3', 'local'), 'utf8') };
}

test('Claude Code: claude --agent <agent> "/f3-<step> <arguments>", with F3_LAUNCH', () => {
  const t = setup({ installed: ['claude'] });
  const r = t.f3(['dev', 'add-import']);
  assert.equal(r.status, 0, r.stderr);
  const [call] = t.calls();
  assert.equal(call.tool, 'claude');
  assert.deepEqual(call.argv, ['--agent', 'developer', '/f3-dev add-import']);
  assert.equal(JSON.parse(call.launch.content).prompt, null);
  assert.equal(call.launch.mode, 0o600);
  assert.equal(call.launch.dirMode, 0o700);
});

test('OpenCode: opencode --standalone --prompt "/f3-<step> <arguments> ", with a trailing space', () => {
  const t = setup({ installed: ['opencode'] });
  assert.equal(t.f3(['dev', 'add-import']).status, 0);
  assert.equal(t.f3(['ux-tokens']).status, 0);
  assert.deepEqual(t.calls().map((c) => c.argv), [
    ['--standalone', '--prompt', '/f3-dev add-import '],
    ['--standalone', '--prompt', '/f3-ux-tokens '],
  ]);
});

test('the only installed tool is taken and written to .f3/local', () => {
  const t = setup({ installed: ['opencode'] });
  assert.equal(t.f3(['propose']).status, 0);
  assert.equal(t.local(), 'tool=opencode\n');
  assert.equal(t.calls()[0].tool, 'opencode');
});

test('.f3/local chooses between two installed tools, and f3 tool changes it', () => {
  const t = setup({ installed: ['claude', 'opencode'], local: '# mine\ntool=opencode\n' });
  t.f3(['propose']);
  const set = t.f3(['tool', 'claude']);
  assert.equal(set.status, 0, set.stderr);
  assert.equal(t.local(), 'tool=claude\n# mine\n');
  assert.match(t.f3(['tool']).stdout, /^claude \(Claude Code\)\n$/);
  t.f3(['propose']);
  assert.deepEqual(t.calls().map((c) => c.tool), ['opencode', 'claude']);
});

test('two installed tools and no .f3/local: the question needs a terminal', () => {
  const t = setup({ installed: ['claude', 'opencode'] });
  const r = t.f3(['propose']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no tool chosen: choose it with f3 tool <claude\|opencode>/);
  assert.deepEqual(t.calls(), []);
  assert.ok(!existsSync(join(t.project, '.f3')));
});

test('the question is asked again until a valid choice', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = '';
  output.on('data', (d) => { text += d; });
  input.end('3\nopencode\n2\n');
  assert.equal(await askTool(['claude', 'opencode'], input, output), 'opencode');
  assert.equal(text, [
    'f3: Claude Code and OpenCode are both installed.',
    'Tool for this project (saved in .f3/local; change it with f3 tool <tool>):',
    '  1) Claude Code', '  2) OpenCode', 'Choice [1-2]: Choice [1-2]: Choice [1-2]: ',
  ].join('\n'));
  const ended = new PassThrough();
  ended.end('x\n');
  assert.equal(await askTool(['claude', 'opencode'], ended, new PassThrough()), null);
});

test('a tool of .f3/local that is not installed, an unknown tool, or no tool installed: nothing is launched', () => {
  const t = setup({ installed: ['claude'], local: 'tool=opencode\n' });
  assert.match(t.f3(['propose']).stderr, /names OpenCode, for which f3 is not installed: run install\.sh opencode/);
  writeFileSync(join(t.project, '.f3', 'local'), 'tool=vim\n');
  assert.match(t.f3(['propose']).stderr, /unknown tool "vim"/);
  assert.match(t.f3(['tool', 'vim']).stderr, /unknown tool "vim"/);
  const none = setup({ installed: [] });
  assert.match(none.f3(['propose']).stderr, /f3 is installed for no tool: run install\.sh/);
  assert.deepEqual([...t.calls(), ...none.calls()], []);
});

test('f3 tool for a tool that is not installed sets it, with a warning', () => {
  const t = setup({ installed: ['claude'] });
  const r = t.f3(['tool', 'opencode']);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /f3 is not installed for OpenCode: run install\.sh opencode/);
  assert.equal(t.local(), 'tool=opencode\n');
});

// The prompts of analysis 4.2: none of them may change the step, its arguments or the tool, nor reach
// a command line.
const PROMPTS = [
  ['--', 'then', '--', 'more'],
  ['--tool', 'opencode'],
  ['other-change'],
  ["l'apostrophe", "'; touch pwned; echo '"],
  ['line one\nline two'],
  ['$(touch pwned)', '`touch pwned`'],
];

test('a prompt after "--" leaves the arguments and the tool unchanged and appears in no command line', () => {
  for (const tool of ['claude', 'opencode']) {
    const t = setup({ installed: [tool] });
    for (const words of PROMPTS) {
      const r = t.f3(['dev', 'add-import', '--', ...words]);
      assert.equal(r.status, 0, r.stderr);
    }
    const calls = t.calls();
    assert.equal(calls.length, PROMPTS.length);
    calls.forEach((call, i) => {
      const text = PROMPTS[i].join(' ');
      assert.equal(call.tool, tool);
      assert.deepEqual(call.argv, toolCommand(tool, 'developer', 'dev', ['add-import']).argv);
      assert.ok(!call.argv.join('\n').includes(text), text);
      assert.deepEqual(JSON.parse(call.launch.content), { idea: null, prompt: text });
    });
    assert.ok(!existsSync(join(t.project, 'pwned')));
  }
});

test('the launch file is removed when the tool ends, whatever its exit code, which f3 returns', () => {
  const t = setup();
  const r = t.f3(['dev', 'add-import', '--', 'note'], { env: { F3_TEST_EXIT: '3' } });
  assert.equal(r.status, 3);
  assert.deepEqual(readdirSync(t.tmp), []);
});

test('"--" with no text after it is refused', () => {
  const t = setup();
  for (const args of [['dev', 'add-import', '--'], ['dev', 'add-import', '--', ' ', '']]) {
    const r = t.f3(args);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /"--" with no text after it/);
  }
  assert.deepEqual(t.calls(), []);
});

test('an argument that is not an identifier is refused', () => {
  const t = setup();
  for (const arg of ['Add-Import', '../etc', "x'; touch pwned; echo '", 'a b', '']) {
    const r = t.f3(['dev', arg]);
    assert.equal(r.status, 1, arg);
    assert.match(r.stderr, /is not an identifier/, arg);
  }
  assert.deepEqual(t.calls(), []);
});

test('an option before "--" is an argument like any other: it does not change the tool', () => {
  const t = setup({ installed: ['claude', 'opencode'], local: 'tool=claude\n' });
  assert.equal(t.f3(['dev', '--tool', 'opencode']).status, 0);
  assert.deepEqual(t.calls().map((c) => [c.tool, c.argv]), [['claude', ['--agent', 'developer', '/f3-dev --tool opencode']]]);
});

test('f3 propose: a single identifier is an argument, other words are the idea, sent through the file', () => {
  assert.deepEqual(parseLaunch('propose', ['add-import']), { args: ['add-import'], idea: null, prompt: null });
  assert.deepEqual(parseLaunch('propose', ['invoice', 'export']), { args: [], idea: 'invoice export', prompt: null });
  assert.deepEqual(parseLaunch('propose', ["l'export", '--', 'in', 'French']), { args: [], idea: "l'export", prompt: 'in French' });
  assert.deepEqual(parseLaunch('propose', []), { args: [], idea: null, prompt: null });
  assert.throws(() => parseLaunch('dev', ['invoice', 'Export']), /"Export" is not an identifier/);
  const t = setup();
  assert.equal(t.f3(['propose', 'export', "d'une", 'facture']).status, 0);
  const [call] = t.calls();
  assert.deepEqual(call.argv, ['--agent', 'analyst', '/f3-propose']);
  assert.deepEqual(JSON.parse(call.launch.content), { idea: "export d'une facture", prompt: null });
});

test('the tool is rendered before the launch; a failed render launches nothing', () => {
  const t = setup();
  assert.equal(t.f3(['dev', 'add-import']).status, 0);
  assert.ok(existsSync(join(t.root, 'build', 'claude', 'openspec', 'agents', 'analyst.md')));
  assert.ok(!existsSync(join(t.root, 'build', 'opencode')));
  writeFileSync(join(t.root, 'modules', 'ux', 'agents', 'ux.md'), '---\ndescription: "ux"\nmode: primary\n---\n{{NOPE}}\n');
  const r = t.f3(['dev', 'add-import']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^f3: the render of Claude Code failed, so Claude Code is not started: "\{\{" left in the render of claude/);
  assert.equal(t.calls().length, 1);
  assert.deepEqual(readdirSync(t.tmp), []);
});

test('installedTools: f3 is installed for a tool whose agents folder links into the toolkit', async () => {
  const t = setup({ installed: ['opencode'] });
  mkdirSync(join(t.home, '.claude', 'agents'), { recursive: true });
  symlinkSync('/elsewhere/analyst.md', join(t.home, '.claude', 'agents', 'analyst.md'));
  writeFileSync(join(t.home, '.claude', 'agents', 'mine.md'), 'x');
  const r = spawnSync('node', ['--input-type=module', '-e', `import { installedTools } from ${JSON.stringify(join(import.meta.dirname, '..', 'lib', 'toolkit.mjs'))}; console.log(installedTools().join(','));`], {
    env: { ...process.env, HOME: t.home, F3_TOOLKIT_ROOT: t.root, CLAUDE_CONFIG_DIR: '', XDG_CONFIG_HOME: '' }, encoding: 'utf8',
  });
  assert.equal(r.stdout, 'opencode\n', r.stderr);
});

test('tool and render are reserved: no step may take their names', () => {
  const t = setup();
  assert.match(t.f3(['help']).stdout, /f3 tool \[claude\|opencode\]/);
  assert.equal(t.f3(['tool', 'claude', 'opencode']).status, 1);
});
