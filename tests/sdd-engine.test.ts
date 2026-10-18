import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TemplateEngine } from '../src/utils/template.js';
import { MarkdownUtils } from '../src/utils/markdown.js';
import { appendToChangelog } from '../src/commands/archive.js';
import { generateDockerConfig, generateHostingerConfig, generateVpsConfig, generateWhatsAppConfig } from '../src/commands/infra.js';
import { buildIssuePayload, buildPullRequestDraft, syncGithubCommand } from '../src/commands/github.js';
import { installSkill } from '../src/commands/skill.js';
import fs from 'node:fs';
import path from 'node:path';

describe('TemplateEngine', () => {
  test('deve converter slug para PascalCase corretamente', () => {
    assert.equal(TemplateEngine.toPascalCase('minha-feature'), 'MinhaFeature');
    assert.equal(TemplateEngine.toPascalCase('auth_jwt_service'), 'AuthJwtService');
  });

  test('deve normalizar strings para slug seguro', () => {
    assert.equal(TemplateEngine.toSlug('Autenticação e Permissão de Usuário!'), 'autenticacao-e-permissao-de-usuario');
  });

  test('deve renderizar variáveis no template', () => {
    const template = 'Olá {{NOME}}, bem-vindo à {{SISTEMA}}!';
    const rendered = TemplateEngine.render(template, {
      NOME: 'Douglas',
      SISTEMA: 'Esteira SDD'
    });
    assert.equal(rendered, 'Olá Douglas, bem-vindo à Esteira SDD!');
  });

  test('deve renderizar 00-grill-template.md com variáveis da feature', () => {
    const rendered = TemplateEngine.renderTemplateFile('00-grill-template.md', {
      FEATURE_NAME: 'Autenticação OAuth',
      FEATURE_SLUG: 'autenticacao-oauth',
      FEATURE_PASCAL: 'AutenticacaoOauth',
      DATE: '2026-10-18'
    });
    assert.match(rendered, /Autenticação OAuth/);
    assert.match(rendered, /00-GRILL/);
  });

  test('deve renderizar constitution-template.md com variáveis do projeto', () => {
    const rendered = TemplateEngine.renderTemplateFile('constitution-template.md', {
      PROJECT_NAME: 'MeuProjetoSaaS',
      DATE: '2026-10-18'
    });
    assert.match(rendered, /MeuProjetoSaaS/);
    assert.match(rendered, /PostgreSQL/);
    assert.match(rendered, /MongoDB/);
    assert.match(rendered, /MUI/);
  });
});

describe('MarkdownUtils', () => {
  const testFile = path.resolve('tests/temp-task-test.md');

  test('deve extrair tarefas e identificar tags TDD', () => {
    const content = `
# Tasks
- [ ] T-001 [SETUP] Criar tipos
- [ ] T-002 [TEST] Escrever testes unitários
- [x] T-003 [IMPL] Implementar serviço
`;
    fs.writeFileSync(testFile, content, 'utf-8');

    const tasks = MarkdownUtils.parseTasks(testFile);
    assert.equal(tasks.length, 3);
    assert.equal(tasks[0].id, 'T-001');
    assert.equal(tasks[0].completed, false);
    assert.equal(tasks[1].isTest, true);
    assert.equal(tasks[2].completed, true);
    assert.equal(tasks[2].isTest, false);

    fs.unlinkSync(testFile);
  });

  test('deve identificar corretamente os subtipos de teste da pirâmide TLC', () => {
    const content = `
- [ ] T-001 [TEST-CONTRACT] Validar schemas Zod
- [ ] T-002 [TEST-UNIT] Regra de login Gherkin
- [ ] T-003 [TEST-INT] Rota POST /auth e Postgres
- [ ] T-004 [TEST-E2E] Fluxo Playwright de checkout
- [ ] T-005 [TEST-UI] Componente de botão e a11y
- [ ] T-006 [CHECK-SMOKE] Healthcheck Docker
- [ ] T-007 [IMPL] Código de negócio
`;
    fs.writeFileSync(testFile, content, 'utf-8');

    const tasks = MarkdownUtils.parseTasks(testFile);
    assert.equal(tasks.length, 7);
    assert.equal(tasks[0].testType, 'CONTRACT');
    assert.equal(tasks[1].testType, 'UNIT');
    assert.equal(tasks[2].testType, 'INT');
    assert.equal(tasks[3].testType, 'E2E');
    assert.equal(tasks[4].testType, 'UI');
    assert.equal(tasks[5].testType, 'SMOKE');
    assert.equal(tasks[6].testType, 'NONE');
    assert.equal(tasks[6].isTest, false);

    fs.unlinkSync(testFile);
  });

  test('deve marcar tarefa como concluída no arquivo', () => {
    const content = `
- [ ] T-001 Tarefa pendente
`;
    fs.writeFileSync(testFile, content, 'utf-8');

    const success = MarkdownUtils.markTaskCompleted(testFile, 'T-001');
    assert.equal(success, true);

    const updatedContent = fs.readFileSync(testFile, 'utf-8');
    assert.match(updatedContent, /-\s*\[x\]\s*T-001/);

    fs.unlinkSync(testFile);
  });
});

