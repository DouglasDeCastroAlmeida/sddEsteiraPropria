import fs from 'node:fs';
import type { TaskItem, TlcTestType, EstimateSummary } from '../types.js';

export const TLC_FALLBACK_MINUTES: Record<TlcTestType, number> = {
  CONTRACT: 10,
  UNIT: 20,
  INT: 35,
  E2E: 50,
  UI: 30,
  SMOKE: 15,
  GENERIC: 15,
  NONE: 20
};

export class MarkdownUtils {
  /**
   * Converte minutos em formato legível (ex: 25 min, 1h 30min, 3h)
   */
  static formatDuration(minutes: number): string {
    if (minutes <= 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  /**
   * Extrai tarefas de um arquivo Markdown com padrão `- [ ]` ou `- [x]`
   */
  static parseTasks(filePath: string): TaskItem[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const tasks: TaskItem[] = [];

    const taskRegex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;
    const idRegex = /(T-\d{3,4}|TASK-\d+|RF-\d+)/i;
    const estimateRegex = /\(~\s*(?:(\d+)\s*(?:h|horas?))?\s*(?:(\d+)\s*(?:min|minutos?|m))?\s*\)/i;

    lines.forEach((line: string, index: number) => {
      const match = line.match(taskRegex);
      if (match) {
        const completed = match[1].toLowerCase() === 'x';
        const rawText = match[2].trim();
        const idMatch = rawText.match(idRegex);
        const id = idMatch ? idMatch[1].toUpperCase() : `T-${String(tasks.length + 1).padStart(3, '0')}`;
        
        let testType: TlcTestType = 'NONE';
        if (/\[\s*(TEST-CONTRACT|CONTRACT)\s*\]/i.test(rawText)) {
          testType = 'CONTRACT';
        } else if (/\[\s*(TEST-UNIT|UNIT)\s*\]/i.test(rawText)) {
          testType = 'UNIT';
        } else if (/\[\s*(TEST-INT|INT|INTEGRATION)\s*\]/i.test(rawText)) {
          testType = 'INT';
        } else if (/\[\s*(TEST-E2E|E2E)\s*\]/i.test(rawText)) {
          testType = 'E2E';
        } else if (/\[\s*(TEST-UI|UI)\s*\]/i.test(rawText)) {
          testType = 'UI';
        } else if (/\[\s*(CHECK-SMOKE|SMOKE)\s*\]/i.test(rawText)) {
          testType = 'SMOKE';
        } else if (/\[\s*(TEST|TESTE|TDD)\s*\]/i.test(rawText)) {
          testType = 'GENERIC';
        }

        const isTest = testType !== 'NONE';

        // Detecção de estimativa explícita (~15 min, ~1h 30min, etc.)
        const estMatch = rawText.match(estimateRegex);
        let estimatedMinutes = 0;
        let hasExplicitEstimate = false;
        let explicitEstimateText: string | undefined;

        if (estMatch && (estMatch[1] || estMatch[2])) {
          const hours = estMatch[1] ? parseInt(estMatch[1], 10) : 0;
          const mins = estMatch[2] ? parseInt(estMatch[2], 10) : 0;
          estimatedMinutes = hours * 60 + mins;
          if (estimatedMinutes > 0) {
            hasExplicitEstimate = true;
            explicitEstimateText = estMatch[0];
          }
        }

        // Se não houver estimativa explícita, usa o piso da pirâmide TLC
        if (!hasExplicitEstimate) {
          estimatedMinutes = TLC_FALLBACK_MINUTES[testType] || 20;
        }

        tasks.push({
          id,
          title: rawText,
          isTest,
          testType,
          completed,
          rawText,
          lineNumber: index + 1,
          estimatedMinutes,
          hasExplicitEstimate,
          explicitEstimateText
        });
      }
    });

    return tasks;
  }

  /**
   * Verifica se o arquivo contém seções obrigatórias
   */
  static checkRequiredSections(filePath: string, requiredHeaders: string[]): string[] {
    if (!fs.existsSync(filePath)) {
      return requiredHeaders;
    }

    const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();
    const missing: string[] = [];

    for (const header of requiredHeaders) {
      if (!content.includes(header.toLowerCase())) {
        missing.push(header);
      }
    }

    return missing;
  }

  /**
   * Verifica se o arquivo tem marcadores placeholder não preenchidos (ex: `<!-- PREENCHA`, `[SEU PROJETO]`)
   */
  static checkPlaceholders(filePath: string): string[] {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const placeholders: string[] = [];

    const placeholderRegex = /<!--\s*TODO|\bTODO\b|<!--\s*PREENCHA|<SUA_|\[INFORME/i;

    lines.forEach((line: string, idx: number) => {
      if (placeholderRegex.test(line)) {
        placeholders.push(`Linha ${idx + 1}: ${line.trim()}`);
      }
    });

    return placeholders;
  }

  /**
   * Marca uma tarefa como concluída no arquivo
   */
  static markTaskCompleted(filePath: string, taskId: string): boolean {
    if (!fs.existsSync(filePath)) return false;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let found = false;

    const updatedLines = lines.map((line: string) => {
      if (line.includes(taskId) && /-\s*\[\s*\]/.test(line)) {
        found = true;
        return line.replace(/-\s*\[\s*\]/, '- [x]');
      }
      return line;
    });

    if (found) {
      fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf-8');
    }

    return found;
  }

  /**
   * Calcula o resumo de estimativa híbrida de tempo de uma lista de tarefas
   */
  static calculateEstimate(featureName: string, tasks: TaskItem[], baseDate: Date = new Date()): EstimateSummary {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    let totalMinutes = 0;
    let completedMinutes = 0;
    let pendingMinutes = 0;

    const byTlcLayer: Record<TlcTestType, { count: number; minutes: number; completedCount: number }> = {
      CONTRACT: { count: 0, minutes: 0, completedCount: 0 },
      UNIT: { count: 0, minutes: 0, completedCount: 0 },
      INT: { count: 0, minutes: 0, completedCount: 0 },
      E2E: { count: 0, minutes: 0, completedCount: 0 },
      UI: { count: 0, minutes: 0, completedCount: 0 },
      SMOKE: { count: 0, minutes: 0, completedCount: 0 },
      GENERIC: { count: 0, minutes: 0, completedCount: 0 },
      NONE: { count: 0, minutes: 0, completedCount: 0 }
    };

    for (const t of tasks) {
      totalMinutes += t.estimatedMinutes;
      if (t.completed) {
        completedMinutes += t.estimatedMinutes;
        byTlcLayer[t.testType].completedCount++;
      } else {
        pendingMinutes += t.estimatedMinutes;
      }
      byTlcLayer[t.testType].count++;
      byTlcLayer[t.testType].minutes += t.estimatedMinutes;
    }

    const completionPercentage = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;
    const projectedFinishTime = new Date(baseDate.getTime() + pendingMinutes * 60 * 1000);

    return {
      featureName,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalMinutes,
      completedMinutes,
      pendingMinutes,
      completionPercentage,
      projectedFinishTime,
      byTlcLayer
    };
  }
}
