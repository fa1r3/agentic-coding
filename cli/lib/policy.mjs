// Permission table of an agent (<agent>.permission, beside its source in modules/) and its evaluation.
// Semantics of OpenCode: wildcard globs ("*" matches any text, "/" included), the last matching rule wins.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { HOME, parseYaml, permissionFile } from './toolkit.mjs';

const KEYS = ['edit', 'read', 'shell_read_programs', 'subagent'];
const VALUES = ['allow', 'ask', 'deny'];

export function loadPolicy(agent) {
  const file = permissionFile(agent);
  if (!file) throw new Error(`unknown agent "${agent}"`);
  const table = parseYaml(readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(table)) {
    if (!KEYS.includes(key)) throw new Error(`unknown key "${key}" in ${agent}.permission`);
    const values = typeof value === 'string' ? [value] : Object.values(value);
    for (const v of values) if (!VALUES.includes(v)) throw new Error(`unknown value "${v}" for ${key} in ${agent}.permission`);
  }
  return table;
}

export function wildcard(text, pattern) {
  let p = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  if (p.endsWith(' .*')) p = p.slice(0, -3) + '( .*)?';
  return new RegExp('^' + p + '$', 's').test(text);
}

function expandHome(p) {
  return p === '~' ? HOME : p.startsWith('~/') ? join(HOME, p.slice(2)) : p;
}

// Resource of a path: relative to the project root inside it, absolute outside it. A relative path is
// resolved against base, the current folder of the call (the root by default).
// A directory ends with "/", so that "tests/*" covers the folder tests itself; the root is ".".
export function resource(path, root, { directory = false, base = root } = {}) {
  const abs = resolve(base, expandHome(path));
  const rel = relative(root, abs);
  if (rel === '') return '.';
  const inside = !rel.startsWith('..') && !isAbsolute(rel);
  let res = (inside ? rel : abs).split(sep).join('/');
  let dir = directory;
  if (!dir) {
    try { dir = statSync(abs).isDirectory(); } catch { dir = false; }
  }
  return dir ? res + '/' : res;
}

// Effect of a rule table on a resource: "allow", "ask", "deny", or null when no rule matches.
export function evaluate(rules, res) {
  if (rules === undefined) return null;
  if (typeof rules === 'string') return rules;
  let effect = null;
  for (const [pattern, value] of Object.entries(rules)) {
    const expanded = expandHome(pattern);
    const target = isAbsolute(expanded) ? expanded : pattern;
    if (wildcard(res, target)) effect = value;
  }
  return effect;
}

