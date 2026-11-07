// f3 render: renders the agents and commands of the toolkit for one tool (analysis, 4.4 and 4.5).
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
import { ROOT } from './toolkit.mjs';

export const TOOLS = ['claude', 'opencode'];
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

// Rendered files of a tool, sorted by path: [{ path: "<module>/<kind>/<file>", content }].
// At this step the sources do not change: the render of each tool is a copy.
export function renderFiles(tool, root = ROOT) {
  checkTool(tool);
  const files = [];
  for (const mod of modules(root)) {
    for (const kind of RENDERED) {
      const dir = join(root, 'modules', mod, kind);
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        files.push({ path: `${mod}/${kind}/${entry.name}`, content: readFileSync(join(dir, entry.name), 'utf8') });
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
