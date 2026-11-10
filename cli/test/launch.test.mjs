// The launcher f3 <step> (analysis 4.2, D1, D3), f3 tool and installedTools() (D19). Each test runs f3 in
// a throwaway toolkit (the fixtures and the tools/ of the toolkit), a throwaway HOME where install.sh
// links are simulated, and a PATH whose claude and opencode record how they were called.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { constants } from 'node:os';
import { PassThrough } from 'node:stream';
import { askTool, parseLaunch, toolCommand } from '../lib/launch.mjs';
import { tempDir } from './tmp.mjs';

const F3 = join(import.meta.dirname, '..', 'f3.mjs');
const FIXTURES = join(import.meta.dirname, 'fixtures', 'modules');
const TOOLS_DIR = join(import.meta.dirname, '..', '..', 'tools');

// A fake tool: records its arguments, F3_LAUNCH and the launch file as it finds it. As opencode serve, it
// is a fake OpenCode server: it prints its address and password, answers the API, records the session
// and the command it receives, and runs the injection of the command itself (D45). As opencode --server,
// it is the TUI.
const FAKE = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const tool = path.basename(process.argv[1]);
const argv = process.argv.slice(2);
const append = (entry) => fs.appendFileSync(process.env.F3_TEST_RECORD, JSON.stringify(entry) + '\\n');
// What the launched command finds: the launch file, and the injection f3 state, which inherits F3_LAUNCH.
function launched() {
  const file = process.env.F3_LAUNCH;
  let launch = null;
  if (file && fs.existsSync(file)) launch = { content: fs.readFileSync(file, 'utf8'), mode: fs.statSync(file).mode & 0o777, dirMode: fs.statSync(path.dirname(file)).mode & 0o777 };
  const state = process.env.F3_TEST_STATE ? require('node:child_process').spawnSync('node', [process.env.F3_TEST_F3, 'state', ...process.env.F3_TEST_STATE.split(' ')], { encoding: 'utf8' }) : null;
  return { file, launch, mark: process.env.F3_TEST_MARK ?? null, state: state && { status: state.status, stdout: state.stdout, stderr: state.stderr } };
}
if (tool === 'opencode' && argv[0] === 'serve') {
  if (process.env.F3_TEST_SERVE_FAIL) { console.error('cannot listen'); process.exit(2); }
  const password = 'pw-' + process.pid;
  const record = { tool, argv, serverPid: process.pid, serverHasPassword: 'OPENCODE_SERVER_PASSWORD' in process.env };
  const server = require('node:http').createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const request = { path: req.url, auth: req.headers.authorization, body: JSON.parse(body || 'null') };
      if (req.method === 'POST' && req.url === '/api/session') {
        record.session = request;
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ data: { id: 'ses_test' } }));
      }
      if (req.method === 'POST' && req.url === '/api/session/ses_test/command') {
        const status = Number(process.env.F3_TEST_COMMAND_STATUS || 204);
        append({ ...record, command: request, ...launched() });
        res.writeHead(status);
        return res.end(status === 204 ? '' : 'refused');
      }
      res.writeHead(404);
      res.end();
    });
  });
  server.listen(0, '127.0.0.1', () => {
    console.log('server listening on http://127.0.0.1:' + server.address().port);
    console.log('server password ' + password);
  });
  process.on('SIGTERM', () => { append({ tool: 'opencode-server-stopped', serverPid: process.pid }); process.exit(0); });
} else if (tool === 'opencode') {
  append({ tool: 'opencode-tui', argv, password: process.env.OPENCODE_SERVER_PASSWORD, f3Launch: process.env.F3_LAUNCH ?? null });
  process.exit(Number(process.env.F3_TEST_EXIT || 0));
} else {
  append({ tool, argv, ...launched() });
  // F3_TEST_WAIT: the session goes on until a signal ends it.
  if (process.env.F3_TEST_WAIT) setInterval(() => {}, 1000);
  else process.exit(Number(process.env.F3_TEST_EXIT || 0));
}
`;

function setup({ installed = ['claude'], local } = {}) {
  const base = tempDir('f3-launch-test-');
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
  const env = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, F3_TOOLKIT_ROOT: root, F3_TEST_RECORD: record, F3_TEST_F3: F3, TMPDIR: tmp };
  for (const k of ['CLAUDE_CONFIG_DIR', 'XDG_CONFIG_HOME', 'F3_LAUNCH']) delete env[k];
  const f3 = (args, options = {}) => spawnSync('node', [F3, ...args], { cwd: project, env: { ...env, ...options.env }, input: options.input ?? '', encoding: 'utf8' });
  const calls = () => (existsSync(record) ? readFileSync(record, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
  // The launches: one record per session, without the records of the TUI and of the stopped server of OpenCode.
  const launches = () => calls().filter((c) => !c.tool.startsWith('opencode-'));
  return { root, home, project, tmp, env, f3, calls, launches, local: () => readFileSync(join(project, '.f3', 'local'), 'utf8') };
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

test('Claude Code: a signal to f3 goes to the session, and the launch folder is removed when it ends', async () => {
  const t = setup({ installed: ['claude'] });
  const f3 = spawn('node', [F3, 'dev', 'add-import', '--', 'note'], { cwd: t.project, env: { ...t.env, F3_TEST_WAIT: '1' }, stdio: 'ignore' });
  const ended = new Promise((resolve) => f3.once('exit', (code) => resolve(code)));
  for (let i = 0; i < 200 && !t.calls().length; i++) await new Promise((r) => setTimeout(r, 25));
  assert.equal(t.calls().length, 1, 'the session did not start');
  f3.kill('SIGTERM');
  assert.equal(await ended, 128 + constants.signals.SIGTERM);
  assert.deepEqual(readdirSync(t.tmp).filter((n) => n.startsWith('f3-launch-')), []);
});

test('Claude Code: the session gets the environment given to launch()', () => {
  const t = setup({ installed: ['claude'], local: 'tool=claude\n' });
  const LAUNCH = join(import.meta.dirname, '..', 'lib', 'launch.mjs');
  const code = `import { launch } from ${JSON.stringify(LAUNCH)}; process.exitCode = await launch('dev', 'developer', ['add-import'], { render() {}, env: { ...process.env, F3_TEST_MARK: 'given' } });`;
  const r = spawnSync('node', ['--input-type=module', '-e', code], { cwd: t.project, env: t.env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(t.calls()[0].mark, 'given');
});

test('OpenCode: a private server, a session created as the agent with its command, then the TUI on it (D45)', () => {
  const t = setup({ installed: ['opencode'] });
  assert.equal(t.f3(['dev', 'add-import']).status, 0);
  assert.equal(t.f3(['ux-tokens']).status, 0);
  const calls = t.calls();
  assert.deepEqual(calls.map((c) => c.tool), [
    'opencode', 'opencode-tui', 'opencode-server-stopped', 'opencode', 'opencode-tui', 'opencode-server-stopped',
  ]);
  const [server, tui, stopped] = calls;
  assert.deepEqual(server.argv, ['serve', '--hostname', '127.0.0.1', '--port', '0']);
  assert.deepEqual(server.session.body, { agent: 'developer', location: { directory: realpathSync(t.project) } });
  assert.deepEqual(server.command.body, { name: 'f3-dev', text: 'add-import' });
  assert.deepEqual(calls[3].command.body, { name: 'f3-ux-tokens', text: '' });
  const auth = `Basic ${Buffer.from(`opencode:pw-${server.serverPid}`).toString('base64')}`;
  assert.equal(server.session.auth, auth);
  assert.equal(server.command.auth, auth);
  assert.match(tui.argv.join(' '), /^--server http:\/\/127\.0\.0\.1:\d+ --session ses_test$/);
  // The password of the server is given to the TUI only; F3_LAUNCH to the server only.
  assert.equal(server.serverHasPassword, false);
  assert.equal(tui.password, `pw-${server.serverPid}`);
  assert.equal(tui.f3Launch, null);
  assert.ok(server.file);
  assert.equal(stopped.serverPid, server.serverPid);
});

test('OpenCode: a password of the environment does not reach the server', () => {
  const t = setup({ installed: ['opencode'] });
  assert.equal(t.f3(['dev', 'add-import'], { env: { OPENCODE_SERVER_PASSWORD: 'mine' } }).status, 0);
  const [server, tui] = t.calls();
  assert.equal(server.serverHasPassword, false);
  assert.equal(tui.password, `pw-${server.serverPid}`);
});

test('OpenCode: a server that does not start, or a refused command, opens no TUI and leaves nothing', () => {
  const t = setup({ installed: ['opencode'] });
  const failed = t.f3(['dev', 'add-import', '--', 'note'], { env: { F3_TEST_SERVE_FAIL: '1' } });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /^f3: the OpenCode server ended \(code 2\) before it was ready:\ncannot listen/);
  const refused = t.f3(['dev', 'add-import', '--', 'note'], { env: { F3_TEST_COMMAND_STATUS: '400' } });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /^f3: the OpenCode server refused \/api\/session\/ses_test\/command \(400\): refused/);
  assert.deepEqual(t.calls().map((c) => c.tool), ['opencode', 'opencode-server-stopped']);
  assert.deepEqual(readdirSync(t.tmp), []);
});

test('OpenCode: f3 returns the exit code of the TUI, after stopping the server and removing the launch file', () => {
  const t = setup({ installed: ['opencode'] });
  assert.equal(t.f3(['dev', 'add-import', '--', 'note'], { env: { F3_TEST_EXIT: '3' } }).status, 3);
  assert.equal(t.calls().at(-1).tool, 'opencode-server-stopped');
  assert.deepEqual(readdirSync(t.tmp), []);
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
  assert.deepEqual(t.launches().map((c) => c.tool), ['opencode', 'claude']);
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
    const calls = t.launches();
    assert.equal(calls.length, PROMPTS.length);
    calls.forEach((call, i) => {
      const text = PROMPTS[i].join(' ');
      assert.equal(call.tool, tool);
      assert.deepEqual(call.argv, toolCommand(tool, 'developer', 'dev', ['add-import']).argv);
      assert.ok(!call.argv.join('\n').includes(text), text);
      if (tool === 'opencode') {
        assert.deepEqual(call.command.body, { name: 'f3-dev', text: 'add-import' });
        assert.ok(!JSON.stringify(call.session.body).includes(text), text);
      }
      assert.deepEqual(JSON.parse(call.launch.content), { idea: null, prompt: text });
    });
    assert.ok(!existsSync(join(t.project, 'pwned')));
  }
});

test('the injection of the launched command gets the note of the user from f3 state, last', () => {
  for (const tool of ['claude', 'opencode']) {
    const t = setup({ installed: [tool] });
    mkdirSync(join(t.project, 'openspec', 'changes', 'add-import'), { recursive: true });
    writeFileSync(join(t.project, 'openspec', 'config.yaml'), 'schema: f3\n');
    const r = t.f3(['dev', 'add-import', '--', "reprends à la 2.3, l'autre", 'est faite'], { env: { F3_TEST_STATE: 'dev add-import' } });
    assert.equal(r.status, 0, r.stderr);
    const [{ state }] = t.launches();
    assert.equal(state.status, 0, state.stderr);
    assert.match(state.stdout, /\n\nNote from the user:\n\nreprends à la 2\.3, l'autre est faite\n$/);
    assert.doesNotMatch(state.stdout, /Warning: the toolkit had changed|Not started by f3/);
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

test('an option before "--" is refused under every step, and changes no tool (D43)', () => {
  const t = setup({ installed: ['claude', 'opencode'], local: 'tool=claude\n' });
  for (const words of [['dev', '--tool', 'opencode'], ['init', '--help'], ['propose', '-h'], ['propose', 'export', '--x']]) {
    const r = t.f3(words);
    assert.equal(r.status, 1, words.join(' '));
    assert.match(r.stderr, /is an option, and f3 \w+ takes none/, words.join(' '));
  }
  assert.equal(t.f3(['dev', 'add-import', '--', '--tool', 'opencode']).status, 0);
  assert.deepEqual(t.calls().map((c) => [c.tool, c.argv]), [['claude', ['--agent', 'developer', '/f3-dev add-import']]]);
});

test('a step is not started from a session that f3 started (D43)', () => {
  const t = setup();
  const r = t.f3(['init'], { env: { F3_LAUNCH: '/tmp/f3-launch-x/launch.json' } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /f3 init is not started from a session that f3 started: run it in a terminal/);
  assert.deepEqual(t.calls(), []);
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
