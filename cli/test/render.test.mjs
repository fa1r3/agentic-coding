import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync,
  statSync, symlinkSync, utimesSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { TOOLS, fingerprint, render, renderFiles, renderView } from '../lib/render.mjs';
import { tempDir } from './tmp.mjs';

const F3 = join(import.meta.dirname, '..', 'f3.mjs');
const FIXTURES = join(import.meta.dirname, 'fixtures', 'modules');
const TOOLS_DIR = join(import.meta.dirname, '..', '..', 'tools');
const RENDER_DIR = /^(claude|opencode)\.[0-9a-f]{64}\.[0-9]+$/;

// A toolkit of its own for each test: the agents and commands of the fixtures, the tools/ of the
// toolkit, plus a skill.
function toolkit() {
  const root = tempDir('f3-render-');
  cpSync(FIXTURES, join(root, 'modules'), { recursive: true });
  cpSync(TOOLS_DIR, join(root, 'tools'), { recursive: true });
  mkdirSync(join(root, 'modules', 'ux', 'skills', 'ux-practice'), { recursive: true });
  writeFileSync(join(root, 'modules', 'ux', 'skills', 'ux-practice', 'SKILL.md'), '# ux-practice\n');
  return root;
}
const build = (root) => join(root, 'build');
const entries = (root) => readdirSync(build(root)).sort();
const target = (root, tool) => readlinkSync(join(build(root), tool));
const name = (tool, hash, pid = process.pid) => `${tool}.${hash}.${pid}`;
// Replaces the source of the ux agent, keeping a valid frontmatter; text is its body.
const change = (root, text = 'changed\n') => writeFileSync(join(root, 'modules', 'ux', 'agents', 'ux.md'), `---\ndescription: "ux"\nmode: primary\n---\n${text}`);
const body = (content) => content.slice(content.lastIndexOf('\n---\n') + 5);
const source = (root, path, text) => writeFileSync(join(root, 'modules', path), text);
const pointAt = (root, tool, dirName) => {
  const next = join(build(root), 'next-link');
  symlinkSync(dirName, next);
  renameSync(next, join(build(root), tool));
};
// The pid of a process that has ended, and one of a process still running.
const endedPid = () => spawnSync('true').pid;
const runningProcess = () => spawn('sleep', ['30'], { stdio: 'ignore' });

test('the render holds the agents and commands, and not the permission tables', () => {
  const root = toolkit();
  for (const tool of TOOLS) {
    const files = renderFiles(tool, root);
    assert.equal(files.length, 17);
    for (const { path } of files) assert.match(path, /^(openspec|ux)\/(agents|commands)\/[a-z0-9-]+\.md$/);
  }
});

test('an agent is assembled from its frontmatter, its permission table and the head of the tool', () => {
  const root = toolkit();
  source(root, 'ux/agents/ux.md', '---\ndescription: "d"\nmode: all\ndeny-tools: bash penpot\n---\n\nBody {{GENERAL}}.\n');
  source(root, 'ux/agents/ux.permission', 'edit:\n  "*": ask\n');
  const agent = (tool) => renderFiles(tool, root).find((f) => f.path === 'ux/agents/ux.md').content;
  assert.equal(agent('claude'), [
    '---', 'name: ux', 'description: "d"', 'disallowedTools: Bash, mcp__penpot__*', 'f3-permission:', '  edit:', '    "*": ask',
    'hooks:', '  PreToolUse:', '    - matcher: "Edit|Write|MultiEdit|NotebookEdit|Read|Grep|Glob|Bash|Agent"', '      hooks:',
    '        - type: command', `          command: '"$HOME/.local/bin/f3" guard ux || exit 2'`, '---', '', 'Body general-purpose.', '',
  ].join('\n'));
  assert.equal(agent('opencode'), [
    '---', 'description: "d"', 'mode: all', 'permission:', '  edit:', '    "*": ask', '  bash: deny', '  penpot_*: deny', '---',
    '', 'Body general.', '',
  ].join('\n'));
});

