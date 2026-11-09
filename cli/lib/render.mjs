// f3 render: renders the agents and commands of the toolkit for one tool (analysis, 4.4 and 4.5).
// Each one is assembled from its common source, the head of the tool (tools/<tool>/agent.head or
// command.head), its keys as the tool names them (keys), its refused tools (deny-tools, through
// tools) and, for an agent, its permission table (<agent>.permission); the variables of the tool
// (vars) fill the body. No condition: concatenation, substitution and translation only.
// The render is built in memory and fingerprinted (SHA-256 of its paths and contents). It is written
// in build/.tmp.<pid>/, then renamed build/<tool>.<fingerprint>.<pid>/, so that a directory has its
// final name only once complete; build/<tool> is a link switched atomically to it (D17).
// No lock, and no hole between concurrent renders (D17 revised):
// - only the creator of a directory (the pid in its name) ever switches the link to it; an existing
//   directory is reused only when it is already the target, and nothing is written then;
// - the cleanup removes an entry only once its creator has ended, and reads the link after that
//   check: a directory it removes can never become the target again;
// - after its switch, a render checks the sources again and starts over if they changed: the last
//   render to switch has seen the current sources.
// A render that fails switches nothing: the link keeps the last complete render (D18).
// Skills, schemas and scripts are not rendered: they stay linked to the sources (D20).
import { createHash } from 'node:crypto';
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ROOT, TOOLS, fillPermission } from './toolkit.mjs';

export { TOOLS };
// The kinds of files that are rendered; every other file of a module is used as is.
const RENDERED = ['agents', 'commands'];
// Renders in a row whose sources changed before their check, before giving up.
const MAX_ROUNDS = 3;
const TMP = /^\.tmp\.([1-9][0-9]*)(\.link)?$/;
const renderName = (tool) => new RegExp(`^${tool}\\.([0-9a-f]{64})\\.([1-9][0-9]*)$`);

function modules(root) {
  const dir = join(root, 'modules');
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

function checkTool(tool) {
  if (!TOOLS.includes(tool)) throw new Error(`unknown tool "${tool}" (expected: ${TOOLS.join(', ')})`);
}

// Reads tools/<tool>/<name>: "KEY=value" lines; blank lines and lines starting with "#" are skipped.
function readTable(root, tool, name) {
  const file = join(root, 'tools', tool, name);
  const table = {};
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const at = line.indexOf('=');
    if (at <= 0) throw new Error(`unreadable line ${i + 1} of tools/${tool}/${name}: ${line}`);
    table[line.slice(0, at)] = line.slice(at + 1);
  });
  return table;
}

// The fixed set of variables of a tool (tools/<tool>/vars), substituted as {{NAME}} (analysis, 4.5).
function substitute(text, vars) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (all, name) => (Object.hasOwn(vars, name) ? vars[name] : all));
}

// Splits a source into its frontmatter lines ("key: value", one per line) and its body.
function splitSource(text, path) {
  const lines = text.split('\n');
  const end = lines.indexOf('---', 1);
  if (lines[0] !== '---' || end < 0) throw new Error(`${path}: no frontmatter`);
  const keys = lines.slice(1, end).map((line) => {
    const m = /^([a-z][a-z-]*): (.+)$/.exec(line);
    if (!m) throw new Error(`${path}: unreadable frontmatter line: ${line}`);
    return { key: m[1], line };
  });
  return { keys, body: lines.slice(end + 1).join('\n') };
}

// The frontmatter keys of a source as the tool names them (tools/<tool>/keys): a key mapped to a
// name is renamed, a key mapped to nothing is left out, any other key is kept.
function frontmatterLines(keys, table) {
  return keys.flatMap(({ key, line }) => {
    if (!Object.hasOwn(table, key)) return [line];
    return table[key] ? [table[key] + line.slice(key.length)] : [];
  });
}

// Lines of the refused tools of an agent (deny-tools) for a tool (tools/<tool>/tools): a built-in tool
// by its name in the table, any other name as an MCP server through the "mcp" pattern; "deny" writes
// them on one line with <tools> (joined by ", "), or one line per tool with <tool>. No tool, no line.
function denyLines(names, table, path) {
  for (const k of ['mcp', 'deny']) if (!table[k]) throw new Error(`${path}: the key "${k}" is missing from the tools table`);
  const tools = names.map((n) => (Object.hasOwn(table, n) && !['mcp', 'deny'].includes(n) ? table[n] : table.mcp.replace('<server>', n)));
  if (!tools.length) return [];
  if (table.deny.includes('<tools>')) return [table.deny.replace('<tools>', tools.join(', '))];
  return tools.map((t) => table.deny.replace('<tool>', t));
}

