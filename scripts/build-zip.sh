#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

node scripts/sync-core.mjs

mkdir -p dist
OUT_ZIP="dist/snapback-extension-v1.0.0.zip"
rm -f "$OUT_ZIP" "dist/focusguard-v1.0.0.zip"

python3 - <<'PY'
import os
import sys
import zipfile

ext_dir = "extension"
include_rel = ["manifest.json", "_locales", "src", "assets"]
root_docs = ["LICENSE", "PRIVACY.md", "README.md"]
out_zip = "dist/snapback-extension-v1.0.0.zip"

for rel in include_rel:
    full = os.path.join(ext_dir, rel)
    if not os.path.exists(full):
        print(f"ERROR: Missing required extension path: {full}", file=sys.stderr)
        sys.exit(1)

with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
    for doc in root_docs:
        if os.path.isfile(doc):
            zf.write(doc, doc)
    for rel in include_rel:
        full = os.path.join(ext_dir, rel)
        if os.path.isfile(full):
            zf.write(full, rel)
        elif os.path.isdir(full):
            for root, _, files in os.walk(full):
                for f in sorted(files):
                    abs_f = os.path.join(root, f)
                    arc_name = os.path.relpath(abs_f, ext_dir)
                    zf.write(abs_f, arc_name)

print(f"Created {out_zip} ({os.path.getsize(out_zip)} bytes)")
PY
