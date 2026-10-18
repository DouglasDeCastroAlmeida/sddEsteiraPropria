import fs from 'node:fs';
import path from 'node:path';
import { input } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { TemplateEngine } from '../utils/template.js';

export async function newCommand(featureNameArg?: string) {
  let name = featureNameArg;

  if (!name || name.trim() === '') {
    try {
      name = await input({
        message: 'Qual é o nome da funcionalidade / feature que você quer especificar?',
        validate: (val) => {
          if (!val.trim()) return 'O nome não pode ser vazio.';
          return true;
        }
      });
    } catch {
      logger.error('Operação cancelada pelo usuário.');
      return;
    }
  }

  const slug = TemplateEngine.toSlug(name);
  const pascalName = TemplateEngine.toPascalCase(slug);
  const dateStr = new Date().toISOString().split('T')[0];

  const cwd = process.cwd();
  const sddDir = path.join(cwd, '.sdd');
  const specsDir = path.join(sddDir, 'specs');
  const targetFeatureDir = path.join(specsDir, slug);

  if (!fs.existsSync(sddDir)) {
    logger.warn('A esteira ainda não foi inicializada. Inicializando automaticamente...');
    fs.mkdirSync(specsDir, { recursive: true });
  }

  if (fs.existsSync(targetFeatureDir)) {
    logger.error(`A funcionalidade "${slug}" já existe em: ${targetFeatureDir}`);
    logger.info(`Para ver o status execute: sdd status ou sdd validate ${slug}`);
    return;
  }

  fs.mkdirSync(targetFeatureDir, { recursive: true });

  const vars: Record<string, string> = {
    FEATURE_NAME: name,
    FEATURE_SLUG: slug,
    FEATURE_PASCAL: pascalName,
    DATE: dateStr,
    NOME_DO_PRIMEIRO_REQUISITO: 'Fluxo Principal de Negócio',
    NOME_DO_SEGUNDO_REQUISITO: 'Tratamento de Exceções e Resiliência'
  };

  // Renderiza templates
  const grillContent = TemplateEngine.renderTemplateFile('00-grill-template.md', vars);
  const prdContent = TemplateEngine.renderTemplateFile('01-prd-template.md', vars);
  const sddContent = TemplateEngine.renderTemplateFile('02-sdd-template.md', vars);
  const tasksContent = TemplateEngine.renderTemplateFile('03-tasks-template.md', vars);

  fs.writeFileSync(path.join(targetFeatureDir, '00-grill.md'), grillContent, 'utf-8');
  fs.writeFileSync(path.join(targetFeatureDir, '01-prd.md'), prdContent, 'utf-8');
  fs.writeFileSync(path.join(targetFeatureDir, '02-sdd.md'), sddContent, 'utf-8');
  fs.writeFileSync(path.join(targetFeatureDir, '03-tasks.md'), tasksContent, 'utf-8');

  // Metadados do ciclo
  const meta = {
    featureName: name,
    slug,
    pascalName,
    createdAt: new Date().toISOString(),
    currentStage: '01-prd',
    grillCompleted: false,
    stagesHistory: [
      { stage: '01-prd', enteredAt: new Date().toISOString() }
    ]
  };
  fs.writeFileSync(path.join(targetFeatureDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

  logger.success(`Especificação criada com sucesso para: "${name}"!`);
  logger.box(`FEATURE: ${slug}`, [
    `📁 Local: .sdd/specs/${slug}/`,
    `📄 01-prd.md   -> Definição de Requisitos de Produto e Critérios de Aceite`,
    `📄 02-sdd.md   -> Arquitetura Técnica, Diagramas Mermaid e Contratos`,
    `📄 03-tasks.md -> Quebra de Tarefas TDD e Critérios de Conclusão`,
    '',
    `🚀 Próximos passos na esteira:`,
    `  1. Preencha ou revise o documento de PRD em: .sdd/specs/${slug}/01-prd.md`,
    `  2. Valide o PRD com: sdd validate ${slug}`,
    `  3. Ao aprovar, avance para o SDD técnico: sdd next ${slug}`
  ]);
}
