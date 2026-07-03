#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export QACCT_SAMPLE="${QACCT_SAMPLE:-$ROOT_DIR/scripts/fixtures/qacct.sample.txt}"

node --input-type=module <<'NODE'
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { parseQacct } from './scripts/lib/parse-history.mjs';
import { storeHistory } from './scripts/lib/store.mjs';

const text = process.env.QACCT_COMMAND
  ? execSync(process.env.QACCT_COMMAND, { encoding: 'utf8' })
  : fs.readFileSync(process.env.QACCT_SAMPLE, 'utf8');
const records = parseQacct(text);
await storeHistory(records);
console.log(JSON.stringify(records, null, 2));
NODE
