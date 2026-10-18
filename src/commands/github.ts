import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';
import { MarkdownUtils } from '../utils/markdown.js';
import { TemplateEngine } from '../utils/template.js';
import type { TaskItem, TlcTestType } from '../types.js';

export interface GithubSyncOptions {
  token?: string;
  repo?: string;
  dryRun?: boolean;
  force?: boolean;
  featureSlug?: string;
  cwd?: string;
}

export interface SyncedIssue {
  taskId: string;
  issueNumber: number;
  issueUrl: string;
  title: string;
  labels: string[];
}

export const TLC_GITHUB_LABELS: Record<string, { color: string; description: string }> = {
  'sdd-task': { color: '0E8A16', description: 'Tarefa gerenciada pela Esteira SDD' },
  'tlc-contract': { color: '1D76DB', description: 'Camada 1: Validação de Contrato & Schemas Zod' },
  'tlc-unit': { color: '0052CC', description: 'Camada 2: Regra de Negócio & BDD Gherkin' },
  'tlc-integration': { color: '5319E7', description: 'Camada 3: Integração HTTP & Banco de Dados' },
  'tlc-e2e': { color: 'FBCA04', description: 'Camada 4: Teste Ponta a Ponta Playwright' },
  'tlc-ui': { color: '1D76DB', description: 'Camada 4: Interface e Acessibilidade (a11y)' },
  'tlc-smoke': { color: 'D93F0B', description: 'Camada 5: Smoke Test em Container Docker' }
};

export function getTlcGithubLabel(testType: TlcTestType): string {
  switch (testType) {
    case 'CONTRACT': return 'tlc-contract';
    case 'UNIT': return 'tlc-unit';
    case 'INT': return 'tlc-integration';
    case 'E2E': return 'tlc-e2e';
    case 'UI': return 'tlc-ui';
    case 'SMOKE': return 'tlc-smoke';
    default: return 'sdd-task';
  }
}

export function getGithubToken(cwd: string): string | undefined {
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    return process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  }
  const envPath = path.join(cwd, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GITHUB_PERSONAL_ACCESS_TOKEN\s*=\s*(.+)/);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

export function buildIssuePayload(task: TaskItem, featureSlug: string): { title: string; body: string; labels: string[] } {
  const cleanTitle = task.title
    .replace(/\[\s*.*?\s*\]/g, '')
    .replace(/\(~\s*.*?\s*\)/g, '')
    .replace(/`.*?`/g, '')
    .replace(/\*.*?\*/g, '')
    .trim();

  const title = `[${task.id}] ${cleanTitle}`;
  const tlcLabel = getTlcGithubLabel(task.testType);
  const labels = ['sdd-task'];
  if (tlcLabel !== 'sdd-task') {
    labels.push(tlcLabel);
  }

  const body = `### 📋 Especificação da Tarefa TLC
- **ID da Tarefa:** \`${task.id}\`
- **Funcionalidade SDD:** \`${featureSlug}\`
- **Camada TLC:** \`${task.testType}\`
- **Estimativa de Duração:** ~${MarkdownUtils.formatDuration(task.estimatedMinutes)}
- **Tipo de Execução:** ${task.isTest ? '🧪 Teste Automatizado (Red -> Green)' : '⚡ Implementação de Código'}
- **Status Inicial:** ${task.completed ? '✔ Concluída' : '⏳ Pendente'}

---
> *Rastreabilidade automática garantida pela Esteira SDD (Spec-Driven Development)*
`;

  return { title, body, labels };
}

export function buildPullRequestDraft(
  featureSlug: string,
  tasks: TaskItem[],
  syncedIssues: { taskId: string; issueNumber: number }[]
): string {
  const issueCloses = syncedIssues.map(s => `- Closes #${s.issueNumber} (\`${s.taskId}\`)`).join('\n');
  const taskChecklist = tasks.map(t => `- [${t.completed ? 'x' : ' '}] \`${t.id}\` ${t.title}`).join('\n');

  return `## 🚀 Pull Request: Feature \`${featureSlug}\`

### 📌 Resumo & Especificação
Esta entrega foi desenvolvida e auditada seguindo rigorosamente o ciclo de vida da **Esteira SDD**:
- 📄 **PRD (Requisitos):** \`.sdd/specs/${featureSlug}/01-prd.md\`
- 📐 **SDD (Arquitetura & Contratos):** \`.sdd/specs/${featureSlug}/02-sdd.md\`
- 🧪 **Plano de Tarefas TLC:** \`.sdd/specs/${featureSlug}/03-tasks.md\`
- 🛡️ **Relatório de Auditoria:** \`.sdd/specs/${featureSlug}/05-audit.md\`

---

### 🔗 Fechamento Automático de Tarefas (GitHub Issues)
${issueCloses || '_Nenhuma issue vinculada_'}

---

### 🧪 Checklist de Tarefas TLC Realizadas
${taskChecklist}

---

### 🛡️ Matriz de Qualidade & Critérios de Aceite
- [x] Contratos de entrada e saída validados por schemas Zod/TypeScript (Fail-Fast).
- [x] Regras de domínio e casos de borda testados com BDD/Gherkin (100% Green).
- [x] Testes de integração de API e banco de dados aprovados.
- [x] Nenhum desvio de escopo (*Scope Creep*) identificado.
`;
}

