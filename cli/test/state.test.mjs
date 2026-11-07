import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdtempSync, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// A throwaway toolkit (the fixtures and the tools/ of the toolkit) and a throwaway HOME where f3 is
// installed for both tools: set before the toolkit is loaded, so that no test renders the real toolkit.
const sandbox = mkdtempSync(join(tmpdir(), 'f3-state-sandbox-'));
const ROOT = join(sandbox, 'toolkit');
const HOME = join(sandbox, 'home');
cpSync(join(import.meta.dirname, 'fixtures', 'modules'), join(ROOT, 'modules'), { recursive: true });
cpSync(join(import.meta.dirname, '..', '..', 'tools'), join(ROOT, 'tools'), { recursive: true });
const AGENTS = { claude: join(HOME, '.claude', 'agents'), opencode: join(HOME, '.config', 'opencode', 'agents') };
for (const [tool, dir] of Object.entries(AGENTS)) {
  mkdirSync(dir, { recursive: true });
  symlinkSync(join(ROOT, 'build', tool, 'openspec', 'agents', 'analyst.md'), join(dir, 'analyst.md'));
}
Object.assign(process.env, { F3_TOOLKIT_ROOT: ROOT, HOME });
for (const k of ['CLAUDE_CONFIG_DIR', 'XDG_CONFIG_HOME', 'F3_LAUNCH']) delete process.env[k];
const { stateOf } = await import('../lib/state.mjs');
const { writeLaunchFile } = await import('../lib/launch.mjs');

function project({ framed = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'f3-state-'));
  const w = (f, t) => { mkdirSync(join(dir, f, '..'), { recursive: true }); writeFileSync(join(dir, f), t); };
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  if (framed) w('openspec/config.yaml', 'schema: f3\ncontext: |\n  Design tool:\n    Penpot, skill ux-penpot\n');
  w('BACKLOG.md', '# Backlog\n\n## B-001 Export\n\n- Status: open\n\n## B-002 Import\n\n- Status: in-progress add-import\n');
  w('arch/decisions.md', '## A-001 Stack\n\n- Status: active\n');
  w('openspec/changes/add-import/proposal.md', '# p\n');
  w('openspec/changes/add-import/clarification.md', '# c\n');
  w('openspec/changes/add-import/tasks.md', '## 1. Work\n\n- [x] 1.1 a\n- [ ] 1.2 b\n\n## 2. Acceptance fixes, pass 01\n\n- [ ] 2.1 c\n');
  w('openspec/changes/add-import/validations/amigos.md', 'ok\n');
  w('openspec/changes/empty-one/.keep', '');
  w('openspec/changes/archive/old/proposal.md', '');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], { cwd: dir });
  return dir;
}

function inDir(dir, fn) {
  const cwd = process.cwd();
  process.chdir(dir);
  try { return fn(); } finally { process.chdir(cwd); }
}

const framed = project();
const s = (cmd, args) => inDir(framed, () => stateOf(cmd, args));

test('propose lists the changes in progress and the backlog', () => {
  const r = s('propose');
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Project schema: schema: f3/);
  assert.match(r.stdout, /add-import: clarification\.md proposal\.md validations\/amigos\.md/);
  assert.match(r.stdout, /empty-one: \(empty\)/);
  assert.doesNotMatch(r.stdout, /archive|old/);
  assert.match(r.stdout, /## B-001 Export - Status: open/);
});

test('dev shows branch, uncommitted files, unchecked tasks and fix groups', () => {
  const r = s('dev', 'add-import');
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Current branch: main/);
  assert.match(r.stdout, /Uncommitted files: none/);
  assert.match(r.stdout, /Unchecked tasks: 2/);
  assert.match(r.stdout, /Fix groups: ## 2\. Acceptance fixes, pass 01/);
});

test('dev on a change without tasks', () => {
  const r = s('dev', 'empty-one');
  assert.match(r.stdout, /Unchecked tasks: tasks\.md absent/);
  assert.match(r.stdout, /Fix groups: none/);
});

