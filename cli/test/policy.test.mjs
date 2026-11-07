import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { decide, loadPolicy, shellReadCheck, wildcard } from '../lib/policy.mjs';
import { HOME } from '../lib/toolkit.mjs';

const root = mkdtempSync(join(tmpdir(), 'f3-policy-'));
for (const d of ['tests/e2e/steps', 'src', 'openspec/changes/demo', 'ux']) mkdirSync(join(root, d), { recursive: true });

const effect = (agent, tool, input) => decide(agent, loadPolicy(agent), { tool, input }, root)?.effect ?? 'none';

test('wildcard follows OpenCode: "*" crosses folders', () => {
  assert.ok(wildcard('openspec/changes/a/specs/x.md', 'openspec/changes/*'));
  assert.ok(wildcard('openspec/changes/a/tasks.md', 'openspec/changes/*/tasks.md'));
  assert.ok(!wildcard('openspec/specs/x.md', 'openspec/changes/*'));
  assert.ok(wildcard('anything/at/all', '*'));
});

// [agent, tool, input, expected effect] — "none" means no decision: the user's settings apply.
const CASES = [
  ['analyst', 'Write', { file_path: 'openspec/changes/demo/proposal.md' }, 'none'],
  ['analyst', 'Edit', { file_path: 'CONTEXT.md' }, 'none'],
  ['analyst', 'Write', { file_path: 'src/app.js' }, 'deny'],
  ['analyst', 'Write', { file_path: 'openspec/specs/x/spec.md' }, 'deny'],
  ['analyst', 'Write', { file_path: '/etc/passwd' }, 'deny'],
  ['analyst', 'Read', { file_path: 'src/app.js' }, 'none'],
  ['analyst', 'Bash', { command: 'cat src/app.js' }, 'none'],
  ['architect', 'Write', { file_path: 'arch/decisions.md' }, 'none'],
  ['architect', 'Write', { file_path: 'CLAUDE.md' }, 'none'],
  ['architect', 'Write', { file_path: '.mcp.json' }, 'none'],
  ['architect', 'Write', { file_path: '.claude/settings.json' }, 'none'],
  ['architect', 'Write', { file_path: '.claude/settings.local.json' }, 'deny'],
  ['architect', 'Edit', { file_path: 'src/app.js' }, 'deny'],
  ['architect', 'Edit', { file_path: 'ux/brief.md' }, 'deny'],
  ['architect', 'Edit', { file_path: 'ux/decisions.md' }, 'none'],
  ['developer', 'Write', { file_path: 'src/app.js' }, 'none'],
  ['developer', 'Edit', { file_path: 'openspec/changes/demo/tasks.md' }, 'none'],
  ['developer', 'Edit', { file_path: 'openspec/changes/demo/specs/a/spec.md' }, 'deny'],
  ['developer', 'Write', { file_path: 'tests/e2e/steps/a.ts' }, 'deny'],
  ['developer', 'Edit', { file_path: 'ux/views.md' }, 'none'],
  ['developer', 'Edit', { file_path: 'ux/brief.md' }, 'deny'],
  ['developer', 'Edit', { file_path: 'CLAUDE.md' }, 'deny'],
  ['developer', 'Edit', { file_path: '.mcp.json' }, 'deny'],
  ['developer', 'Edit', { file_path: '.claude/settings.json' }, 'deny'],
  ['developer', 'Edit', { file_path: 'AGENTS.md' }, 'deny'],
  ['developer', 'Edit', { file_path: 'src/../AGENTS.md' }, 'deny'],
  ['developer', 'Agent', { subagent_type: 'Explore' }, 'none'],
  ['tester', 'Read', { file_path: 'openspec/changes/demo/proposal.md' }, 'none'],
  ['tester', 'Read', { file_path: 'tests/e2e/steps/a.ts' }, 'none'],
  ['tester', 'Read', { file_path: 'package.json' }, 'none'],
  ['tester', 'Read', { file_path: 'src/app.js' }, 'deny'],
  ['tester', 'Read', { file_path: 'tests/../src/app.js' }, 'deny'],
  ['tester', 'Read', { file_path: join(root, 'src/app.js') }, 'deny'],
  ['tester', 'Read', { file_path: join(HOME, '.claude/skills/e2e-practice/SKILL.md') }, 'none'],
  ['tester', 'Read', { file_path: '/etc/passwd' }, 'deny'],
  ['tester', 'Grep', { pattern: 'secret' }, 'deny'],
  ['tester', 'Grep', { pattern: 'secret', path: 'src' }, 'deny'],
  ['tester', 'Grep', { pattern: 'Given', path: 'tests' }, 'none'],
  ['tester', 'Grep', { pattern: 'Given', path: 'tests/e2e/steps' }, 'none'],
  ['tester', 'Glob', { pattern: 'src/**/*.ts' }, 'deny'],
  ['tester', 'Glob', { pattern: '**/*.ts', path: 'tests' }, 'none'],
  ['tester', 'Glob', { pattern: '../src/**', path: 'tests' }, 'deny'],
  ['tester', 'Bash', { command: 'cat src/app.js' }, 'deny'],
  ['tester', 'Bash', { command: 'npx playwright test tests/e2e --grep "login"' }, 'none'],
  ['tester', 'Bash', { command: 'git status' }, 'none'],
  ['tester', 'Bash', { command: 'git diff HEAD~1' }, 'deny'],
  ['tester', 'Bash', { command: 'git -C . show HEAD:src/app.js' }, 'deny'],
  ['tester', 'Bash', { command: 'git log -p -1' }, 'deny'],
  ['tester', 'Bash', { command: 'git log --oneline -5' }, 'none'],
  ['tester', 'Bash', { command: 'npm test && grep -r secret src' }, 'deny'],
  ['tester', 'Bash', { command: 'grep -rn "Given" tests/e2e' }, 'none'],
  ['tester', 'Bash', { command: 'grep -rn "Given" tests openspec/changes/demo' }, 'none'],
  ['tester', 'Bash', { command: 'grep -r secret' }, 'deny'],
  ['tester', 'Bash', { command: 'grep -rn Given tests src' }, 'deny'],
  ['tester', 'Bash', { command: 'grep Given tests/../src/app.js' }, 'deny'],
  ['tester', 'Bash', { command: 'grep -f src/patterns.txt tests' }, 'deny'],
  ['tester', 'Bash', { command: 'grep -e foo -e bar tests openspec' }, 'none'],
  ['tester', 'Bash', { command: 'grep -A3 -m 2 Given tests/e2e/steps/a.ts' }, 'none'],
  ['tester', 'Bash', { command: 'npx bddgen -c tests/e2e/playwright.config.ts 2>&1 | grep missing' }, 'none'],
  ['tester', 'Bash', { command: 'rg Given tests' }, 'none'],
  ['tester', 'Bash', { command: 'rg -t ts --glob "*.steps.ts" Given tests/e2e' }, 'none'],
  ['tester', 'Bash', { command: 'rg secret' }, 'deny'],
  ['tester', 'Bash', { command: 'rg --files src' }, 'deny'],
  ['tester', 'Bash', { command: 'rg --files tests' }, 'none'],
  ['tester', 'Bash', { command: 'npm test | rg failed' }, 'none'],
  ['tester', 'Bash', { command: "find tests -name '*.ts'" }, 'none'],
  ['tester', 'Bash', { command: "find . -name '*.ts'" }, 'deny'],
  ['tester', 'Bash', { command: 'find src' }, 'deny'],
  ['tester', 'Bash', { command: 'find tests -name "*.ts" -exec cat {} ;' }, 'deny'],
  ['tester', 'Bash', { command: 'ls src | xargs grep secret' }, 'deny'],
  ['tester', 'Bash', { command: 'bash -c "cat src/app.js"' }, 'deny'],
  ['tester', 'Bash', { command: 'timeout 5 cat src/app.js' }, 'deny'],
  ['tester', 'Bash', { command: 'cat tests/e2e/steps/a.ts' }, 'deny'],
  ['tester', 'Bash', { command: 'ls tests/e2e' }, 'none'],
  ['tester', 'Bash', { command: 'echo $(head -1 src/app.js)' }, 'deny'],
  ['tester', 'Bash', { command: 'node -e "console.log(1)"' }, 'deny'],
  ['tester', 'Bash', { command: 'node tests/e2e/run.mjs' }, 'none'],
  ['tester', 'Bash', { command: 'python3 -c "print(1)"' }, 'deny'],
  ['tester', 'Bash', { command: 'LANG=C /usr/bin/cat src/app.js' }, 'deny'],
  ['tester', 'Bash', { command: 'openspec instructions specs --change demo' }, 'none'],
  ['tester', 'Agent', { subagent_type: 'tester' }, 'none'],
  ['tester', 'Agent', { subagent_type: 'Explore' }, 'deny'],
  ['tester', 'Agent', { subagent_type: 'general-purpose' }, 'deny'],
  ['tester', 'Agent', {}, 'deny'],
  ['tester', 'Write', { file_path: 'tests/e2e/steps/a.ts' }, 'none'],
  ['tester', 'Write', { file_path: 'src/app.js' }, 'deny'],
  ['tester', 'Edit', { file_path: 'openspec/changes/demo/acceptance/pass-01.md' }, 'none'],
  ['ux', 'Write', { file_path: 'ux/brief.md' }, 'ask'],
  ['ux', 'Read', { file_path: 'src/app.js' }, 'none'],
  ['ux', 'Agent', { subagent_type: 'general-purpose' }, 'none'],
];

