import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';
import { MarkdownUtils } from '../utils/markdown.js';
import type { ValidationResult, ValidationIssue } from '../types.js';

export function validateFeature(featureSlug: string): ValidationResult {
  const cwd = process.cwd();
  const featureDir = path.join(cwd, '.sdd/specs', featureSlug);
  const issues: ValidationIssue[] = [];

  if (!fs.existsSync(featureDir)) {
    return {
      valid: false,
      issues: [
        {
          stage: '01-prd',
          file: featureDir,
          type: 'error',
          message: `Diretório da feature "${featureSlug}" não encontrado em .sdd/specs/${featureSlug}`
        }
      ]
    };
  }

  const prdPath = path.join(featureDir, '01-prd.md');
  const sddPath = path.join(featureDir, '02-sdd.md');
  const tasksPath = path.join(featureDir, '03-tasks.md');

  // 1. Validação do PRD
  if (!fs.existsSync(prdPath)) {
    issues.push({
      stage: '01-prd',
      file: '01-prd.md',
      type: 'error',
      message: 'Arquivo 01-prd.md está ausente.'
    });
  } else {
    const requiredPrdHeaders = [
      'Contexto & Problema',
      'Objetivos & Métricas',
      'Requisitos Funcionais',
      'Requisitos Não-Funcionais',
      'Limites de Escopo'
    ];
    const missingPrd = MarkdownUtils.checkRequiredSections(prdPath, requiredPrdHeaders);
    for (const h of missingPrd) {
      issues.push({
        stage: '01-prd',
        file: '01-prd.md',
        type: 'error',
        message: `Seção obrigatória ausente no PRD: "${h}"`
      });
    }

    const prdPlaceholders = MarkdownUtils.checkPlaceholders(prdPath);
    if (prdPlaceholders.length > 0) {
      issues.push({
        stage: '01-prd',
        file: '01-prd.md',
        type: 'warning',
        message: `Foram encontrados ${prdPlaceholders.length} placeholders não preenchidos no PRD.`,
        suggestion: 'Revise e substitua marcações como TODO e <!-- PREENCHA antes de avançar.'
      });
    }
  }

  // 2. Validação do SDD
  if (!fs.existsSync(sddPath)) {
    issues.push({
      stage: '02-sdd',
      file: '02-sdd.md',
      type: 'error',
      message: 'Arquivo 02-sdd.md está ausente.'
    });
  } else {
    const requiredSddHeaders = [
      'Visão Geral da Arquitetura',
      'Diagramas',
      'Modelo de Dados',
      'Contratos de API',
      'Decisões de Arquitetura',
      'Casos Extremos'
    ];
    const missingSdd = MarkdownUtils.checkRequiredSections(sddPath, requiredSddHeaders);
    for (const h of missingSdd) {
      issues.push({
        stage: '02-sdd',
        file: '02-sdd.md',
        type: 'error',
        message: `Seção obrigatória ausente no SDD: "${h}"`
      });
    }
  }

  // 3. Validação das Tarefas & TDD
  if (!fs.existsSync(tasksPath)) {
    issues.push({
      stage: '03-tasks',
      file: '03-tasks.md',
      type: 'error',
      message: 'Arquivo 03-tasks.md está ausente.'
    });
  } else {
    const tasks = MarkdownUtils.parseTasks(tasksPath);
    if (tasks.length === 0) {
      issues.push({
        stage: '03-tasks',
        file: '03-tasks.md',
        type: 'error',
        message: 'Nenhuma tarefa formatada (- [ ] T-xxx) encontrada em 03-tasks.md.'
      });
    } else {
      const testTasks = tasks.filter((t) => t.isTest);
      if (testTasks.length === 0) {
        issues.push({
          stage: '03-tasks',
          file: '03-tasks.md',
          type: 'warning',
          message: 'Nenhuma tarefa identificada com tag de teste TLC [TEST-UNIT / TEST-CONTRACT / TEST-E2E].',
          suggestion: 'Adote TLC identificando as tarefas de teste antes da implementação.'
        });
      } else {
        const hasUnit = testTasks.some((t) => t.testType === 'UNIT' || t.testType === 'GENERIC');
        const hasIntOrE2E = testTasks.some((t) => t.testType === 'INT' || t.testType === 'E2E');

        if (!hasUnit) {
          issues.push({
            stage: '03-tasks',
            file: '03-tasks.md',
            type: 'warning',
            message: 'Pirâmide TLC: Recomendado incluir tarefas de teste unitário [TEST-UNIT] para cobrir o domínio.',
            suggestion: 'Mapeie cada cenário Gherkin do PRD para uma tarefa [TEST-UNIT].'
          });
        }
        if (!hasIntOrE2E) {
          issues.push({
            stage: '03-tasks',
            file: '03-tasks.md',
            type: 'warning',
            message: 'Pirâmide TLC: Recomendado incluir testes de integração [TEST-INT] ou ponta a ponta [TEST-E2E].',
            suggestion: 'Adicione testes de integração de API/Banco ou testes E2E com Playwright / DevTools MCP.'
          });
        }
      }
    }
  }

  const errors = issues.filter((i) => i.type === 'error');
  return {
    valid: errors.length === 0,
    issues
  };
}

export function validateCommand(featureSlug?: string) {
  const cwd = process.cwd();
  const specsDir = path.join(cwd, '.sdd/specs');

  if (!fs.existsSync(specsDir)) {
    logger.error('Nenhuma especificação encontrada (.sdd/specs/ não existe). Execute "sdd init" primeiro.');
    return;
  }

  const featuresToValidate: string[] = [];

  if (featureSlug) {
    featuresToValidate.push(featureSlug);
  } else {
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        featuresToValidate.push(entry.name);
      }
    }
  }

  if (featuresToValidate.length === 0) {
    logger.warn('Nenhuma funcionalidade cadastrada para validar.');
    logger.info('Crie uma nova com: sdd new <nome-da-feature>');
    return;
  }

  logger.info(`Executando validação de qualidade da esteira de SDD...`);

  let allValid = true;

  for (const slug of featuresToValidate) {
    console.log(`\n${pc.bold(pc.cyan(`🔍 Validando feature: ${slug}`))}`);
    const result = validateFeature(slug);

    if (result.issues.length === 0) {
      logger.success(`A especificação "${slug}" atende 100% dos requisitos de qualidade!`);
      continue;
    }

    const errors = result.issues.filter((i) => i.type === 'error');
    const warnings = result.issues.filter((i) => i.type === 'warning');

    if (errors.length > 0) {
      allValid = false;
      console.log(pc.red(`  Erros encontrados (${errors.length}):`));
      for (const err of errors) {
        console.log(pc.red(`   ✖ [${err.stage}][${err.file}] `) + err.message);
        if (err.suggestion) console.log(pc.gray(`     💡 Sugestão: ${err.suggestion}`));
      }
    }

    if (warnings.length > 0) {
      console.log(pc.yellow(`  Avisos de melhoria (${warnings.length}):`));
      for (const w of warnings) {
        console.log(pc.yellow(`   ⚠ [${w.stage}][${w.file}] `) + w.message);
        if (w.suggestion) console.log(pc.gray(`     💡 Sugestão: ${w.suggestion}`));
      }
    }

    if (errors.length === 0) {
      logger.success(`Especificação "${slug}" está apta para avanço na esteira (apenas avisos leves).`);
    }
  }

  if (!allValid) {
    logger.error('Validação concluída com erros impeditivos. Corrija-os antes de avançar para a próxima fase.');
  }
}