test('acceptance, archive, design, design-review, tres-amigos, ux-design', () => {
  assert.match(s('acceptance', 'add-import').stdout, /openspec\/changes\/add-import\/acceptance: absent/);
  assert.match(s('archive', 'add-import').stdout, /Acceptance reports of the change: openspec\/changes\/add-import\/acceptance: absent/);
  const design = s('design', 'add-import');
  assert.equal(design.code, 0, design.stderr);
  assert.match(design.stdout, /Progress of OpenSpec/);
  assert.match(design.stdout, /## A-001 Stack - Status: active/);
  assert.match(s('design-review', 'add-import').stdout, /validations: amigos\.md/);
  assert.match(s('tres-amigos', 'add-import').stdout, /Path of the spec-practice skill: .*skills\/spec-practice\/SKILL\.md/);
  assert.match(s('ux-design', 'add-import').stdout, /Design tool named by the context: Penpot, skill ux-penpot/);
  assert.equal(s('ux-design', 'add-import conformity').code, 0);
});

test('invalid, unknown or missing change identifier: error with the changes in progress', () => {
  for (const arg of ['', 'nope', '../etc', 'Add-Import', "x'; touch pwned; echo '"]) {
    const r = s('dev', arg);
    assert.equal(r.code, 1, arg);
    assert.match(r.stderr, /Changes in progress: add-import, empty-one\./, arg);
  }
});

test('extra argument or unknown mode', () => {
  assert.match(s('dev', 'add-import extra').stderr, /Too many arguments: "extra"/);
  assert.match(s('ux-design', 'add-import review').stderr, /Unknown mode "review"/);
  assert.match(s('ux-design', 'add-import conformity more').stderr, /Too many arguments/);
});

test('a project that is not framed stops every command but init', () => {
  const bare = project({ framed: false });
  for (const cmd of ['propose', 'dev', 'ux-tokens']) {
    const r = inDir(bare, () => stateOf(cmd, 'add-import'));
    assert.equal(r.code, 1, cmd);
    assert.match(r.stderr, /not framed with f3.*f3 init/);
  }
  const init = inDir(bare, () => stateOf('init'));
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /openspec\/config\.yaml: absent/);
  assert.match(init.stdout, /Git repository: true/);
  assert.match(init.stdout, /Skills installed in the project by OpenSpec:\n  \.claude\/skills: absent\n  \.opencode\/skills: absent\n/);
});

test('init marks the f3 files, and the former form of the marker of AGENTS.md', () => {
  const p = equipped();
  for (const [line, label] of [['written by f3 init. To change it, run f3 init again.', '(f3 marker)'], ['written by /f3-init. To change it, run /f3-init again.', '(f3 marker, former form)']]) {
    p.w('AGENTS.md', `# AGENTS.md\n\n<!-- f3 standards: ${line} -->\n`);
    assert.ok(inDir(p.dir, () => stateOf('init', '', quiet)).stdout.includes(`AGENTS.md: present ${label}\n`), label);
  }
  const r = inDir(framed, () => stateOf('init'));
  assert.match(r.stdout, /openspec\/config\.yaml: present \(f3 marker\)/);
  assert.match(r.stdout, /CLAUDE\.md: absent/);
});

const launched = (cmd, args, launch, options = {}) => inDir(framed, () => stateOf(cmd, args, { env: { F3_LAUNCH: launch }, ...options }));

test('under f3, the idea and the note of the user come last, and the launch file is removed', () => {
  const file = writeLaunchFile({ idea: "export d'une facture", prompt: 'line one\n-- line two' });
  const r = launched('propose', '', file);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /\n\nIdea from the user:\n\nexport d'une facture\n\nNote from the user:\n\nline one\n-- line two\n$/);
  assert.doesNotMatch(r.stdout, /Not started by f3/);
  assert.ok(!existsSync(file) && !existsSync(join(file, '..')));
});

test('under f3 without a prompt, or once the launch file is consumed: no note', () => {
  const file = writeLaunchFile({ idea: null, prompt: null });
  for (let i = 0; i < 2; i++) {
    const r = launched('dev', 'add-import', file);
    assert.equal(r.code, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /from the user|Not started by f3/);
  }
});

test('without F3_LAUNCH, a line recommends f3 <step>, and the identifier is still checked', () => {
  const r = inDir(framed, () => stateOf('ux-design', 'add-import conformity', { env: {} }));
  assert.match(r.stdout, /\n- Not started by f3: .* here: f3 ux-design add-import conformity\n$/);
  assert.match(inDir(framed, () => stateOf('dev', "x'; touch pwned", { env: {} })).stderr, /names no change in progress/);
});

