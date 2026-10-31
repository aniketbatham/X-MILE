import fs from "fs";
import path from "path";

const LOCALES_DIR = path.resolve("./src/i18n/locales");
if (!fs.existsSync(LOCALES_DIR)) {
  fs.mkdirSync(LOCALES_DIR, { recursive: true });
}

// Helper to write a locale file
function writeLocaleFile(code, data) {
  const filePath = path.join(LOCALES_DIR, `${code}.ts`);
  const content = `import { TranslationDictionary } from "../types";\n\nexport const ${code}: TranslationDictionary = ${JSON.stringify(
    data,
    null,
    2
  )};\n`;
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Generated locale: ${code}`);
}

export { writeLocaleFile };
