// install.sh (D9, D16, analysis 4.5). Each test runs the install.sh of a throwaway copy of the toolkit,
// in a throwaway HOME, with a PATH of the system folders and a folder of its own: node, and fake
// claude, opencode and openspec when the test wants them. The real HOME is never touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, rmSync, symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TOOLKIT = resolve(import.meta.dirname, '..', '..');
const NODE = process.execPath;

function setup({ programs = ['claude', 'opencode', 'openspec'] } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'f3-install-test-'));
  const root = join(base, 'toolkit');
  for (const part of ['install.sh', 'cli', 'modules', 'tools']) {
    cpSync(join(TOOLKIT, part), join(root, part), { recursive: true, filter: (src) => !src.includes(`${join(TOOLKIT, 'cli', 'test')}`) });
  }
  const home = join(base, 'home');
  mkdirSync(home);
  const bin = join(base, 'bin');
  mkdirSync(bin);
  symlinkSync(NODE, join(bin, 'node'));
  for (const p of programs) {
    writeFileSync(join(bin, p), '#!/bin/sh\nexit 0\n');
    chmodSync(join(bin, p), 0o755);
  }
  const env = { HOME: home, PATH: `${bin}:/usr/bin:/bin`, LC_ALL: 'C' };
  const install = (args = [], input = '', extra = {}) => spawnSync('bash', [join(root, 'install.sh'), ...args], { env: { ...env, ...extra }, input, encoding: 'utf8' });
  const at = (...p) => join(home, ...p);
  return { base, root, home, bin, install, at };
}

const isLink = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };
const links = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => isLink(join(dir, n))).sort() : []);
const CLAUDE = ['.claude'];
const OPENCODE = ['.config', 'opencode'];

test('install.sh claude links the agents and commands through build/claude, the skills to the sources', () => {
  const t = setup();
  const r = t.install(['claude']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readlinkSync(t.at(...CLAUDE, 'agents', 'analyst.md')), join(t.root, 'build', 'claude', 'openspec', 'agents', 'analyst.md'));
  assert.equal(readlinkSync(t.at(...CLAUDE, 'commands', 'f3-dev.md')), join(t.root, 'build', 'claude', 'openspec', 'commands', 'f3-dev.md'));
  assert.equal(readlinkSync(t.at(...CLAUDE, 'skills', 'spec-practice')), join(t.root, 'modules', 'openspec', 'skills', 'spec-practice'));
  assert.equal(readlinkSync(t.at('.local', 'share', 'f3', 'scripts', 'f3-features.mjs')), join(t.root, 'modules', 'openspec', 'scripts', 'f3-features.mjs'));
  assert.equal(readlinkSync(t.at('.local', 'share', 'openspec', 'schemas', 'f3')), join(t.root, 'modules', 'openspec', 'schemas', 'f3'));
  assert.equal(readlinkSync(t.at('.local', 'bin', 'f3')), join(t.root, 'cli', 'f3.mjs'));
  assert.ok(existsSync(t.at(...CLAUDE, 'agents', 'analyst.md')));
  assert.match(lstatSync(join(t.root, 'build', 'claude')).isSymbolicLink() ? 'link' : '', /link/);
  assert.equal(links(t.at(...CLAUDE, 'agents')).length, 5);
  assert.equal(links(t.at(...CLAUDE, 'commands')).length, 12);
  assert.ok(!existsSync(t.at(...OPENCODE)));
  assert.ok(!existsSync(join(t.root, 'build', 'opencode')));
  assert.match(r.stdout, /Toolkit linked for Claude Code\./);
  assert.doesNotMatch(r.stdout, /OpenCode/);
});

test('install.sh opencode keeps the behavior of OpenCode, and all installs both', () => {
  const t = setup();
  mkdirSync(t.at(...OPENCODE, 'scripts'), { recursive: true });
  symlinkSync(join(t.root, 'modules', 'openspec', 'scripts', 'f3-features.mjs'), t.at(...OPENCODE, 'scripts', 'f3-features.mjs'));
  const r = t.install(['opencode']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readlinkSync(t.at(...OPENCODE, 'agents', 'tester.md')), join(t.root, 'build', 'opencode', 'openspec', 'agents', 'tester.md'));
  assert.equal(readlinkSync(t.at(...OPENCODE, 'skills', 'ux-practice')), join(t.root, 'modules', 'ux', 'skills', 'ux-practice'));
  assert.match(r.stdout, /Obsolete link removed: .*opencode\/scripts\/f3-features\.mjs/);
  assert.match(r.stdout, /Restart OpenCode/);
  assert.ok(!existsSync(t.at(...CLAUDE)));
  const all = t.install(['all']);
  assert.equal(all.status, 0, all.stderr);
  assert.equal(links(t.at(...CLAUDE, 'agents')).length, 5);
  assert.equal(links(t.at(...OPENCODE, 'commands')).length, 12);
  assert.match(all.stdout, /Claude Code\..*\n.*OpenCode\./);
});

test('the installed tools are those of installedTools()', () => {
  const t = setup();
  t.install(['opencode']);
  const r = spawnSync(NODE, ['--input-type=module', '-e', `import { installedTools } from ${JSON.stringify(join(t.root, 'cli', 'lib', 'toolkit.mjs'))}; console.log(installedTools().join(','));`], { env: { HOME: t.home }, encoding: 'utf8' });
  assert.equal(r.stdout, 'opencode\n', r.stderr);
});