test('an agent without refused tools gets no line for them', () => {
  const root = toolkit();
  source(root, 'ux/agents/ux.md', '---\ndescription: "d"\nmode: primary\n---\nBody\n');
  const agent = (tool) => renderFiles(tool, root).find((f) => f.path === 'ux/agents/ux.md').content;
  assert.doesNotMatch(agent('claude'), /disallowedTools/);
  assert.match(agent('opencode'), /^---\ndescription: "d"\nmode: primary\npermission:\n  edit: ask\n---\nBody\n$/);
});

test('a command is assembled from its frontmatter and the head of the tool, keys renamed or left out', () => {
  const root = toolkit();
  source(root, 'ux/commands/f3-ux-tokens.md', '---\ndescription: "c"\nargument-hint: "<x>"\nagent: ux\n---\n\nBody "{{ARG1}}".\n');
  const command = (tool) => renderFiles(tool, root).find((f) => f.path === 'ux/commands/f3-ux-tokens.md').content;
  assert.equal(command('claude'), '---\ndescription: "c"\nargument-hint: "<x>"\nf3-agent: ux\ndisable-model-invocation: true\nallowed-tools: Bash(f3 state:*)\n---\n\nBody "$0".\n');
  assert.equal(command('opencode'), '---\ndescription: "c"\nagent: ux\n---\n\nBody "$1".\n');
});

test('a source without frontmatter, with an unreadable frontmatter line or without permission table fails the render', () => {
  const root = toolkit();
  source(root, 'ux/commands/f3-ux-tokens.md', 'no frontmatter\n');
  assert.throws(() => renderFiles('claude', root), /ux\/commands\/f3-ux-tokens\.md: no frontmatter/);
  source(root, 'ux/commands/f3-ux-tokens.md', '---\ndescription: "c"\npermission:\n  edit: ask\n---\n');
  assert.throws(() => renderFiles('claude', root), /f3-ux-tokens\.md: unreadable frontmatter line: permission:/);
  source(root, 'ux/commands/f3-ux-tokens.md', '---\ndescription: "c"\nagent: ux\n---\n');
  rmSync(join(root, 'modules', 'ux', 'agents', 'ux.permission'));
  assert.throws(() => renderFiles('opencode', root), /ux\/agents\/ux\.md: no permission table ux\.permission/);
});

test('render writes build/<tool>.<fingerprint>.<pid>/ and points the link build/<tool> at it', () => {
  const root = toolkit();
  const r = render('claude', { root });
  assert.equal(r.fingerprint, fingerprint(renderFiles('claude', root)));
  assert.ok(r.written && r.switched);
  assert.equal(r.rounds, 1);
  assert.ok(lstatSync(join(build(root), 'claude')).isSymbolicLink());
  assert.equal(target(root, 'claude'), name('claude', r.fingerprint));
  assert.equal(readFileSync(join(build(root), 'claude', 'ux', 'agents', 'ux.md'), 'utf8'),
    renderFiles('claude', root).find((f) => f.path === 'ux/agents/ux.md').content);
  assert.deepEqual(entries(root), ['claude', name('claude', r.fingerprint)]);
});

test('a second render of the same content writes nothing and keeps the link', () => {
  const root = toolkit();
  const first = render('opencode', { root });
  const before = statSync(join(first.dir, 'openspec', 'agents', 'analyst.md')).mtimeMs;
  const second = render('opencode', { root });
  assert.equal(second.dir, first.dir);
  assert.ok(!second.written && !second.switched);
  assert.equal(statSync(join(first.dir, 'openspec', 'agents', 'analyst.md')).mtimeMs, before);
});

test('the target is reused even when its creator has ended', () => {
  const root = toolkit();
  const first = render('claude', { root });
  const theirs = name('claude', first.fingerprint, endedPid());
  renameSync(first.dir, join(build(root), theirs));
  pointAt(root, 'claude', theirs);
  const again = render('claude', { root });
  assert.ok(!again.written && !again.switched);
  assert.equal(target(root, 'claude'), theirs);
  assert.ok(existsSync(join(build(root), theirs)));
});

