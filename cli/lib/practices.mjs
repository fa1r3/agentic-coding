// The practices catalog of the toolkit (practices/, REFERENTIEL-PRATIQUES.md) and the command
// f3 practices, which does the deterministic operations of the Practices phase of f3 init (D20):
//   f3 practices select --archetype <id|none> [facts]       candidates of the catalog for the project
//   f3 practices select --archetype <id|none> [facts] --check <ids>   refuses an invalid selection
//   f3 practices apply --archetype <id|none> [--recipe <id>] [--force <id>]... [<ids>]
//                                                           writes the Adopted practices section of
//                                                           AGENTS.md and the practice skills
//   f3 practices show <id>...                               prints entries, header and body (D28)
//   f3 practices diff <id>...                               differences between the text of the project and
//                                                           the catalog, for an update (step 7 of the plan)
//   f3 practices catalog                                    prints practices/catalog.md
// An entry is a folder practices/<kind folder>/<id>/ with ENTRY.md, or SKILL.md for a skill: a header in
// the YAML subset below, then its body. Entries are written in English (D23).
// Exit codes: 0 done, 1 error (usage, unreadable catalog, project), 3 refused (invalid selection, text
// modified by hand).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { PRACTICES_DIR } from './toolkit.mjs';

export const KINDS = { archetype: 'archetypes', recipe: 'recipes', rules: 'rules', skill: 'skills' };
export const STATUSES = ['stable', 'draft'];
// The closed vocabulary of applies-when (D20): each criterion is an option of f3 practices select.
// A criterion absent from an entry does not filter; a fact not given checks nothing, and is reported.
export const CRITERIA = {
  archetypes: { option: 'archetype', list: true },
  ui: { option: 'ui', values: ['yes', 'no'] },
  languages: { option: 'language', list: true },
  frameworks: { option: 'framework', list: true },
  exposure: { option: 'exposure', list: true, values: ['none', 'private', 'public'] },
};
// The sub-sections of the Stack section that a key of workflow-impact feeds (D26).
export const WORKFLOW_IMPACT = {
  modules: 'Modules',
  enforcement: 'Dependency enforcement',
  'entry-points': 'Entry points',
  ui: 'User interface',
  transport: 'Transport security',
  verification: 'Verification command',
  e2e: 'End-to-end tests',
  observation: 'Observing the running application',
};
// Global budget of the Adopted practices section of AGENTS.md, in lines (D11).
export const GLOBAL_BUDGET = 150;
export const SECTION = '## Adopted practices';
export const SKILL_PREFIX = 'practice-';
const MARKER = /<!-- f3 practices: (.*?) -->/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+\.\d+$/;

export class PracticesError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------------------------------
// Header of an entry: scalars, nested mappings, lists (inline [a, b] or "- item" lines of scalars),
// and folded (>) or literal (|) block scalars. A comment starts with " #" outside quotes.

