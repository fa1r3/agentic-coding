// f3 state <command> [arguments]: checks the arguments and the project, then prints the launch state
// of the command. Called by the single shell injection of each command; writes nothing.
// Exit code 0 when the command may go on; otherwise 1, with the reason on stderr (Claude Code then
// interrupts the command).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPTS_DIR, SKILLS_DIR } from './toolkit.mjs';

class StateError extends Error {}

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    if (error.code === 'ENOENT') return `${cmd}: not found`;
    return `${error.stdout || ''}${error.stderr || ''}`;
  }
}

const head = (text, n) => text.split('\n').filter((l, i, a) => i < a.length - 1 || l !== '').slice(0, n);
const tail = (text, n) => text.split('\n').filter((l, i, a) => i < a.length - 1 || l !== '').slice(-n);

function block(label, lines, empty = 'none') {
  if (!lines.length) return `- ${label}: ${empty}`;
  if (lines.length === 1) return `- ${label}: ${lines[0]}`;
  return `- ${label}:\n${lines.map((l) => `  ${l}`).join('\n')}`;
}

function listFolder(path) {
  if (!existsSync(path)) return `${path}: absent`;
  const names = readdirSync(path, { withFileTypes: true }).map((d) => (d.isDirectory() ? `${d.name}/` : d.name)).sort();
  return `${path}: ${names.length ? names.join(', ') : '(empty)'}`;
}

function changesInProgress() {
  const dir = 'openspec/changes';
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'archive').map((d) => d.name).sort();
}

function pairs(file, pattern, absent, limit = Infinity) {
  if (!existsSync(file)) return [absent];
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => pattern.test(l));
  const result = [];
  for (let i = 0; i < lines.length; i += 2) result.push(lines.slice(i, i + 2).join(' '));
  return result.slice(0, limit);
}

function tasksLines(id) {
  const file = `openspec/changes/${id}/tasks.md`;
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n') : null;
}

const git = (...args) => run('git', args);
const uncommitted = (n) => head(git('status', '--porcelain'), n);
const firstLine = (text) => head(text, 1)[0] || '';

function checkFramed() {
  const config = 'openspec/config.yaml';
  const first = existsSync(config) ? firstLine(readFileSync(config, 'utf8')) : '';
  if (first.trim() !== 'schema: f3') {
    throw new StateError('This project is not framed with f3: openspec/config.yaml does not start with "schema: f3". Frame it first, in a terminal: f3 init');
  }
}

function checkChange(id, usage) {
  const changes = changesInProgress();
  const list = changes.length ? `Changes in progress: ${changes.join(', ')}.` : 'No change in progress.';
  if (!id) throw new StateError(`Missing change identifier. Usage: ${usage}. ${list}`);
  if (!/^[a-z0-9-]+$/.test(id) || !changes.includes(id)) throw new StateError(`"${id}" names no change in progress. ${list}`);
}

function splitArgs(raw) {
  return (raw || '').trim().split(/\s+/).filter(Boolean);
}

const changeFiles = (id, ...subs) => block('Files of the change', [`openspec/changes/${id}`, ...subs.map((s) => `openspec/changes/${id}/${s}`)].map(listFolder));
const openspecProgress = (id) => block('Progress of OpenSpec', tail(run('openspec', ['status', '--change', id]), 12));
const unchecked = (id) => {
  const lines = tasksLines(id);
  return `- Unchecked tasks: ${lines ? lines.filter((l) => /^\s*- \[ \]/.test(l)).length : 'tasks.md absent'}`;
};