test('a directory of the same fingerprint that is not the target is not reused', () => {
  // Reusing it could race with a cleanup that removes it: only its creator may switch to it.
  const root = toolkit();
  const first = render('claude', { root });
  const theirs = name('claude', first.fingerprint, endedPid());
  renameSync(first.dir, join(build(root), theirs));
  rmSync(join(build(root), 'claude'));
  const again = render('claude', { root });
  assert.ok(again.written && again.switched);
  assert.equal(target(root, 'claude'), name('claude', first.fingerprint));
  assert.ok(!existsSync(join(build(root), theirs)));
});

test('the variables of each tool are substituted in the agents and commands', () => {
  const root = toolkit();
  change(root, 'Delegate to `{{GENERAL}}` through {{SUBAGENT_TOOL}}: change "{{ARG1}}", mode "{{ARG2}}"; {{EXPLORE}}.\n');
  const text = (tool) => renderFiles(tool, root).find((f) => f.path === 'ux/agents/ux.md').content;
  assert.equal(body(text('claude')), 'Delegate to `general-purpose` through the Agent tool: change "$0", mode "$1"; Explore.\n');
  assert.equal(body(text('opencode')), 'Delegate to `general` through the subagent tool: change "$1", mode "$2"; explore.\n');
});

test('a variable a tool does not define is left, and fails the render', () => {
  const root = toolkit();
  writeFileSync(join(root, 'tools', 'opencode', 'vars'), '# no GENERAL here\nEXPLORE=explore\n');
  change(root, 'Use {{GENERAL}} and {{EXPLORE}}.\n');
  assert.throws(() => renderFiles('opencode', root), /"\{\{" left in the render of opencode: ux\/agents\/ux\.md/);
  writeFileSync(join(root, 'tools', 'opencode', 'vars'), 'GENERAL general\n');
  assert.throws(() => renderFiles('opencode', root), /unreadable line 1 of tools\/opencode\/vars/);
});

test('the fingerprint covers the paths as well as the contents', () => {
  const files = [{ path: 'm/agents/a.md', content: 'x' }];
  assert.notEqual(fingerprint(files), fingerprint([{ path: 'm/agents/b.md', content: 'x' }]));
  assert.notEqual(fingerprint(files), fingerprint([{ path: 'm/agents/a.md', content: 'y' }]));
  assert.notEqual(fingerprint([{ path: 'ab', content: 'c' }]), fingerprint([{ path: 'a', content: 'bc' }]));
});

test('a changed source gives a new directory, switches the link and removes the old directory', () => {
  const root = toolkit();
  const first = render('claude', { root });
  change(root);
  const second = render('claude', { root });
  assert.notEqual(second.fingerprint, first.fingerprint);
  assert.ok(second.switched);
  assert.equal(target(root, 'claude'), name('claude', second.fingerprint));
  assert.ok(!existsSync(first.dir));
  assert.deepEqual(entries(root), ['claude', name('claude', second.fingerprint)]);
});

test('a renamed or removed source changes the render', () => {
  const root = toolkit();
  const first = render('claude', { root });
  renameSync(join(root, 'modules', 'ux', 'commands', 'f3-ux-tokens.md'), join(root, 'modules', 'ux', 'commands', 'f3-ux-palette.md'));
  const second = render('claude', { root });
  assert.notEqual(second.fingerprint, first.fingerprint);
  assert.ok(existsSync(join(build(root), 'claude', 'ux', 'commands', 'f3-ux-palette.md')));
  assert.ok(!existsSync(join(build(root), 'claude', 'ux', 'commands', 'f3-ux-tokens.md')));
});