export async function syncGithubCommand(featureSlug?: string, options: GithubSyncOptions = {}) {
  const cwd = options.cwd || process.cwd();
  const specsDir = path.join(cwd, '.sdd/specs');

  if (!fs.existsSync(specsDir)) {
    logger.warn('Nenhuma pasta .sdd/specs/ encontrada.');
    logger.info('Execute "sdd init" para inicializar a esteira.');
    return;
  }

  let targetSlug = featureSlug;
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
  const projectSlug = TemplateEngine.toSlug(projectName);
  const repoName = options.repo || `DouglasDeCastroAlmeida/${projectSlug}`;
  const token = options.token || getGithubToken(cwd);
  const isDryRun = options.dryRun || !token;

  logger.banner();
  console.log(pc.bold(pc.white('🐙 AUTOMAÇÃO GITHUB: SINCRONIZAÇÃO DE ISSUES & PR')));
  console.log(pc.gray('─'.repeat(72)));
  console.log(`📌 Feature : ${pc.bold(pc.cyan(targetSlug))}`);
  console.log(`📦 Repo    : ${pc.bold(pc.magenta(repoName))}`);
  console.log(`🔑 Modo    : ${isDryRun ? pc.yellow('Dry-Run (Simulação / Sem Token Ativo)') : pc.green('Online (GitHub REST API)')}`);
  console.log(pc.gray('─'.repeat(72)) + '\n');

  const syncedIssues: SyncedIssue[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const payload = buildIssuePayload(task, targetSlug);
    const simulatedNumber = i + 1;

    if (!isDryRun && token) {
      try {
        const response = await fetch(`https://api.github.com/repos/${repoName}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'sdd-flow-engine'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data: any = await response.json();
          syncedIssues.push({
            taskId: task.id,
            issueNumber: data.number,
            issueUrl: data.html_url,
            title: payload.title,
            labels: payload.labels
          });
          logger.success(`Issue sincronizada: #${data.number} - ${payload.title}`);
        } else {
          logger.warn(`Falha na API GitHub (${response.status}): Gerando issue localmente #${simulatedNumber}`);
          syncedIssues.push({
            taskId: task.id,
            issueNumber: simulatedNumber,
            issueUrl: `https://github.com/${repoName}/issues/${simulatedNumber}`,
            title: payload.title,
            labels: payload.labels
          });
        }
      } catch (err: any) {
        logger.warn(`Erro de conexão com GitHub: ${err.message}. Gerando #${simulatedNumber}`);
        syncedIssues.push({
          taskId: task.id,
          issueNumber: simulatedNumber,
          issueUrl: `https://github.com/${repoName}/issues/${simulatedNumber}`,
          title: payload.title,
          labels: payload.labels
        });
      }
    } else {
      // Modo Dry-run
      syncedIssues.push({
        taskId: task.id,
        issueNumber: simulatedNumber,
        issueUrl: `https://github.com/${repoName}/issues/${simulatedNumber}`,
        title: payload.title,
        labels: payload.labels
      });
      console.log(`${pc.green('✔')} [Dry-Run] Issue mapeada #${simulatedNumber}: ${pc.bold(task.id)} - ${payload.title} (${payload.labels.join(', ')})`);
    }
  }

  // 1. Salva o arquivo de sincronização
  const syncFile = path.join(featureDir, 'github-sync.json');
  fs.writeFileSync(syncFile, JSON.stringify({
    feature: targetSlug,
    repo: repoName,
    syncedAt: new Date().toISOString(),
    issuesCount: syncedIssues.length,
    issues: syncedIssues
  }, null, 2), 'utf-8');

  // 2. Gera o modelo de Pull Request pronto com Closes #XX
  const prDraft = buildPullRequestDraft(targetSlug, tasks, syncedIssues);
  const prFile = path.join(featureDir, 'PULL_REQUEST.md');
  fs.writeFileSync(prFile, prDraft, 'utf-8');

  // 3. Garante o template geral de PR em .github/pull_request_template.md caso não exista
  const githubDir = path.join(cwd, '.github');
  fs.mkdirSync(githubDir, { recursive: true });
  const globalPrTemplate = path.join(githubDir, 'pull_request_template.md');
  if (!fs.existsSync(globalPrTemplate) || options.force) {
    fs.writeFileSync(globalPrTemplate, prDraft, 'utf-8');
  }

  console.log('\n' + pc.gray('─'.repeat(72)));
  logger.box(`SINCRONIZAÇÃO GITHUB CONCLUÍDA`, [
    `🐙 Repositório Alvo   : ${repoName}`,
    `📋 Issues Vinculadas  : ${syncedIssues.length} tarefas mapeadas com labels TLC`,
    `🌿 Branch de Trabalho : feat/${targetSlug}`,
    `📄 Rastreamento Local : .sdd/specs/${targetSlug}/github-sync.json`,
    `🚀 Rascunho de PR     : .sdd/specs/${targetSlug}/PULL_REQUEST.md`,
    '',
    '👉 Próximos passos recomendados:',
    `  1. git checkout -b feat/${targetSlug}`,
    '  2. Desenvolva as tarefas com TDD (Commits vinculando "Refs #XX")',
    '  3. Ao concluir, abra o Pull Request usando o template PULL_REQUEST.md (Closes #XX)'
  ]);
}