describe('Archive & Changelog (Open Spec)', () => {
  const tempDir = path.resolve('tests/temp-archive-test');

  test('deve criar e atualizar CHANGELOG.md ao arquivar uma feature', () => {
    fs.mkdirSync(tempDir, { recursive: true });

    appendToChangelog(tempDir, {
      featureName: 'Autenticação JWT',
      slug: 'autenticacao-jwt',
      dateStr: '2026-10-18',
      rfList: ['RF-001: Login com email e senha', 'RF-002: Renovação de refresh token']
    });

    const changelogPath = path.join(tempDir, 'CHANGELOG.md');
    assert.equal(fs.existsSync(changelogPath), true);

    const content = fs.readFileSync(changelogPath, 'utf-8');
    assert.match(content, /Autenticação JWT/);
    assert.match(content, /RF-001: Login com email e senha/);
    assert.match(content, /\.sdd\/archive\/2026-10-18-autenticacao-jwt\//);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('Infra & Deploy (Docker & Hostinger)', () => {
  const tempInfraDir = path.resolve('tests/temp-infra-test');

  test('deve gerar Dockerfile, docker-compose.yml e Caddyfile configurados para PostgreSQL', () => {
    fs.mkdirSync(tempInfraDir, { recursive: true });

    generateDockerConfig(tempInfraDir, { db: 'postgres', force: true });

    assert.equal(fs.existsSync(path.join(tempInfraDir, 'Dockerfile')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, 'docker-compose.yml')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, 'Caddyfile')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, '.env.example')), true);

    const composeContent = fs.readFileSync(path.join(tempInfraDir, 'docker-compose.yml'), 'utf-8');
    assert.match(composeContent, /postgres:16-alpine/);
    assert.match(composeContent, /caddy:2-alpine/);

    fs.rmSync(tempInfraDir, { recursive: true, force: true });
  });

  test('deve gerar workflow de CI/CD do GitHub Actions e script de deploy Hostinger', () => {
    fs.mkdirSync(tempInfraDir, { recursive: true });

    generateHostingerConfig(tempInfraDir, { force: true });

    assert.equal(fs.existsSync(path.join(tempInfraDir, '.github/workflows/deploy.yml')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, 'scripts/deploy-hostinger.sh')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, 'docs/hostinger-deploy-guide.md')), true);

    const workflowContent = fs.readFileSync(path.join(tempInfraDir, '.github/workflows/deploy.yml'), 'utf-8');
    assert.match(workflowContent, /HOSTINGER_SSH_HOST/);
    assert.match(workflowContent, /test-and-quality/);

    fs.rmSync(tempInfraDir, { recursive: true, force: true });
  });

  test('deve gerar kit de autonomia 24/7 na Hostinger VPS (sdd_runner.sh, PowerShell e Python runner)', () => {
    fs.mkdirSync(tempInfraDir, { recursive: true });

    generateVpsConfig(tempInfraDir, { force: true });

    assert.equal(fs.existsSync(path.join(tempInfraDir, 'scripts/sdd_runner.sh')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, 'scripts/sdd_runner.ps1')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, 'scripts/sdd_remote_runner.py')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, 'docs/vps-autonomous-guide.md')), true);

    const shContent = fs.readFileSync(path.join(tempInfraDir, 'scripts/sdd_runner.sh'), 'utf-8');
    assert.match(shContent, /sdd_remote_runner/);
    assert.match(shContent, /LOCK_FILE/);

    const psContent = fs.readFileSync(path.join(tempInfraDir, 'scripts/sdd_runner.ps1'), 'utf-8');
    assert.match(psContent, /HOSTINGER_SSH_HOST/);

    const pyContent = fs.readFileSync(path.join(tempInfraDir, 'scripts/sdd_remote_runner.py'), 'utf-8');
    assert.match(pyContent, /find_active_feature/);
    assert.match(pyContent, /notify_whatsapp/);

    fs.rmSync(tempInfraDir, { recursive: true, force: true });
  });

  test('deve gerar controlador de webhook WhatsApp com guardrail estrito de número mestre', () => {
    fs.mkdirSync(tempInfraDir, { recursive: true });

    generateWhatsAppConfig(tempInfraDir, { force: true });

    assert.equal(fs.existsSync(path.join(tempInfraDir, 'scripts/whatsapp_webhook.ts')), true);
    assert.equal(fs.existsSync(path.join(tempInfraDir, 'docs/whatsapp-integration-guide.md')), true);

    const webhookContent = fs.readFileSync(path.join(tempInfraDir, 'scripts/whatsapp_webhook.ts'), 'utf-8');
    assert.match(webhookContent, /isAuthorizedMaster/);
    assert.match(webhookContent, /WHATSAPP_MASTER_ADMIN/);
    assert.match(webhookContent, /EVOLUTION_INSTANCE/);
    assert.match(webhookContent, /DROPPED/);

    fs.rmSync(tempInfraDir, { recursive: true, force: true });
  });
});

