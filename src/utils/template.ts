import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateEngine {
  /**
   * Obtém o caminho do diretório de templates embutido
   */
  static getTemplatesDir(): string {
    // Pode estar em src/templates (dev) ou dist/templates (prod)
    const localSrcDir = path.resolve(__dirname, '../templates');
    if (fs.existsSync(localSrcDir)) {
      return localSrcDir;
    }
    const distDir = path.resolve(__dirname, '../../src/templates');
    if (fs.existsSync(distDir)) {
      return distDir;
    }
    return localSrcDir;
  }

  /**
   * Converte uma string kebab/slug para PascalCase
   */
  static toPascalCase(str: string): string {
    return str
      .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, (c) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Converte uma string para slug seguro
   */
  static toSlug(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Renderiza um template substituindo os marcadores
   */
  static render(templateContent: string, vars: Record<string, string>): string {
    let result = templateContent;
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Lê um template pelo nome e renderiza com variáveis
   */
  static renderTemplateFile(templateFileName: string, vars: Record<string, string>): string {
    const filePath = path.join(this.getTemplatesDir(), templateFileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template não encontrado: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.render(content, vars);
  }
}
