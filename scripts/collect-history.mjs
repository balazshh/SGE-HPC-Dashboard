import fs from "node:fs";
import { execSync } from "node:child_process";

import { parseQacct } from "./lib/parse-history.mjs";
import { storeHistory } from "./lib/store.mjs";

const samplePath = process.env.QACCT_SAMPLE ?? new URL("./fixtures/qacct.sample.txt", import.meta.url);
const text = process.env.QACCT_COMMAND
  ? execSync(process.env.QACCT_COMMAND, { encoding: "utf8" })
  : fs.readFileSync(samplePath, "utf8");
const records = parseQacct(text);

await storeHistory(records);
console.log(JSON.stringify(records, null, 2));