describe('Estimativa Híbrida & WhatsApp (sdd estimate)', () => {
  const testFile = path.resolve('tests/temp-estimate-test.md');

  test('deve extrair estimativas explícitas e aplicar fallbacks TLC determinísticos', () => {
    const content = `
- [ ] T-001 [SETUP] Criar tipos (~15 min)
- [ ] T-002 [TEST-CONTRACT] Validar schemas Zod (~1h 30min)
- [x] T-003 [TEST-UNIT] Regra de login sem anotação explícita
- [ ] T-004 [TEST-INT] Rota de persistência sem anotação
- [ ] T-005 [TEST-E2E] Fluxo completo Playwright (~45 min)
`;
    fs.writeFileSync(testFile, content, 'utf-8');

    const tasks = MarkdownUtils.parseTasks(testFile);
    assert.equal(tasks.length, 5);

    // T-001: Explícito 15 min
    assert.equal(tasks[0].hasExplicitEstimate, true);
    assert.equal(tasks[0].estimatedMinutes, 15);

    // T-002: Explícito 1h 30min = 90 min
    assert.equal(tasks[1].hasExplicitEstimate, true);
    assert.equal(tasks[1].estimatedMinutes, 90);

    // T-003: Fallback TLC UNIT = 20 min
    assert.equal(tasks[2].hasExplicitEstimate, false);
    assert.equal(tasks[2].estimatedMinutes, 20);
    assert.equal(tasks[2].completed, true);

    // T-004: Fallback TLC INT = 35 min
    assert.equal(tasks[3].hasExplicitEstimate, false);
    assert.equal(tasks[3].estimatedMinutes, 35);

    // T-005: Explícito 45 min
    assert.equal(tasks[4].hasExplicitEstimate, true);
    assert.equal(tasks[4].estimatedMinutes, 45);

    fs.unlinkSync(testFile);
  });

  test('deve calcular métricas de tempo, percentual e ETA corretamente', () => {
    const content = `
- [x] T-001 [SETUP] Concluído (~30 min)
- [x] T-002 [TEST-CONTRACT] Concluído (~30 min)
- [ ] T-003 [TEST-UNIT] Pendente (~60 min)
- [ ] T-004 [TEST-INT] Pendente (~60 min)
`;
    fs.writeFileSync(testFile, content, 'utf-8');

    const tasks = MarkdownUtils.parseTasks(testFile);
    const baseDate = new Date('2026-10-18T10:00:00Z');
    const summary = MarkdownUtils.calculateEstimate('checkout-service', tasks, baseDate);

    assert.equal(summary.totalTasks, 4);
    assert.equal(summary.completedTasks, 2);
    assert.equal(summary.pendingTasks, 2);
    assert.equal(summary.totalMinutes, 180); // 30+30+60+60 = 180m = 3h
    assert.equal(summary.completedMinutes, 60); // 30+30 = 60m = 1h
    assert.equal(summary.pendingMinutes, 120); // 60+60 = 120m = 2h
    assert.equal(summary.completionPercentage, 33); // 60/180 = 33%

    // 10:00 + 120 min = 12:00
    assert.equal(summary.projectedFinishTime.toISOString(), '2026-10-18T12:00:00.000Z');

    fs.unlinkSync(testFile);
  });
});

