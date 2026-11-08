// The files of each tool in a project (D2, analysis 4.3 and 4.10, R14), read in the current directory.
// - A tool is a tool of the project when f3 is installed for it, or when the project already has one
//   of its files: those f3 init writes, or the OpenSpec skills of the tool.
// - A tool of the project lacks files when one that f3 init always writes is absent, or, once
//   openspec/ exists, its OpenSpec skills; .mcp.json is written only when a server is decided.
// - The MCP servers are decided once, in the Stack section of AGENTS.md: opencode.json and .mcp.json
//   are two translations of it, whose server names must agree (R14).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { TOOLS, TOOL_NAMES } from './toolkit.mjs';

// The files of the project that f3 init writes for each tool, the ones it always writes, and the
// folder where OpenSpec installs the skills of the tool (openspec init --tools <tool>).
export const PROJECT_FILES = {
  claude: { files: ['CLAUDE.md', '.mcp.json', '.claude/settings.json'], always: ['CLAUDE.md', '.claude/settings.json'], skills: '.claude/skills' },
  opencode: { files: ['opencode.json'], always: ['opencode.json'], skills: '.opencode/skills' },
};

export function openspecSkills(tool) {
  const dir = PROJECT_FILES[tool].skills;
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.startsWith('openspec-')).sort();
}

// The tools of the project: [{ tool, installed, present: [<what shows it in the project>] }].
export function projectTools(installed) {
  return TOOLS.map((tool) => {
    const { files, skills } = PROJECT_FILES[tool];
    const present = files.filter((f) => existsSync(f));
    if (openspecSkills(tool).length) present.push(`${skills}/openspec-*`);
    return { tool, installed: installed.includes(tool), present };
  }).filter((t) => t.installed || t.present.length);
}

// What a tool of the project lacks: the files f3 init always writes, then its OpenSpec skills.
export function missingFiles(tool) {
  const { always, skills } = PROJECT_FILES[tool];
  const missing = always.filter((f) => !existsSync(f));
  if (existsSync('openspec') && !openspecSkills(tool).length) missing.push(`${skills}/openspec-*`);
  return missing;
}

// true or false; null outside a Git repository.
export function localIgnored() {
  try {
    execFileSync('git', ['check-ignore', '-q', '.f3/local'], { stdio: 'ignore' });
    return true;
  } catch (error) {
    return error.status === 1 ? false : null;
  }
}

// The names of the servers found at the path of keys, in a JSON file: mcpServers in .mcp.json, mcp.servers
// in opencode.json (OpenCode reads its servers there since its configuration V2).
function serverNames(file, keys) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const servers = keys.reduce((node, key) => node?.[key], config);
  return servers && typeof servers === 'object' ? Object.keys(servers).sort() : [];
}

// The difference between the MCP servers of opencode.json and .mcp.json, as a sentence, or null when
// either file is absent or both name the same servers.
export function mcpGap() {
  if (!existsSync('opencode.json') || !existsSync('.mcp.json')) return null;
  let oc;
  let cc;
  try {
    oc = serverNames('opencode.json', ['mcp', 'servers']);
    cc = serverNames('.mcp.json', ['mcpServers']);
  } catch (error) {
    return `cannot compare the MCP servers of opencode.json and .mcp.json: ${error.message}`;
  }
  if (oc.join(',') === cc.join(',')) return null;
  const list = (names) => (names.length ? names.join(', ') : 'none');
  return `the MCP servers of opencode.json (${list(oc)}) and .mcp.json (${list(cc)}) differ`;
}

// The warning lines of a framed project about the files of its tools: one per tool that lacks files,
// one when .f3/local is not ignored by Git, one when the MCP servers differ. None blocks.
export function toolWarnings(installed) {
  const fix = 'run f3 init, theme Tools';
  const lines = [];
  for (const { tool, installed: inst } of projectTools(installed)) {
    const missing = missingFiles(tool);
    if (missing.length) {
      lines.push(`- Warning: the project lacks files of ${TOOL_NAMES[tool]}, ${inst ? 'which f3 is installed for' : 'which the project uses'} (${missing.join(', ')}): ${fix}.`);
    }
  }
  if (localIgnored() === false) lines.push(`- Warning: .f3/local, the tool of each user, is not ignored by Git: ${fix}.`);
  const gap = mcpGap();
  if (gap) lines.push(`- Warning: ${gap}: ${fix}.`);
  return lines;
}
