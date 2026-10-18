import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';
import { validateFeature } from './validate.js';
import { TemplateEngine } from '../utils/template.js';
import { MarkdownUtils } from '../utils/markdown.js';
import type { SddStage } from '../types.js';

const STAGE_ORDER: SddStage[] = [
  '01-prd',
  '02-sdd',
  '03-tasks',
  '04-impl',
  '05-audit',
  'completed'
];

export async function nextCommand(featureSlug: string, options: { force?: boolean }) {
  const cwd = process.cwd();
  const featureDir = path.join(cwd, '.sdd/specs', featureSlug);
  const metaPath = path.join(featureDir, 'meta.json');

  if (!fs.existsSync(featureDir) || !fs.existsSync(metaPath)) {
    logger.error(`Funcionalidade "${featureSlug}" não encontrada em .sdd/specs/${featureSlug}.`);
    return;
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const currentStage: SddStage = meta.currentStage || '01-prd';
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  if (currentIndex === -1 || currentStage === 'completed') {
    logger.success(`A funcionalidade "${featureSlug}" já está em status de finalizada (completed)!`);
    return;
  }

  const nextStage = STAGE_ORDER[currentIndex + 1];

  // Regras de validação antes de avançar
  if (!options.force) {
    if (currentStage === '01-prd') {
      logger.info('Validando qualidade do PRD antes de liberar o SDD...');
      const validation = validateFeature(featureSlug);
      const prdErrors = validation.issues.filter((i) => i.stage === '01-prd' && i.type === 'error');
      if (prdErrors.length > 0) {
        logger.error(`Não é possível avançar: O PRD possui ${prdErrors.length} pendências estruturais.`);
        logger.info('Execute "sdd validate ' + featureSlug + '" para ver os detalhes ou use --force.');
        return;
      }
    } else if (currentStage === '02-sdd') {
      logger.info('Validando qualidade do SDD técnico antes de liberar o plano de tarefas...');
      const validation = validateFeature(featureSlug);
      const sddErrors = validation.issues.filter((i) => i.stage === '02-sdd' && i.type === 'error');
      if (sddErrors.length > 0) {
        logger.error(`Não é possível avançar: O SDD possui ${sddErrors.length} pendências estruturais.`);
        logger.info('Execute "sdd validate ' + featureSlug + '" para ver os detalhes ou use --force.');
        return;
      }
    } else if (currentStage === '03-tasks') {
      logger.info('Validando se o plano de tarefas possui abordagem TDD...');
      const validation = validateFeature(featureSlug);
      const taskErrors = validation.issues.filter((i) => i.stage === '03-tasks' && i.type === 'error');
      if (taskErrors.length > 0) {
        logger.error(`Não é possível avançar: O arquivo de tarefas precisa ser corrigido.`);
        return;
      }
    } else if (currentStage === '04-impl') {
      logger.info('Verificando se todas as tarefas TDD foram concluídas antes de ir para a auditoria...');
      const tasksPath = path.join(featureDir, '03-tasks.md');
      const tasks = MarkdownUtils.parseTasks(tasksPath);
      const pendingTasks = tasks.filter((t) => !t.completed);

      if (pendingTasks.length > 0) {
        logger.error(`Ainda existem ${pendingTasks.length} tarefas pendentes em 03-tasks.md.`);
        logger.info(`Conclua as tarefas e marque-as com "sdd task complete ${featureSlug} <ID>" ou use --force.`);
        return;
      }
    }
  }

  // Ações ao entrar em um novo estágio
  if (nextStage === '05-audit') {
    const auditPath = path.join(featureDir, '05-audit.md');
    if (!fs.existsSync(auditPath)) {
      const vars: Record<string, string> = {
        FEATURE_NAME: meta.featureName || featureSlug,
        FEATURE_SLUG: featureSlug,
        FEATURE_PASCAL: meta.pascalName || TemplateEngine.toPascalCase(featureSlug),
        DATE: new Date().toISOString().split('T')[0]
      };
      const auditContent = TemplateEngine.renderTemplateFile('05-audit-template.md', vars);
      fs.writeFileSync(auditPath, auditContent, 'utf-8');
      logger.info('Gerado documento de auditoria: 05-audit.md');
    }
  }

  // Atualiza metadados
  meta.currentStage = nextStage;
  if (!meta.stagesHistory) meta.stagesHistory = [];
  meta.stagesHistory.push({
    stage: nextStage,
    enteredAt: new Date().toISOString()
  });

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  logger.success(`Transição de estágio concluída com sucesso!`);
  logger.box(`AVANÇO NA ESTEIRA SDD`, [
    `Feature: ${featureSlug}`,
    `Estágio Anterior : ${currentStage}`,
    `Novo Estágio     : ${nextStage}`,
    '',
    `👉 Próxima etapa:` + (
      nextStage === '02-sdd' ? ' Detalhar arquitetura, contratos e diagramas em 02-sdd.md' :
      nextStage === '03-tasks' ? ' Decompor tarefas TDD atômicas em 03-tasks.md' :
      nextStage === '04-impl' ? ' Iniciar ciclo TDD (Red -> Green -> Refactor) das tarefas' :
      nextStage === '05-audit' ? ' Realizar checklist de conformidade e auditoria em 05-audit.md' :
      ` 🎉 Funcionalidade 100% concluída e entregue! Arquive no histórico com "sdd archive ${featureSlug}" para atualizar o CHANGELOG.md`
    )
  ]);
}
