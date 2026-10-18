import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcTemplates = path.resolve(__dirname, '../src/templates');
const distTemplates = path.resolve(__dirname, '../dist/templates');

if (!fs.existsSync(distTemplates)) {
  fs.mkdirSync(distTemplates, { recursive: true });
}

if (fs.existsSync(srcTemplates)) {
  fs.cpSync(srcTemplates, distTemplates, { recursive: true });
  const count = fs.readdirSync(distTemplates, { recursive: true }).length;
  console.log(`[build] ${count} arquivos e templates copiados com sucesso para dist/templates.`);
}
