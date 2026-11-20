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
skills: [f3-stack-ng]
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
pairs-with: [f3-stack-ng]
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
  w('skills/f3-stack-ng/SKILL.md', `---
id: f3-stack-ng
kind: skill
name: f3-stack-ng
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
  w('skills/f3-stack-ng/references/more.md', 'More.\n');
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
  m.w('skills/f3-stack-ng/SKILL.md', readFileSync(join(m.root, 'skills/f3-stack-ng/SKILL.md'), 'utf8').replace('name: f3-stack-ng', 'name: ng'));
  m.w('skills/ng/SKILL.md', '---\nid: ng\nkind: skill\nname: ng\ndescription: x\nversion: 1.0.0\nstatus: stable\nsummary: x\n---\n');
  const errors = validateCatalog(loadCatalog(m.root)).join('\n');
  assert.match(errors, /recipes: "ts-gone" is not a recipe entry/);
  assert.match(errors, /workflow-impact: unknown key "colour"/);
  assert.match(errors, /code "FE" already used by frontend/);
  assert.match(errors, /is not numbered FE-1/);
  assert.match(errors, /2 lines, over its size-budget of 1/);
  assert.match(errors, /name "ng" differs from its id/);
  assert.match(errors, /skills\/ng\/SKILL.md: a skill is named f3-stack-<name>/);
});

test('select: entries of the archetype first, criteria, unchecked facts, drafts, and no archetype', () => {
  const { root } = mini();
  const catalog = loadCatalog(root);
  const r = select(catalog, { archetype: 'web-app', ui: 'yes', language: ['typescript'], framework: [], exposure: [] });
  assert.deepEqual(r.candidates.map((c) => [c.entry.id, c.archetype, c.unchecked]), [
    ['frontend', true, []], ['f3-stack-ng', true, ['frameworks']], ['security', false, ['exposure']],
  ]);
  assert.deepEqual(r.setAside.map((s) => [s.entry.id, s.reasons]), [['legacy', ['languages: cobol']]]);
  const none = select(catalog, { archetype: 'none', ui: 'no', language: [], framework: ['angular'], exposure: ['private'] });
  assert.deepEqual(none.candidates.map((c) => c.entry.id), ['legacy', 'f3-stack-ng']);
  const out = cmd(['select', '--archetype', 'web-app', '--ui', 'yes', '--framework', 'angular'], { root });
  assert.equal(out.code, 0, out.err);
  assert.match(out.out, /- rules frontend@1\.2\.0 \(FE, 2 lines\): Frontend rules\. \[proposed by the archetype; detailed by f3-stack-ng\]/);
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
  const r = cmd(['apply', '--archetype', 'web-app', '--recipe', 'ts-web', 'frontend', 'f3-stack-ng'], { root, projectDir: dir });
  assert.equal(r.code, 0, r.err);
  const text = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.ok(text.startsWith('# AGENTS.md\n\n## Rules\n\n1. **Invariant.**\n\n## Adopted practices\n\n'), text);
  assert.ok(text.endsWith('\n\n## Stack\n\n### Modules\n\nnpm.\n'), text);
  assert.match(text, /<!-- f3 practices: archetype:web-app@1\.0\.0, recipe:ts-web@2\.1\.0, frontend@1\.2\.0#[0-9a-f]{12}, f3-stack-ng@1\.0\.0 -->/);
  assert.match(text, /### Frontend \(FE\)\n\nFE-1\. \*\*Views own state\.\*\* Reason: one place\.\nFE-2\./);
  const skill = readFileSync(join(dir, '.claude/skills/f3-stack-ng/SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: f3-stack-ng\ndescription: "Load before writing an Angular component\."\nsource: f3 practices f3-stack-ng@1\.0\.0 sha256:[0-9a-f]{64}\n---\n\n# Angular\n\nUse signals\.\n$/);
  assert.equal(readFileSync(join(dir, '.claude/skills/f3-stack-ng/references/more.md'), 'utf8'), 'More.\n');
  assert.deepEqual(readMarker(text).map((i) => [i.role, i.id, i.version]), [['archetype', 'web-app', '1.0.0'], ['recipe', 'ts-web', '2.1.0'], ['entry', 'frontend', '1.2.0'], ['entry', 'f3-stack-ng', '1.0.0']]);
  assert.deepEqual(projectPractices(loadCatalog(root), dir).modified, []);
  cmd(['apply', '--archetype', 'web-app', '--recipe', 'ts-web', 'frontend', 'f3-stack-ng'], { root, projectDir: dir });
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), text);
  // Without any practice, the section keeps the marker of the archetype, and the skill is removed.
  assert.equal(cmd(['apply', '--archetype', 'web-app'], { root, projectDir: dir }).code, 0);
  const none = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.match(none, /<!-- f3 practices: archetype:web-app@1\.0\.0 -->\n\nNo practice of the f3 catalog is adopted\.\n\n## Stack/);
  assert.ok(!existsSync(join(dir, '.claude/skills/f3-stack-ng')));
  // Without an archetype either, the marker says none.
  assert.equal(cmd(['apply', '--archetype', 'none'], { root, projectDir: dir }).code, 0);
  const empty = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.match(empty, /<!-- f3 practices: none -->/);
  assert.deepEqual(readMarker(empty), []);
});

test('apply keeps the text modified by hand unless --force names it', () => {
  const { root } = mini();
  const dir = project();
  cmd(['apply', '--archetype', 'none', 'frontend', 'f3-stack-ng'], { root, projectDir: dir });
  const skill = join(dir, '.claude/skills/f3-stack-ng/references/more.md');
  writeFileSync(skill, 'Changed.\n');
  const agents = join(dir, 'AGENTS.md');
  writeFileSync(agents, readFileSync(agents, 'utf8').replace('Reason: one place.', 'Reason: one single place.'));
  assert.deepEqual(projectPractices(loadCatalog(root), dir).modified.sort(), ['f3-stack-ng: modified by hand', 'frontend: modified by hand']);
  const r = cmd(['apply', '--archetype', 'none', 'frontend'], { root, projectDir: dir });
  assert.equal(r.code, 3);
  assert.match(r.err, /skill f3-stack-ng was modified by hand/);
  assert.match(r.err, /the rules of frontend were modified by hand in AGENTS\.md/);
  assert.equal(readFileSync(skill, 'utf8'), 'Changed.\n');
  const forced = cmd(['apply', '--archetype', 'none', '--force', 'frontend', '--force', 'f3-stack-ng', 'frontend'], { root, projectDir: dir });
  assert.equal(forced.code, 0, forced.err);
  assert.match(forced.out, /removed \.claude\/skills\/f3-stack-ng\//);
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

test('show prints entries with their header and body, and the other files of a skill (D28)', () => {
  const { root } = mini();
  const r = cmd(['show', 'frontend', 'f3-stack-ng'], { root });
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /^=== rules\/frontend\/ENTRY\.md\n---\nid: frontend\n[\s\S]*FE-2\. \*\*Components display\.\*\* Reason: reuse\.\n\n=== skills\/f3-stack-ng\/SKILL\.md\n/);
  assert.match(r.out, /Use signals\.\n\(other files of the skill: references\/more\.md\)\n$/);
  assert.match(cmd(['show', 'nope'], { root }).err, /unknown entry: nope/);
  assert.equal(cmd(['show', 'frontend@1.2.0'], { root }).out, cmd(['show', 'frontend'], { root }).out);
  assert.match(cmd(['select', '--archetype', 'web-app'], { root }).out, /Read an entry with: f3 practices show <id>\n$/);
});

test('practices is a reserved subcommand of f3', async () => {
  const { RESERVED } = await import('../lib/toolkit.mjs');
  assert.ok(RESERVED.includes('practices'));
});

test('the guard of the tester lets it read the practice skills of the project, and nothing else of .claude/ (V-P4)', async () => {
  const { decide, loadPolicy } = await import('../lib/policy.mjs');
  const root = tempDir('f3-practices-guard-');
  mkdirSync(join(root, '.claude/skills/f3-stack-angular-developer'), { recursive: true });
  writeFileSync(join(root, '.claude/skills/f3-stack-angular-developer/SKILL.md'), 'x');
  const effect = (file) => decide('tester', loadPolicy('tester'), { tool: 'Read', input: { file_path: file } }, root)?.effect ?? 'none';
  assert.equal(effect('.claude/skills/f3-stack-angular-developer/SKILL.md'), 'none');
  assert.equal(effect('.claude/settings.json'), 'deny');
  assert.equal(effect('.claude/skills/openspec-apply-change/SKILL.md'), 'deny');
  assert.equal(effect('.claude/skills/practice-x/SKILL.md'), 'deny'); // the former prefix (D13)
});

test('projectUpdates: adopted items, newer versions, removed entries, text modified by hand, entries of the archetype not adopted', async () => {
  const { projectUpdates } = await import('../lib/practices.mjs');
  const m = mini();
  const dir = project();
  assert.equal(projectUpdates(loadCatalog(m.root), dir), null);
  cmd(['apply', '--archetype', 'web-app', '--recipe', 'ts-web', 'frontend'], { root: m.root, projectDir: dir });
  assert.deepEqual(projectUpdates(loadCatalog(m.root), dir), {
    adopted: ['archetype web-app@1.0.0', 'recipe ts-web@2.1.0', 'rules frontend@1.2.0'],
    updates: ['f3-stack-ng@1.0.0: proposed by the archetype, not adopted (arch/decisions.md says why before you propose it)'],
  });
  const bump = (path, from, to) => m.w(path, readFileSync(join(m.root, path), 'utf8').replace(from, to));
  bump('rules/frontend/ENTRY.md', 'version: 1.2.0', 'version: 1.3.0');
  bump('recipes/ts-web/ENTRY.md', 'version: 2.1.0', 'version: 2.2.0');
  const agents = join(dir, 'AGENTS.md');
  writeFileSync(agents, readFileSync(agents, 'utf8').replace('Reason: reuse.', 'Reason: reuse, always.'));
  const u = projectUpdates(loadCatalog(m.root), dir).updates;
  assert.ok(u.includes('frontend: 1.2.0 -> 1.3.0 in the catalog'), u.join('\n'));
  assert.ok(u.includes('ts-web: 2.1.0 -> 2.2.0 in the catalog (information only: archetype and recipe are not updated)'), u.join('\n'));
  assert.ok(u.includes('frontend: modified by hand'), u.join('\n'));
  rmSync(join(m.root, 'rules/frontend'), { recursive: true });
  m.w('rules/security/ENTRY.md', readFileSync(join(m.root, 'rules/security/ENTRY.md'), 'utf8').replace('requires: [frontend]', 'requires: []'));
  m.w('archetypes/web-app/ENTRY.md', readFileSync(join(m.root, 'archetypes/web-app/ENTRY.md'), 'utf8').replace('practices: [frontend]', 'practices: []'));
  assert.ok(projectUpdates(loadCatalog(m.root), dir).updates.includes('frontend: removed from the catalog'));
});

test('diff shows the text of the project against the catalog, for rules and skills', () => {
  const m = mini();
  const dir = project();
  cmd(['apply', '--archetype', 'none', 'frontend', 'f3-stack-ng'], { root: m.root, projectDir: dir });
  assert.equal(cmd(['diff', 'frontend', 'f3-stack-ng'], { root: m.root, projectDir: dir }).out, 'AGENTS.md (FE): identical\n.claude/skills/f3-stack-ng/SKILL.md: identical\n.claude/skills/f3-stack-ng/references/more.md: identical\n');
  m.w('rules/frontend/ENTRY.md', readFileSync(join(m.root, 'rules/frontend/ENTRY.md'), 'utf8').replace('Reason: reuse.', 'Reason: reuse everywhere.').replace('version: 1.2.0', 'version: 1.3.0'));
  m.w('skills/f3-stack-ng/references/new.md', 'New.\n');
  const out = cmd(['diff', 'frontend', 'f3-stack-ng'], { root: m.root, projectDir: dir }).out;
  assert.match(out, /--- project AGENTS\.md \(FE\)\n\+\+\+ catalog AGENTS\.md \(FE\)\n[\s\S]*-FE-2\. \*\*Components display\.\*\* Reason: reuse\.\n\+FE-2\. \*\*Components display\.\*\* Reason: reuse everywhere\./);
  assert.match(out, /\+\+\+ catalog \.claude\/skills\/f3-stack-ng\/references\/new\.md\n@@ -0,0 \+1 @@\n\+New\./);
  assert.match(cmd(['diff', 'ts-web'], { root: m.root, projectDir: dir }).err, /only rules and skills are copied/);
});
