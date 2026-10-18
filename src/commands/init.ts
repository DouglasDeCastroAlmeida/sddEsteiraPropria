import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';
import { TemplateEngine } from '../utils/template.js';
import type { SddConfig } from '../types.js';

export async function initCommand(options: { force?: boolean }) {
  logger.banner();
  logger.info('Inicializando a esteira de SDD (Spec-Driven Development)...');

  const cwd = process.cwd();
  const sddDir = path.join(cwd, '.sdd');
  const specsDir = path.join(sddDir, 'specs');
  const templatesDir = path.join(sddDir, 'templates');
  const rulesDir = path.join(sddDir, 'rules');
  const configFile = path.join(sddDir, 'config.json');

  if (fs.existsSync(sddDir) && !options.force) {
    logger.warn('A esteira já está inicializada neste projeto (.sdd/ já existe).');
    logger.info('Use "sdd new <feature-name>" para criar uma nova especificação ou "sdd status" para ver o andamento.');
    return;
  }

  // Cria estrutura de diretórios
  fs.mkdirSync(specsDir, { recursive: true });
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.mkdirSync(rulesDir, { recursive: true });

  // Configuração padrão
  const config: SddConfig = {
    version: '1.0.0',
    projectName: path.basename(cwd),
    language: 'pt-BR',
    specsDir: '.sdd/specs',
    tddRequired: true,
    enforceAudit: true,
    agentRules: {
      disallowCodeWithoutSpec: true,
      atomicTaskExecution: true
    }
  };

  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');

  // Copia os templates base para .sdd/templates para permitir personalização local
  const baseTemplates = [
    'constitution-template.md',
    '00-grill-template.md',
    '01-prd-template.md',
    '02-sdd-template.md',
    '03-tasks-template.md',
    '05-audit-template.md',
    'sdd-agent-rules.md',
    'sdd-prompt-library.md'
  ];

  const sourceDir = TemplateEngine.getTemplatesDir();
  for (const file of baseTemplates) {
    const srcPath = path.join(sourceDir, file);
    if (fs.existsSync(srcPath)) {
      const destPath = (file === 'sdd-agent-rules.md' || file === 'sdd-prompt-library.md')
        ? path.join(rulesDir, file) 
        : path.join(templatesDir, file);
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Cria constitution.md na raiz se não existir
  const constitutionPath = path.join(cwd, 'constitution.md');
  if (!fs.existsSync(constitutionPath)) {
    const constitutionContent = TemplateEngine.renderTemplateFile('constitution-template.md', {
      PROJECT_NAME: path.basename(cwd),
      DATE: new Date().toISOString().split('T')[0]
    });
    fs.writeFileSync(constitutionPath, constitutionContent, 'utf-8');
    logger.info('Criado arquivo constitution.md na raiz do projeto (Constituição Técnica).');
  }

  // Cria também arquivo de regras de agente na raiz se não existir (para fácil leitura por Cursor/Antigravity)
  const agentRulesRoot = path.join(cwd, 'AGENTS.md');
  if (!fs.existsSync(agentRulesRoot)) {
    const rulesContent = fs.readFileSync(path.join(rulesDir, 'sdd-agent-rules.md'), 'utf-8');
    fs.writeFileSync(agentRulesRoot, rulesContent, 'utf-8');
    logger.info('Criado arquivo AGENTS.md na raiz do projeto com as regras da esteira.');
  }

  logger.success('Esteira SDD inicializada com sucesso!');
  logger.box('ESTEIRA SDD CONFIGURADA', [
    `📁 Diretório central: .sdd/`,
    `📜 Constituição: constitution.md (Stack, Design System, Skills)`,
    `📋 Templates locais: .sdd/templates/`,
    `🤖 Regras para agentes: .sdd/rules/ e AGENTS.md`,
    `⚙️ Configuração: .sdd/config.json`,
    '',
    '👉 Próximos passos recomendados:',
    '  1. Crie uma nova especificação: npx sdd new <nome-da-feature>',
    '  2. Verifique o status da esteira: npx sdd status',
    '  3. Valide suas specs antes de codificar: npx sdd validate <nome-da-feature>'
  ]);
}