// Fills a head (tools/<tool>/agent.head or command.head): {{NAME}} anywhere, and {{FRONTMATTER}},
// {{PERMISSION}} and {{DENY}} each alone on its line, replaced by zero or more lines.
function fillHead(head, values) {
  return head.replace(/\n$/, '').split('\n').flatMap((line) => {
    const m = /^\{\{(FRONTMATTER|PERMISSION|DENY)\}\}$/.exec(line);
    if (m) return values[m[1]];
    return [line.replaceAll('{{NAME}}', values.NAME)];
  }).join('\n');
}

// One agent or command of a tool: the head of the tool, filled from the common frontmatter (and, for
// an agent, from <agent>.permission), then the common body with the variables of the tool.
function assemble(tool, root, mod, kind, file, tables) {
  const path = `${mod}/${kind}/${file}`;
  const { keys, body } = splitSource(readFileSync(join(root, 'modules', path), 'utf8'), path);
  const name = file.replace(/\.md$/, '');
  const values = { NAME: name, PERMISSION: [], DENY: [] };
  let common = keys;
  if (kind === 'agents') {
    const deny = keys.find((k) => k.key === 'deny-tools');
    common = keys.filter((k) => k.key !== 'deny-tools');
    values.DENY = denyLines(deny ? deny.line.slice('deny-tools: '.length).trim().split(/\s+/) : [], tables.tools, path);
    const permission = join(root, 'modules', mod, kind, `${name}.permission`);
    if (!existsSync(permission)) throw new Error(`${path}: no permission table ${name}.permission`);
    values.PERMISSION = fillPermission(readFileSync(permission, 'utf8'), tool).replace(/\n$/, '').split('\n').map((l) => (l ? `  ${l}` : l));
  }
  values.FRONTMATTER = frontmatterLines(common, tables.keys);
  const head = kind === 'agents' ? tables.agentHead : tables.commandHead;
  return `${fillHead(head, values)}\n${substitute(body, tables.vars)}`;
}

// Rendered files of a tool, sorted by path: [{ path: "<module>/<kind>/<file>", content }]. Only the
// .md files are rendered; an agent's <agent>.permission goes into its frontmatter.
export function renderFiles(tool, root = ROOT) {
  checkTool(tool);
  const tables = {
    vars: readTable(root, tool, 'vars'),
    keys: readTable(root, tool, 'keys'),
    tools: readTable(root, tool, 'tools'),
    agentHead: readFileSync(join(root, 'tools', tool, 'agent.head'), 'utf8'),
    commandHead: readFileSync(join(root, 'tools', tool, 'command.head'), 'utf8'),
  };
  const files = [];
  for (const mod of modules(root)) {
    for (const kind of RENDERED) {
      const dir = join(root, 'modules', mod, kind);
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
        files.push({ path: `${mod}/${kind}/${entry.name}`, content: assemble(tool, root, mod, kind, entry.name, tables) });
      }
    }
  }
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const unrendered = files.filter((f) => f.content.includes('{{')).map((f) => f.path);
  if (unrendered.length) throw new Error(`"{{" left in the render of ${tool}: ${unrendered.join(', ')}`);
  return files;
}

// SHA-256 of the paths and contents, each one preceded by its length so that no two renders collide.
export function fingerprint(files) {
  const hash = createHash('sha256');
  for (const { path, content } of files) {
    for (const part of [path, content]) {
      const bytes = Buffer.from(part, 'utf8');
      hash.update(`${bytes.length}:`);
      hash.update(bytes);
    }
  }
  return hash.digest('hex');
}