function unquote(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function stripComment(value) {
  if (/^["']/.test(value.trim())) return value;
  return value.replace(/\s+#.*$/, '');
}

function scalar(value) {
  const v = stripComment(value).trim();
  if (v.startsWith('[')) {
    if (!v.endsWith(']')) throw new Error(`unterminated list: ${v}`);
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((x) => unquote(x)) : [];
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return unquote(v);
}

export function parseHeader(text) {
  const lines = text.split(/\r?\n/);
  const root = {};
  // A frame is the node being filled and the indentation of its key: the keys of a mapping are more
  // indented than its key; the items of a list may be at the indentation of its key.
  const stack = [{ indent: -1, node: root }];
  const indentOf = (l) => l.length - l.trimStart().length;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = indentOf(raw);
    const line = raw.trim();
    const item = line.startsWith('- ') || line === '-';
    while (stack.length > 1) {
      const top = stack[stack.length - 1];
      const inside = Array.isArray(top.node) ? indent > top.indent || (indent === top.indent && item) : indent > top.indent;
      if (inside) break;
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (item) {
      if (!Array.isArray(parent.node)) throw new Error(`list item outside a list: ${line}`);
      parent.node.push(scalar(line.slice(1)));
      continue;
    }
    if (Array.isArray(parent.node)) throw new Error(`key inside a list: ${line}`);
    const m = /^("[^"]*"|'[^']*'|[^:]+):(?:\s+(.*))?$/.exec(line);
    if (!m) throw new Error(`unreadable header line: ${line}`);
    const key = unquote(m[1]);
    const rest = m[2] === undefined ? '' : stripComment(m[2]).trim();
    if (rest === '>' || rest === '|') {
      const block = [];
      while (i + 1 < lines.length && (!lines[i + 1].trim() || indentOf(lines[i + 1]) > indent)) block.push(lines[++i].trim());
      while (block.length && !block[block.length - 1]) block.pop();
      parent.node[key] = rest === '>' ? block.join(' ').replace(/\s+/g, ' ').trim() : block.join('\n');
    } else if (rest === '') {
      // A mapping or a list: the next meaningful line tells.
      let j = i + 1;
      while (j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith('#'))) j++;
      const next = j < lines.length ? lines[j].trim() : '';
      const child = (next.startsWith('- ') || next === '-') && j < lines.length && indentOf(lines[j]) >= indent ? [] : {};
      parent.node[key] = child;
      stack.push({ indent, node: child });
    } else {
      parent.node[key] = scalar(rest);
    }
  }
  return root;
}

export function splitEntry(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') throw new Error('no header');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('unterminated header');
  return { header: parseHeader(lines.slice(1, end).join('\n')), headerText: lines.slice(1, end), body: lines.slice(end + 1).join('\n') };
}

// ---------------------------------------------------------------------------------------------------
// Catalog.

const list = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function entryFile(kind, dir) {
  return join(dir, kind === 'skill' ? 'SKILL.md' : 'ENTRY.md');
}

// Reads every entry; an unreadable entry is an error of the catalog, reported with its path.
export function loadCatalog(root = PRACTICES_DIR) {
  const entries = new Map();
  const errors = [];
  if (!existsSync(root)) return { root, entries, errors: [`no practices folder: ${root}`] };
  for (const [kind, folder] of Object.entries(KINDS)) {
    const base = join(root, folder);
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const dir = join(base, d.name);
      const file = entryFile(kind, dir);
      const where = relative(root, file);
      if (!existsSync(file)) {
        errors.push(`${where}: missing`);
        continue;
      }
      let parsed;
      try {
        parsed = splitEntry(readFileSync(file, 'utf8'));
      } catch (error) {
        errors.push(`${where}: ${error.message}`);
        continue;
      }
      const h = parsed.header;
      const entry = { ...h, kind: h.kind, folderKind: kind, dir, file, where, body: parsed.body, headerText: parsed.headerText };
      if (h.id !== d.name) errors.push(`${where}: id "${h.id}" differs from its folder "${d.name}"`);
      if (entries.has(h.id)) errors.push(`${where}: id "${h.id}" already used by ${entries.get(h.id).where}`);
      else entries.set(h.id, entry);
    }
  }
  return { root, entries, errors };
}

// Lines that the Adopted practices section gives to a rules entry: its heading, a blank line, its body.
export function rulesBlock(entry) {
  const body = entry.body.replace(/^\n+/, '').replace(/\s+$/, '');
  return `### ${entry.title} (${entry.code})\n\n${body}\n`;
}

const bodyLines = (entry) => entry.body.replace(/^\n+/, '').replace(/\s+$/, '').split('\n').length;

// Checks the catalog as a whole: the tests of the toolkit run it on practices/ (step 2 of the plan).
export function validateCatalog(catalog) {
  const errors = [...catalog.errors];
  const codes = new Map();
  for (const e of catalog.entries.values()) {
    const err = (m) => errors.push(`${e.where}: ${m}`);
    if (!ID.test(e.id || '')) err(`id "${e.id}" is not in kebab-case`);
    if (e.kind !== e.folderKind) err(`kind "${e.kind}" in the folder of ${KINDS[e.folderKind]}`);
    if (!VERSION.test(e.version || '')) err(`version "${e.version}" is not x.y.z`);
    if (!STATUSES.includes(e.status)) err(`status "${e.status}" is not one of ${STATUSES.join(', ')}`);
    if (!e.summary || typeof e.summary !== 'string') err('no summary');
    for (const key of ['requires', 'conflicts']) {
      for (const id of list(e[key])) if (!catalog.entries.has(id)) err(`${key}: unknown entry "${id}"`);
    }
    const when = e['applies-when'] || {};
    if (typeof when !== 'object' || Array.isArray(when)) err('applies-when is not a mapping');
    else {
      for (const [k, v] of Object.entries(when)) {
        const c = CRITERIA[k];
        if (!c) {
          err(`applies-when: unknown criterion "${k}" (known: ${Object.keys(CRITERIA).join(', ')})`);
          continue;
        }
        for (const x of list(v)) {
          const value = typeof x === 'boolean' ? (x ? 'yes' : 'no') : String(x);
          if (c.values && !c.values.includes(value)) err(`applies-when.${k}: "${value}" is not one of ${c.values.join(', ')}`);
          if (k === 'archetypes' && catalog.entries.get(value)?.kind !== 'archetype') err(`applies-when.archetypes: unknown archetype "${value}"`);
        }
      }
    }
    if (e.kind === 'archetype') {
      if (!e.invariant) err('no invariant: how the archetype applies the invariant part (D5)');
      if (list(e.interview).length > 3) err('more than 3 interview questions');
      for (const [key, kind] of [['recipes', 'recipe'], ['practices', 'rules'], ['skills', 'skill']]) {
        for (const id of list(e[key])) if (catalog.entries.get(id)?.kind !== kind) err(`${key}: "${id}" is not a ${kind} entry of the catalog`);
      }
      for (const k of Object.keys(e['workflow-impact'] || {})) {
        if (!WORKFLOW_IMPACT[k]) err(`workflow-impact: unknown key "${k}" (known: ${Object.keys(WORKFLOW_IMPACT).join(', ')})`);
      }
    }
    if (e.kind === 'recipe' && !list(e.check).length) err('no check: what the research must verify (D9)');
    if (e.kind === 'rules') {
      if (!/^[A-Z]{2,4}$/.test(e.code || '')) err(`code "${e.code}" is not 2 to 4 capital letters`);
      else if (codes.has(e.code)) err(`code "${e.code}" already used by ${codes.get(e.code)}`);
      else codes.set(e.code, e.id);
      if (!e.title) err('no title');
      if (!Number.isInteger(e['size-budget'])) err('no size-budget');
      else if (bodyLines(e) > e['size-budget']) err(`${bodyLines(e)} lines, over its size-budget of ${e['size-budget']}`);
      const numbered = e.body.split('\n').filter((l) => /^[A-Z]+-\d+\. /.test(l));
      if (!numbered.length) err(`no rule numbered ${e.code}-1`);
      numbered.forEach((l, i) => {
        if (!l.startsWith(`${e.code}-${i + 1}. `)) err(`rule "${l.slice(0, 20)}…" is not numbered ${e.code}-${i + 1}`);
      });
      for (const id of list(e['pairs-with'])) if (catalog.entries.get(id)?.kind !== 'skill') err(`pairs-with: "${id}" is not a skill entry`);
    }
    if (e.kind === 'skill') {
      if (!e.id?.startsWith(SKILL_PREFIX)) err(`a skill is named ${SKILL_PREFIX}<name> (D13)`);
      if (e.name !== e.id) err(`name "${e.name}" differs from its id`);
      if (!e.description) err('no description: it tells when to load the skill (D24)');
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------------------------------
// Selection.

function factValue(facts, criterion) {
  const v = facts[CRITERIA[criterion].option];
  return v === undefined || (Array.isArray(v) && !v.length) ? undefined : v;
}

// Whether an entry fits the facts: { fits, unchecked: [criteria], reasons: [why it does not fit] }.
export function fits(entry, facts) {
  const when = entry['applies-when'] || {};
  const unchecked = [];
  const reasons = [];
  for (const [criterion, expected] of Object.entries(when)) {
    if (criterion === 'archetypes' && facts.archetype === 'none') continue;
    const fact = factValue(facts, criterion);
    if (fact === undefined) {
      unchecked.push(criterion);
      continue;
    }
    const wanted = list(expected).map((x) => (typeof x === 'boolean' ? (x ? 'yes' : 'no') : String(x)));
    const given = list(fact);
    if (!given.some((g) => wanted.includes(g))) reasons.push(`${criterion}: ${wanted.join(', ')}`);
  }
  return { fits: !reasons.length, unchecked, reasons };
}

function closure(catalog, ids) {
  const seen = new Set();
  const visit = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const r of list(catalog.entries.get(id)?.requires)) visit(r);
  };
  ids.forEach(visit);
  return seen;
}

// Candidates for a project: the rules and skills of the archetype first, then the other compatible ones.
export function select(catalog, facts) {
  const archetype = facts.archetype === 'none' ? null : catalog.entries.get(facts.archetype);
  if (facts.archetype !== 'none' && archetype?.kind !== 'archetype') throw new PracticesError(`unknown archetype "${facts.archetype}"`);
  const fromArchetype = new Set(archetype ? [...list(archetype.practices), ...list(archetype.skills)] : []);
  const candidates = [];
  const setAside = [];
  const drafts = [];
  for (const e of catalog.entries.values()) {
    if (e.kind !== 'rules' && e.kind !== 'skill') continue;
    if (e.status === 'draft') {
      drafts.push(e);
      continue;
    }
    const f = fits(e, facts);
    if (f.fits) candidates.push({ entry: e, archetype: fromArchetype.has(e.id), unchecked: f.unchecked });
    else setAside.push({ entry: e, reasons: f.reasons });
  }
  candidates.sort((a, b) => (b.archetype - a.archetype) || a.entry.kind.localeCompare(b.entry.kind) || a.entry.id.localeCompare(b.entry.id));
  return { archetype, candidates, setAside, drafts };
}

export function sectionText(catalog, { archetype, recipe, ids }) {
  const rules = ids.map((id) => catalog.entries.get(id)).filter((e) => e.kind === 'rules');
  const items = [];
  if (archetype && archetype !== 'none') items.push(`archetype:${archetype}@${catalog.entries.get(archetype).version}`);
  if (recipe) items.push(`recipe:${recipe}@${catalog.entries.get(recipe).version}`);
  for (const id of ids) {
    const e = catalog.entries.get(id);
    items.push(e.kind === 'rules' ? `${id}@${e.version}#${fingerprint(rulesBlock(e)).slice(0, 12)}` : `${id}@${e.version}`);
  }
  const parts = [SECTION, '', `<!-- f3 practices: ${items.length ? items.join(', ') : 'none'} -->`, ''];
  if (!rules.length) parts.push('No practice of the f3 catalog is adopted.', '');
  for (const e of rules) parts.push(rulesBlock(e));
  return parts.join('\n');
}

const sectionLines = (text) => text.replace(/\s+$/, '').split('\n').length;

// Errors of a selection: unknown, draft or wrong kind, missing requirement, conflict, global budget.
export function check(catalog, { archetype, recipe, ids }) {
  const errors = [];
  if (archetype && archetype !== 'none') {
    const a = catalog.entries.get(archetype);
    if (a?.kind !== 'archetype') errors.push(`unknown archetype "${archetype}"`);
    else if (a.status === 'draft') errors.push(`archetype "${archetype}" is a draft: not available (D25)`);
  }
  if (recipe) {
    const r = catalog.entries.get(recipe);
    if (r?.kind !== 'recipe') errors.push(`unknown recipe "${recipe}"`);
    else if (r.status === 'draft') errors.push(`recipe "${recipe}" is a draft: not available (D25)`);
  }
  const chosen = new Set(ids);
  for (const id of ids) {
    const e = catalog.entries.get(id);
    if (!e) {
      errors.push(`unknown entry "${id}"`);
      continue;
    }
    if (e.kind !== 'rules' && e.kind !== 'skill') errors.push(`"${id}" is a ${e.kind} entry: only rules and skills are adopted`);
    if (e.status === 'draft') errors.push(`"${id}" is a draft: not available (D25)`);
    for (const r of list(e.requires)) if (!chosen.has(r)) errors.push(`"${id}" requires "${r}", not selected`);
    for (const c of list(e.conflicts)) if (chosen.has(c)) errors.push(`"${id}" conflicts with "${c}"`);
  }
  if (!errors.length) {
    const lines = sectionLines(sectionText(catalog, { archetype, recipe, ids }));
    if (lines > GLOBAL_BUDGET) errors.push(`the Adopted practices section would have ${lines} lines, over the global budget of ${GLOBAL_BUDGET} (D11)`);
  }
  return errors;
}

// ---------------------------------------------------------------------------------------------------
// Fingerprints (D27) and the marker of AGENTS.md (D17, D22).

export function fingerprint(text) {
  return createHash('sha256').update(text).digest('hex');
}

const SOURCE_LINE = /^source: f3 practices (\S+)@(\S+) sha256:([0-9a-f]{64})$/m;

function filesOf(dir) {
  const out = [];
  const walk = (d) => {
    for (const x of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, x.name);
      if (x.isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

// Fingerprint of a skill folder: each file, by its relative path, SKILL.md without its source line.
export function skillFingerprint(files) {
  const h = createHash('sha256');
  for (const [path, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    h.update(path).update('\0').update(path === 'SKILL.md' ? content.replace(/^source: f3 practices .*\n/m, '') : content).update('\0');
  }
  return h.digest('hex');
}

function readFolder(dir) {
  return filesOf(dir).map((f) => [relative(dir, f).split(sep).join('/'), readFileSync(f, 'utf8')]);
}

// The files of a skill as copied into the project: SKILL.md keeps name and description, plus its source.
export function skillCopy(entry) {
  const files = readFolder(entry.dir).filter(([p]) => p !== 'SKILL.md');
  const skillText = (source) => ['---', `name: ${entry.name}`, `description: ${JSON.stringify(entry.description)}`, ...(source ? [source] : []), '---', entry.body].join('\n');
  const print = skillFingerprint([['SKILL.md', skillText(null)], ...files]);
  return { files: [['SKILL.md', skillText(`source: f3 practices ${entry.id}@${entry.version} sha256:${print}`)], ...files], fingerprint: print };
}

export function readMarker(agentsText) {
  const m = MARKER.exec(agentsText || '');
  if (!m) return null;
  const items = m[1].split(',').map((s) => s.trim()).filter((s) => s && s !== 'none').map((s) => {
    const x = /^(?:(archetype|recipe):)?([a-z0-9-]+)@([0-9.]+)(?:#([0-9a-f]+))?$/.exec(s);
    return x ? { role: x[1] || 'entry', id: x[2], version: x[3], print: x[4] || null } : { role: 'unreadable', raw: s };
  });
  return items;
}

// The Adopted practices section of AGENTS.md: from its heading to the next level-2 heading.
export function findSection(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === SECTION);
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  return { start, end, lines };
}

// The rules blocks of the section as written in the project, by code: to compare with the marker.
export function writtenBlocks(text) {
  const s = findSection(text);
  if (!s) return new Map();
  const blocks = new Map();
  let code = null;
  let buf = [];
  const flush = () => {
    if (code) blocks.set(code, buf.join('\n').replace(/\s+$/, '') + '\n');
  };
  for (const l of s.lines.slice(s.start + 1, s.end)) {
    const h = /^### .* \(([A-Z]+)\)$/.exec(l);
    if (h) {
      flush();
      code = h[1];
      buf = [l];
    } else if (code) buf.push(l);
  }
  flush();
  return blocks;
}

// State of the practices of a project, for f3 state init and for apply: what the marker lists, and what
// was modified by hand (fingerprint of the text differs from the one written at the import).
export function projectPractices(catalog, projectDir = '.') {
  const agentsFile = join(projectDir, 'AGENTS.md');
  const text = existsSync(agentsFile) ? readFileSync(agentsFile, 'utf8') : '';
  const marker = readMarker(text);
  const blocks = writtenBlocks(text);
  const modified = [];
  const skills = new Map();
  const skillsDir = join(projectDir, '.claude', 'skills');
  if (existsSync(skillsDir)) {
    for (const name of readdirSync(skillsDir)) {
      if (!name.startsWith(SKILL_PREFIX)) continue;
      const dir = join(skillsDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const files = readFolder(dir);
      const skill = files.find(([p]) => p === 'SKILL.md');
      const src = skill && SOURCE_LINE.exec(skill[1]);
      skills.set(name, src ? { id: src[1], version: src[2], print: src[3] } : null);
      if (!src) modified.push(`${name}: no source line`);
      else if (skillFingerprint(files) !== src[3]) modified.push(`${name}: modified by hand`);
    }
  }
  for (const item of marker || []) {
    if (item.role !== 'entry' || !item.print) continue;
    const e = catalog.entries.get(item.id);
    const code = e?.code;
    const written = code && blocks.get(code);
    if (!written) modified.push(`${item.id}: its rules are missing from the Adopted practices section`);
    else if (!fingerprint(written).startsWith(item.print)) modified.push(`${item.id}: modified by hand`);
  }
  return { text, marker, skills, modified };
}

// ---------------------------------------------------------------------------------------------------
// Apply: the section of AGENTS.md and the skills, as the selection says (declarative: a skill imported
// before and no longer selected is removed).

export function apply(catalog, { archetype, recipe, ids, force = [], projectDir = '.' }) {
  const errors = check(catalog, { archetype, recipe, ids });
  if (errors.length) throw new PracticesError(`selection refused:\n${errors.map((e) => `  - ${e}`).join('\n')}`, 3);
  const agentsFile = join(projectDir, 'AGENTS.md');
  if (!existsSync(agentsFile)) throw new PracticesError('no AGENTS.md: write the invariant part and the Stack section first');
  const state = projectPractices(catalog, projectDir);
  const lines = state.text.split('\n');
  const selected = ids.map((id) => catalog.entries.get(id));
  const wantedSkills = new Set(selected.filter((e) => e.kind === 'skill').map((e) => e.id));
  const imported = new Set([...state.skills.keys()]);
  // Text modified by hand is never overwritten or removed without --force <id> (section 4.3).
  const touched = new Set([...wantedSkills, ...[...imported].filter((n) => !wantedSkills.has(n))]);
  const blocked = [];
  for (const name of touched) {
    if (!imported.has(name) || force.includes(name)) continue;
    const dir = join(projectDir, '.claude', 'skills', name);
    const src = state.skills.get(name);
    if (!src || skillFingerprint(readFolder(dir)) !== src.print) blocked.push(`skill ${name} was modified by hand`);
  }
  for (const item of state.marker || []) {
    if (item.role !== 'entry' || !item.print || force.includes(item.id)) continue;
    if (state.modified.includes(`${item.id}: modified by hand`)) blocked.push(`the rules of ${item.id} were modified by hand in AGENTS.md`);
  }
  if (blocked.length) throw new PracticesError(`refused, to keep the changes made by hand (give --force <id> after the user agreed):\n${blocked.map((b) => `  - ${b}`).join('\n')}`, 3);

  const section = sectionText(catalog, { archetype, recipe, ids });
  const existing = findSection(state.text);
  let out;
  if (existing) {
    out = [...lines.slice(0, existing.start), ...section.replace(/\n$/, '').split('\n'), '', ...lines.slice(existing.end)];
  } else {
    const stack = lines.findIndex((l) => l.trim() === '## Stack');
    if (stack < 0) throw new PracticesError('no "## Stack" heading in AGENTS.md: the section goes just before it');
    out = [...lines.slice(0, stack), ...section.replace(/\n$/, '').split('\n'), '', ...lines.slice(stack)];
  }
  writeFileSync(agentsFile, out.join('\n'));

  const written = [];
  for (const name of imported) {
    if (wantedSkills.has(name)) continue;
    rmSync(join(projectDir, '.claude', 'skills', name), { recursive: true, force: true });
    written.push(`removed .claude/skills/${name}/`);
  }
  for (const e of selected.filter((x) => x.kind === 'skill')) {
    const dir = join(projectDir, '.claude', 'skills', e.id);
    rmSync(dir, { recursive: true, force: true });
    for (const [path, content] of skillCopy(e).files) {
      const target = join(dir, ...path.split('/'));
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, content);
    }
    written.push(`.claude/skills/${e.id}/ (${e.id}@${e.version})`);
  }
  return { section, written, lines: sectionLines(section) };
}

// ---------------------------------------------------------------------------------------------------
// Update (section 4.3): what the marker of a project lists, and what the catalog has changed since.

function newer(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

// For f3 state init: null without a marker; otherwise the adopted items and the updates to propose.
export function projectUpdates(catalog, projectDir = '.') {
  const state = projectPractices(catalog, projectDir);
  if (!state.marker) return null;
  const adopted = state.marker.map((i) => (i.role === 'unreadable' ? `unreadable: ${i.raw}` : `${i.role === 'entry' ? catalog.entries.get(i.id)?.kind || 'entry' : i.role} ${i.id}@${i.version}`));
  const updates = [];
  for (const item of state.marker) {
    if (item.role === 'unreadable') continue;
    const e = catalog.entries.get(item.id);
    const info = item.role === 'entry' ? '' : ' (information only: archetype and recipe are not updated)';
    if (!e) updates.push(`${item.id}: removed from the catalog${info}`);
    else if (newer(e.version, item.version)) updates.push(`${item.id}: ${item.version} -> ${e.version} in the catalog${info}`);
  }
  for (const m of state.modified) updates.push(m);
  const archetype = state.marker.find((i) => i.role === 'archetype');
  const a = archetype && catalog.entries.get(archetype.id);
  if (a) {
    const taken = new Set(state.marker.map((i) => i.id));
    for (const id of [...list(a.practices), ...list(a.skills)]) {
      const e = catalog.entries.get(id);
      if (e && e.status === 'stable' && !taken.has(id)) updates.push(`${id}@${e.version}: proposed by the archetype, not adopted (arch/decisions.md says why before you propose it)`);
    }
  }
  const s = findSection(state.text);
  if (s) {
    const lines = s.lines.slice(s.start, s.end).join('\n').replace(/\s+$/, '').split('\n').length;
    if (lines > GLOBAL_BUDGET) updates.push(`the Adopted practices section has ${lines} lines, over the global budget of ${GLOBAL_BUDGET}`);
  }
  return { adopted, updates };
}

function unifiedDiff(label, before, after) {
  const dir = mkdtempSync(join(tmpdir(), 'f3-practices-diff-'));
  try {
    writeFileSync(join(dir, 'a'), before);
    writeFileSync(join(dir, 'b'), after);
    const r = spawnSync('diff', ['-u', '--label', `project ${label}`, '--label', `catalog ${label}`, 'a', 'b'], { cwd: dir, encoding: 'utf8' });
    return r.status === 0 ? `${label}: identical\n` : r.stdout;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// The differences between the text a project holds for an entry and the current catalog.
export function entryDiff(catalog, id, projectDir = '.') {
  const e = catalog.entries.get(id);
  if (!e) throw new PracticesError(`unknown entry: ${id}`);
  if (e.kind === 'rules') {
    const text = existsSync(join(projectDir, 'AGENTS.md')) ? readFileSync(join(projectDir, 'AGENTS.md'), 'utf8') : '';
    return unifiedDiff(`AGENTS.md (${e.code})`, writtenBlocks(text).get(e.code) || '', rulesBlock(e));
  }
  if (e.kind === 'skill') {
    const dir = join(projectDir, '.claude', 'skills', e.id);
    const local = new Map(existsSync(dir) ? readFolder(dir) : []);
    const copy = new Map(skillCopy(e).files);
    const strip = (t) => (t || '').replace(/^source: f3 practices .*\n/m, '');
    return [...new Set([...local.keys(), ...copy.keys()])].sort().map((p) => unifiedDiff(`.claude/skills/${e.id}/${p}`, strip(local.get(p)), strip(copy.get(p)))).join('');
  }
  throw new PracticesError(`"${id}" is a ${e.kind} entry: only rules and skills are copied into a project`);
}

// ---------------------------------------------------------------------------------------------------
// practices/catalog.md: the readable index, one line per entry (kept equal to this output by a test).

export function catalogMarkdown(catalog) {
  const out = [
    '# Practices catalog',
    '',
    'Generated by `f3 practices catalog` from the headers of the entries: do not edit by hand. The format of an entry is described in `README.md`.',
    '',
  ];
  const titles = { archetype: 'Archetypes', recipe: 'Recipes', rules: 'Rules', skill: 'Skills' };
  for (const kind of Object.keys(KINDS)) {
    const entries = [...catalog.entries.values()].filter((e) => e.kind === kind).sort((a, b) => a.id.localeCompare(b.id));
    if (!entries.length) continue;
    out.push(`## ${titles[kind]}`, '', '| Entry | Version | Status | Summary | Applies when |', '|---|---|---|---|---|');
    for (const e of entries) {
      const when = Object.entries(e['applies-when'] || {}).map(([k, v]) => `${k}: ${list(v).map(String).join(', ')}`).join('; ') || 'always';
      const name = e.kind === 'rules' ? `\`${e.id}\` (${e.code})` : `\`${e.id}\``;
      out.push(`| ${name} | ${e.version} | ${e.status} | ${e.summary} | ${when} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------
// Command line.

function parseArgs(args) {
  const facts = { language: [], framework: [], exposure: [] };
  const opts = { force: [], ids: [], check: null, recipe: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const value = () => {
      const v = args[++i];
      if (v === undefined || v.startsWith('--')) throw new PracticesError(`${a} needs a value`);
      return v;
    };
    if (a === '--archetype') facts.archetype = value();
    else if (a === '--ui') {
      facts.ui = value();
      if (!CRITERIA.ui.values.includes(facts.ui)) throw new PracticesError(`--ui is yes or no, not "${facts.ui}"`);
    } else if (a === '--language') facts.language.push(value());
    else if (a === '--framework') facts.framework.push(value());
    else if (a === '--exposure') {
      const v = value();
      if (!CRITERIA.exposure.values.includes(v)) throw new PracticesError(`--exposure is one of ${CRITERIA.exposure.values.join(', ')}, not "${v}"`);
      facts.exposure.push(v);
    } else if (a === '--check') opts.check = value().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--recipe') opts.recipe = value();
    else if (a === '--force') opts.force.push(value());
    else if (a.startsWith('--')) throw new PracticesError(`unknown option ${a}`);
    else opts.ids.push(...a.split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (!facts.archetype) throw new PracticesError('--archetype <id|none> is required');
  return { facts, opts };
}

// An entry as the agents read it (D28): its file, header and body, then the other files of a skill.
export function showEntry(entry) {
  const text = readFileSync(entry.file, 'utf8');
  const others = entry.kind === 'skill' ? readFolder(entry.dir).filter(([p]) => p !== 'SKILL.md').map(([p]) => p) : [];
  return [`=== ${KINDS[entry.kind]}/${entry.id}/${entry.kind === 'skill' ? 'SKILL.md' : 'ENTRY.md'}`, text.replace(/\s+$/, ''), ...(others.length ? [`(other files of the skill: ${others.join(', ')})`] : []), ''].join('\n');
}

const USAGE = [
  'Usage: f3 practices select --archetype <id|none> [--ui yes|no] [--language <l>]... [--framework <f>]... [--exposure none|private|public]... [--check <id,id,...>]',
  '       f3 practices apply --archetype <id|none> [--recipe <id>] [--force <id>]... <id> [<id>...]',
  '       f3 practices show <id> [<id>...]',
  '       f3 practices diff <id> [<id>...]',
  '       f3 practices catalog',
].join('\n');

function describe(e) {
  if (e.kind === 'rules') return `rules ${e.id}@${e.version} (${e.code}, ${bodyLines(e)} lines): ${e.summary}`;
  return `skill ${e.id}@${e.version}: ${e.summary}`;
}

function selectOutput(catalog, facts, result) {
  const given = Object.entries(facts).filter(([k, v]) => k !== 'archetype' && v !== undefined && !(Array.isArray(v) && !v.length));
  const out = [`Practices candidates for archetype ${facts.archetype}${given.length ? `, with ${given.map(([k, v]) => `${k}=${list(v).join('|')}`).join(', ')}` : ', no fact given'}:`];
  if (!result.candidates.length) out.push('- none');
  for (const c of result.candidates) {
    const e = c.entry;
    const notes = [c.archetype ? 'proposed by the archetype' : 'compatible'];
    if (list(e.requires).length) notes.push(`requires ${list(e.requires).join(', ')}`);
    if (list(e.conflicts).length) notes.push(`conflicts with ${list(e.conflicts).join(', ')}`);
    if (list(e['pairs-with']).length) notes.push(`detailed by ${list(e['pairs-with']).join(', ')}`);
    if (c.unchecked.length) notes.push(`not checked, no fact given: ${c.unchecked.join(', ')}`);
    out.push(`- ${describe(e)} [${notes.join('; ')}]`);
  }
  out.push('Set aside by the criteria:');
  if (!result.setAside.length) out.push('- none');
  for (const s of result.setAside) out.push(`- ${s.entry.id}: applies when ${s.reasons.join('; ')}`);
  if (result.drafts.length) out.push(`Not available (draft, D25): ${result.drafts.map((e) => e.id).join(', ')}`);
  out.push(`Global budget of the Adopted practices section: ${GLOBAL_BUDGET} lines (D11).`);
  out.push('Read an entry with: f3 practices show <id>');
  return out.join('\n');
}

export function practicesCommand(args, { root = PRACTICES_DIR, projectDir = '.', stdout = process.stdout, stderr = process.stderr } = {}) {
  const [sub, ...rest] = args;
  try {
    if (!sub || sub === 'help' || sub === '--help') {
      stdout.write(USAGE + '\n');
      return sub ? 0 : 1;
    }
    const catalog = loadCatalog(root);
    const errors = validateCatalog(catalog);
    if (errors.length) throw new PracticesError(`the practices catalog is invalid:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    if (sub === 'catalog') {
      stdout.write(catalogMarkdown(catalog));
      return 0;
    }
    if (sub === 'show') {
      if (!rest.length) throw new PracticesError(`show needs at least one entry\n${USAGE}`);
      // An entry may be named as the marker writes it (id@version): the catalog holds its current version.
      const ids = rest.map((x) => x.replace(/@[0-9.]+(#[0-9a-f]+)?$/, ''));
      const unknown = ids.filter((id) => !catalog.entries.has(id));
      if (unknown.length) throw new PracticesError(`unknown entry: ${unknown.join(', ')}`);
      stdout.write(ids.map((id) => showEntry(catalog.entries.get(id))).join('\n'));
      return 0;
    }
    if (sub === 'diff') {
      if (!rest.length) throw new PracticesError(`diff needs at least one entry\n${USAGE}`);
      stdout.write(rest.map((id) => entryDiff(catalog, id.replace(/@[0-9.]+(#[0-9a-f]+)?$/, ''), projectDir)).join(''));
      return 0;
    }
    if (sub !== 'select' && sub !== 'apply') throw new PracticesError(`unknown subcommand "${sub}"\n${USAGE}`);
    const { facts, opts } = parseArgs(rest);
    if (sub === 'select') {
      if (opts.ids.length) throw new PracticesError(`select takes no entry, only --check: "${opts.ids.join(' ')}"`);
      const result = select(catalog, facts);
      if (opts.check) {
        const errs = check(catalog, { archetype: facts.archetype, recipe: opts.recipe, ids: opts.check });
        if (errs.length) throw new PracticesError(`selection refused:\n${errs.map((e) => `  - ${e}`).join('\n')}`, 3);
        const lines = sectionLines(sectionText(catalog, { archetype: facts.archetype, recipe: opts.recipe, ids: opts.check }));
        stdout.write(`Selection valid: ${opts.check.join(', ')}. The Adopted practices section would have ${lines} lines of ${GLOBAL_BUDGET}.\n`);
        return 0;
      }
      stdout.write(selectOutput(catalog, facts, result) + '\n');
      return 0;
    }
    const r = apply(catalog, { archetype: facts.archetype, recipe: opts.recipe, ids: opts.ids, force: opts.force, projectDir });
    stdout.write([`Written: AGENTS.md, section Adopted practices (${r.lines} lines of ${GLOBAL_BUDGET}).`, ...r.written.map((w) => `Written: ${w}`)].join('\n') + '\n');
    return 0;
  } catch (error) {
    if (error instanceof PracticesError) {
      stderr.write(`f3 practices: ${error.message}\n`);
      return error.code;
    }
    throw error;
  }
}
