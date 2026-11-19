// The practices catalog (practices/) and the command f3 practices (D19, D20, D22, D25, D27).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tempDir } from './tmp.mjs';

const TOOLKIT = resolve(import.meta.dirname, '..', '..');
const {
  apply, catalogMarkdown, check, loadCatalog, parseHeader, practicesCommand, projectPractices, readMarker, select,
  validateCatalog, GLOBAL_BUDGET,
} = await import('../lib/practices.mjs');

const REAL = join(TOOLKIT, 'practices');

// A mini catalog, written entry by entry; each test alters its own copy.
function mini() {
  const root = tempDir('f3-practices-');
  const w = (path, text) => {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  w('archetypes/web-app/ENTRY.md', `---
id: web-app
kind: archetype
version: 1.0.0
status: stable
summary: A web app.
invariant: >
  Applied as is.
interview:
  - One question?
recipes: [ts-web]
practices: [frontend]
skills: [practice-ng]
workflow-impact:
  e2e: a browser
---
Body.
`);
  w('archetypes/svc/ENTRY.md', `---
id: svc
kind: archetype
version: 1.0.0
status: draft
summary: A service.
invariant: >
  The service is an Application.
recipes: []
practices: []
skills: []
---
`);
  w('recipes/ts-web/ENTRY.md', `---
id: ts-web
kind: recipe
version: 2.1.0
status: stable
summary: A recipe.
check:
  - the versions
---
### Modules
`);
  w('rules/frontend/ENTRY.md', `---
id: frontend
kind: rules
code: FE
title: Frontend
version: 1.2.0
status: stable
summary: Frontend rules.
applies-when:
  ui: yes
pairs-with: [practice-ng]
size-budget: 5
---

FE-1. **Views own state.** Reason: one place.
FE-2. **Components display.** Reason: reuse.
`);
  w('rules/security/ENTRY.md', `---
id: security
kind: rules
code: SE
title: Security
version: 1.0.0
status: stable
summary: Security rules.
applies-when:
  exposure: [public]
requires: [frontend]
conflicts: [legacy]
size-budget: 5
---

SE-1. **Check input.** Reason: attacks.
`);
  w('rules/legacy/ENTRY.md', `---
id: legacy
kind: rules
code: LE
title: Legacy
version: 1.0.0
status: stable
summary: Legacy rules.
applies-when:
  languages: [cobol]
size-budget: 5
---

LE-1. **Old.** Reason: old.
`);
  w('skills/practice-ng/SKILL.md', `---
id: practice-ng
kind: skill
name: practice-ng
description: "Load before writing an Angular component."
version: 1.0.0
status: stable
summary: Angular.
applies-when:
  frameworks: [angular]
loaded-by: [developer]
---

# Angular

Use signals.
`);
  w('skills/practice-ng/references/more.md', 'More.\n');
  return { root, w };
}

const AGENTS = '# AGENTS.md\n\n## Rules\n\n1. **Invariant.**\n\n## Stack\n\n### Modules\n\nnpm.\n';

function project() {
  const dir = tempDir('f3-practices-project-');
  writeFileSync(join(dir, 'AGENTS.md'), AGENTS);
  return dir;
}

function cmd(args, opts) {
  let out = '';
  let err = '';
  const code = practicesCommand(args, { ...opts, stdout: { write: (s) => { out += s; } }, stderr: { write: (s) => { err += s; } } });
  return { code, out, err };
}

test('header parser: scalars, comments, inline and block lists, nested mappings, folded scalars', () => {
  const h = parseHeader('id: a  # comment\nn: 12\nflag: true\nq: "x # y"\nl: [a, b]\ne: []\nb:\n  - one\n  - two\nk:\n- three\nm:\n  x: 1\n  y: [z]\nf: >\n  one\n  two\nafter: z');
  assert.deepEqual(h, { id: 'a', n: 12, flag: true, q: 'x # y', l: ['a', 'b'], e: [], b: ['one', 'two'], k: ['three'], m: { x: 1, y: ['z'] }, f: 'one two', after: 'z' });
});

test('the practices catalog of the toolkit is valid, and catalog.md is its generated index', () => {
  const catalog = loadCatalog(REAL);
  assert.deepEqual(validateCatalog(catalog), []);
  assert.equal(readFileSync(join(REAL, 'catalog.md'), 'utf8'), catalogMarkdown(catalog), 'run: node cli/f3.mjs practices catalog > practices/catalog.md');
  for (const id of ['web-app', 'desktop-app', 'cli-tool', 'service', 'library', 'ui-library']) assert.equal(catalog.entries.get(id)?.kind, 'archetype', id);
  for (const id of ['service', 'library', 'ui-library']) assert.equal(catalog.entries.get(id).status, 'draft', id);
});

test('validation reports a broken reference, a reused code, a budget exceeded, a misnumbered rule, a bad skill', () => {
  const m = mini();
  assert.deepEqual(validateCatalog(loadCatalog(m.root)), []);
  m.w('archetypes/web-app/ENTRY.md', readFileSync(join(m.root, 'archetypes/web-app/ENTRY.md'), 'utf8').replace('recipes: [ts-web]', 'recipes: [ts-gone]').replace('e2e: a browser', 'e2e: a browser\n  colour: red'));
  m.w('rules/legacy/ENTRY.md', readFileSync(join(m.root, 'rules/legacy/ENTRY.md'), 'utf8').replace('code: LE', 'code: FE').replace('LE-1.', 'LE-2.'));
  m.w('rules/frontend/ENTRY.md', readFileSync(join(m.root, 'rules/frontend/ENTRY.md'), 'utf8').replace('size-budget: 5', 'size-budget: 1'));
  m.w('skills/practice-ng/SKILL.md', readFileSync(join(m.root, 'skills/practice-ng/SKILL.md'), 'utf8').replace('name: practice-ng', 'name: ng'));
  m.w('skills/ng/SKILL.md', '---\nid: ng\nkind: skill\nname: ng\ndescription: x\nversion: 1.0.0\nstatus: stable\nsummary: x\n---\n');
  const errors = validateCatalog(loadCatalog(m.root)).join('\n');
  assert.match(errors, /recipes: "ts-gone" is not a recipe entry/);
  assert.match(errors, /workflow-impact: unknown key "colour"/);
  assert.match(errors, /code "FE" already used by frontend/);
  assert.match(errors, /is not numbered FE-1/);
  assert.match(errors, /2 lines, over its size-budget of 1/);
  assert.match(errors, /name "ng" differs from its id/);
  assert.match(errors, /skills\/ng\/SKILL.md: a skill is named practice-<name>/);
});

test('select: entries of the archetype first, criteria, unchecked facts, drafts, and no archetype', () => {
  const { root } = mini();
  const catalog = loadCatalog(root);
  const r = select(catalog, { archetype: 'web-app', ui: 'yes', language: ['typescript'], framework: [], exposure: [] });
  assert.deepEqual(r.candidates.map((c) => [c.entry.id, c.archetype, c.unchecked]), [
    ['frontend', true, []], ['practice-ng', true, ['frameworks']], ['security', false, ['exposure']],
  ]);
  assert.deepEqual(r.setAside.map((s) => [s.entry.id, s.reasons]), [['legacy', ['languages: cobol']]]);
  const none = select(catalog, { archetype: 'none', ui: 'no', language: [], framework: ['angular'], exposure: ['private'] });
  assert.deepEqual(none.candidates.map((c) => c.entry.id), ['legacy', 'practice-ng']);
  const out = cmd(['select', '--archetype', 'web-app', '--ui', 'yes', '--framework', 'angular'], { root });
  assert.equal(out.code, 0, out.err);
  assert.match(out.out, /- rules frontend@1\.2\.0 \(FE, 2 lines\): Frontend rules\. \[proposed by the archetype; detailed by practice-ng\]/);
  assert.match(out.out, /security@1\.0\.0.*\[compatible; requires frontend; conflicts with legacy; not checked, no fact given: exposure\]/);
  assert.match(cmd(['select', '--archetype', 'svc'], { root }).out, /Practices candidates for archetype svc/);
  assert.equal(cmd(['select', '--archetype', 'nope'], { root }).code, 1);
  assert.equal(cmd(['select', '--archetype', 'web-app', '--ui', 'maybe'], { root }).code, 1);
});

test('check refuses a missing requirement, a conflict, a draft, a kind that is not adopted, the global budget', () => {
  const m = mini();
  const catalog = loadCatalog(m.root);
  const sel = (ids, extra = {}) => check(catalog, { archetype: 'web-app', recipe: 'ts-web', ids, ...extra });
  assert.deepEqual(sel(['frontend', 'security']), []);
  assert.match(sel(['security']).join('\n'), /"security" requires "frontend", not selected/);
  assert.match(sel(['frontend', 'security', 'legacy']).join('\n'), /"security" conflicts with "legacy"/);
  assert.match(sel(['ts-web']).join('\n'), /"ts-web" is a recipe entry/);
  assert.match(check(catalog, { archetype: 'svc', ids: [] }).join('\n'), /archetype "svc" is a draft/);
  const rules = Array.from({ length: GLOBAL_BUDGET }, (_, i) => `FE-${i + 1}. **R.** Reason: r.`).join('\n');
  m.w('rules/frontend/ENTRY.md', readFileSync(join(m.root, 'rules/frontend/ENTRY.md'), 'utf8').replace(/size-budget: 5\n---[\s\S]*$/, `size-budget: 999\n---\n\n${rules}\n`));
  assert.match(check(loadCatalog(m.root), { archetype: 'web-app', ids: ['frontend'] }).join('\n'), /over the global budget of 150/);
  const r = cmd(['select', '--archetype', 'web-app', '--check', 'security'], { root: m.root });
  assert.equal(r.code, 3);
  assert.match(r.err, /selection refused/);
  assert.match(cmd(['select', '--archetype', 'web-app', '--check', 'frontend'], { root: mini().root }).out, /^Selection valid: frontend\. The Adopted practices section would have \d+ lines of 150\.\n$/);
});

test('apply writes the section before the Stack section, the marker, the skills, and is idempotent', () => {
  const { root } = mini();
  const dir = project();
  const r = cmd(['apply', '--archetype', 'web-app', '--recipe', 'ts-web', 'frontend', 'practice-ng'], { root, projectDir: dir });
  assert.equal(r.code, 0, r.err);
  const text = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.ok(text.startsWith('# AGENTS.md\n\n## Rules\n\n1. **Invariant.**\n\n## Adopted practices\n\n'), text);
  assert.ok(text.endsWith('\n\n## Stack\n\n### Modules\n\nnpm.\n'), text);
  assert.match(text, /<!-- f3 practices: archetype:web-app@1\.0\.0, recipe:ts-web@2\.1\.0, frontend@1\.2\.0#[0-9a-f]{12}, practice-ng@1\.0\.0 -->/);
  assert.match(text, /### Frontend \(FE\)\n\nFE-1\. \*\*Views own state\.\*\* Reason: one place\.\nFE-2\./);
  const skill = readFileSync(join(dir, '.claude/skills/practice-ng/SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: practice-ng\ndescription: "Load before writing an Angular component\."\nsource: f3 practices practice-ng@1\.0\.0 sha256:[0-9a-f]{64}\n---\n\n# Angular\n\nUse signals\.\n$/);
  assert.equal(readFileSync(join(dir, '.claude/skills/practice-ng/references/more.md'), 'utf8'), 'More.\n');
  assert.deepEqual(readMarker(text).map((i) => [i.role, i.id, i.version]), [['archetype', 'web-app', '1.0.0'], ['recipe', 'ts-web', '2.1.0'], ['entry', 'frontend', '1.2.0'], ['entry', 'practice-ng', '1.0.0']]);
  assert.deepEqual(projectPractices(loadCatalog(root), dir).modified, []);
  cmd(['apply', '--archetype', 'web-app', '--recipe', 'ts-web', 'frontend', 'practice-ng'], { root, projectDir: dir });
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), text);
  // Without any practice, the section keeps the marker of the archetype, and the skill is removed.
  assert.equal(cmd(['apply', '--archetype', 'web-app'], { root, projectDir: dir }).code, 0);
  const none = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.match(none, /<!-- f3 practices: archetype:web-app@1\.0\.0 -->\n\nNo practice of the f3 catalog is adopted\.\n\n## Stack/);
  assert.ok(!existsSync(join(dir, '.claude/skills/practice-ng')));
});

test('apply keeps the text modified by hand unless --force names it', () => {
  const { root } = mini();
  const dir = project();
  cmd(['apply', '--archetype', 'none', 'frontend', 'practice-ng'], { root, projectDir: dir });
  const skill = join(dir, '.claude/skills/practice-ng/references/more.md');
  writeFileSync(skill, 'Changed.\n');
  const agents = join(dir, 'AGENTS.md');
  writeFileSync(agents, readFileSync(agents, 'utf8').replace('Reason: one place.', 'Reason: one single place.'));
  assert.deepEqual(projectPractices(loadCatalog(root), dir).modified.sort(), ['frontend: modified by hand', 'practice-ng: modified by hand']);
  const r = cmd(['apply', '--archetype', 'none', 'frontend'], { root, projectDir: dir });
  assert.equal(r.code, 3);
  assert.match(r.err, /skill practice-ng was modified by hand/);
  assert.match(r.err, /the rules of frontend were modified by hand in AGENTS\.md/);
  assert.equal(readFileSync(skill, 'utf8'), 'Changed.\n');
  const forced = cmd(['apply', '--archetype', 'none', '--force', 'frontend', '--force', 'practice-ng', 'frontend'], { root, projectDir: dir });
  assert.equal(forced.code, 0, forced.err);
  assert.match(forced.out, /removed \.claude\/skills\/practice-ng\//);
  assert.deepEqual(projectPractices(loadCatalog(root), dir).modified, []);
});

test('apply refuses without AGENTS.md or its Stack section, and with an invalid catalog', () => {
  const { root, w } = mini();
  const dir = tempDir('f3-practices-project-');
  assert.match(cmd(['apply', '--archetype', 'none', 'frontend'], { root, projectDir: dir }).err, /no AGENTS\.md/);
  writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
  assert.match(cmd(['apply', '--archetype', 'none', 'frontend'], { root, projectDir: dir }).err, /no "## Stack" heading/);
  w('rules/frontend/ENTRY.md', '---\nid: frontend\n');
  const r = cmd(['select', '--archetype', 'none'], { root });
  assert.equal(r.code, 1);
  assert.match(r.err, /the practices catalog is invalid/);
});

test('practices is a reserved subcommand of f3', async () => {
  const { RESERVED } = await import('../lib/toolkit.mjs');
  assert.ok(RESERVED.includes('practices'));
});