for (const [agent, tool, input, expected] of CASES) {
  test(`${agent} ${tool} ${JSON.stringify(input)} -> ${expected}`, () => {
    assert.equal(effect(agent, tool, input), expected);
  });
}

test('every agent table loads', () => {
  for (const agent of ['analyst', 'architect', 'developer', 'tester', 'ux']) assert.ok(loadPolicy(agent));
});

test('unknown agent is an error', () => {
  assert.throws(() => loadPolicy('nobody'), /unknown agent/);
});

test('shell read check: program and reason', () => {
  const table = loadPolicy('tester');
  assert.equal(shellReadCheck('sed -n 1,10p tests/a.ts', table, root).program, 'sed');
  assert.equal(shellReadCheck('npx bddgen -c tests/e2e/playwright.config.ts', table, root), null);
  assert.equal(shellReadCheck('git show --stat', table, root).program, 'git show');
  assert.deepEqual(shellReadCheck('grep -r x src', table, root), { program: 'grep', reason: 'search', path: 'src/' });
});

test('the refusal of the tester redirects to the Read tool and lists what it may read', () => {
  const r = decide('tester', loadPolicy('tester'), { tool: 'Bash', input: { command: 'cat src/a' } }, root);
  assert.match(r.reason, /Use the Read tool, or search with grep, rg or find in what you may read; you may read openspec\/, tests\//);
});
