// f3 state <command> [arguments]: checks the arguments and the project, then prints the launch state
// of the command. Called by the single shell injection of each command; it reads the project, and
// writes only the render of the toolkit in its build/ (D4).
// - The tool of .f3/local is rendered, or every installed tool when the file is absent. A failed
//   render is an error of the launch state; a render that switched its link is a warning: the agent
//   and the command the session loaded may be out of date (R1).
// - Under f3 <step>, F3_LAUNCH names the launch file of the launcher: its idea and its prompt are
//   shown last, and the file is removed. Without F3_LAUNCH, the command was typed in a session: a
//   line recommends f3 <step> (R6); the identifier is checked in both cases.
// - In a framed project, warning lines, which do not block, report a tool of the project that lacks
//   files, .f3/local not ignored by Git, and MCP servers that differ between opencode.json and
//   .mcp.json (analysis 4.10, R14); f3 state init details the tools of the project for f3 init.
// Exit code 0 when the command may go on; otherwise 1, with the reason on stderr (Claude Code then
// interrupts the command; under OpenCode, each command says to stop).
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync, rmdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { LAUNCH_FILE, LAUNCH_PREFIX, LOCAL, LaunchError, readLocal } from './launch.mjs';
import { render } from './render.mjs';
import { PROJECT_FILES, localIgnored, missingFiles, projectTools, toolWarnings } from './project.mjs';
import { SCRIPTS_DIR, TOOLS, TOOL_NAMES, installedTools, skillsDir } from './toolkit.mjs';

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
// .f3/local is never committed: the launcher writes it before f3 init adds it to .gitignore (D41).
const uncommitted = (n) => head(git('status', '--porcelain', '--', '.', `:(exclude)${LOCAL}`), n);
const firstLine = (text) => head(text, 1)[0] || '';

// Whether the project is framed with f3: openspec/config.yaml starts with "schema: f3".
function isFramed() {
  const config = 'openspec/config.yaml';
  return existsSync(config) && firstLine(readFileSync(config, 'utf8')).trim() === 'schema: f3';
}

