import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';
import { MarkdownUtils } from '../utils/markdown.js';
import type { EstimateSummary, TaskItem, TlcTestType } from '../types.js';

export function getTlcBadge(type: TlcTestType): string {
  switch (type) {
    case 'CONTRACT': return pc.bgBlue(pc.black(' CONTRACT '));
    case 'UNIT': return pc.bgCyan(pc.black(' UNIT/BDD '));
    case 'INT': return pc.bgMagenta(pc.black(' INTEGRATION '));
    case 'E2E': return pc.bgYellow(pc.black(' E2E/PLAYWRIGHT '));
    case 'UI': return pc.bgBlueBright(pc.black(' UI/A11Y '));
    case 'SMOKE': return pc.bgRedBright(pc.black(' SMOKE/DOCKER '));
    case 'GENERIC': return pc.bgGreen(pc.black(' TEST '));
    default: return pc.bgWhite(pc.black(' IMPL '));
  }
}

export function formatEtaString(date: Date): string {
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && 
                  date.getMonth() === now.getMonth() && 
                  date.getFullYear() === now.getFullYear();
  
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const isTomorrow = date.getDate() === tomorrow.getDate() &&
                     date.getMonth() === tomorrow.getMonth() &&
                     date.getFullYear() === tomorrow.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) return `Hoje às ${timeStr}`;
  if (isTomorrow) return `Amanhã às ${timeStr}`;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month} às ${timeStr}`;
}

export function generateWhatsAppReport(summary: EstimateSummary, projectName: string, tasks: TaskItem[]): string {
  const pendingTasksList = tasks.filter(t => !t.completed).slice(0, 5);
  
  const lines: string[] = [
    `📊 *Status & Estimativa SDD*`,
    `🚀 *Projeto:* ${projectName}`,
    `🎯 *Feature:* ${summary.featureName}`,
    ``,
    `⏱️ *Previsão de Término (ETA):* ${formatEtaString(summary.projectedFinishTime)}`,
    `⏳ *Tempo Restante:* ${MarkdownUtils.formatDuration(summary.pendingMinutes)} (${summary.pendingTasks} tarefas pendentes)`,
    `✅ *Progresso:* ${summary.completionPercentage}% concluído (${MarkdownUtils.formatDuration(summary.completedMinutes)} de ${MarkdownUtils.formatDuration(summary.totalMinutes)})`,
    ``
  ];

  if (pendingTasksList.length > 0) {
    lines.push(`📋 *Próximas Tarefas:*`);
    for (const t of pendingTasksList) {
      const cleanTitle = t.title.replace(/\[\s*.*?\s*\]/g, '').replace(/\(~\s*.*?\s*\)/g, '').replace(/`.*?`/g, '').trim();
      const typeTag = t.testType !== 'NONE' ? `[${t.testType}]` : '[IMPL]';
      lines.push(`• \`${t.id}\` ${typeTag} ${cleanTitle} (~${MarkdownUtils.formatDuration(t.estimatedMinutes)})`);
    }
    if (summary.pendingTasks > 5) {
      lines.push(`• _...e mais ${summary.pendingTasks - 5} tarefa(s) pendente(s)_`);
    }
    lines.push(``);
  } else {
    lines.push(`🎉 *Todas as tarefas foram 100% concluídas!*`);
    lines.push(``);
  }

  lines.push(`🤖 _Enviado automaticamente pelo SDD Autonomous Runner_`);
  return lines.join('\n');
}

