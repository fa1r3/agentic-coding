import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, renameSync, statSync,
  utimesSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TOOLS, fingerprint, render, renderFiles, renderView } from '../lib/render.mjs';

const F3 = join(import.meta.dirname, '..', 'f3.mjs');
const FIXTURES = join(import.meta.dirname, 'fixtures', 'modules');
const HASH_DIR = /^(claude|opencode)\.[0-9a-f]{64}$/;

// A toolkit of its own for each test: the agents and commands of the fixtures, plus a skill.
function toolkit() {
  const root = mkdtempSync(join(tmpdir(), 'f3-render-'));
  cpSync(FIXTURES, join(root, 'modules'), { recursive: true });
  mkdirSync(join(root, 'modules', 'ux', 'skills', 'ux-practice'), { recursive: true });
  writeFileSync(join(root, 'modules', 'ux', 'skills', 'ux-practice', 'SKILL.md'), '# ux-practice\n');
  return root;
}
const build = (root) => join(root, 'build');
const entries = (root) => readdirSync(build(root)).sort();
const target = (root, tool) => readlinkSync(join(build(root), tool));

test('the render of each tool is a copy of the agents and commands, and nothing else', () => {
  const root = toolkit();
  for (const tool of TOOLS) {
    const files = renderFiles(tool, root);
    assert.equal(files.length, 17);
    for (const { path, content } of files) {
      assert.match(path, /^(openspec|ux)\/(agents|commands)\/[a-z0-9-]+\.md$/);
      assert.equal(content, readFileSync(join(root, 'modules', path), 'utf8'));
    }
  }
});

test('render writes build/<tool>.<fingerprint>/ and points the link build/<tool> at it', () => {
  const root = toolkit();
  const r = render('claude', { root });
  assert.equal(r.fingerprint, fingerprint(renderFiles('claude', root)));
  assert.ok(r.written && r.switched);
  assert.ok(lstatSync(join(build(root), 'claude')).isSymbolicLink());
  assert.equal(target(root, 'claude'), `claude.${r.fingerprint}`);
  assert.equal(readFileSync(join(build(root), 'claude', 'ux', 'agents', 'ux.md'), 'utf8'),
    readFileSync(join(root, 'modules', 'ux', 'agents', 'ux.md'), 'utf8'));
  assert.deepEqual(entries(root), ['claude', `claude.${r.fingerprint}`]);
});

test('a second render of the same content writes nothing and keeps the link', () => {
  const root = toolkit();
  const first = render('opencode', { root });
  const before = statSync(join(first.dir, 'openspec', 'agents', 'analyst.md')).mtimeMs;
  const second = render('opencode', { root });
  assert.equal(second.fingerprint, first.fingerprint);
  assert.ok(!second.written && !second.switched);
  assert.equal(statSync(join(first.dir, 'openspec', 'agents', 'analyst.md')).mtimeMs, before);
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
  writeFileSync(join(root, 'modules', 'ux', 'agents', 'ux.md'), 'changed\n');
  const second = render('claude', { root });
  assert.notEqual(second.fingerprint, first.fingerprint);
  assert.ok(second.switched);
  assert.equal(target(root, 'claude'), `claude.${second.fingerprint}`);
  assert.ok(!existsSync(first.dir));
  assert.deepEqual(entries(root), ['claude', `claude.${second.fingerprint}`]);
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
  writeFileSync(join(root, 'modules', 'openspec', 'commands', 'f3-dev.md'), '---\nf3-agent: developer\n---\nUse {{EXPLORE}}.\n');
  assert.throws(() => render('claude', { root }), /"\{\{" left in the render of claude: openspec\/commands\/f3-dev\.md/);
  assert.equal(target(root, 'claude'), `claude.${first.fingerprint}`);
  assert.deepEqual(entries(root), ['claude', `claude.${first.fingerprint}`]);
  assert.throws(() => renderView('claude', join(root, 'view'), { root }), /"\{\{" left/);
  assert.ok(!existsSync(join(root, 'view')));
});

test('a failed write switches nothing and leaves no temporary directory', () => {
  const root = toolkit();
  const first = render('claude', { root });
  writeFileSync(join(root, 'modules', 'ux', 'agents', 'ux.md'), 'changed\n');
  // A read-only build/: the temporary directory of the new render cannot be written.
  spawnSync('chmod', ['a-w', build(root)]);
  try {
    assert.throws(() => render('claude', { root }), /read-only and its render is out of date; run install\.sh/);
  } finally {
    spawnSync('chmod', ['u+w', build(root)]);
  }
  assert.equal(target(root, 'claude'), `claude.${first.fingerprint}`);
  assert.deepEqual(entries(root), ['claude', `claude.${first.fingerprint}`]);
});