function checkFramed() {
  if (!isFramed()) {
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

// The path of a skill under each tool of the launch state.
function skillPath(tools, skill) {
  const path = (tool) => join(skillsDir(tool), skill, 'SKILL.md');
  if (!tools.length) return 'f3 is installed for no tool: run install.sh';
  if (tools.length === 1) return path(tools[0]);
  return tools.map((t) => `${path(t)} (${TOOL_NAMES[t]})`).join('; ');
}

// Reads and removes the launch file named by F3_LAUNCH: { idea, prompt }, or null when it is gone (a
// later command of a session started by f3). Only a file the launcher writes is read and removed:
// <tmpdir>/f3-launch-*/launch.json, a regular file of the user, private.
function takeLaunch(file) {
  const dir = dirname(resolve(file));
  if (basename(file) !== LAUNCH_FILE || !basename(dir).startsWith(LAUNCH_PREFIX) || dirname(dir) !== resolve(tmpdir())) {
    throw new StateError(`F3_LAUNCH names a file the launcher of f3 does not write: ${file}`);
  }
  let info;
  try {
    info = lstatSync(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  if (!info.isFile() || info.uid !== process.getuid() || (info.mode & 0o077) !== 0) {
    throw new StateError(`F3_LAUNCH names a file that is not a private file of the user: ${file}`);
  }
  let launch;
  try {
    launch = JSON.parse(readFileSync(file, 'utf8'));
  } finally {
    rmSync(file, { force: true });
    try { rmdirSync(dir); } catch { /* left to the launcher */ }
  }
  return { idea: typeof launch?.idea === 'string' ? launch.idea : null, prompt: typeof launch?.prompt === 'string' ? launch.prompt : null };
}

// Renders the tools of the launch state; returns the warning lines of the renders that switched.
function renderTools(tools, renderTool) {
  const warnings = [];
  for (const tool of tools) {
    let result;
    try {
      result = renderTool(tool);
    } catch (error) {
      throw new StateError(`the render of ${TOOL_NAMES[tool]} failed: ${error.message}`);
    }
    if (result.switched) {
      warnings.push(`- Warning: the toolkit had changed since the last render of ${TOOL_NAMES[tool]}: the agent and the command this session loaded may be out of date. Tell the user; a new session started with f3 loads the current ones.`);
    }
  }
  return warnings;
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
    lines: (_, { installed }) => {
      const framing = ['AGENTS.md', 'CONTEXT.md', 'BACKLOG.md', 'arch/decisions.md', 'openspec/config.yaml'];
      const files = [...framing, ...TOOLS.flatMap((t) => PROJECT_FILES[t].files)].map((f) => {
        if (!existsSync(f)) return `${f}: absent`;
        const text = readFileSync(f, 'utf8');
        // The marker of AGENTS.md before the commands became f3 <step>: f3 init rewrites it (theme Tools).
        const former = text.includes('f3 standards: written by /f3-init') ? ', former form' : '';
        const marker = text.includes('f3 standards') || firstLine(text).trim() === 'schema: f3' ? ` (f3 marker${former})` : '';
        return `${f}: present${marker}`;
      });
      const tools = projectTools(installed).map(({ tool, installed: inst, present }) => {
        const why = [inst ? 'f3 installed' : '', present.length ? `in the project: ${present.join(', ')}` : ''].filter(Boolean).join('; ');
        const missing = missingFiles(tool);
        return `${tool} (${TOOL_NAMES[tool]}): ${why}${missing.length ? `; missing: ${missing.join(', ')}` : ''}`;
      });
      const skills = TOOLS.map((t) => {
        const dir = PROJECT_FILES[t].skills;
        return `${dir}: ${existsSync(dir) ? readdirSync(dir).sort().join(', ') || '(empty)' : 'absent'}`;
      });
      const ignored = localIgnored();
      return [
        block('Framing files', files),
        block('Tools of the project (f3 init writes the files of each one)', tools, 'none: f3 is installed for no tool, run install.sh'),
        `- Git repository: ${firstLine(git('rev-parse', '--is-inside-work-tree'))}`,
        block('Uncommitted changes', uncommitted(20)),
        `- .f3/local ignored by Git: ${ignored === null ? 'no Git repository' : ignored ? 'yes' : 'no'}`,
        `- OpenSpec: ${firstLine(run('openspec', ['--version']))}`,
        block('Schema f3', head(run('openspec', ['schema', 'which', 'f3']), 3)),
        block('Skills installed in the project by OpenSpec', skills),
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
    lines: ([id], { tools }) => [
      changeFiles(id, 'validations'),
      `- Path of the spec-practice skill: ${skillPath(tools, 'spec-practice')}`,
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
export function stateOf(command, rawArgs, { env = process.env, renderTool = render } = {}) {
  const entry = ENTRIES[command];
  if (!entry) return { code: 1, stdout: '', stderr: `f3 state: unknown command "${command}". Known: ${STATE_COMMANDS.join(', ')}.` };
  try {
    const launch = env.F3_LAUNCH ? takeLaunch(env.F3_LAUNCH) : null;
    let local;
    try {
      local = readLocal();
    } catch (error) {
      if (error instanceof LaunchError) throw new StateError(error.message);
      throw error;
    }
    const installed = installedTools();
    const tools = local?.tool ? [local.tool] : installed;
    const warnings = renderTools(tools, renderTool);
    if (entry.framed !== false) checkFramed();
    const args = splitArgs(rawArgs);
    const usage = `f3 ${command}${entry.args.map((a) => (a === 'change' ? ' <change-id>' : a === 'mode?' ? ' [conformity]' : '')).join('')}`;
    if (entry.args.includes('change')) checkChange(args[0], usage);
    const max = entry.args.length;
    if (args.length > max) throw new StateError(`Too many arguments: "${args.slice(max).join(' ')}". Usage: ${usage}.`);
    if (entry.args.includes('mode?') && args[1] !== undefined && args[1] !== 'conformity') {
      throw new StateError(`Unknown mode "${args[1]}": the only mode is "conformity". Usage: ${usage}.`);
    }
    const lines = [...entry.lines(args, { tools, installed }), ...warnings, ...(isFramed() ? toolWarnings(installed) : [])];
    if (!env.F3_LAUNCH) {
      lines.push(`- Not started by f3: this command was typed in a session. Recommend to the user to start each step in a terminal with f3 <step>, here: f3 ${[command, ...args].join(' ')}`);
    }
    if (launch?.idea) lines.push('', 'Idea from the user:', '', launch.idea);
    if (launch?.prompt) lines.push('', 'Note from the user:', '', launch.prompt);
    return { code: 0, stdout: lines.join('\n') + '\n', stderr: '' };
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
