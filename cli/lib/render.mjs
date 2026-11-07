// f3 render: renders the agents and commands of the toolkit for one tool (analysis, 4.4 and 4.5).
// The render is built in memory, then named by its SHA-256 fingerprint: build/<tool>.<fingerprint>/.
// That directory is written only if it does not exist, in build/.tmp.<pid>/ then renamed, so that it
// has its final name only once complete. build/<tool> is a link switched atomically to it (D17).
// A render that fails switches nothing: the link keeps the last complete render (D18).
// Skills, schemas and scripts are not rendered: they stay linked to the sources (D20).
import { createHash } from 'node:crypto';
import {
  cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync,
  symlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ROOT } from './toolkit.mjs';

export const TOOLS = ['claude', 'opencode'];
// The kinds of files that are rendered; every other file of a module is used as is.
const RENDERED = ['agents', 'commands'];
const TMP_MAX_AGE_MS = 60 * 60 * 1000;

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

// Removes the fingerprint directories of the tool that the link does not target, and the temporary
// entries older than one hour (interrupted renders). Never fails the render: a read-only toolkit
// whose render is up to date keeps working.
function clean(build, tool, target, now = Date.now()) {
  const own = new RegExp(`^${tool}\\.[0-9a-f]{64}$`);
  for (const name of readdirSync(build)) {
    const path = join(build, name);
    try {
      if (own.test(name) && name !== target) rmSync(path, { recursive: true, force: true });
      else if (name.startsWith('.tmp.') && now - lstatSync(path).mtimeMs > TMP_MAX_AGE_MS) rmSync(path, { recursive: true, force: true });
    } catch {
      // left for a later render
    }
  }
}

// Renders a tool into <root>/build. Returns { tool, fingerprint, dir, written, switched }.
export function render(tool, { root = ROOT } = {}) {
  const files = renderFiles(tool, root);
  const hash = fingerprint(files);
  const build = join(root, 'build');
  const name = `${tool}.${hash}`;
  const dir = join(build, name);
  const link = join(build, tool);
  let written = false;
  let switched = false;
  try {
    mkdirSync(build, { recursive: true });
    if (!existsSync(dir)) {
      const tmp = join(build, `.tmp.${process.pid}`);
      rmSync(tmp, { recursive: true, force: true }); // left by an earlier process with the same pid
      try {
        writeFiles(tmp, files);
        renameSync(tmp, dir);
        written = true;
      } catch (error) {
        rmSync(tmp, { recursive: true, force: true });
        // Another render of the same content won the rename: both converge on the same directory.
        if (!existsSync(dir)) throw error;
      }
    }
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
  } catch (error) {
    throw writeError(build, error);
  }
  clean(build, tool, name);
  return { tool, fingerprint: hash, dir, written, switched };
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
      console.log(`${tool}: build/${tool} -> ${tool}.${r.fingerprint}${r.switched ? ' (switched)' : ''}`);
    }
  }
  return 0;
}
