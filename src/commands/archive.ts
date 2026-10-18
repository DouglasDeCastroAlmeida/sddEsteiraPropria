import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';

export interface ArchiveRecord {
  slug: string;
  featureName: string;
  archivedAt: string;
  archiveDir: string;
  completedTasks: number;
  totalTasks: number;
}

export function appendToChangelog(cwd: string, record: {
  featureName: string;
  slug: string;
  dateStr: string;
  rfList: string[];
}) {
  const changelogPath = path.join(cwd, 'CHANGELOG.md');
  const entryDate = record.dateStr;
  
  let changelogContent = '';
  if (fs.existsSync(changelogPath)) {
    changelogContent = fs.readFileSync(changelogPath, 'utf-8');
  } else {
    changelogContent = `# 📜 CHANGELOG do Projeto\n\nTodas as entregas concluídas e auditadas pela Esteira SDD são registradas aqui automaticamente.\n\n---\n`;
  }

  const rfText = record.rfList.length > 0 
    ? record.rfList.map((rf) => `  - ${rf}`).join('\n')
    : `  - Implementação completa e auditoria da feature ${record.featureName}.`;

  const newEntry = `
## [${entryDate}] - ${record.featureName} (\`${record.slug}\`)
- **Status:** ✔ Entregue & Auditado
- **Arquivo da Especificação:** \`.sdd/archive/${entryDate}-${record.slug}/\`
- **Requisitos & Entregas:**
${rfText}

---
`;

  // Insere após o cabeçalho
  if (changelogContent.includes('---')) {
    const parts = changelogContent.split('---');
    const header = parts[0] + '---';
    const rest = parts.slice(1).join('---');
    changelogContent = `${header}\n${newEntry}${rest}`;
  } else {
    changelogContent += newEntry;
  }

  fs.writeFileSync(changelogPath, changelogContent, 'utf-8');
}

export async function archiveCommand(featureSlugArg?: string, options: { force?: boolean } = {}) {
  const cwd = process.cwd();
  const sddDir = path.join(cwd, '.sdd');
  const specsDir = path.join(sddDir, 'specs');
  const archiveDir = path.join(sddDir, 'archive');

  if (!fs.existsSync(specsDir)) {
    logger.error('Nenhuma especificação encontrada (.sdd/specs/ não existe). Execute "sdd init" primeiro.');
    return;
  }

  let slug = featureSlugArg;
  if (!slug) {
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });
    const features = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (features.length === 0) {
      logger.warn('Nenhuma funcionalidade ativa para arquivar.');
      return;
    }
    slug = features[0];
  }

  const featureDir = path.join(specsDir, slug);
  if (!fs.existsSync(featureDir)) {
    logger.error(`Funcionalidade "${slug}" não encontrada em .sdd/specs/${slug}.`);
    return;
  }

  const metaPath = path.join(featureDir, 'meta.json');
  let meta: any = {};
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {}
  }

  const currentStage = meta.currentStage || '01-prd';

  // Validação: Só arquiva se completado ou auditado, exceto se forçar
  if (!options.force && currentStage !== 'completed' && currentStage !== '05-audit') {
    logger.error(`A funcionalidade "${slug}" está no estágio "${currentStage}".`);
    logger.warn('Apenas especificações no estágio "05-audit" ou "completed" podem ser arquivadas.');
    logger.info('Para forçar o arquivamento utilize a flag: sdd archive ' + slug + ' --force');
    return;
  }

  // Cria pasta de archives se não existir
  fs.mkdirSync(archiveDir, { recursive: true });

  const dateStr = new Date().toISOString().split('T')[0];
  const targetArchiveFolder = `${dateStr}-${slug}`;
  const targetArchivePath = path.join(archiveDir, targetArchiveFolder);

  // Extrai lista de RFs do PRD para o Changelog
  const prdPath = path.join(featureDir, '01-prd.md');
  const rfList: string[] = [];
  if (fs.existsSync(prdPath)) {
    const prdContent = fs.readFileSync(prdPath, 'utf-8');
    const matches = prdContent.match(/###\s*RF-\d{3}:?\s*(.*)/g);
    if (matches) {
      for (const m of matches) {
        rfList.push(m.replace(/###\s*/, '').trim());
      }
    }
  }

  // Atualiza meta.json antes de mover
  meta.archivedAt = new Date().toISOString();
  meta.archivePath = targetArchiveFolder;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  // Move o diretório da feature para o arquivo histórico
  if (fs.existsSync(targetArchivePath)) {
    logger.warn(`Sobrescrevendo arquivo histórico existente em ${targetArchivePath}...`);
    fs.rmSync(targetArchivePath, { recursive: true, force: true });
  }

  fs.cpSync(featureDir, targetArchivePath, { recursive: true });
  fs.rmSync(featureDir, { recursive: true, force: true });

  // Atualiza o índice do archive (.sdd/archive/index.json)
  const indexFile = path.join(archiveDir, 'index.json');
  let archiveIndex: ArchiveRecord[] = [];
  if (fs.existsSync(indexFile)) {
    try {
      archiveIndex = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
    } catch {}
  }

  archiveIndex.unshift({
    slug,
    featureName: meta.featureName || slug,
    archivedAt: meta.archivedAt,
    archiveDir: targetArchiveFolder,
    completedTasks: meta.completedTasks || 0,
    totalTasks: meta.totalTasks || 0
  });

  fs.writeFileSync(indexFile, JSON.stringify(archiveIndex, null, 2), 'utf-8');

  // Atualiza CHANGELOG.md na raiz do projeto
  appendToChangelog(cwd, {
    featureName: meta.featureName || slug,
    slug,
    dateStr,
    rfList
  });

  logger.banner();
  logger.success(`Funcionalidade "${slug}" arquivada com sucesso no histórico imutável!`);
  logger.box('HISTÓRICO ATUALIZADO (OPEN SPEC PATTERN)', [
    `📁 Destino do Archive : .sdd/archive/${targetArchiveFolder}/`,
    `📜 Registro de Versão : CHANGELOG.md atualizado na raiz`,
    `📋 Índice Histórico   : .sdd/archive/index.json`,
    '',
    `✨ Benefício do Archive:`,
    `  A pasta .sdd/specs/ agora está limpa e o contexto de tokens do Agente de IA`,
    `  permanece 100% focado e veloz para a próxima funcionalidade!`
  ]);
}
