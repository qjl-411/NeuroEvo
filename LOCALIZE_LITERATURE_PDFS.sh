#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
python apps/api/scripts/localize_literature_pdfs.py --all --workers 4 --retries 2 --timeout 60
