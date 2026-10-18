import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../utils/logger.js';
import { TemplateEngine } from '../utils/template.js';

export function installSkill(options: { global?: boolean; cwd?: string; force?: boolean } = {}) {
  const cwd = options.cwd || process.cwd();
  const isGlobal = options.global ?? true;

  logger.banner();

  const templatePath = path.join(TemplateEngine.getTemplatesDir(), 'sdd-skill-template.md');
  if (!fs.existsSync(templatePath)) {
    logger.error('Template da skill não encontrado: sdd-skill-template.md');
    return false;
  }

  const skillContent = fs.readFileSync(templatePath, 'utf-8');

  if (isGlobal) {
    // Instalação Global em ~/.gemini/config/skills/sdd-flow/SKILL.md
    const homeDir = os.homedir();
    const globalSkillsDir = path.join(homeDir, '.gemini/config/skills/sdd-flow');
    fs.mkdirSync(globalSkillsDir, { recursive: true });

    const globalSkillFile = path.join(globalSkillsDir, 'SKILL.md');
    fs.writeFileSync(globalSkillFile, skillContent, 'utf-8');
    logger.success(`Skill instalada globalmente em: ${globalSkillFile}`);
  }

  // Instalação Local no Projeto em .agents/skills/sdd-flow/SKILL.md
  const localSkillsDir = path.join(cwd, '.agents/skills/sdd-flow');
  fs.mkdirSync(localSkillsDir, { recursive: true });

  const localSkillFile = path.join(localSkillsDir, 'SKILL.md');
  fs.writeFileSync(localSkillFile, skillContent, 'utf-8');
  logger.success(`Skill instalada no projeto em: ${localSkillFile}`);

  logger.box('SKILL NATIVA ANTIGRAVITY INSTALADA', [
    '🎯 Nome da Skill: sdd-flow',
    '🌐 Escopo: Global (para todos os projetos) e Local (.agents/skills/)',
    '⚡ O Antigravity agora reconhece e opera sua esteira automaticamente!',
    '',
    '👉 Ações habilitadas:',
    '  • Questionamento Grill socrático pré-PRD',
    '  • Alinhamento estrito com a constitution.md',
    '  • Validação da pirâmide de testes TLC',
    '  • Orquestração 24/7 na Hostinger e controle por WhatsApp'
  ]);

  return true;
}
