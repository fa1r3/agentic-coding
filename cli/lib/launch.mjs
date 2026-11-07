// f3 <step> [<arguments>] [-- <prompt>]: starts a session of the tool of the project as the agent of the
// step, running /f3-<step> (analysis 4.2, D1, D3).
// - The tool comes from .f3/local (tool=claude|opencode), a setting of the project for each user. When
//   the file is absent, the only installed tool is taken, or the user is asked once when both are;
//   the file is then written. f3 tool <tool> changes it. There is no F3_TOOL variable.
// - The first "--" cuts: what follows is the prompt, taken as is and never parsed. The arguments
//   before it must be identifiers (^[a-z0-9-]+$). Under f3 propose, words that are not a single
//   identifier are the idea of the user.
// - The idea and the prompt never go through the launch message: they are written in a private file
//   (mode 600, in a private folder), named by F3_LAUNCH, which f3 state reads, shows and removes.
// - The tool is rendered before the launch (D4); a failed render launches nothing (D18).
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';
import { TOOLS, TOOL_NAMES, installedTools } from './toolkit.mjs';

export const ID = /^[a-z0-9-]+$/;
export const LOCAL = join('.f3', 'local');
export const LAUNCH_PREFIX = 'f3-launch-';
export const LAUNCH_FILE = 'launch.json';

export class LaunchError extends Error {}

// The settings of .f3/local in <dir>: "key=value" lines; blank lines and lines starting with "#" skipped.
export function readLocal(dir = '.') {
  const file = join(dir, LOCAL);
  if (!existsSync(file)) return null;
  const settings = {};
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const at = line.indexOf('=');
    if (at <= 0) throw new LaunchError(`unreadable line ${i + 1} of ${LOCAL}: ${line}`);
    settings[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  });
  if (settings.tool !== undefined && !TOOLS.includes(settings.tool)) {
    throw new LaunchError(`${LOCAL} names an unknown tool "${settings.tool}" (expected: ${TOOLS.join(', ')}). Change it with: f3 tool <tool>`);
  }
  return settings;
}

// Writes tool=<tool> in .f3/local, keeping its other lines.
export function writeLocal(tool, dir = '.') {
  const file = join(dir, LOCAL);
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l !== '' && !/^\s*tool\s*=/.test(l)) : [];
  mkdirSync(join(dir, '.f3'), { recursive: true });
  writeFileSync(file, [`tool=${tool}`, ...lines].join('\n') + '\n');
}

// Asks for the tool of the project until a valid choice; null when the input ends first.
export async function askTool(tools, input, output) {
  const question = [
    `f3: ${tools.map((t) => TOOL_NAMES[t]).join(' and ')} are both installed.`,
    'Tool for this project (saved in .f3/local; change it with f3 tool <tool>):',
    ...tools.map((t, i) => `  ${i + 1}) ${TOOL_NAMES[t]}`),
    `Choice [1-${tools.length}]: `,
  ].join('\n');
  const rl = createInterface({ input, terminal: false });
  output.write(question);
  try {
    for await (const line of rl) {
      const n = Number(line.trim());
      if (Number.isInteger(n) && n >= 1 && n <= tools.length) return tools[n - 1];
      output.write(`Choice [1-${tools.length}]: `);
    }
    return null;
  } finally {
    rl.close();
  }
}

// The tool of the project: .f3/local, or the only installed tool, or the user's choice; written to
// .f3/local when it was absent. ask(tools) returns the chosen tool or null.
export async function projectTool({ ask, dir = '.', installed = installedTools() } = {}) {
  const local = readLocal(dir);
  if (local?.tool) {
    if (!installed.includes(local.tool)) {
      throw new LaunchError(`${LOCAL} names ${TOOL_NAMES[local.tool]}, for which f3 is not installed: run install.sh ${local.tool}, or change the tool with f3 tool <tool>.`);
    }
    return local.tool;
  }
  if (!installed.length) throw new LaunchError('f3 is installed for no tool: run install.sh.');
  const tool = installed.length === 1 ? installed[0] : await ask(installed);
  if (!tool) throw new LaunchError(`no tool chosen: choose it with f3 tool <${installed.join('|')}>.`);
  writeLocal(tool, dir);
  return tool;
}