test('a read-only toolkit works while its render is up to date', () => {
  const root = toolkit();
  const first = render('claude', { root });
  spawnSync('chmod', ['a-w', build(root)]);
  try {
    const again = render('claude', { root });
    assert.equal(again.fingerprint, first.fingerprint);
  } finally {
    spawnSync('chmod', ['u+w', build(root)]);
  }
});

test('the cleanup removes only the fingerprint directories of the tool not targeted, and old temporaries', () => {
  const root = toolkit();
  const other = render('opencode', { root });
  const old = render('claude', { root });
  const b = build(root);
  const stale = `claude.${'0'.repeat(64)}`;
  mkdirSync(join(b, stale));
  mkdirSync(join(b, '.tmp.999999'));
  mkdirSync(join(b, '.tmp.888888'));
  const twoHoursAgo = (Date.now() - 2 * 60 * 60 * 1000) / 1000;
  utimesSync(join(b, '.tmp.999999'), twoHoursAgo, twoHoursAgo);
  mkdirSync(join(b, 'claude.notahash'));
  writeFileSync(join(root, 'modules', 'ux', 'agents', 'ux.md'), 'changed\n');
  const now = render('claude', { root });
  assert.deepEqual(entries(root), [
    '.tmp.888888', 'claude', 'claude.notahash', `claude.${now.fingerprint}`, 'opencode', `opencode.${other.fingerprint}`,
  ].sort());
  assert.ok(!existsSync(old.dir));
});

test('renders running at the same time converge on one directory and a valid link', async () => {
  const root = toolkit();
  const runs = Array.from({ length: 6 }, () => new Promise((resolve) => {
    const child = spawn('node', [F3, 'render', 'claude'], { env: { ...process.env, F3_TOOLKIT_ROOT: root } });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => resolve({ code, err }));
  }));
  for (const r of await Promise.all(runs)) assert.equal(r.code, 0, r.err);
  const names = entries(root);
  assert.equal(names.filter((n) => HASH_DIR.test(n)).length, 1);
  assert.deepEqual(names.filter((n) => n.startsWith('.tmp.')), []);
  assert.ok(existsSync(join(build(root), 'claude', 'openspec', 'agents', 'tester.md')));
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
    readFileSync(join(root, 'modules', 'openspec', 'commands', 'f3-dev.md'), 'utf8'));
  assert.ok(!existsSync(build(root)));
  assert.throws(() => renderView('opencode', to, { root }), /already exists/);
});

test('f3 render renders both tools by default, one when named, and fails on an unknown tool', () => {
  const root = toolkit();
  const env = { ...process.env, F3_TOOLKIT_ROOT: root };
  const both = spawnSync('node', [F3, 'render'], { env, encoding: 'utf8' });
  assert.equal(both.status, 0, both.stderr);
  assert.match(both.stdout, /^claude: build\/claude -> claude\.[0-9a-f]{64} \(switched\)\nopencode: build\/opencode -> opencode\.[0-9a-f]{64} \(switched\)\n$/);
  const one = spawnSync('node', [F3, 'render', 'opencode'], { env, encoding: 'utf8' });
  assert.match(one.stdout, /^opencode: build\/opencode -> opencode\.[0-9a-f]{64}\n$/);
  const bad = spawnSync('node', [F3, 'render', 'vim'], { env, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /unknown tool "vim"/);
  const view = spawnSync('node', [F3, 'render', '--to', join(root, 'view')], { env, encoding: 'utf8' });
  assert.equal(view.status, 0, view.stderr);
  assert.ok(existsSync(join(root, 'view', 'claude')) && existsSync(join(root, 'view', 'opencode')));
});

test('f3 render reports a failed render with exit code 1', () => {
  const root = toolkit();
  writeFileSync(join(root, 'modules', 'ux', 'agents', 'ux.md'), '{{GENERAL}}\n');
  const r = spawnSync('node', [F3, 'render', 'claude'], { env: { ...process.env, F3_TOOLKIT_ROOT: root }, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^f3: "\{\{" left in the render of claude: ux\/agents\/ux\.md/);
  assert.ok(!existsSync(build(root)));
});