test('without argument, install.sh asks, again until a valid choice', () => {
  const t = setup();
  const r = t.install([], 'x\n4\n3\n');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.startsWith('Install the f3 toolkit for:\n  1) Claude Code\n  2) OpenCode\n  3) both\nChoice [1-3]: Choice [1-3]: Choice [1-3]: '));
  assert.ok(existsSync(t.at(...CLAUDE, 'agents', 'ux.md')) && existsSync(t.at(...OPENCODE, 'agents', 'ux.md')));
  const none = setup();
  const n = none.install([], '');
  assert.equal(n.status, 1);
  assert.match(n.stderr, /No choice made: run .* claude, opencode or all/);
  assert.ok(!existsSync(none.at('.local')));
});

test('an unknown argument or an extra one is refused', () => {
  const t = setup();
  for (const args of [['vim'], ['claude', 'opencode'], ['--remove', 'claude'], ['--render']]) {
    const r = t.install(args);
    assert.equal(r.status, 1, args.join(' '));
    assert.match(r.stderr, /^Usage: /, args.join(' '));
  }
  assert.deepEqual(readdirSync(t.home), []);
});

test('prerequisites: node stops the installation, a missing tool or OpenSpec only warns', () => {
  const t = setup({ programs: [] });
  const r = t.install(['all']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /Warning: claude is not in the PATH: install Claude Code/);
  assert.match(r.stderr, /Warning: opencode is not in the PATH: install OpenCode/);
  assert.match(r.stderr, /Warning: openspec is not in the PATH/);
  const one = setup({ programs: ['claude', 'openspec'] }).install(['claude']);
  assert.equal(one.stderr.match(/Warning: (claude|opencode|openspec)/g), null);
  // A PATH with only what install.sh runs before its check of node.
  const bare = setup();
  const sys = join(bare.base, 'sys');
  mkdirSync(sys);
  for (const p of ['bash', 'dirname']) symlinkSync(join('/usr/bin', p), join(sys, p));
  const nodeless = bare.install(['claude'], '', { PATH: sys });
  assert.equal(nodeless.status, 1);
  assert.match(nodeless.stderr, /Missing prerequisite: node is not in the PATH/);
  assert.deepEqual(readdirSync(bare.home), []);
});

test('the PATH is checked for ~/.local/bin', () => {
  const t = setup();
  assert.match(t.install(['claude']).stderr, /Warning: .*\.local\/bin is not in the PATH/);
  const r = t.install(['claude'], '', { PATH: `${t.at('.local', 'bin')}:${t.bin}:/usr/bin:/bin` });
  assert.doesNotMatch(r.stderr, /\.local\/bin is not in the PATH/);
});

test('a failed render touches no link: neither creates, nor changes, nor removes one', () => {
  const t = setup();
  t.install(['claude']);
  const agents = t.at(...CLAUDE, 'agents');
  symlinkSync(join(t.root, 'modules', 'gone.md'), join(agents, 'gone.md'));
  const before = links(agents);
  writeFileSync(join(t.root, 'modules', 'ux', 'agents', 'ux.md'), '---\ndescription: "ux"\nmode: primary\n---\n{{NOPE}}\n');
  const r = t.install(['all']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /"\{\{" left in the render of claude/);
  assert.deepEqual(links(agents), before);
  assert.ok(!existsSync(t.at(...OPENCODE)));
});

test('after build/ is removed, install.sh renders again and the links work, before any cleanup', () => {
  const t = setup();
  t.install(['all']);
  rmSync(join(t.root, 'build'), { recursive: true });
  assert.ok(!existsSync(t.at(...CLAUDE, 'agents', 'analyst.md')));
  const r = t.install(['all']);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /Dead link removed/);
  assert.ok(existsSync(t.at(...CLAUDE, 'agents', 'analyst.md')) && existsSync(t.at(...OPENCODE, 'commands', 'f3-dev.md')));
});

test('the cleanup removes only the dead links of the toolkit; a file that is not a link is skipped', () => {
  const t = setup();
  const commands = t.at(...CLAUDE, 'commands');
  mkdirSync(commands, { recursive: true });
  symlinkSync(join(t.root, 'build', 'claude', 'openspec', 'commands', 'f3-old.md'), join(commands, 'f3-old.md'));
  symlinkSync('/nowhere/mine.md', join(commands, 'mine.md'));
  writeFileSync(join(commands, 'f3-dev.md'), 'my own');
  const r = t.install(['claude']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Dead link removed: .*commands\/f3-old\.md/);
  assert.match(r.stderr, /Skipped: .*commands\/f3-dev\.md exists and is not a link/);
  assert.ok(isLink(join(commands, 'mine.md')));
  assert.ok(!isLink(join(commands, 'f3-dev.md')));
});

test('install.sh --remove removes every link of the toolkit for both tools, and nothing else', () => {
  const t = setup();
  t.install(['all']);
  symlinkSync('/nowhere/mine.md', t.at(...CLAUDE, 'agents', 'mine.md'));
  writeFileSync(t.at(...OPENCODE, 'agents', 'own.md'), 'x');
  const r = t.install(['--remove']);
  assert.equal(r.status, 0, r.stderr);
  for (const dir of [[...CLAUDE, 'agents'], [...CLAUDE, 'commands'], [...CLAUDE, 'skills'], [...OPENCODE, 'agents'], [...OPENCODE, 'skills'], ['.local', 'bin'], ['.local', 'share', 'f3', 'scripts']]) {
    assert.deepEqual(links(t.at(...dir)).filter((n) => n !== 'mine.md'), [], dir.join('/'));
  }
  assert.ok(isLink(t.at(...CLAUDE, 'agents', 'mine.md')));
  assert.ok(existsSync(t.at(...OPENCODE, 'agents', 'own.md')));
});
