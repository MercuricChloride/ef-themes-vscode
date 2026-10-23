#!/bin/sh
# Regenerate scripts/palettes.json from the Emacs packages.
#
# Usage: scripts/update-palettes.sh [EF_THEMES_DIR MODUS_THEMES_DIR]
#
# Defaults to the vendor/ submodules. Use a modus-themes revision at
# least as new as the version ef-themes requires (see Package-Requires
# in ef-themes.el).
set -eu

here=$(cd "$(dirname "$0")" && pwd)
root=$(dirname "$here")

case $# in
  0) ef=$root/vendor/ef-themes; modus=$root/vendor/modus-themes ;;
  2) ef=$1; modus=$2 ;;
  *) echo "usage: $0 [EF_THEMES_DIR MODUS_THEMES_DIR]" >&2; exit 1 ;;
esac

for dir in "$ef" "$modus"; do
  if [ ! -f "$dir/$(basename "$dir").el" ]; then
    echo "$dir is missing or empty; run: git submodule update --init" >&2
    exit 1
  fi
done

ef=$(cd "$ef" && pwd)
modus=$(cd "$modus" && pwd)

ef_rev=$(git -C "$ef" describe --tags --always --dirty)
modus_rev=$(git -C "$modus" describe --tags --always --dirty)

emacs -Q --batch -L "$modus" -L "$ef" -l "$here/dump-palettes.el" \
  --eval "(ef-vscode-dump \"$here/palettes.json\" \"$ef_rev\" \"$modus_rev\")"

echo "Wrote $here/palettes.json (ef-themes $ef_rev, modus-themes $modus_rev)"
