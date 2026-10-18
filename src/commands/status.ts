import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';
import { MarkdownUtils } from '../utils/markdown.js';
import type { FeatureProgress, SddStage } from '../types.js';

const STAGE_LABELS: Record<SddStage, string> = {
  '01-prd': '01. Requisitos (PRD)',
  '02-sdd': '02. Arquitetura (SDD)',
  '03-tasks': '03. Plano de Tarefas',
  '04-impl': '04. Implementação & TDD',
  '05-audit': '05. Auditoria de Conformidade',
  'completed': '✔ Concluída & Liberada'
};

export function getFeatureProgress(featureDir: string, slug: string): FeatureProgress {
  const grillPath = path.join(featureDir, '00-grill.md');
  const prdPath = path.join(featureDir, '01-prd.md');
  const sddPath = path.join(featureDir, '02-sdd.md');
  const tasksPath = path.join(featureDir, '03-tasks.md');
  const auditPath = path.join(featureDir, '05-audit.md');
  const metaPath = path.join(featureDir, 'meta.json');

  let currentStage: SddStage = '01-prd';
  let featureName = slug;

  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (meta.currentStage) currentStage = meta.currentStage;
      if (meta.featureName) featureName = meta.featureName;
    } catch {
      // Ignora erro de JSON
    }
  }

  const tasks = MarkdownUtils.parseTasks(tasksPath);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    featureName,
    currentStage,
    stageName: STAGE_LABELS[currentStage] || currentStage,
    totalTasks,
    completedTasks,
    percentage,
    files: {
      grillExists: fs.existsSync(grillPath),
      prdExists: fs.existsSync(prdPath),
      sddExists: fs.existsSync(sddPath),
      tasksExists: fs.existsSync(tasksPath),
      auditExists: fs.existsSync(auditPath)
    }
  };
}

export function statusCommand(specificFeature?: string) {
  const cwd = process.cwd();
  const specsDir = path.join(cwd, '.sdd/specs');

  if (!fs.existsSync(specsDir)) {
    logger.warn('Nenhuma esteira inicializada encontrada em .sdd/specs/.');
    logger.info('Execute "sdd init" para começar.');
    return;
  }

  const entries = fs.readdirSync(specsDir, { withFileTypes: true });
  const featureDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (featureDirs.length === 0) {
    logger.warn('Nenhuma funcionalidade cadastrada ainda.');
    logger.info('Crie sua primeira spec com: sdd new <nome-da-feature>');
    return;
  }

  const targetFeatures = specificFeature 
    ? featureDirs.filter((f) => f.toLowerCase() === specificFeature.toLowerCase())
    : featureDirs;

  if (targetFeatures.length === 0) {
    logger.error(`Funcionalidade "${specificFeature}" não foi encontrada.`);
    return;
  }

  logger.banner();
  console.log(pc.bold(pc.white(`📊 DASHBOARD DA ESTEIRA SDD (${targetFeatures.length} funcionalidade(s))`)));
  console.log(pc.gray('─'.repeat(65)));

  for (const slug of targetFeatures) {
    const featureDir = path.join(specsDir, slug);
    const progress = getFeatureProgress(featureDir, slug);

    console.log(`\n📌 ${pc.bold(pc.cyan(progress.featureName))} ${pc.gray(`(${slug})`)}`);
    console.log(`   Estágio Atual : ${pc.bold(pc.yellow(progress.stageName))}`);
    console.log(`   Tarefas TDD   : ${logger.progressBar(progress.completedTasks, progress.totalTasks)}`);
    
    // Status dos arquivos
    const f = progress.files;
    const fileBadges = [
      f.grillExists ? pc.green('GRILL ✔') : pc.gray('GRILL ⏳'),
      f.prdExists ? pc.green('PRD ✔') : pc.red('PRD ✖'),
      f.sddExists ? pc.green('SDD ✔') : pc.red('SDD ✖'),
      f.tasksExists ? pc.green('TASKS ✔') : pc.red('TASKS ✖'),
      f.auditExists ? pc.green('AUDIT ✔') : pc.gray('AUDIT ⏳')
    ].join(pc.gray(' | '));
    console.log(`   Documentos    : ${fileBadges}`);

    // Próxima ação recomendada
    let nextAction = '';
    switch (progress.currentStage) {
      case '01-prd':
        nextAction = `Fazer o grill técnico ("sdd grill ${slug}") e detalhar requisitos em 01-prd.md`;
        break;
      case '02-sdd':
        nextAction = `Definir arquitetura, contratos e diagramas em .sdd/specs/${slug}/02-sdd.md e rodar "sdd next ${slug}"`;
        break;
      case '03-tasks':
        nextAction = `Refinar lista de microtarefas TDD em .sdd/specs/${slug}/03-tasks.md e rodar "sdd next ${slug}"`;
        break;
      case '04-impl':
        if (progress.completedTasks < progress.totalTasks) {
          nextAction = `Codificar seguindo o ciclo TDD atômico (tarefa atual) e rodar "sdd task complete ${slug} <T-ID>"`;
        } else {
          nextAction = `Todas as tarefas concluídas! Avance para a auditoria com "sdd next ${slug}"`;
        }
        break;
      case '05-audit':
        nextAction = `Revisar relatório de conformidade em .sdd/specs/${slug}/05-audit.md e finalizar com "sdd next ${slug}"`;
        break;
      case 'completed':
        nextAction = `Funcionalidade concluída e auditada! Arquive com "sdd archive ${slug}" para atualizar o CHANGELOG.md`;
        break;
    }

    console.log(`   👉 Próxima Ação: ${pc.cyan(nextAction)}`);
  }

  // Verifica se há features arquivadas no histórico (Open Spec)
  const archiveIndexFile = path.join(cwd, '.sdd/archive/index.json');
  if (fs.existsSync(archiveIndexFile)) {
    try {
      const archives = JSON.parse(fs.readFileSync(archiveIndexFile, 'utf-8'));
      if (Array.isArray(archives) && archives.length > 0) {
        console.log(`\n📦 ${pc.bold(pc.white(`HISTÓRICO DE ENTREGAS ARQUIVADAS (${archives.length} funcionalidade(s))`))}`);
        console.log(pc.gray('─'.repeat(65)));
        for (const arch of archives.slice(0, 5)) {
          const date = arch.archivedAt ? arch.archivedAt.split('T')[0] : 'Data n/d';
          console.log(`   ✔ ${pc.bold(pc.green(arch.featureName))} ${pc.gray(`(${arch.slug})`)} - Arquivado em ${pc.yellow(date)}`);
        }
        if (archives.length > 5) {
          console.log(pc.gray(`   ... e mais ${archives.length - 5} funcionalidade(s) arquivada(s). Consulte CHANGELOG.md.`));
        }
      }
    } catch {}
  }

  console.log(`\n${pc.gray('─'.repeat(65))}\n`);
}