test('"{{" left in the render fails it, before any write or switch', () => {
  const root = toolkit();
  const first = render('claude', { root });
  writeFileSync(join(root, 'modules', 'openspec', 'commands', 'f3-dev.md'), '---\ndescription: "d"\nagent: developer\n---\nUse {{UNKNOWN}}.\n');
  assert.throws(() => render('claude', { root }), /"\{\{" left in the render of claude: openspec\/commands\/f3-dev\.md/);
  assert.equal(target(root, 'claude'), name('claude', first.fingerprint));
  assert.deepEqual(entries(root), ['claude', name('claude', first.fingerprint)]);
  assert.throws(() => renderView('claude', join(root, 'view'), { root }), /"\{\{" left/);
  assert.ok(!existsSync(join(root, 'view')));
});

test('a failed write switches nothing and leaves no temporary directory', () => {
  const root = toolkit();
  const first = render('claude', { root });
  change(root);
  // A read-only build/: the temporary directory of the new render cannot be written.
  spawnSync('chmod', ['a-w', build(root)]);
  try {
    assert.throws(() => render('claude', { root }), /read-only and its render is out of date; run install\.sh/);
  } finally {
    spawnSync('chmod', ['u+w', build(root)]);
  }
  assert.equal(target(root, 'claude'), name('claude', first.fingerprint));
  assert.deepEqual(entries(root), ['claude', name('claude', first.fingerprint)]);
});

test('a read-only toolkit works while its render is up to date', () => {
  const root = toolkit();
  const first = render('claude', { root });
  spawnSync('chmod', ['a-w', build(root)]);
  try {
    assert.equal(render('claude', { root }).dir, first.dir);
  } finally {
    spawnSync('chmod', ['u+w', build(root)]);
  }
});

test('the cleanup removes only the entries of ended processes, whatever their age, and never the target', () => {
  const root = toolkit();
  const other = render('opencode', { root });
  render('claude', { root });
  const b = build(root);
  const sleeper = runningProcess();
  try {
    const live = sleeper.pid;
    const ended = endedPid();
    // A render of a running process between its rename and its switch, and its temporaries.
    const pending = name('claude', '1'.repeat(64), live);
    for (const dir of [pending, name('claude', '2'.repeat(64), ended), `.tmp.${live}`, `.tmp.${ended}`]) mkdirSync(join(b, dir));
    symlinkSync('nowhere', join(b, `.tmp.${ended}.link`));
    mkdirSync(join(b, 'claude.notarender'));
    // Age plays no part: a recent entry of an ended process goes, an old one of a running process stays.
    const twoHoursAgo = (Date.now() - 2 * 60 * 60 * 1000) / 1000;
    utimesSync(join(b, `.tmp.${live}`), twoHoursAgo, twoHoursAgo);
    change(root);
    const now = render('claude', { root });
    assert.deepEqual(entries(root), [
      `.tmp.${live}`, 'claude', 'claude.notarender', name('claude', now.fingerprint), pending,
      'opencode', name('opencode', other.fingerprint),
    ].sort());
    // The pending render can still switch the link to its directory, which exists.
    pointAt(root, 'claude', pending);
    assert.ok(existsSync(join(b, 'claude')));
  } finally {
    sleeper.kill();
  }
});

test('a render whose sources changed before its check starts over on the current sources', () => {
  const root = toolkit();
  const r = render('claude', { root, afterSwitch: (round) => { if (round === 1) change(root); } });
  assert.equal(r.rounds, 2);
  assert.equal(r.fingerprint, fingerprint(renderFiles('claude', root)));
  assert.equal(target(root, 'claude'), name('claude', r.fingerprint));
  assert.deepEqual(entries(root), ['claude', name('claude', r.fingerprint)]);
});

test('sources that keep changing fail the render, the link on a complete render', () => {
  const root = toolkit();
  assert.throws(() => render('claude', { root, afterSwitch: (round) => change(root, `round ${round}\n`) }),
    /the sources of claude changed during each of 3 renders/);
  assert.equal(body(readFileSync(join(build(root), 'claude', 'ux', 'agents', 'ux.md'), 'utf8')), 'round 2\n');
});

