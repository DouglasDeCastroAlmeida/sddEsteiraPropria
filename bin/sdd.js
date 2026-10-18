#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distCli = path.resolve(__dirname, '../dist/cli.js');
const srcCli = path.resolve(__dirname, '../src/cli.ts');

if (fs.existsSync(distCli)) {
  await import(`file://${distCli}`);
} else {
  // Se ainda não foi compilado, usa o tsx programaticamente ou avisa
  console.error('[SDD Flow] Execute "npm run build" antes de usar a CLI globalmente.');
  process.exit(1);
}