export function estimateCommand(featureName?: string, options: { format?: 'cli' | 'wpp'; cwd?: string } = {}) {
  const cwd = options.cwd || process.cwd();
  const specsDir = path.join(cwd, '.sdd/specs');
  const format = options.format || 'cli';

  if (!fs.existsSync(specsDir)) {
    logger.warn('Nenhuma pasta .sdd/specs/ encontrada.');
    logger.info('Execute "sdd init" para inicializar a esteira.');
    return;
  }

  let targetSlug = featureName;
  if (!targetSlug) {
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });
    const features = entries.filter(e => e.isDirectory()).map(e => e.name);
    if (features.length === 0) {
      logger.warn('Nenhuma funcionalidade cadastrada ainda.');
      return;
    }
    targetSlug = features[0];
  }

  const featureDir = path.join(specsDir, targetSlug);
  const tasksPath = path.join(featureDir, '03-tasks.md');

  if (!fs.existsSync(tasksPath)) {
    logger.error(`Arquivo de tarefas não encontrado: .sdd/specs/${targetSlug}/03-tasks.md`);
    return;
  }

  const tasks = MarkdownUtils.parseTasks(tasksPath);
  if (tasks.length === 0) {
    logger.warn(`Nenhuma tarefa encontrada em .sdd/specs/${targetSlug}/03-tasks.md.`);
    return;
  }

  const projectName = path.basename(cwd);
  const summary = MarkdownUtils.calculateEstimate(targetSlug, tasks);

  if (format === 'wpp') {
    const wppMessage = generateWhatsAppReport(summary, projectName, tasks);
    console.log(wppMessage);
    return;
  }

  logger.banner();
  console.log(pc.bold(pc.white(`⏱️  ESTIMATIVA DE TEMPO & CRONOGRAMA TLC: `)) + pc.bold(pc.cyan(targetSlug)));
  console.log(pc.gray('─'.repeat(72)));

  console.log('\n' + pc.bold('📋 Lista Detalhada de Tarefas e Estimativas:'));
  console.log(pc.gray('─'.repeat(72)));

  for (const t of tasks) {
    const statusIcon = t.completed ? pc.green('✔ [OK] ') : pc.yellow('⏳ [  ] ');
    const badge = getTlcBadge(t.testType);
    const estText = t.hasExplicitEstimate 
      ? pc.cyan(`~${MarkdownUtils.formatDuration(t.estimatedMinutes)}`)
      : pc.gray(`~${MarkdownUtils.formatDuration(t.estimatedMinutes)} (piso TLC)`);
    
    console.log(`${statusIcon} ${pc.bold(t.id)} ${badge} ${estText}`);
    console.log(`   ${pc.gray(t.title)}`);
  }

  console.log('\n' + pc.gray('─'.repeat(72)));
  logger.box(`RESUMO DE EXECUÇÃO: ${targetSlug}`, [
    `⏱️  Tempo Total Estimado  : ${MarkdownUtils.formatDuration(summary.totalMinutes)} (${summary.totalTasks} tarefas)`,
    `✅ Tempo Já Realizado     : ${MarkdownUtils.formatDuration(summary.completedMinutes)} (${summary.completedTasks} concluídas - ${summary.completionPercentage}%)`,
    `⏳ Tempo Restante         : ${pc.bold(pc.yellow(MarkdownUtils.formatDuration(summary.pendingMinutes)))} (${summary.pendingTasks} pendentes)`,
    `🎯 Previsão de Conclusão  : ${pc.bold(pc.green(formatEtaString(summary.projectedFinishTime)))}`,
    '',
    `🧩 Distribuição por Camada TLC:`,
    `   • Contratos (Fail-Fast) : ${MarkdownUtils.formatDuration(summary.byTlcLayer.CONTRACT.minutes)} (${summary.byTlcLayer.CONTRACT.completedCount}/${summary.byTlcLayer.CONTRACT.count})`,
    `   • Domínio / BDD         : ${MarkdownUtils.formatDuration(summary.byTlcLayer.UNIT.minutes)} (${summary.byTlcLayer.UNIT.completedCount}/${summary.byTlcLayer.UNIT.count})`,
    `   • Integração / Banco    : ${MarkdownUtils.formatDuration(summary.byTlcLayer.INT.minutes)} (${summary.byTlcLayer.INT.completedCount}/${summary.byTlcLayer.INT.count})`,
    `   • UI / E2E Playwright   : ${MarkdownUtils.formatDuration(summary.byTlcLayer.E2E.minutes + summary.byTlcLayer.UI.minutes)} (${summary.byTlcLayer.E2E.completedCount + summary.byTlcLayer.UI.completedCount}/${summary.byTlcLayer.E2E.count + summary.byTlcLayer.UI.count})`,
    `   • Smoke Test / Docker   : ${MarkdownUtils.formatDuration(summary.byTlcLayer.SMOKE.minutes)} (${summary.byTlcLayer.SMOKE.completedCount}/${summary.byTlcLayer.SMOKE.count})`,
    '',
    `💡 Dica WhatsApp: gere a mensagem para o bot com "sdd estimate ${targetSlug} --format wpp"`
  ]);
}