// Splits the words after the step: { args, idea, prompt }. Nothing after the first "--" is parsed.
export function parseLaunch(step, words) {
  const cut = words.indexOf('--');
  let args = cut < 0 ? [...words] : words.slice(0, cut);
  let prompt = null;
  if (cut >= 0) {
    prompt = words.slice(cut + 1).join(' ');
    if (!prompt.trim()) throw new LaunchError('"--" with no text after it: write the prompt after "--", or leave "--" out.');
  }
  let idea = null;
  if (step === 'propose' && args.length && !(args.length === 1 && ID.test(args[0]))) {
    idea = args.join(' ');
    args = [];
  }
  for (const a of args) {
    if (!ID.test(a)) throw new LaunchError(`"${a}" is not an identifier (lowercase letters, digits and "-"): give free text after "--".`);
  }
  return { args, idea, prompt };
}

// The program, arguments and launch message of a tool (V-O1: OpenCode needs the trailing space).
export function toolCommand(tool, agent, step, args) {
  const message = `/f3-${step}${args.length ? ' ' + args.join(' ') : ''}`;
  if (tool === 'claude') return { program: 'claude', argv: ['--agent', agent, message] };
  return { program: 'opencode', argv: ['--standalone', '--prompt', `${message} `] };
}

// Writes the idea and the prompt (each one null when absent) in a private file; returns its path.
// The file is written even when both are absent: F3_LAUNCH tells f3 state that f3 started the session.
export function writeLaunchFile({ idea, prompt }) {
  const dir = mkdtempSync(join(tmpdir(), LAUNCH_PREFIX));
  chmodSync(dir, 0o700);
  const file = join(dir, LAUNCH_FILE);
  writeFileSync(file, JSON.stringify({ idea, prompt }), { mode: 0o600 });
  return file;
}

async function askTerminal(tools) {
  if (!process.stdin.isTTY) return null;
  return askTool(tools, process.stdin, process.stdout);
}

// f3 <step> ...: returns the exit code of the tool, or 1.
export async function launch(step, agent, words, { render, ask = askTerminal, spawn = spawnSync } = {}) {
  let parsed;
  let tool;
  try {
    parsed = parseLaunch(step, words);
    tool = await projectTool({ ask });
  } catch (error) {
    if (error instanceof LaunchError) {
      console.error(`f3: ${error.message}`);
      return 1;
    }
    throw error;
  }
  try {
    render(tool);
  } catch (error) {
    console.error(`f3: the render of ${TOOL_NAMES[tool]} failed, so ${TOOL_NAMES[tool]} is not started: ${error.message}`);
    return 1;
  }
  const { program, argv } = toolCommand(tool, agent, step, parsed.args);
  const file = writeLaunchFile(parsed);
  try {
    const result = spawn(program, argv, { stdio: 'inherit', env: { ...process.env, F3_LAUNCH: file } });
    if (result.error) {
      console.error(`f3: cannot start ${TOOL_NAMES[tool]}: ${result.error.message}`);
      return 1;
    }
    return result.status ?? 1;
  } finally {
    rmSync(join(file, '..'), { recursive: true, force: true });
  }
}

// f3 tool [<tool>]: shows the tool of the project, or sets it in .f3/local.
export function toolSubcommand(args, { installed = installedTools() } = {}) {
  try {
    if (args.length > 1) throw new LaunchError(`usage: f3 tool [${TOOLS.join('|')}]`);
    if (!args.length) {
      const tool = readLocal()?.tool;
      console.log(tool ? `${tool} (${TOOL_NAMES[tool]})` : `No tool set for this project (${LOCAL} absent): f3 <step> sets it.`);
      return 0;
    }
    const [tool] = args;
    if (!TOOLS.includes(tool)) throw new LaunchError(`unknown tool "${tool}" (expected: ${TOOLS.join(', ')})`);
    writeLocal(tool);
    console.log(`Tool of this project: ${TOOL_NAMES[tool]} (${LOCAL}).`);
    if (!installed.includes(tool)) console.error(`Warning: f3 is not installed for ${TOOL_NAMES[tool]}: run install.sh ${tool}.`);
    return 0;
  } catch (error) {
    if (error instanceof LaunchError) {
      console.error(`f3: ${error.message}`);
      return 1;
    }
    throw error;
  }
}
