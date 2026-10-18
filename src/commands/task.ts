import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';
import { MarkdownUtils } from '../utils/markdown.js';

export function listTasks(featureSlug: string) {
  const cwd = process.cwd();
  const tasksPath = path.join(cwd, '.sdd/specs', featureSlug, '03-tasks.md');

  if (!fs.existsSync(tasksPath)) {
    logger.error(`Arquivo de tarefas não encontrado para a feature "${featureSlug}".`);
    return;
  }

  const tasks = MarkdownUtils.parseTasks(tasksPath);
  if (tasks.length === 0) {
    logger.warn('Nenhuma tarefa encontrada no arquivo 03-tasks.md.');
    return;
  }

  const completed = tasks.filter((t) => t.completed).length;
  logger.banner();
  console.log(pc.bold(pc.cyan(`📋 TAREFAS TDD PARA: ${featureSlug}`)));
  console.log(`Progresso: ${logger.progressBar(completed, tasks.length)}\n`);

  for (const t of tasks) {
    const check = t.completed ? pc.green('[✔] Concluída ') : pc.yellow('[ ] Pendente  ');
    
    let tag = pc.bgWhite(pc.black(' IMPL '));
    switch (t.testType) {
      case 'CONTRACT':
        tag = pc.bgCyan(pc.black(' CONTRACT '));
        break;
      case 'UNIT':
        tag = pc.bgGreen(pc.black(' UNIT/BDD '));
        break;
      case 'INT':
        tag = pc.bgBlue(pc.black(' INTEGRATION '));
        break;
      case 'E2E':
        tag = pc.bgMagenta(pc.white(' E2E/PLAYWRIGHT '));
        break;
      case 'UI':
        tag = pc.bgYellow(pc.black(' UI/A11Y '));
        break;
      case 'SMOKE':
        tag = pc.bgRed(pc.white(' SMOKE/DOCKER '));
        break;
      case 'GENERIC':
        tag = pc.bgMagenta(pc.black(' TEST '));
        break;
      default:
        tag = pc.bgWhite(pc.black(' IMPL '));
    }

    const title = t.completed ? pc.gray(t.title) : pc.white(t.title);
    console.log(`${check} ${tag} ${pc.bold(t.id)}: ${title}`);
  }

  console.log('');
}

export function completeTask(featureSlug: string, taskId: string) {
  const cwd = process.cwd();
  const tasksPath = path.join(cwd, '.sdd/specs', featureSlug, '03-tasks.md');

  if (!fs.existsSync(tasksPath)) {
    logger.error(`Arquivo de tarefas não encontrado para a feature "${featureSlug}".`);
    return;
  }

  const success = MarkdownUtils.markTaskCompleted(tasksPath, taskId);
  if (!success) {
    logger.error(`Tarefa com identificador "${taskId}" não foi encontrada pendente em 03-tasks.md.`);
    return;
  }

  logger.success(`Tarefa ${taskId} marcada como concluída!`);

  const updatedTasks = MarkdownUtils.parseTasks(tasksPath);
  const completed = updatedTasks.filter((t) => t.completed).length;
  console.log(`Progresso atualizado: ${logger.progressBar(completed, updatedTasks.length)}`);

  const nextPending = updatedTasks.find((t) => !t.completed);
  if (nextPending) {
    console.log(pc.cyan(`👉 Próxima tarefa a executar: `) + pc.bold(`${nextPending.id} - ${nextPending.title}`));
  } else {
    logger.success(`🎉 Todas as tarefas de ${featureSlug} foram concluídas!`);
    logger.info(`Você já pode avançar para a auditoria de conformidade com: sdd next ${featureSlug}`);
  }
}