describe('GitHub Full Automation (sdd infra github)', () => {
  const tempProjectDir = path.resolve('tests/temp-gh-project');

  test('deve construir payload de issue do GitHub com labels TLC e metadata', () => {
    const task: import('../src/types.js').TaskItem = {
      id: 'T-002',
      title: '`T-002` [TEST-CONTRACT] Validar schemas Zod (~15 min)',
      isTest: true,
      testType: 'CONTRACT',
      completed: false,
      rawText: '- [ ] `T-002` [TEST-CONTRACT] Validar schemas Zod (~15 min)',
      lineNumber: 5,
      estimatedMinutes: 15,
      hasExplicitEstimate: true
    };

    const payload = buildIssuePayload(task, 'auth-jwt');
    assert.equal(payload.title, '[T-002] Validar schemas Zod');
    assert.deepEqual(payload.labels, ['sdd-task', 'tlc-contract']);
    assert.match(payload.body, /ID da Tarefa.*T-002/);
    assert.match(payload.body, /auth-jwt/);
    assert.match(payload.body, /~15 min/);
  });

  test('deve construir rascunho de Pull Request contendo Closes #XX e checklist de auditoria', () => {
    const tasks: import('../src/types.js').TaskItem[] = [
      {
        id: 'T-001',
        title: '[SETUP] Criar types',
        isTest: false,
        testType: 'NONE',
        completed: true,
        rawText: '- [x] T-001 [SETUP] Criar types',
        lineNumber: 1,
        estimatedMinutes: 10,
        hasExplicitEstimate: false
      },
      {
        id: 'T-002',
        title: '[TEST-CONTRACT] Schemas Zod',
        isTest: true,
        testType: 'CONTRACT',
        completed: true,
        rawText: '- [x] T-002 [TEST-CONTRACT] Schemas Zod',
        lineNumber: 2,
        estimatedMinutes: 15,
        hasExplicitEstimate: false
      }
    ];

    const synced = [
      { taskId: 'T-001', issueNumber: 10 },
      { taskId: 'T-002', issueNumber: 11 }
    ];

    const prContent = buildPullRequestDraft('auth-jwt', tasks, synced);
    assert.match(prContent, /Pull Request: Feature `auth-jwt`/);
    assert.match(prContent, /- Closes #10 \(`T-001`\)/);
    assert.match(prContent, /- Closes #11 \(`T-002`\)/);
    assert.match(prContent, /- \[x\] `T-001`/);
    assert.match(prContent, /- \[x\] `T-002`/);
  });

  test('deve sincronizar issues e gerar PULL_REQUEST.md e github-sync.json em modo dry-run', async () => {
    const specDir = path.join(tempProjectDir, '.sdd/specs/carrinho-compras');
    fs.mkdirSync(specDir, { recursive: true });

    const tasksContent = `
# Tasks
- [ ] T-001 [TEST-CONTRACT] Schemas Zod do Carrinho (~10 min)
- [ ] T-002 [TEST-UNIT] Cálculo de frete e cupom (~20 min)
`;
    fs.writeFileSync(path.join(specDir, '03-tasks.md'), tasksContent, 'utf-8');

    await syncGithubCommand('carrinho-compras', {
      cwd: tempProjectDir,
      dryRun: true,
      repo: 'DouglasDeCastroAlmeida/meu-ecommerce-sdd'
    });

    const syncFile = path.join(specDir, 'github-sync.json');
    const prFile = path.join(specDir, 'PULL_REQUEST.md');

    assert.equal(fs.existsSync(syncFile), true);
    assert.equal(fs.existsSync(prFile), true);

    const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
    assert.equal(syncData.feature, 'carrinho-compras');
    assert.equal(syncData.issuesCount, 2);
    assert.equal(syncData.issues[0].taskId, 'T-001');
    assert.equal(syncData.issues[0].labels.includes('tlc-contract'), true);

    const prText = fs.readFileSync(prFile, 'utf-8');
    assert.match(prText, /Closes #1/);
    assert.match(prText, /Closes #2/);

    fs.rmSync(tempProjectDir, { recursive: true, force: true });
  });
});

describe('Antigravity Skill Packaging (sdd skill install)', () => {
  const tempSkillDir = path.resolve('tests/temp-skill-project');

  test('deve instalar a skill sdd-flow localmente no projeto em .agents/skills/sdd-flow/SKILL.md', () => {
    fs.mkdirSync(tempSkillDir, { recursive: true });

    const success = installSkill({ cwd: tempSkillDir, global: false });
    assert.equal(success, true);

    const localSkillPath = path.join(tempSkillDir, '.agents/skills/sdd-flow/SKILL.md');
    assert.equal(fs.existsSync(localSkillPath), true);

    const content = fs.readFileSync(localSkillPath, 'utf-8');
    assert.match(content, /name: sdd-flow/);
    assert.match(content, /00-GRILL/);
    assert.match(content, /constitution\.md/);
    assert.match(content, /sdd estimate/);
    assert.match(content, /sdd infra/);

    fs.rmSync(tempSkillDir, { recursive: true, force: true });
  });
});



