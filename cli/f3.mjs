#!/usr/bin/env node
// f3: the command of the f3 toolkit, for Claude Code and OpenCode.
//   f3 <step> [arguments] [-- prompt]  starts a session of the tool of the project as the agent of the step,
//                                      running /f3-<step>; the prompt reaches the agent through f3 state
//   f3 tool [claude|opencode]          shows or sets the tool of the project (.f3/local)
//   f3 state <command> [args]          launch state of a command (its single shell injection)
//   f3 guard <agent>                   PreToolUse hook of an agent under Claude Code: applies its permission table
//   f3 guard-prompt                    UserPromptSubmit hook of the project under Claude Code: an f3 command runs as its agent
//   f3 render [tool] [--to dir]        renders the agents and commands for one tool, or both, into build/
import { RESERVED, commands } from './lib/toolkit.mjs';

const [sub, ...rest] = process.argv.slice(2);

function usage() {
  const steps = Object.keys(commands()).sort();
  return [
    'Usage: f3 <step> [<arguments>] [-- <prompt>]',
    `Steps: ${steps.join(', ')}`,
    'Each step starts a new session of the tool of the project (.f3/local) as its agent and runs the command /f3-<step>.',
    'The arguments are identifiers; everything after the first "--" is a prompt for the agent, taken as is.',
    'f3 tool [claude|opencode] shows or sets the tool of the project.',
    'Other subcommands, used by the commands and hooks of the toolkit: state, guard, guard-prompt.',
    'f3 render [claude|opencode] [--to <dir>] renders the toolkit for one tool, or both, into build/ (or as a full view into <dir>).',
  ].join('\n');
}

async function main() {
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(usage());
    return 0;
  }
  if (sub === 'state') {
    const { state } = await import('./lib/state.mjs');
    return state(rest[0], rest.slice(1).join(' '));
  }
  if (sub === 'tool') {
    const { toolSubcommand } = await import('./lib/launch.mjs');
    return toolSubcommand(rest);
  }
  if (sub === 'render') {
    const { renderCommand } = await import('./lib/render.mjs');
    return renderCommand(rest);
  }
  if (sub === 'guard') {
    const { guard } = await import('./lib/guard.mjs');
    return guard(rest[0]);
  }
  if (sub === 'guard-prompt') {
    const { guardPrompt } = await import('./lib/guard.mjs');
    return guardPrompt();
  }
  const step = commands()[sub];
  if (!step || RESERVED.includes(sub)) {
    console.error(`f3: unknown step "${sub}".\n${usage()}`);
    return 1;
  }
  if (!step.agent) {
    console.error(`f3: the command /f3-${sub} declares no agent (key agent).`);
    return 1;
  }
  const { launch } = await import('./lib/launch.mjs');
  const { render } = await import('./lib/render.mjs');
  return launch(sub, step.agent, rest, { render });
}

main().then((code) => process.exit(code), (error) => {
  console.error(`f3: ${error.message}`);
  process.exit(sub === 'guard' ? 2 : 1);
});