test('renders running at the same time leave a valid link on the current sources, then a single directory', async () => {
  const root = toolkit();
  const env = { ...process.env, F3_TOOLKIT_ROOT: root };
  const runs = Array.from({ length: 6 }, (_, i) => new Promise((resolve) => {
    const child = spawn('node', [F3, 'render', 'claude'], { env });
    // The source changes while they run: some may have read the old one.
    if (i === 0) child.on('spawn', () => change(root));
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => resolve({ code, err }));
  }));
  for (const r of await Promise.all(runs)) assert.equal(r.code, 0, r.err);
  assert.equal(body(readFileSync(join(build(root), 'claude', 'ux', 'agents', 'ux.md'), 'utf8')), 'changed\n');
  assert.deepEqual(entries(root).filter((n) => n.startsWith('.tmp.')), []);
  render('claude', { root }); // every earlier render has ended: only the target remains
  assert.match(target(root, 'claude'), RENDER_DIR);
  assert.deepEqual(entries(root), ['claude', target(root, 'claude')]);
});

test('a build/<tool> that is not a link is refused', () => {
  const root = toolkit();
  mkdirSync(join(build(root), 'claude'), { recursive: true });
  writeFileSync(join(build(root), 'claude', 'keep.md'), 'mine');
  assert.throws(() => render('claude', { root }), /build\/claude exists and is not a link/);
  assert.equal(readFileSync(join(build(root), 'claude', 'keep.md'), 'utf8'), 'mine');
});

test('the full view holds the rendered files and a copy of the other files, and touches neither build/ nor links', () => {
  const root = toolkit();
  const to = join(root, 'view');
  const out = renderView('opencode', to, { root });
  assert.equal(out, join(to, 'opencode'));
  assert.equal(readFileSync(join(out, 'ux', 'skills', 'ux-practice', 'SKILL.md'), 'utf8'), '# ux-practice\n');
  assert.equal(readFileSync(join(out, 'openspec', 'commands', 'f3-dev.md'), 'utf8'),
    renderFiles('opencode', root).find((f) => f.path === 'openspec/commands/f3-dev.md').content);
  assert.ok(!existsSync(join(out, 'openspec', 'agents', 'tester.permission')));
  assert.ok(!existsSync(build(root)));
  assert.throws(() => renderView('opencode', to, { root }), /already exists/);
});

test('f3 render renders both tools by default, one when named, and fails on an unknown tool', () => {
  const root = toolkit();
  const env = { ...process.env, F3_TOOLKIT_ROOT: root };
  const both = spawnSync('node', [F3, 'render'], { env, encoding: 'utf8' });
  assert.equal(both.status, 0, both.stderr);
  assert.match(both.stdout, /^claude: build\/claude -> claude\.[0-9a-f]{64}\.[0-9]+ \(switched\)\nopencode: build\/opencode -> opencode\.[0-9a-f]{64}\.[0-9]+ \(switched\)\n$/);
  const one = spawnSync('node', [F3, 'render', 'opencode'], { env, encoding: 'utf8' });
  assert.match(one.stdout, /^opencode: build\/opencode -> opencode\.[0-9a-f]{64}\.[0-9]+\n$/);
  assert.ok(entries(root).filter((n) => RENDER_DIR.test(n)).length === 2);
  const bad = spawnSync('node', [F3, 'render', 'vim'], { env, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /unknown tool "vim"/);
  const view = spawnSync('node', [F3, 'render', '--to', join(root, 'view')], { env, encoding: 'utf8' });
  assert.equal(view.status, 0, view.stderr);
  assert.ok(existsSync(join(root, 'view', 'claude')) && existsSync(join(root, 'view', 'opencode')));
});

test('f3 render reports a failed render with exit code 1', () => {
  const root = toolkit();
  change(root, '{{NOPE}}\n');
  const r = spawnSync('node', [F3, 'render', 'claude'], { env: { ...process.env, F3_TOOLKIT_ROOT: root }, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^f3: "\{\{" left in the render of claude: ux\/agents\/ux\.md/);
  assert.ok(!existsSync(build(root)));
});
