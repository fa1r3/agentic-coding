#!/usr/bin/env bash
# Installs the f3 toolkit for Claude Code, OpenCode or both (D9): renders the agents and commands of each
# tool, links them and the common files, then removes the dead links it left behind (analysis 4.5).
# If a render fails, no link is touched.
# Usage: ./install.sh                         asks which tool to install
#        ./install.sh claude|opencode|all     installs for one tool, or both
#        ./install.sh --remove                removes every link created by this repository, for both tools
#        ./install.sh --render <dir>          renders each tool into <dir>/<tool>/, laid out like modules/,
#                                             without installing anything (comparison with the references)
# For each tool (<config>: ~/.claude for Claude Code, ~/.config/opencode for OpenCode):
#   build/<tool>/*/agents/*.md     -> <config>/agents/      (rendered by f3 render <tool>)
#   build/<tool>/*/commands/*.md   -> <config>/commands/
#   modules/*/skills/*/            -> <config>/skills/      (common, not rendered: D20)
# For both:
#   modules/*/scripts/*            -> ~/.local/share/f3/scripts/
#   modules/*/schemas/*/           -> ~/.local/share/openspec/schemas/
#   cli/f3.mjs                     -> ~/.local/bin/f3 (the launcher, and f3 state, called by every command)
set -euo pipefail

TOOLKIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
OPENCODE="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
SCRIPTS="$DATA/f3/scripts"
SCHEMAS="$DATA/openspec/schemas"
# Former location of the scripts under OpenCode: the links left there are removed.
OLD_SCRIPTS="$OPENCODE/scripts"
# Fixed path: the guard hook of each Claude Code agent calls "$HOME/.local/bin/f3".
BIN="$HOME/.local/bin"
NODE_MIN="20.19.0"
MODE="${1:-ask}"

usage() {
  echo "Usage: $0 [claude|opencode|all | --remove | --render <dir>]" >&2
  exit 1
}

need_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Missing prerequisite: node is not in the PATH." >&2
    exit 1
  fi
  local version
  version="$(node -p 'process.versions.node')"
  if [[ "$(printf '%s\n%s\n' "$NODE_MIN" "$version" | sort -V | head -1)" != "$NODE_MIN" ]]; then
    echo "Node.js $version is too old: OpenSpec and f3 need $NODE_MIN or later." >&2
    exit 1
  fi
}

config_of() {
  case "$1" in
    claude) echo "$CLAUDE" ;;
    opencode) echo "$OPENCODE" ;;
  esac
}

name_of() {
  case "$1" in
    claude) echo "Claude Code" ;;
    opencode) echo "OpenCode" ;;
  esac
}

# Removes the links of the toolkit in a folder: all of them with "all", the dead ones with "dead".
remove_links() {
  local dir="$1" which="$2" label="$3" entry
  for entry in "$dir"/*; do
    if [[ -L "$entry" && "$(readlink "$entry")" == "$TOOLKIT"/* ]] && [[ "$which" == all || ! -e "$entry" ]]; then
      rm "$entry"
      echo "$label: $entry"
    fi
  done
}

link() {
  local source="$1" target="$2"
  if [[ -e "$target" && ! -L "$target" ]]; then
    echo "Skipped: $target exists and is not a link. Move it, then run install.sh again." >&2
    return 0
  fi
  ln -sfn "$source" "$target"
}

shopt -s nullglob

case "$MODE" in
  --render)
    [[ $# -eq 2 && -n "$2" ]] || usage
    need_node
    exec node "$TOOLKIT/cli/f3.mjs" render --to "$2"
    ;;
  --remove)
    [[ $# -eq 1 ]] || usage
    for dir in "$CLAUDE"/{agents,commands,skills} "$OPENCODE"/{agents,commands,skills} "$SCRIPTS" "$SCHEMAS" "$BIN" "$OLD_SCRIPTS"; do
      remove_links "$dir" all Removed
    done
    exit 0
    ;;
  ask)
    printf 'Install the f3 toolkit for:\n  1) Claude Code\n  2) OpenCode\n  3) both\nChoice [1-3]: '
    while true; do
      if ! read -r choice; then
        echo >&2
        echo "No choice made: run $0 claude, opencode or all." >&2
        exit 1
      fi
      case "$choice" in
        1) TOOLS=(claude) ;;
        2) TOOLS=(opencode) ;;
        3) TOOLS=(claude opencode) ;;
        *) printf 'Choice [1-3]: '; continue ;;
      esac
      break
    done
    ;;
  claude | opencode)
    [[ $# -eq 1 ]] || usage
    TOOLS=("$MODE")
    ;;
  all)
    [[ $# -eq 1 ]] || usage
    TOOLS=(claude opencode)
    ;;
  *) usage ;;
esac

# Prerequisites: node renders and runs f3, so it stops the installation; a tool or OpenSpec missing
# from the PATH only gives a warning, since it may be installed afterwards.
need_node
for tool in "${TOOLS[@]}"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Warning: $tool is not in the PATH: install $(name_of "$tool") to use f3 with it." >&2
  fi
done
if ! command -v openspec >/dev/null 2>&1; then
  echo "Warning: openspec is not in the PATH: install OpenSpec, which every f3 project uses." >&2
fi

# (1) Render. The agents and commands are rendered into build/<tool>, a link to the last complete
# render: the links below go through it and never change. A failed render stops here.
for tool in "${TOOLS[@]}"; do
  node "$TOOLKIT/cli/f3.mjs" render "$tool"
done

# (2) Links.
DIRS=("$SCRIPTS" "$SCHEMAS" "$BIN")
for tool in "${TOOLS[@]}"; do
  config="$(config_of "$tool")"
  DIRS+=("$config/agents" "$config/commands" "$config/skills")
done
mkdir -p "${DIRS[@]}"

for tool in "${TOOLS[@]}"; do
  config="$(config_of "$tool")"
  for module in "$TOOLKIT"/modules/*/; do
    rendered="$TOOLKIT/build/$tool/$(basename "$module")/"
    for f in "$rendered"agents/*.md; do link "$f" "$config/agents/$(basename "$f")"; done
    for f in "$rendered"commands/*.md; do link "$f" "$config/commands/$(basename "$f")"; done
    for d in "$module"skills/*/; do link "${d%/}" "$config/skills/$(basename "$d")"; done
  done
done
for module in "$TOOLKIT"/modules/*/; do
  for f in "$module"scripts/*; do link "$f" "$SCRIPTS/$(basename "$f")"; done
  for d in "$module"schemas/*/; do link "${d%/}" "$SCHEMAS/$(basename "$d")"; done
done
link "$TOOLKIT/cli/f3.mjs" "$BIN/f3"

# (3) Cleanup of the dead links, then of the former location of the scripts.
for dir in "${DIRS[@]}"; do
  remove_links "$dir" dead "Dead link removed"
done
for tool in "${TOOLS[@]}"; do
  if [[ "$tool" == opencode ]]; then remove_links "$OLD_SCRIPTS" all "Obsolete link removed"; fi
done

case ":$PATH:" in
  *":$BIN:"*) ;;
  *) echo "Warning: $BIN is not in the PATH; add it so that the f3 command is found." >&2 ;;
esac

for tool in "${TOOLS[@]}"; do
  case "$tool" in
    claude) echo "Toolkit linked for Claude Code. New Claude Code sessions load the agents, commands and skills." ;;
    opencode) echo "Toolkit linked for OpenCode. Restart OpenCode to load the agents, commands and skills." ;;
  esac
done
