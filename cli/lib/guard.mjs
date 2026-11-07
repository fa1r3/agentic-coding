// Hooks of Claude Code: f3 guard (PreToolUse of each agent) and f3 guard-prompt (UserPromptSubmit of the project).
import { readFileSync } from 'node:fs';
import { decide, loadPolicy } from './policy.mjs';
import { commands } from './toolkit.mjs';

// f3 guard <agent>. Exits only with 0 or 2: any internal error refuses the call (fail closed).
// A call the table permits gets no decision: the user's settings and permission mode apply.
export function guard(agent) {
  try {
    const call = JSON.parse(readFileSync(0, 'utf8'));
    const table = loadPolicy(agent);
    const result = decide(agent, table, { tool: call.tool_name, input: call.tool_input }, call.cwd || process.cwd());
    if (!result) return 0;
    if (result.effect === 'ask') {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: result.reason },
      }));
      return 0;
    }
    process.stderr.write(result.reason);
    return 2;
  } catch (error) {
    process.stderr.write(`f3 guard failed: ${error.message} — the call is refused`);
    return 2;
  }
}

// The message that blocks a prompt, or null.
export function promptVerdict(prompt, agentType, table = commands()) {
  const m = /^\s*\/f3-([a-z-]+)(?:\s+([\s\S]*))?$/.exec(prompt || '');
  if (!m || !table[m[1]]) return null;
  const expected = table[m[1]].agent;
  if (!expected || agentType === expected) return null;
  const args = (m[2] || '').trim();
  return `/f3-${m[1]} runs as the ${expected} agent, in a session of its own. Run it in a terminal: f3 ${m[1]}${args ? ' ' + args : ''}`;
}

// f3 guard-prompt. Lets the prompt through on an internal error: refusing would block everything
// typed in the project; a broken f3 still interrupts the f3 commands through their f3 state injection.
export function guardPrompt() {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    const message = promptVerdict(input.prompt, input.agent_type);
    if (!message) return 0;
    process.stderr.write(message);
    return 2;
  } catch {
    return 0;
  }
}