function writeFiles(dir, files) {
  for (const { path, content } of files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
}

function readLink(link) {
  try {
    return readlinkSync(link);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    if (error.code === 'EINVAL') throw new Error(`${link} exists and is not a link: move it, then render again`);
    throw error;
  }
}

function writeError(build, error) {
  if (['EACCES', 'EPERM', 'EROFS'].includes(error.code)) {
    return new Error(`cannot write the render in ${build} (${error.code}): the toolkit is read-only and its render is out of date; run install.sh with write access to the toolkit`);
  }
  return error;
}

// Whether the process that created an entry may still use it. A pid reused by another process
// only delays the cleanup.
function running(pid) {
  if (pid === process.pid) return false; // this render is past its switch
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

// Makes build/<tool> point at a complete render of these files. Returns { name, written, switched }.
function place(tool, build, link, hash, files) {
  const current = readLink(link);
  const m = current && renderName(tool).exec(current);
  if (m && m[1] === hash && existsSync(join(build, current))) return { name: current, written: false, switched: false };
  const name = `${tool}.${hash}.${process.pid}`;
  const dir = join(build, name);
  const tmp = join(build, `.tmp.${process.pid}`);
  mkdirSync(build, { recursive: true });
  // Leftovers of this pid: an earlier render of this process, or of an ended process with the same
  // pid. Neither is the target (checked above), and no other process switches to them.
  rmSync(dir, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
  try {
    writeFiles(tmp, files);
    renameSync(tmp, dir);
  } catch (error) {
    rmSync(tmp, { recursive: true, force: true });
    throw error;
  }
  let switched = false;
  if (readLink(link) !== name) {
    const next = join(build, `.tmp.${process.pid}.link`);
    rmSync(next, { force: true });
    symlinkSync(name, next);
    try {
      renameSync(next, link);
    } catch (error) {
      rmSync(next, { force: true });
      throw error;
    }
    switched = true;
  }
  return { name, written: true, switched };
}

// Removes the renders of the tool and the temporary entries whose creator has ended, except the
// target of the link, read after that check. Never fails the render: a read-only toolkit whose
// render is up to date keeps working.
function clean(build, tool, link) {
  let names;
  try {
    names = readdirSync(build);
  } catch {
    return;
  }
  for (const name of names) {
    const own = renderName(tool).exec(name);
    const tmp = TMP.exec(name);
    if (!own && !tmp) continue;
    if (running(Number(own ? own[2] : tmp[1]))) continue;
    try {
      if (own && readLink(link) === name) continue;
      rmSync(join(build, name), { recursive: true, force: true });
    } catch {
      // left for a later render
    }
  }
}

// Renders a tool into <root>/build. Returns { tool, fingerprint, dir, written, switched, rounds }.
// afterSwitch is called after each switch, for the tests only.
export function render(tool, { root = ROOT, afterSwitch } = {}) {
  const build = join(root, 'build');
  const link = join(build, tool);
  let files = renderFiles(tool, root);
  let written = false;
  let switched = false;
  for (let round = 1; ; round++) {
    const hash = fingerprint(files);
    let placed;
    try {
      placed = place(tool, build, link, hash, files);
    } catch (error) {
      throw writeError(build, error);
    }
    written ||= placed.written;
    switched ||= placed.switched;
    clean(build, tool, link);
    afterSwitch?.(round);
    const now = renderFiles(tool, root);
    if (fingerprint(now) === hash) {
      return { tool, fingerprint: hash, dir: join(build, placed.name), written, switched, rounds: round };
    }
    if (round === MAX_ROUNDS) {
      throw new Error(`the sources of ${tool} changed during each of ${MAX_ROUNDS} renders: render again once they are saved`);
    }
    files = now;
  }
}

// Writes the full view of a tool into <to>/<tool>/, laid out like modules/: the rendered files, and a
// copy of every other file of the modules. Used by install.sh --render for the comparison with the
// references (4.9); touches neither build/ nor the links.
export function renderView(tool, to, { root = ROOT } = {}) {
  const files = renderFiles(tool, root);
  const out = join(to, tool);
  if (existsSync(out)) throw new Error(`${out} already exists: choose an empty directory`);
  for (const mod of modules(root)) {
    cpSync(join(root, 'modules', mod), join(out, mod), {
      recursive: true,
      filter: (src) => !RENDERED.includes(relative(join(root, 'modules', mod), src).split('/')[0]),
    });
  }
  writeFiles(out, files);
  return out;
}

// f3 render [claude|opencode] [--to <dir>]: one tool, or both when none is named.
export function renderCommand(args) {
  const rest = [...args];
  let to = null;
  const at = rest.indexOf('--to');
  if (at >= 0) {
    to = rest[at + 1];
    if (!to) throw new Error('render: --to needs a directory');
    rest.splice(at, 2);
  }
  if (rest.length > 1) throw new Error('usage: f3 render [claude|opencode] [--to <dir>]');
  const tools = rest.length ? [rest[0]] : TOOLS;
  tools.forEach(checkTool);
  for (const tool of tools) {
    if (to) {
      console.log(`${tool}: ${renderView(tool, to)}`);
    } else {
      const r = render(tool);
      console.log(`${tool}: build/${tool} -> ${relative(join(ROOT, 'build'), r.dir)}${r.switched ? ' (switched)' : ''}`);
    }
  }
  return 0;
}
