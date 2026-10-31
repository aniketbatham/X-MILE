import fs from "fs";
import path from "path";

const LOCALES_DIR = "./src/i18n/locales";
const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".ts") && f !== "index.ts");

function parseLocaleFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const equalIdx = content.indexOf("=");
  const firstBrace = content.indexOf("{", equalIdx);
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`Could not find braces in ${filePath}`);
  }
  const objCode = content.substring(firstBrace, lastBrace + 1);
  return new Function(`return (${objCode});`)();
}

const enDict = parseLocaleFile(path.join(LOCALES_DIR, "en.ts"));

function getKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(getKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const masterKeys = getKeys(enDict);
const totalMasterKeys = masterKeys.length;

console.log("==========================================================================================");
console.log("             X-MILE TRANSLATION COMPLETENESS REPORT (ALL 23 LOCALES)                     ");
console.log("==========================================================================================");
console.log(`Total canonical translation keys: ${totalMasterKeys}\n`);

const rows = [];
let grandTotal = 0;
let grandTranslated = 0;
let grandMissing = 0;

for (const file of files.sort()) {
  const code = file.replace(".ts", "");
  const dict = parseLocaleFile(path.join(LOCALES_DIR, file));
  
  let translatedCount = 0;
  let missingKeys = [];

  for (const k of masterKeys) {
    const parts = k.split(".");
    let curr = dict;
    let found = true;
    for (const p of parts) {
      if (curr && typeof curr === "object" && p in curr && curr[p] !== undefined && curr[p] !== "") {
        curr = curr[p];
      } else {
        found = false;
        break;
      }
    }
    if (found) {
      translatedCount++;
    } else {
      missingKeys.push(k);
    }
  }

  const percent = ((translatedCount / totalMasterKeys) * 100).toFixed(1) + "%";
  rows.push({
    locale: code,
    keysRequired: totalMasterKeys,
    keysTranslated: translatedCount,
    missing: missingKeys.length,
    completeness: percent,
    status: missingKeys.length === 0 ? "✓ 100% COMPLETE" : "PARTIAL",
  });

  grandTotal += totalMasterKeys;
  grandTranslated += translatedCount;
  grandMissing += missingKeys.length;
}

console.table(rows);
console.log(`\nLocales verified: ${files.length} (English + all 22 Indian Eighth Schedule languages)`);
console.log(`Grand Total Keys: ${grandTotal}`);
console.log(`Grand Total Translated: ${grandTranslated} (${((grandTranslated / grandTotal) * 100).toFixed(2)}%)`);
console.log(`Grand Total Missing: ${grandMissing}`);
console.log("==========================================================================================\n");
