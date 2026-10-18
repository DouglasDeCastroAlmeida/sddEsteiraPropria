import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { input } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { TemplateEngine } from '../utils/template.js';

export async function grillCommand(featureSlugArg?: string, options: { interactive?: boolean } = {}) {
  const cwd = process.cwd();
  const specsDir = path.join(cwd, '.sdd/specs');

  if (!fs.existsSync(specsDir)) {
    logger.error('Nenhuma especificação encontrada (.sdd/specs/ não existe). Execute "sdd init" primeiro.');
    return;
  }

  let slug = featureSlugArg;
  if (!slug) {
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });
    const features = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (features.length === 0) {
      logger.warn('Nenhuma feature encontrada. Crie uma nova com "sdd new <nome>".');
      return;
    }
    slug = features[0];
  }

  const featureDir = path.join(specsDir, slug);
  if (!fs.existsSync(featureDir)) {
    logger.error(`Funcionalidade "${slug}" não foi encontrada em .sdd/specs/${slug}.`);
    return;
  }

  const grillFile = path.join(featureDir, '00-grill.md');
  const metaFile = path.join(featureDir, 'meta.json');

  let meta: any = {};
  if (fs.existsSync(metaFile)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    } catch {}
  }

  const featureName = meta.featureName || slug;

  // Se o arquivo 00-grill.md ainda não existe, cria a partir do template
  if (!fs.existsSync(grillFile)) {
    const vars: Record<string, string> = {
      FEATURE_NAME: featureName,
      FEATURE_SLUG: slug,
      FEATURE_PASCAL: meta.pascalName || TemplateEngine.toPascalCase(slug),
      DATE: new Date().toISOString().split('T')[0]
    };
    const content = TemplateEngine.renderTemplateFile('00-grill-template.md', vars);
    fs.writeFileSync(grillFile, content, 'utf-8');
    logger.info(`Criado arquivo de interrogatório técnico: .sdd/specs/${slug}/00-grill.md`);
  }

  logger.banner();
  console.log(pc.bgRed(pc.white(pc.bold(' 🔥 MODO GRILL: REFINAMENTO SOCRÁTICO (MATT POCOCK WORKFLOW) '))));
  console.log(pc.yellow(`Funcionalidade em análise: ${pc.bold(featureName)} (${slug})\n`));

  console.log(pc.cyan('O objetivo do Grill é expor premissas frágeis, casos de falha e limites rígidos de escopo ANTES de redigir o PRD ou codificar.\n'));

  if (options.interactive) {
    try {
      console.log(pc.bold(pc.white('Responda às 3 perguntas de choque arquitetural:\n')));

      const p1 = await input({
        message: '1. O que acontece se o serviço/banco dependente falhar ou sofrer timeout de 10s?',
        default: 'Falhar graciosamente com erro amigável e log estruturado.'
      });

      const p2 = await input({
        message: '2. Qual ação ou funcionalidade está expressamente PROIBIDA de ser feita nesta versão (Fora de Escopo)?',
        default: 'Qualquer migração legada ou interface além da API contratada.'
      });

      const p3 = await input({
        message: '3. Se quebrar em produção, qual é o plano de rollback imediato?',
        default: 'Desabilitar via feature flag ou reverter versão do container Docker.'
      });

      let content = fs.readFileSync(grillFile, 'utf-8');
      content += `\n\n## 📝 Respostas Registradas via CLI Interativa em ${new Date().toLocaleString('pt-BR')}\n`;
      content += `- **Tratamento de Timeout/Falha:** ${p1}\n`;
      content += `- **Proibição de Escopo:** ${p2}\n`;
      content += `- **Estratégia de Rollback:** ${p3}\n`;

      fs.writeFileSync(grillFile, content, 'utf-8');
      logger.success('Respostas do Grill registradas com sucesso em 00-grill.md!');
    } catch {
      logger.warn('Interrogatório interativo cancelado.');
    }
  } else {
    logger.box('ROTEIRO DE GRILL TÉCNICO', [
      `Arquivo: .sdd/specs/${slug}/00-grill.md`,
      '',
      '👉 Para conduzir com o Agente de IA (Antigravity):',
      '  Peça: "Grelhe-me sobre a feature ' + slug + ' fazendo perguntas difíceis sobre edge cases e limites de escopo."',
      '',
      '👉 Para responder interativamente via terminal:',
      '  Execute: sdd grill ' + slug + ' --interactive'
    ]);
  }

  meta.grillCompleted = true;
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf-8');
}