// One entry per command: its arguments, then what it reads at launch.
const ENTRIES = {
  init: {
    args: [],
    framed: false,
    lines: () => {
      const files = ['AGENTS.md', 'CONTEXT.md', 'BACKLOG.md', 'arch/decisions.md', 'openspec/config.yaml', 'CLAUDE.md', '.mcp.json', '.claude/settings.json'].map((f) => {
        if (!existsSync(f)) return `${f}: absent`;
        const text = readFileSync(f, 'utf8');
        const marker = text.includes('f3 standards') || firstLine(text).trim() === 'schema: f3' ? ' (f3 marker)' : '';
        return `${f}: present${marker}`;
      });
      const skills = existsSync('.claude/skills') ? readdirSync('.claude/skills').sort().join(', ') || '(empty)' : 'absent';
      return [
        block('Framing files', files),
        `- Git repository: ${firstLine(git('rev-parse', '--is-inside-work-tree'))}`,
        block('Uncommitted changes', uncommitted(20)),
        `- OpenSpec: ${firstLine(run('openspec', ['--version']))}`,
        block('Schema f3', head(run('openspec', ['schema', 'which', 'f3']), 3)),
        `- OpenSpec skills installed in the project (.claude/skills): ${skills}`,
      ];
    },
  },
  propose: {
    args: [],
    lines: () => {
      const changes = changesInProgress().map((n) => {
        const d = `openspec/changes/${n}/`;
        const present = ['clarification.md', 'proposal.md', 'specs/', 'validations/amigos.md'].filter((f) => existsSync(d + f));
        return `${n}: ${present.length ? present.join(' ') : '(empty)'}`;
      });
      return [
        `- Project schema: ${firstLine(readFileSync('openspec/config.yaml', 'utf8'))}`,
        block('Changes in progress and their files', changes),
        block('Backlog entries', pairs('BACKLOG.md', /^## B-|^- Status:/, 'BACKLOG.md absent', 40)),
      ];
    },
  },
  'tres-amigos': {
    args: ['change'],
    lines: ([id]) => [
      changeFiles(id, 'validations'),
      `- Path of the spec-practice skill: ${join(SKILLS_DIR, 'spec-practice', 'SKILL.md')}`,
      block('Step form check', head(run('node', [join(SCRIPTS_DIR, 'f3-features.mjs'), '--check', id]), 40)),
    ],
  },
  'ux-design': {
    args: ['change', 'mode?'],
    lines: ([id]) => [
      changeFiles(id, 'validations'),
      `- Design tool named by the context: ${(() => {
        const lines = existsSync('openspec/config.yaml') ? readFileSync('openspec/config.yaml', 'utf8').split('\n') : [];
        const i = lines.findIndex((l) => /^\s*Design tool/.test(l));
        return i < 0 ? 'not found' : (lines[i + 1] ?? lines[i]).trim();
      })()}`,
    ],
  },
  design: {
    args: ['change'],
    lines: ([id]) => [openspecProgress(id), block('Architecture decisions', pairs('arch/decisions.md', /^## A-|^- Status:/, 'arch/decisions.md absent'))],
  },
  'design-review': {
    args: ['change'],
    lines: ([id]) => [changeFiles(id, 'validations'), openspecProgress(id)],
  },
  dev: {
    args: ['change'],
    lines: ([id]) => {
      const lines = tasksLines(id) || [];
      return [
        `- Current branch: ${firstLine(git('branch', '--show-current'))}`,
        block('Uncommitted files', uncommitted(30)),
        unchecked(id),
        block('Fix groups', lines.filter((l) => /^## .*(Acceptance fixes|Conformity fixes)/.test(l))),
      ];
    },
  },
  acceptance: {
    args: ['change'],
    lines: ([id]) => [
      `- Current commit: ${firstLine(git('rev-parse', '--short', 'HEAD'))}`,
      block('Uncommitted files', uncommitted(30)),
      changeFiles(id, 'validations', 'acceptance'),
      unchecked(id),
    ],
  },
  archive: {
    args: ['change'],
    lines: ([id]) => [
      `- Current branch: ${firstLine(git('branch', '--show-current'))}`,
      block('Uncommitted files', uncommitted(30)),
      `- Acceptance reports of the change: ${listFolder(`openspec/changes/${id}/acceptance`)}`,
    ],
  },
  'ux-calibrate': { args: [], lines: () => ['- Checks: passed'] },
  'ux-direction': { args: [], lines: () => ['- Checks: passed'] },
  'ux-tokens': { args: [], lines: () => ['- Checks: passed'] },
};

export const STATE_COMMANDS = Object.keys(ENTRIES);

// Returns { code, stdout, stderr } instead of printing, for the tests.
export function stateOf(command, rawArgs) {
  const entry = ENTRIES[command];
  if (!entry) return { code: 1, stdout: '', stderr: `f3 state: unknown command "${command}". Known: ${STATE_COMMANDS.join(', ')}.` };
  try {
    if (entry.framed !== false) checkFramed();
    const args = splitArgs(rawArgs);
    const usage = `f3 ${command}${entry.args.map((a) => (a === 'change' ? ' <change-id>' : a === 'mode?' ? ' [conformity]' : '')).join('')}`;
    if (entry.args.includes('change')) checkChange(args[0], usage);
    const max = entry.args.length;
    if (args.length > max) throw new StateError(`Too many arguments: "${args.slice(max).join(' ')}". Usage: ${usage}.`);
    if (entry.args.includes('mode?') && args[1] !== undefined && args[1] !== 'conformity') {
      throw new StateError(`Unknown mode "${args[1]}": the only mode is "conformity". Usage: ${usage}.`);
    }
    return { code: 0, stdout: entry.lines(args).join('\n') + '\n', stderr: '' };
  } catch (error) {
    if (error instanceof StateError) return { code: 1, stdout: '', stderr: `f3 state ${command}: ${error.message}` };
    return { code: 1, stdout: '', stderr: `f3 state ${command} failed: ${error.message}` };
  }
}

export function state(command, rawArgs) {
  const result = stateOf(command, rawArgs);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr + '\n');
  return result.code;
}
