import pc from 'picocolors';

export const logger = {
  info: (msg: string) => console.log(pc.cyan('ℹ ') + pc.white(msg)),
  success: (msg: string) => console.log(pc.green('✔ ') + pc.bold(msg)),
  warn: (msg: string) => console.log(pc.yellow('⚠ ') + pc.yellow(msg)),
  error: (msg: string) => console.error(pc.red('✖ ') + pc.bold(pc.red(msg))),
  step: (step: string, desc: string) => {
    console.log(`\n${pc.bgBlue(pc.black(` [${step}] `))} ${pc.bold(pc.cyan(desc))}`);
  },

  banner: () => {
    console.log(pc.cyan(`
   ███████╗██████╗ ██████╗     ███████╗██╗      ██████╗ ██╗    ██╗
   ██╔════╝██╔══██╗██╔══██╗    ██╔════╝██║     ██╔═══██╗██║    ██║
   ███████╗██║  ██║██║  ██║    █████╗  ██║     ██║   ██║██║ █╗ ██║
   ╚════██║██║  ██║██║  ██║    ██╔══╝  ██║     ██║   ██║██║███╗██║
   ███████║██████╔╝██████╔╝    ██║     ███████╗╚██████╔╝╚███╔███╔╝
   ╚══════╝╚═════╝ ╚═════╝     ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ 
`));
    console.log(pc.gray('   ═════════════════════════════════════════════════════════════'));
    console.log(pc.bold(pc.green('   🚀 Esteira Profissional de Spec-Driven Development com IA')));
    console.log(pc.gray('   ═════════════════════════════════════════════════════════════\n'));
  },

  box: (title: string, lines: string[], colorFn = pc.cyan) => {
    const maxLen = Math.max(title.length + 4, ...lines.map((l) => l.replace(/\u001b\[[0-9;]*m/g, '').length), 50);
    const border = '─'.repeat(maxLen + 2);
    console.log(colorFn(`┌${border}┐`));
    console.log(colorFn(`│  ${pc.bold(title.padEnd(maxLen))}│`));
    console.log(colorFn(`├${border}┤`));
    for (const line of lines) {
      const cleanLen = line.replace(/\u001b\[[0-9;]*m/g, '').length;
      const padding = ' '.repeat(Math.max(0, maxLen - cleanLen));
      console.log(colorFn('│  ') + line + padding + colorFn('│'));
    }
    console.log(colorFn(`└${border}┘`));
  },

  progressBar: (completed: number, total: number, width = 25): string => {
    if (total === 0) return pc.gray('[ Nenhum item ]');
    const ratio = Math.min(1, Math.max(0, completed / total));
    const filled = Math.round(ratio * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const pct = Math.round(ratio * 100);
    
    let color = pc.red;
    if (pct >= 100) color = pc.green;
    else if (pct >= 50) color = pc.yellow;

    return `${color(`[${bar}]`)} ${pc.bold(`${pct}%`)} ${pc.gray(`(${completed}/${total})`)}`;
  }
};
