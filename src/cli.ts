#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { newCommand } from './commands/new.js';
import { grillCommand } from './commands/grill.js';
import { statusCommand } from './commands/status.js';
import { validateCommand } from './commands/validate.js';
import { nextCommand } from './commands/next.js';
import { archiveCommand } from './commands/archive.js';
import { listTasks, completeTask } from './commands/task.js';
import { infraCommand, generateDockerConfig, generateHostingerConfig, generateVpsConfig, generateWhatsAppConfig } from './commands/infra.js';
import { estimateCommand } from './commands/estimate.js';
import { syncGithubCommand } from './commands/github.js';
import { installSkill } from './commands/skill.js';

const program = new Command();

program
  .name('sdd')
  .description('Esteira profissional de Spec-Driven Development (SDD) para desenvolvimento assistido por IA')
  .version('1.0.0');

// Comando: init
program
  .command('init')
  .description('Inicializa a esteira SDD no repositório atual criando diretórios, templates e regras')
  .option('-f, --force', 'Sobrescreve a configuração caso já exista')
  .action(async (options) => {
    await initCommand(options);
  });

// Comando: grill
program
  .command('grill [feature-name]')
  .description('Conduz interrogatório técnico socrático (estilo Matt Pocock) para blindar o PRD contra falhas')
  .option('-i, --interactive', 'Executa perguntas interativas diretamente no terminal')
  .action(async (featureName, options) => {
    await grillCommand(featureName, options);
  });

// Comando: new
program
  .command('new [feature-name]')
  .description('Cria uma nova especificação estruturada de funcionalidade (PRD, SDD e Tasks)')
  .action(async (featureName) => {
    await newCommand(featureName);
  });

// Comando: status
program
  .command('status [feature-name]')
  .description('Exibe o dashboard visual de progresso, estágios e tarefas TDD da esteira')
  .action((featureName) => {
    statusCommand(featureName);
  });

// Comando: estimate
program
  .command('estimate [feature-name]')
  .description('Calcula estimativa híbrida de tempo (ETA) das tarefas para planejamento ou WhatsApp')
  .option('-f, --format <format>', 'Formato de exibição: cli ou wpp (WhatsApp)', 'cli')
  .action((featureName, options) => {
    estimateCommand(featureName, options);
  });

// Comando: validate
program
  .command('validate [feature-name]')
  .description('Executa verificação de integridade e qualidade nas especificações (linting de spec)')
  .action((featureName) => {
    validateCommand(featureName);
  });

// Comando: next
program
  .command('next <feature-name>')
  .description('Avança a funcionalidade para o próximo estágio da esteira (com validações de portão)')
  .option('-f, --force', 'Força o avanço mesmo com avisos')
  .action(async (featureName, options) => {
    await nextCommand(featureName, options);
  });

// Comando: archive
program
  .command('archive [feature-name]')
  .description('Arquiva uma funcionalidade concluída no histórico imutável (Open Spec) e atualiza o CHANGELOG.md')
  .option('-f, --force', 'Força o arquivamento mesmo antes do estágio completed')
  .action(async (featureName, options) => {
    await archiveCommand(featureName, options);
  });

// Comando: infra
const infraCmd = program
  .command('infra')
  .description('Automação de infraestrutura e deploy para VPS Hostinger (Docker, Compose, Caddy e CI/CD)')
  .action(async (options) => {
    await infraCommand(undefined, options);
  });

infraCmd
  .command('docker')
  .description('Gera Dockerfile multi-stage, docker-compose.yml, Caddyfile e .env.example')
  .option('--db <type>', 'Banco de dados: postgres ou mongo', 'postgres')
  .option('-f, --force', 'Sobrescreve arquivos existentes')
  .action((options) => {
    generateDockerConfig(process.cwd(), options);
  });

infraCmd
  .command('hostinger')
  .description('Gera workflow do GitHub Actions e scripts de deploy automatizado via SSH para VPS Hostinger')
  .option('-f, --force', 'Sobrescreve arquivos existentes')
  .action((options) => {
    generateHostingerConfig(process.cwd(), options);
  });

infraCmd
  .command('github [feature-name]')
  .description('Sincroniza tarefas TLC como GitHub Issues, cria branch e rascunho de Pull Request')
  .option('--repo <owner/repo>', 'Repositório GitHub de destino (ex: DouglasDeCastroAlmeida/meu-projeto)')
  .option('--token <token>', 'Token de acesso pessoal (PAT) do GitHub')
  .option('--dry-run', 'Simula a criação de issues e PR sem realizar requisições na API')
  .option('-f, --force', 'Sobrescreve o template global de pull request')
  .action(async (featureName, options) => {
    await syncGithubCommand(featureName, options);
  });

infraCmd
  .command('vps')
  .description('Gera kit de autonomia 24/7 na Hostinger VPS (sdd_runner.sh, PowerShell e Gemini runner)')
  .option('-f, --force', 'Sobrescreve arquivos existentes')
  .action((options) => {
    generateVpsConfig(process.cwd(), options);
  });

infraCmd
  .command('whatsapp')
  .description('Gera servidor webhook para comandos do WhatsApp via Evolution API com guardrail estrito')
  .option('-f, --force', 'Sobrescreve arquivos existentes')
  .action((options) => {
    generateWhatsAppConfig(process.cwd(), options);
  });

// Subcomando: task
const taskCmd = program
  .command('task')
  .description('Gerenciamento de tarefas TDD da esteira');

taskCmd
  .command('list <feature-name>')
  .description('Lista todas as tarefas da funcionalidade com seus IDs e status')
  .action((featureName) => {
    listTasks(featureName);
  });

taskCmd
  .command('complete <feature-name> <task-id>')
  .description('Marca uma tarefa TDD como concluída no arquivo de tarefas')
  .action((featureName, taskId) => {
    completeTask(featureName, taskId);
  });

// Subcomando: skill
const skillCmd = program
  .command('skill')
  .description('Gerenciamento da Skill oficial sdd-flow para Antigravity');

skillCmd
  .command('install')
  .description('Instala a skill sdd-flow no Antigravity global (~/.gemini/config/skills) e no projeto atual')
  .option('--no-global', 'Instala somente no projeto atual (.agents/skills)')
  .action((options) => {
    installSkill({ global: options.global });
  });

program.parse(process.argv);

if (process.argv.length <= 2) {
  statusCommand();
}
