import fs from 'node:fs';
import path from 'node:path';
import { select } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { TemplateEngine } from '../utils/template.js';

export function generateDockerConfig(cwd: string, options: { db?: 'postgres' | 'mongo'; force?: boolean }) {
  const projectName = path.basename(cwd);
  const projectSlug = TemplateEngine.toSlug(projectName);
  const dbChoice = options.db || 'postgres';

  logger.info(`Gerando arquivos de containerização Docker (Banco: ${dbChoice.toUpperCase()})...`);

  // 1. Dockerfile
  const dockerfilePath = path.join(cwd, 'Dockerfile');
  if (!fs.existsSync(dockerfilePath) || options.force) {
    const dockerfileTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/Dockerfile-template');
    if (fs.existsSync(dockerfileTemplate)) {
      fs.copyFileSync(dockerfileTemplate, dockerfilePath);
      logger.success('Criado: Dockerfile (Multi-stage build, usuário não-root nodejs)');
    }
  } else {
    logger.warn('Dockerfile já existe. Use --force para sobrescrever.');
  }

  // 2. .dockerignore
  const dockerignoreContent = `node_modules
dist
build
.git
.env
.sdd/archive
npm-debug.log
`;
  fs.writeFileSync(path.join(cwd, '.dockerignore'), dockerignoreContent, 'utf-8');

  // 3. Caddyfile
  const caddyfilePath = path.join(cwd, 'Caddyfile');
  if (!fs.existsSync(caddyfilePath) || options.force) {
    const caddyTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/caddyfile-template');
    if (fs.existsSync(caddyTemplate)) {
      fs.copyFileSync(caddyTemplate, caddyfilePath);
      logger.success('Criado: Caddyfile (Proxy reverso e SSL automático Let\'s Encrypt)');
    }
  }

  // 4. Configuração do Banco no docker-compose.yml
  let dbServiceName = 'postgres';
  let dbServiceBlock = '';
  let dbVolumeBlock = 'postgres_data:';
  let databaseUrlValue = 'postgresql://appuser:appsecret123@postgres:5432/appdb?schema=public';

  if (dbChoice === 'postgres') {
    dbServiceName = 'postgres';
    dbServiceBlock = `postgres:
    image: postgres:16-alpine
    container_name: ${projectSlug}_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: appsecret123
      POSTGRES_DB: appdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5`;
    dbVolumeBlock = 'postgres_data:';
  } else {
    dbServiceName = 'mongodb';
    dbServiceBlock = `mongodb:
    image: mongo:7-jammy
    container_name: ${projectSlug}_mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: appuser
      MONGO_INITDB_ROOT_PASSWORD: appsecret123
      MONGO_INITDB_DATABASE: appdb
    volumes:
      - mongo_data:/data/db
    networks:
      - app_network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5`;
    dbVolumeBlock = 'mongo_data:';
    databaseUrlValue = 'mongodb://appuser:appsecret123@mongodb:27017/appdb?authSource=admin';
  }

  const composeTemplatePath = path.join(TemplateEngine.getTemplatesDir(), 'infra/docker-compose-template.yml');
  if (fs.existsSync(composeTemplatePath)) {
    const rawCompose = fs.readFileSync(composeTemplatePath, 'utf-8');
    const renderedCompose = TemplateEngine.render(rawCompose, {
      PROJECT_SLUG: projectSlug,
      DB_SERVICE_NAME: dbServiceName,
      DB_SERVICE_BLOCK: dbServiceBlock,
      DB_VOLUME_BLOCK: dbVolumeBlock,
      DATABASE_URL_VALUE: databaseUrlValue
    });
    fs.writeFileSync(path.join(cwd, 'docker-compose.yml'), renderedCompose, 'utf-8');
    logger.success('Criado: docker-compose.yml (App + Banco ' + dbChoice.toUpperCase() + ' + Caddy)');
  }

  // 5. .env.example
  const envExamplePath = path.join(cwd, '.env.example');
  if (!fs.existsSync(envExamplePath) || options.force) {
    const envExample = `# Configurações da Aplicação
NODE_ENV=production
PORT=3000
DOMAIN=localhost

# Conexão com o Banco de Dados
DATABASE_URL=${databaseUrlValue}

# Chave secreta de autenticação (JWT)
JWT_SECRET=super_secret_jwt_key_change_in_production
`;
    fs.writeFileSync(envExamplePath, envExample, 'utf-8');
    logger.success('Criado: .env.example com variáveis padronizadas');
  }
}