// Programs that read files, refused in the shell of an agent with shell_read_programs: deny.
// The search programs (grep, rg, find) are the exception: Claude Code has no search tool, so they
// are permitted when every path they search is readable by the agent.
const READ_PROGRAMS = new Set(['cat', 'head', 'tail', 'less', 'more', 'sed', 'awk', 'xxd', 'strings']);
const SEARCH_PROGRAMS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'find']);
const CODE_FLAGS = { node: ['-e', '--eval', '-p', '--print'], python: ['-c'], python3: ['-c'] };
// Programs that run another program given as their arguments.
const WRAPPERS = new Set(['env', 'nice', 'nohup', 'time', 'timeout', 'command', 'exec', 'sudo', 'stdbuf']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash']);

// Placeholder of a command substitution inside a word: its command is checked on its own.
const SUBSTITUTION = '$(…)';

// Reads a shell command as bash does: quotes, escapes, operators, command substitutions.
// Returns { segments: [{ words, piped }], substitutions: [command] }, or null if a quote, a
// backquote or a substitution is not closed. An operator inside quotes is part of the word;
// quoted parts glued together make one word ("a "b"" is "a b"); between single quotes nothing is
// special; between double quotes \ escapes only $ ` " \ and newline, and $( ) and backquotes still
// run a command, which is returned in substitutions.
export function parseShell(command) {
  const segments = [];
  const substitutions = [];
  let words = [];
  let word = null;
  let piped = false;
  const endWord = () => { if (word !== null) words.push(word); word = null; };
  const endSegment = (nextPiped) => {
    endWord();
    if (words.length) segments.push({ words, piped });
    words = [];
    piped = nextPiped;
  };
  const add = (text) => { word = (word ?? '') + text; };
  // The command of $( at index i (after "$("), up to its closing parenthesis; returns [command, next index] or null.
  const dollarParen = (i) => {
    let depth = 1;
    let quote = null;
    for (let j = i; j < command.length; j++) {
      const c = command[j];
      if (quote === "'") { if (c === "'") quote = null; continue; }
      if (c === '\\') { j++; continue; }
      if (quote === '"') { if (c === '"') quote = null; continue; }
      if (c === "'" || c === '"') { quote = c; continue; }
      if (c === '(') depth++;
      if (c === ')' && --depth === 0) return [command.slice(i, j), j + 1];
    }
    return null;
  };
  const backquote = (i) => {
    for (let j = i; j < command.length; j++) {
      if (command[j] === '\\') { j++; continue; }
      if (command[j] === '`') return [command.slice(i, j), j + 1];
    }
    return null;
  };
  // A substitution starting at index i ($( or `); returns the next index, or -1 if not closed.
  const substitution = (i) => {
    const found = command[i] === '`' ? backquote(i + 1) : dollarParen(i + 2);
    if (!found) return -1;
    substitutions.push(found[0]);
    add(SUBSTITUTION);
    return found[1];
  };
  let i = 0;
  while (i < command.length) {
    const c = command[i];
    const two = command.slice(i, i + 2);
    if (c === "'") {
      const end = command.indexOf("'", i + 1);
      if (end < 0) return null;
      add(command.slice(i + 1, end));
      i = end + 1;
    } else if (c === '"') {
      add('');
      i++;
      for (;;) {
        if (i >= command.length) return null;
        const d = command[i];
        if (d === '"') { i++; break; }
        if (d === '\\' && i + 1 < command.length && '$`"\\\n'.includes(command[i + 1])) { add(command[i + 1]); i += 2; continue; }
        if (d === '`' || command.slice(i, i + 2) === '$(') { i = substitution(i); if (i < 0) return null; continue; }
        add(d);
        i++;
      }
    } else if (c === '\\') {
      if (i + 1 < command.length && command[i + 1] !== '\n') add(command[i + 1]);
      i += 2;
    } else if (c === '`' || two === '$(') {
      i = substitution(i);
      if (i < 0) return null;
    } else if (two === '||' || two === '&&') {
      endSegment(false);
      i += 2;
    } else if ('|;&\n()'.includes(c)) {
      endSegment(c === '|');
      i++;
    } else if (/\s/.test(c)) {
      endWord();
      i++;
    } else {
      add(c);
      i++;
    }
  }
  endSegment(false);
  return { segments, substitutions };
}

function gitSubcommand(args) {
  for (let i = 0; i < args.length; i++) {
    if (['-C', '-c', '--git-dir', '--work-tree'].includes(args[i])) { i++; continue; }
    if (!args[i].startsWith('-')) return { sub: args[i], rest: args.slice(i + 1) };
  }
  return { sub: null, rest: [] };
}

// Options that take a value, per search program; "file" marks a value that is a file to read.
const GREP_OPTS = { short: { e: 'pattern', f: 'file', m: 1, A: 1, B: 1, C: 1, d: 1, D: 1 },
  long: { regexp: 'pattern', file: 'file', 'max-count': 1, 'after-context': 1, 'before-context': 1, context: 1, include: 1, exclude: 1, 'exclude-dir': 1, 'exclude-from': 'file', label: 1, devices: 1, directories: 1, 'binary-files': 1, 'group-separator': 1 } };
const RG_OPTS = { short: { e: 'pattern', f: 'file', g: 1, t: 1, T: 1, m: 1, A: 1, B: 1, C: 1, j: 1, M: 1, E: 1, r: 1, d: 1 },
  long: { regexp: 'pattern', file: 'file', glob: 1, iglob: 1, type: 1, 'type-not': 1, 'type-add': 1, 'type-clear': 1, 'max-count': 1, 'after-context': 1, 'before-context': 1, context: 1, threads: 1, 'max-columns': 1, encoding: 1, replace: 1, 'max-depth': 1, 'max-filesize': 1, 'ignore-file': 'file', sort: 1, sortr: 1, pre: 1, 'pre-glob': 1, 'path-separator': 1, 'context-separator': 1, 'field-match-separator': 1, 'field-context-separator': 1, colors: 1, color: 1, engine: 1, 'dfa-size-limit': 1, 'regex-size-limit': 1 } };
const FIND_FORBIDDEN = ['-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls', '-delete'];

// Paths searched by grep or rg: { paths, files } (files: files read for patterns), or null if unparsable.
function searchPaths(program, args, piped) {
  if (program === 'find') {
    let i = 0;
    while (i < args.length && /^-[HLP]$|^-O\d$/.test(args[i])) i++;
    if (args[i] === '-D') i += 2;
    const paths = [];
    while (i < args.length && !/^[-(!]/.test(args[i])) paths.push(args[i++]);
    const forbidden = args.slice(i).find((a) => FIND_FORBIDDEN.includes(a));
    if (forbidden) return { forbidden: `find ${forbidden}` };
    return { paths: paths.length ? paths : ['.'], files: [] };
  }
  const opts = program === 'rg' ? RG_OPTS : GREP_OPTS;
  const positional = [];
  const files = [];
  let patternGiven = false;
  let recursive = program === 'rg';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { positional.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const [name, value] = a.slice(2).split(/=(.*)/s);
      if (['recursive', 'dereference-recursive'].includes(name)) recursive = true;
      if (program === 'rg' && name === 'files') patternGiven = true;
      const kind = opts.long[name];
      if (!kind) continue;
      const v = value !== undefined ? value : args[++i];
      if (kind === 'pattern') patternGiven = true;
      if (kind === 'file' && v !== undefined) { files.push(v); patternGiven = patternGiven || name === 'file'; }
      continue;
    }
    if (a.startsWith('-') && a.length > 1) {
      for (let j = 1; j < a.length; j++) {
        const c = a[j];
        if (program !== 'rg' && (c === 'r' || c === 'R')) recursive = true;
        const kind = opts.short[c];
        if (!kind) continue;
        const v = j + 1 < a.length ? a.slice(j + 1) : args[++i];
        if (kind === 'pattern') patternGiven = true;
        if (kind === 'file' && v !== undefined) { files.push(v); patternGiven = true; }
        break;
      }
      continue;
    }
    positional.push(a);
  }
  const paths = (patternGiven ? positional : positional.slice(1)).filter((p) => p !== '-');
  if (!paths.length) {
    // Without a path, rg searches the working folder unless its input is piped; grep only when recursive.
    const searchesRoot = program === 'rg' ? !piped : recursive;
    return { paths: searchesRoot ? ['.'] : [], files };
  }
  return { paths, files };
}

// Checks a shell command for an agent with shell_read_programs: deny. Returns the reason of a
// refusal, or null. Reading programs are refused; search programs only outside the readable paths.
export function shellReadCheck(command, table, root, depth = 0, cwd = root) {
  const parsed = parseShell(command);
  if (!parsed) return { program: 'the shell', reason: 'unreadable' };
  if (depth < 3) {
    for (const inner of parsed.substitutions) {
      const found = shellReadCheck(inner, table, root, depth + 1, cwd);
      if (found) return found;
    }
  } else if (parsed.substitutions.length) return { program: 'the shell', reason: 'unreadable' };
  for (const segment of parsed.segments) {
    const { piped } = segment;
    let w = segment.words;
    while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w = w.slice(1);
    if (!w.length) continue;
    let program = w[0].split('/').pop();
    let viaXargs = false;
    while (WRAPPERS.has(program) || program === 'xargs') {
      if (program === 'xargs') viaXargs = true;
      w = w.slice(1);
      while (w.length && (w[0].startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || (program === 'timeout' && /^\d/.test(w[0])))) w = w.slice(1);
      if (!w.length) break;
      program = w[0].split('/').pop();
    }
    if (!w.length) continue;
    if (SHELLS.has(program)) {
      const i = w.indexOf('-c');
      if (i > 0 && w[i + 1] !== undefined && depth < 3) {
        const inner = shellReadCheck(w[i + 1], table, root, depth + 1, cwd);
        if (inner) return inner;
      }
      continue;
    }
    if (READ_PROGRAMS.has(program)) return { program, reason: 'read' };
    if (SEARCH_PROGRAMS.has(program)) {
      if (viaXargs) return { program: `xargs ${program}`, reason: 'read' };
      const found = searchPaths(program === 'egrep' || program === 'fgrep' ? 'grep' : program, w.slice(1), piped);
      if (found.forbidden) return { program: found.forbidden, reason: 'read' };
      for (const path of [...found.paths, ...found.files]) {
        // A folder named with a final "/", or a path that does not exist yet (nothing to read) and is not a
        // glob the shell would expand, is matched as a folder: "test-results/*" covers test-results.
        const absent = !/[*?[]/.test(path) && !existsSync(resolve(cwd, expandHome(path)));
        const res = resource(path, root, { base: cwd, directory: path.endsWith('/') || absent });
        const effect = evaluate(table.read, res);
        if (effect === 'deny' || effect === 'ask') return { program, reason: 'search', path: res };
      }
      continue;
    }
    if (program === 'git') {
      const { sub, rest } = gitSubcommand(w.slice(1));
      if (['show', 'grep', 'diff'].includes(sub)) return { program: `git ${sub}`, reason: 'read' };
      if (sub === 'log' && rest.some((a) => a === '-p' || a === '--patch' || /^-[a-zA-Z]*p$/.test(a))) return { program: 'git log -p', reason: 'read' };
    }
    const flags = CODE_FLAGS[program];
    const flag = flags && w.slice(1).find((a) => flags.some((f) => a === f || a.startsWith(f + '=')));
    if (flag) return { program: `${program} ${flag}`, reason: 'read' };
  }
  return null;
}

function staticPrefix(pattern) {
  const segments = pattern.split('/');
  const fixed = [];
  for (const s of segments) {
    if (/[*?[\]{}]/.test(s)) break;
    fixed.push(s);
  }
  return fixed.join('/');
}

function readableList(table) {
  if (typeof table.read !== 'object') return '';
  const allowed = Object.entries(table.read).filter(([, v]) => v === 'allow').map(([p]) => p.replace(/\/\*$/, '/'));
  return allowed.length ? `; you may read ${allowed.join(', ')}` : '';
}

// Decision on one tool call: { effect: 'deny' | 'ask', reason } or null (no decision).
// root is the project folder, against which the rules are written; cwd is the current folder of the
// call, against which its relative paths are resolved.
export function decide(agent, table, call, root, cwd = root) {
  const { tool, input = {} } = call;
  const verdict = (effect, reason) => (effect === 'deny' || effect === 'ask' ? { effect, reason: `f3 guard (${agent}): ${reason}` } : null);

  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
    const path = input.file_path ?? input.notebook_path;
    if (!path) return null;
    const res = resource(path, root, { base: cwd });
    const effect = evaluate(table.edit, res);
    return verdict(effect, effect === 'ask' ? `editing ${res} needs the user's confirmation` : `the ${agent} may not edit ${res}`);
  }

  if (['Read', 'Grep', 'Glob'].includes(tool) && table.read !== undefined) {
    const paths = [];
    if (tool === 'Read') paths.push([input.file_path, false]);
    else {
      const base = input.path ?? '.';
      paths.push([base, tool === 'Glob']);
      if (tool === 'Glob' && input.pattern) {
        const prefix = staticPrefix(input.pattern);
        if (prefix) paths.push([isAbsolute(prefix) ? prefix : join(resolve(cwd, expandHome(base)), prefix), false]);
      }
    }
    for (const [path, directory] of paths) {
      if (!path) continue;
      const res = resource(path, root, { directory, base: cwd });
      const effect = evaluate(table.read, res);
      if (effect === 'deny' || effect === 'ask') return verdict(effect, `the ${agent} may not read ${res}${readableList(table)}`);
    }
    return null;
  }

  if (tool === 'Bash' && table.shell_read_programs === 'deny') {
    const found = shellReadCheck(input.command || '', table, root, 0, cwd);
    if (!found) return null;
    if (found.reason === 'unreadable') return verdict('deny', `the ${agent}'s shell command could not be read: a quote, a backquote or a $( is not closed, or substitutions are nested too deep`);
    if (found.reason === 'search') return verdict('deny', `the ${agent} may search only in what it may read, not in ${found.path} (${found.program})${readableList(table)}`);
    return verdict('deny', `the ${agent} does not read files through the shell (${found.program}). Use the Read tool, or search with grep, rg or find in what you may read${readableList(table)}`);
  }

  if (tool === 'Agent' && table.subagent !== undefined) {
    const type = input.subagent_type || 'general-purpose';
    const effect = evaluate(table.subagent, type);
    return verdict(effect, `the ${agent} may not call the subagent "${type}"`);
  }

  return null;
}
