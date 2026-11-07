// Locations and sources of the toolkit: its root, its commands and agents, and their frontmatter.
import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

// F3_TOOLKIT_ROOT replaces the root, for the tests and their fixtures.
export const ROOT = process.env.F3_TOOLKIT_ROOT
  ? resolve(process.env.F3_TOOLKIT_ROOT)
  : resolve(dirname(realpathSync(fileURLToPath(import.meta.url))), '..', '..');
export const HOME = homedir();
export const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(HOME, '.claude');
export const DATA_DIR = process.env.XDG_DATA_HOME || join(HOME, '.local', 'share');
export const SCRIPTS_DIR = join(DATA_DIR, 'f3', 'scripts');
export const SKILLS_DIR = join(CLAUDE_DIR, 'skills');

// Subcommands of f3 that are not workflow steps: no command may be named /f3-<one of them>.
export const RESERVED = ['state', 'guard', 'guard-prompt', 'help', 'render'];

function unquote(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

// Parses the YAML subset used by the toolkit frontmatter: scalars and nested mappings.
// List items ("- ...") are skipped: the only lists are the hooks, which f3 does not read.
export function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') throw new Error('no frontmatter');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('unterminated frontmatter');
  return parseYaml(lines.slice(1, end).join('\n'));
}

// The same YAML subset, for a whole file: the permission table of an agent (<agent>.permission).
export function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, node: root }];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (line.startsWith('- ') || line === '-' || parent.node === null) {
      parent.node = null; // inside a list: ignored
      continue;
    }
    const m = /^("[^"]*"|'[^']*'|[^:]+):(?:\s+(.*))?$/.exec(line);
    if (!m) throw new Error(`unreadable frontmatter line: ${line}`);
    const key = unquote(m[1]);
    if (m[2] === undefined || m[2] === '') {
      const child = {};
      parent.node[key] = child;
      stack.push({ indent, node: child });
    } else {
      parent.node[key] = unquote(m[2]);
    }
  }
  return root;
}

export function readFrontmatter(file) {
  return parseFrontmatter(readFileSync(file, 'utf8'));
}

function moduleDirs() {
  const modules = join(ROOT, 'modules');
  return readdirSync(modules, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(modules, d.name));
}

// Workflow commands: step name ("propose") -> { file, agent, argumentHint }.
export function commands() {
  const result = {};
  for (const dir of moduleDirs()) {
    const cdir = join(dir, 'commands');
    if (!existsSync(cdir)) continue;
    for (const name of readdirSync(cdir)) {
      const m = /^f3-([a-z-]+)\.md$/.exec(name);
      if (!m) continue;
      const fm = readFrontmatter(join(cdir, name));
      result[m[1]] = { file: join(cdir, name), agent: fm.agent, argumentHint: fm['argument-hint'] || '' };
    }
  }
  return result;
}

export function agentFile(name) {
  if (!/^[a-z0-9-]+$/.test(name)) return null;
  for (const dir of moduleDirs()) {
    const file = join(dir, 'agents', `${name}.md`);
    if (existsSync(file)) return file;
  }
  return null;
}

// Permission table of an agent, common to both tools (D15): <agent>.permission beside its source.
export function permissionFile(name) {
  const file = agentFile(name);
  return file && file.replace(/\.md$/, '.permission');
}
