#!/usr/bin/env bash
# Links the f3 toolkit to OpenCode and OpenSpec, then removes the dead links it left behind.
# Usage: ./install.sh                  create or refresh the links
#        ./install.sh --remove         remove every link created by this repository
#        ./install.sh --render <dir>   render each tool into <dir>/<tool>/, laid out like modules/,
#                                      without installing anything (comparison with the references)
#   modules/*/agents/*.md    -> ~/.config/opencode/agents/
#   modules/*/commands/*.md  -> ~/.config/opencode/commands/
#   modules/*/skills/*/      -> ~/.config/opencode/skills/
#   modules/*/scripts/*      -> ~/.config/opencode/scripts/
#   modules/*/schemas/*/     -> ~/.local/share/openspec/schemas/
set -euo pipefail

TOOLKIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCODE="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
SCHEMAS="${XDG_DATA_HOME:-$HOME/.local/share}/openspec/schemas"
MODE="${1:-install}"

if [[ "$MODE" != "install" && "$MODE" != "--remove" && "$MODE" != "--render" ]]; then
  echo "Usage: $0 [--remove | --render <dir>]" >&2
  exit 1
fi

if [[ "$MODE" == "--render" ]]; then
  if [[ $# -ne 2 || -z "$2" ]]; then
    echo "Usage: $0 --render <dir>" >&2
    exit 1
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "Missing prerequisite: node is not in the PATH." >&2
    exit 1
  fi
  exec node "$TOOLKIT/cli/f3.mjs" render --to "$2"
fi

link() {
  local source="$1" target="$2"
  if [[ -e "$target" && ! -L "$target" ]]; then
    echo "Skipped: $target exists and is not a link. Move it, then run install.sh again." >&2
    return 0
  fi
  ln -sfn "$source" "$target"
}

DIRS=("$OPENCODE/agents" "$OPENCODE/commands" "$OPENCODE/skills" "$OPENCODE/scripts" "$SCHEMAS")
shopt -s nullglob

if [[ "$MODE" == "--remove" ]]; then
  for dir in "${DIRS[@]}"; do
    for entry in "$dir"/*; do
      if [[ -L "$entry" && "$(readlink "$entry")" == "$TOOLKIT"/* ]]; then
        rm "$entry"
        echo "Removed: $entry"
      fi
    done
  done
  exit 0
fi

mkdir -p "${DIRS[@]}"

for module in "$TOOLKIT"/modules/*/; do
  for f in "$module"agents/*.md; do link "$f" "$OPENCODE/agents/$(basename "$f")"; done
  for f in "$module"commands/*.md; do link "$f" "$OPENCODE/commands/$(basename "$f")"; done
  for d in "$module"skills/*/; do link "${d%/}" "$OPENCODE/skills/$(basename "$d")"; done
  for f in "$module"scripts/*; do link "$f" "$OPENCODE/scripts/$(basename "$f")"; done
  for d in "$module"schemas/*/; do link "${d%/}" "$SCHEMAS/$(basename "$d")"; done
done

for dir in "${DIRS[@]}"; do
  for entry in "$dir"/*; do
    if [[ -L "$entry" && ! -e "$entry" && "$(readlink "$entry")" == "$TOOLKIT"/* ]]; then
      rm "$entry"
      echo "Dead link removed: $entry"
    fi
  done
done

echo "Toolkit linked. Restart OpenCode to load the agents, commands and skills."