export function generateHostingerConfig(cwd: string, options: { force?: boolean }) {
  const projectName = path.basename(cwd);
  const projectSlug = TemplateEngine.toSlug(projectName);

  logger.info('Gerando pipeline de CI/CD GitHub Actions e scripts de deploy na Hostinger...');

  // 1. Workflow GitHub Actions
  const workflowsDir = path.join(cwd, '.github/workflows');
  fs.mkdirSync(workflowsDir, { recursive: true });

  const workflowPath = path.join(workflowsDir, 'deploy.yml');
  const workflowTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/github-workflow-deploy-template.yml');
  if (fs.existsSync(workflowTemplate)) {
    const rawWorkflow = fs.readFileSync(workflowTemplate, 'utf-8');
    const renderedWorkflow = TemplateEngine.render(rawWorkflow, {
      PROJECT_SLUG: projectSlug
    });
    fs.writeFileSync(workflowPath, renderedWorkflow, 'utf-8');
    logger.success('Criado: .github/workflows/deploy.yml (CI/CD automático via SSH)');
  }

  // 2. Script de deploy shell
  const scriptsDir = path.join(cwd, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });

  const scriptPath = path.join(scriptsDir, 'deploy-hostinger.sh');
  const scriptTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/deploy-hostinger-template.sh');
  if (fs.existsSync(scriptTemplate)) {
    const rawScript = fs.readFileSync(scriptTemplate, 'utf-8');
    const renderedScript = TemplateEngine.render(rawScript, {
      PROJECT_NAME: projectName,
      PROJECT_SLUG: projectSlug
    });
    fs.writeFileSync(scriptPath, renderedScript, 'utf-8');
    logger.success('Criado: scripts/deploy-hostinger.sh (Script de deploy direto)');
  }

  // 3. Guia de configuração
  const docsDir = path.join(cwd, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });

  const guidePath = path.join(docsDir, 'hostinger-deploy-guide.md');
  const guideTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/infra-guide-template.md');
  if (fs.existsSync(guideTemplate)) {
    fs.copyFileSync(guideTemplate, guidePath);
    logger.success('Criado: docs/hostinger-deploy-guide.md (Manual passo a passo)');
  }
}

export function generateVpsConfig(cwd: string, options: { force?: boolean } = {}) {
  logger.info('Gerando kit de autonomia 24/7 para a VPS Hostinger (tmux + Gemini Runner)...');

  const scriptsDir = path.join(cwd, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });

  const docsDir = path.join(cwd, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });

  // 1. sdd_runner.sh
  const shPath = path.join(scriptsDir, 'sdd_runner.sh');
  const shTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/sdd-runner-template.sh');
  if (fs.existsSync(shTemplate) && (!fs.existsSync(shPath) || options.force)) {
    fs.copyFileSync(shTemplate, shPath);
    logger.success('Criado: scripts/sdd_runner.sh (Gerenciador de sessão tmux)');
  }

  // 2. sdd_runner.ps1
  const ps1Path = path.join(scriptsDir, 'sdd_runner.ps1');
  const ps1Template = path.join(TemplateEngine.getTemplatesDir(), 'infra/sdd-runner-template.ps1');
  if (fs.existsSync(ps1Template) && (!fs.existsSync(ps1Path) || options.force)) {
    fs.copyFileSync(ps1Template, ps1Path);
    logger.success('Criado: scripts/sdd_runner.ps1 (Controle remoto local PowerShell via SSH)');
  }

  // 3. sdd_remote_runner.py
  const pyPath = path.join(scriptsDir, 'sdd_remote_runner.py');
  const pyTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/sdd-remote-runner-template.py');
  if (fs.existsSync(pyTemplate) && (!fs.existsSync(pyPath) || options.force)) {
    fs.copyFileSync(pyTemplate, pyPath);
    logger.success('Criado: scripts/sdd_remote_runner.py (Motor autônomo com Gemini e loop TDD)');
  }

  // 4. docs/vps-autonomous-guide.md
  const guidePath = path.join(docsDir, 'vps-autonomous-guide.md');
  const guideTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/vps-autonomous-guide-template.md');
  if (fs.existsSync(guideTemplate) && (!fs.existsSync(guidePath) || options.force)) {
    fs.copyFileSync(guideTemplate, guidePath);
    logger.success('Criado: docs/vps-autonomous-guide.md (Guia operacional do runner)');
  }
}