test('a launch file the launcher did not write is neither read nor removed', () => {
  const mine = join(framed, 'notes.txt');
  writeFileSync(mine, 'keep');
  const r = launched('dev', 'add-import', mine);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /F3_LAUNCH names a file the launcher of f3 does not write/);
  assert.ok(existsSync(mine));
  rmSync(mine);
  const open = writeLaunchFile({ idea: null, prompt: 'x' });
  chmodSync(open, 0o644);
  assert.match(launched('dev', 'add-import', open).stderr, /not a private file of the user/);
  assert.ok(existsSync(open));
  const link = writeLaunchFile({ idea: null, prompt: 'x' });
  rmSync(link);
  symlinkSync(join(framed, 'BACKLOG.md'), link);
  assert.match(launched('dev', 'add-import', link).stderr, /not a private file of the user/);
});

test('the tool of .f3/local is rendered, with its paths; without .f3/local, every installed tool', () => {
  const rendered = [];
  const renderTool = (tool) => { rendered.push(tool); return { switched: false }; };
  const both = inDir(framed, () => stateOf('tres-amigos', 'add-import', { renderTool }));
  assert.deepEqual(rendered, ['claude', 'opencode']);
  assert.match(both.stdout, /spec-practice skill: .*\.claude\/skills\/spec-practice\/SKILL\.md \(Claude Code\); .*\.config\/opencode\/skills\/spec-practice\/SKILL\.md \(OpenCode\)\n/);
  mkdirSync(join(framed, '.f3'), { recursive: true });
  writeFileSync(join(framed, '.f3', 'local'), 'tool=opencode\n');
  try {
    rendered.length = 0;
    const one = inDir(framed, () => stateOf('tres-amigos', 'add-import', { renderTool }));
    assert.deepEqual(rendered, ['opencode']);
    assert.match(one.stdout, new RegExp(`spec-practice skill: ${join(HOME, '.config', 'opencode', 'skills', 'spec-practice', 'SKILL.md')}\n`));
    writeFileSync(join(framed, '.f3', 'local'), 'tool=vim\n');
    assert.match(inDir(framed, () => stateOf('dev', 'add-import', { renderTool })).stderr, /unknown tool "vim"/);
  } finally {
    rmSync(join(framed, '.f3'), { recursive: true });
  }
});

test('a failed render is an error of the launch state', () => {
  const renderTool = () => { throw new Error('"{{" left in the render of claude: ux/agents/ux.md'); };
  const r = inDir(framed, () => stateOf('dev', 'add-import', { renderTool }));
  assert.equal(r.code, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /^f3 state dev: the render of Claude Code failed: "\{\{" left/);
});

test('a render that switches its link gives one warning line, then none once up to date', () => {
  // A changed source: the render of each tool differs from the target of its link.
  writeFileSync(join(ROOT, 'modules', 'ux', 'agents', 'ux.md'), '---\ndescription: "ux"\nmode: primary\n---\nchanged\n');
  const first = inDir(framed, () => stateOf('dev', 'add-import'));
  assert.equal(first.code, 0, first.stderr);
  assert.ok(existsSync(join(ROOT, 'build', 'claude')) && existsSync(join(ROOT, 'build', 'opencode')));
  assert.equal(first.stdout.match(/^- Warning: the toolkit had changed/gm).length, 2);
  assert.doesNotMatch(inDir(framed, () => stateOf('dev', 'add-import')).stdout, /Warning: the toolkit had changed/);
});

// A framed project with the files of both tools, in their state after f3 init, then altered by each test.
function equipped() {
  const dir = project();
  const w = (f, t) => { mkdirSync(join(dir, f, '..'), { recursive: true }); writeFileSync(join(dir, f), t); };
  w('CLAUDE.md', '@AGENTS.md\n@CONTEXT.md\n');
  w('.claude/settings.json', '{}\n');
  w('.mcp.json', '{ "mcpServers": { "playwright": {}, "penpot": {} } }\n');
  w('opencode.json', '{ "instructions": ["CONTEXT.md"], "mcp": { "penpot": {}, "playwright": {} } }\n');
  w('.claude/skills/openspec-apply-change/SKILL.md', 'x');
  w('.opencode/skills/openspec-apply-change/SKILL.md', 'x');
  w('.gitignore', '.f3/local\n');
  return { dir, w, rm: (f) => rmSync(join(dir, f), { recursive: true }) };
}
const quiet = { renderTool: () => ({ switched: false }) };
const toolWarnings = (dir, cmd = 'dev', args = 'add-import') => inDir(dir, () => stateOf(cmd, args, quiet)).stdout.split('\n').filter((l) => /^- Warning: (the project lacks|\.f3\/local|the MCP|cannot compare)/.test(l));