export function generateWhatsAppConfig(cwd: string, options: { force?: boolean } = {}) {
  logger.info('Gerando controlador de webhook do WhatsApp integrado à Evolution API...');

  const scriptsDir = path.join(cwd, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });

  const docsDir = path.join(cwd, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });

  // 1. scripts/whatsapp_webhook.ts
  const webhookPath = path.join(scriptsDir, 'whatsapp_webhook.ts');
  const webhookTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/whatsapp-webhook-template.ts');
  if (fs.existsSync(webhookTemplate) && (!fs.existsSync(webhookPath) || options.force)) {
    fs.copyFileSync(webhookTemplate, webhookPath);
    logger.success('Criado: scripts/whatsapp_webhook.ts (Servidor webhook com guardrail estrito)');
  }

  // 2. docs/whatsapp-integration-guide.md
  const guidePath = path.join(docsDir, 'whatsapp-integration-guide.md');
  const guideTemplate = path.join(TemplateEngine.getTemplatesDir(), 'infra/whatsapp-guide-template.md');
  if (fs.existsSync(guideTemplate) && (!fs.existsSync(guidePath) || options.force)) {
    fs.copyFileSync(guideTemplate, guidePath);
    logger.success('Criado: docs/whatsapp-integration-guide.md (Guia de configuração Evolution API)');
  }
}

import { syncGithubCommand } from './github.js';

export async function infraCommand(action?: string, options: any = {}) {
  const cwd = process.cwd();
  logger.banner();

  let selectedAction = action;
  if (!selectedAction) {
    try {
      selectedAction = await select({
        message: 'Qual módulo de infraestrutura você deseja configurar?',
        choices: [
          { name: '📦 Gerar Dockerfile, docker-compose.yml e Caddy (Hostinger Ready)', value: 'docker' },
          { name: '🚀 Configurar CI/CD GitHub Actions & Deploy na Hostinger VPS', value: 'hostinger' },
          { name: '⚡ Configurar Kit de Autonomia 24/7 na Hostinger VPS (tmux + Python Runner)', value: 'vps' },
          { name: '💬 Configurar Webhook e Bot do WhatsApp (Evolution API com Guardrail)', value: 'whatsapp' },
          { name: '🐙 Sincronizar Issues e PR no GitHub (sdd infra github)', value: 'github' },
          { name: '🌐 Configuração Completa de Infraestrutura (Todos os Módulos)', value: 'all' }
        ]
      });
    } catch {
      logger.warn('Operação cancelada.');
      return;
    }
  }

  if (selectedAction === 'docker' || selectedAction === 'all') {
    let db = options.db;
    if (!db && selectedAction !== 'all') {
      try {
        db = await select({
          message: 'Qual banco de dados deseja configurar no docker-compose?',
          choices: [
            { name: '🐘 PostgreSQL 16 (Relacional com schema)', value: 'postgres' },
            { name: '🍃 MongoDB 7 (Documentos flexíveis)', value: 'mongo' }
          ]
        });
      } catch {
        db = 'postgres';
      }
    }
    generateDockerConfig(cwd, { db: db || 'postgres', force: options.force });
  }

  if (selectedAction === 'hostinger' || selectedAction === 'all') {
    generateHostingerConfig(cwd, { force: options.force });
  }

  if (selectedAction === 'vps' || selectedAction === 'all') {
    generateVpsConfig(cwd, { force: options.force });
  }

  if (selectedAction === 'whatsapp' || selectedAction === 'all') {
    generateWhatsAppConfig(cwd, { force: options.force });
  }

  if (selectedAction === 'github') {
    await syncGithubCommand(options.feature, options);
    return;
  }

  logger.box('INFRAESTRUTURA CONFIGURADA (HOSTINGER READY)', [
    '🐳 Dockerfile multi-stage e docker-compose.yml criados',
    '🔒 Caddyfile configurado com SSL automático Let\'s Encrypt',
    '🚀 GitHub Actions configurado em .github/workflows/deploy.yml',
    '📖 Guia completo disponível em: docs/hostinger-deploy-guide.md',
    '',
    '👉 Próximos passos para colocar no ar na Hostinger:',
    '  1. Configure seus segredos no GitHub (HOSTINGER_SSH_HOST, USER e KEY)',
    '  2. Aponte o DNS do seu domínio para o IP da VPS',
    '  3. Faça "git push origin main" para disparar o deploy automático!'
  ]);
}