test('a framed project with the files of its tools, .f3/local ignored and the same MCP servers: no warning', () => {
  assert.deepEqual(toolWarnings(equipped().dir), []);
});

test('every command warns, without blocking, of the files a tool of the project lacks', () => {
  const p = equipped();
  p.rm('opencode.json');
  p.rm('.claude/skills');
  for (const cmd of [['dev', 'add-import'], ['propose', ''], ['ux-tokens', '']]) {
    const r = inDir(p.dir, () => stateOf(cmd[0], cmd[1], quiet));
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(toolWarnings(p.dir, ...cmd), [
      '- Warning: the project lacks files of Claude Code, which f3 is installed for (.claude/skills/openspec-*): run f3 init, theme Tools.',
      '- Warning: the project lacks files of OpenCode, which f3 is installed for (opencode.json): run f3 init, theme Tools.',
    ]);
  }
});

test('.f3/local not ignored by Git is reported; a project that is not framed gets no tool warning', () => {
  const p = equipped();
  p.w('.gitignore', 'node_modules/\n');
  assert.deepEqual(toolWarnings(p.dir), ['- Warning: .f3/local, the tool of each user, is not ignored by Git: run f3 init, theme Tools.']);
  const bare = project({ framed: false });
  assert.doesNotMatch(inDir(bare, () => stateOf('init', '', quiet)).stdout, /Warning: (the project lacks|\.f3)/);
});

test('MCP servers that differ between opencode.json and .mcp.json are reported (R14)', () => {
  const p = equipped();
  p.w('opencode.json', '{ "mcp": { "playwright": {} } }\n');
  assert.deepEqual(toolWarnings(p.dir), ['- Warning: the MCP servers of opencode.json (playwright) and .mcp.json (penpot, playwright) differ: run f3 init, theme Tools.']);
  p.w('opencode.json', '{ "mcp": ');
  assert.match(toolWarnings(p.dir)[0], /^- Warning: cannot compare the MCP servers of opencode.json and .mcp.json: /);
  p.rm('.mcp.json');
  assert.deepEqual(toolWarnings(p.dir), []);
});

test('init lists the tools of the project, installed or present, with what each lacks', () => {
  const p = equipped();
  p.rm('opencode.json');
  const r = inDir(p.dir, () => stateOf('init', '', quiet));
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /- Tools of the project \(f3 init writes the files of each one\):\n  claude \(Claude Code\): f3 installed; in the project: CLAUDE\.md, \.mcp\.json, \.claude\/settings\.json, \.claude\/skills\/openspec-\*\n  opencode \(OpenCode\): f3 installed; in the project: \.opencode\/skills\/openspec-\*; missing: opencode\.json\n/);
  assert.match(r.stdout, /opencode\.json: absent/);
  assert.match(r.stdout, /- \.f3\/local ignored by Git: yes/);
  assert.match(r.stdout, /  \.opencode\/skills: openspec-apply-change\n/);
});

test('a tool f3 is not installed for is a tool of the project when the project has its files', () => {
  const p = equipped();
  const saved = join(sandbox, 'opencode-agents');
  renameSync(AGENTS.opencode, saved);
  try {
    p.rm('.opencode');
    const r = inDir(p.dir, () => stateOf('init', '', quiet));
    assert.match(r.stdout, /  opencode \(OpenCode\): in the project: opencode\.json; missing: \.opencode\/skills\/openspec-\*\n/);
    assert.deepEqual(toolWarnings(p.dir), ['- Warning: the project lacks files of OpenCode, which the project uses (.opencode/skills/openspec-*): run f3 init, theme Tools.']);
    p.rm('opencode.json');
    assert.doesNotMatch(inDir(p.dir, () => stateOf('init', '', quiet)).stdout, /opencode \(OpenCode\)/);
  } finally {
    renameSync(saved, AGENTS.opencode);
  }
});

test('unknown command', () => {
  assert.equal(stateOf('nope').code, 1);
});
