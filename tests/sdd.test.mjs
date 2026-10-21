import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as sdd from '../scripts/lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO, 'scripts', 'sdd.mjs');
const GATE = path.join(REPO, 'hooks', 'gate.mjs');
const SESSION = path.join(REPO, 'hooks', 'session-start.mjs');

let root;

function tmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-test-'));
  sdd.initProject(dir);
  return dir;
}

function write(rel, text) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function art(change, stage) {
  return path.join(change.dir, sdd.ARTIFACTS[stage]);
}

const GRILL = `# Grill
## Pedido original
Login com Google.
## Contexto levantado no código
Auth em src/auth.
## Perguntas e respostas
### P1. E se o Google cair?
- Recomendação do agente: mostrar erro amigável.
- Resposta: ok.
## Decisões
- **D-01** Só Google nesta versão.
## Fora de escopo
- Login com Facebook.
## Riscos e premissas
Nenhum relevante.
`;

const GRILL_S = `# Grill rápido
## Pedido original
Corrigir o rótulo do botão.
## Contexto levantado no código
src/Button.tsx
## Perguntas e respostas
### P1. O estilo do botão muda?
- Fonte: src/Button.tsx — o rótulo é a única prop alterada.
## Critérios de aceite
- **AC-001.1** Dado o formulário, quando abro a tela, então o botão mostra "Salvar".
## Decisões
- **D-01** Só o texto muda.
## Fora de escopo
- Estilo do botão.
`;

const PRD = `# PRD
## Problema
Usuários desistem no cadastro.
## Objetivos e métricas
Cadastro em menos de 1 minuto.
## Personas e cenários
Cliente novo.
## Requisitos funcionais
### REQ-001: Entrar com Google
Como cliente, quero entrar com Google.
- **AC-001.1** Dado um usuário sem conta, quando entra com Google, então a conta é criada.
- **AC-001.2** QUANDO o Google falhar o sistema DEVE mostrar uma mensagem de erro.
## Requisitos não funcionais
Resposta em menos de 2s.
## Fora de escopo
- Facebook.
## Dependências e riscos
API do Google.
`;

const TASKS = `# Tarefas
## Tarefas
- [ ] T-001 [TEST-UNIT] Teste AC-001.1 (~20 min) {AC-001.1}
- [ ] T-002 [IMPL] Criar conta via Google (~30 min) {AC-001.1} deps: T-001
- [ ] T-003 [P] [TEST-INT] Teste de falha do provedor (~35 min) {AC-001.2}
- [ ] T-004 [IMPL] Tratar falha (~1h) {AC-001.2} deps: T-003
## Estimativa
ok
`;

const VERIFY = `# Verificação
## Evidências
- npm test → 4 passed
## Rastreabilidade
tabela
## Revisão de código
ok
## Segurança
ok
## Desvios de escopo
Nenhum.
## Specs vivas
auth
## Parecer
APROVADO — tudo coberto.
`;

beforeEach(() => {
  root = tmpProject();
});

describe('init', () => {
  test('cria estrutura, motor e templates no projeto', () => {
    for (const p of ['config.json', 'constitution.md', 'specs', 'changes', 'archive', 'bin/sdd.mjs', 'bin/lib.mjs', 'templates/prd.md', '.gitignore']) {
      assert.ok(fs.existsSync(path.join(root, '.sdd', p)), p);
    }
    assert.equal(sdd.findProjectRoot(path.join(root, '.sdd', 'specs')), root);
  });

  test('não sobrescreve template customizado ao reinstalar o motor', () => {
    write('.sdd/templates/prd.md', 'meu template');
    sdd.installEngine(root);
    assert.equal(fs.readFileSync(path.join(root, '.sdd/templates/prd.md'), 'utf-8'), 'meu template');
  });
});

describe('mudanças', () => {
  test('numera em sequência e usa o grill rápido no porte S', () => {
    const a = sdd.createChange(root, { title: 'Login com Google', size: 'm' });
    const b = sdd.createChange(root, { title: 'Ajustar botão', size: 'S' });
    assert.equal(a.id, '001-login-com-google');
    assert.equal(b.id, '002-ajustar-botao');
    assert.match(fs.readFileSync(art(b, 'grill'), 'utf-8'), /Grill rápido/);
    assert.equal(sdd.resolveChange(root, '002').id, b.id);
    assert.equal(sdd.resolveChange(root, 'login-com-google').id, a.id);
  });

  test('template recém-criado não passa no gate', () => {
    const c = sdd.createChange(root, { title: 'X', size: 'M' });
    const errors = sdd.validateStage(root, c).filter((i) => i.level === 'error');
    assert.ok(errors.some((e) => /pendência/.test(e.message)));
    assert.ok(errors.some((e) => /D-01/.test(e.message)));
    assert.throws(() => sdd.approve(root, c, { by: 't' }), /bloqueado/);
  });
});

describe('fluxo completo porte M', () => {
  test('grill → prd → tasks → implement → verify → done → archive', () => {
    let c = sdd.createChange(root, { title: 'Login com Google', size: 'M' });
    fs.writeFileSync(art(c, 'grill'), GRILL);
    assert.deepEqual(sdd.approve(root, c, { by: 't' }).to, 'prd');

    c = sdd.resolveChange(root, c.id);
    fs.writeFileSync(art(c, 'prd'), PRD);
    assert.equal(sdd.approve(root, c, { by: 't' }).to, 'tasks');

    c = sdd.resolveChange(root, c.id);
    fs.writeFileSync(art(c, 'tasks'), TASKS);
    assert.equal(sdd.approve(root, c, { by: 't' }).to, 'implement');

    c = sdd.resolveChange(root, c.id);
    assert.throws(() => sdd.approve(root, c, { by: 't' }), /bloqueado/);
    fs.writeFileSync(art(c, 'tasks'), TASKS.replace(/- \[ \]/g, '- [x]'));
    assert.equal(sdd.approve(root, c, { by: 't' }).to, 'verify');

    c = sdd.resolveChange(root, c.id);
    fs.writeFileSync(art(c, 'verify'), VERIFY);
    // Sem testes citando os critérios, a verificação não passa.
    assert.throws(() => sdd.approve(root, c, { by: 't' }), /bloqueado/);
    write('tests/auth.test.ts', "it('AC-001.1: cria conta', () => {});\nit('AC-001.2: erro do Google', () => {});\n");
    write(`.sdd/changes/${c.id}/specs/auth.md`, '# Delta\n## ADICIONADOS\n### Requisito: Login com Google\nO sistema DEVE permitir login com Google.\n');
    const r = sdd.approve(root, c, { by: 't' });
    assert.equal(r.to, 'done');

    c = sdd.resolveChange(root, c.id);
    assert.equal(c.approvals.grill.by, 't');
    const out = sdd.archiveChange(root, c);
    assert.ok(fs.existsSync(out.dest));
    assert.match(fs.readFileSync(path.join(root, '.sdd/specs/auth.md'), 'utf-8'), /### Requisito: Login com Google/);
    assert.match(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf-8'), /Login com Google \(`001-login-com-google`\)/);
    assert.equal(sdd.listChanges(root).length, 0);
    assert.equal(sdd.nextChangeNumber(root), '002');
  });

  test('porte S pula PRD e usa critérios do grill', () => {
    const c = sdd.createChange(root, { title: 'Botão', size: 'S' });
    fs.writeFileSync(art(c, 'grill'), GRILL_S);
    assert.equal(sdd.approve(root, c, { by: 't' }).to, 'tasks');
  });

  test('--force avança com erros e registra no histórico', () => {
    const c = sdd.createChange(root, { title: 'X', size: 'S' });
    const r = sdd.approve(root, c, { by: 't', force: true });
    assert.equal(r.to, 'tasks');
    const meta = sdd.resolveChange(root, c.id);
    assert.equal(meta.approvals.grill.forced, true);
    assert.ok(meta.history.at(-1).forced.length > 0);
  });
});

describe('perguntas do Grill', () => {
  function grillWith(questions) {
    const c = sdd.createChange(root, { title: 'Q', size: 'M' });
    fs.writeFileSync(art(c, 'grill'), GRILL.replace(/### P1\.[\s\S]*?(?=## Decisões)/, questions + '\n'));
    return sdd.validateStage(root, c).filter((i) => i.level === 'error').map((i) => i.message).join('\n');
  }

  test('resposta PENDENTE, vazia ou "a confirmar" bloqueia o gate', () => {
    const msgs = grillWith('### P1. A\n- Recomendação do agente: x\n- Resposta: PENDENTE\n### P2. B\n- Resposta:\n### P3. C\n- **Resposta:** a confirmar\n### P4. D\n- Resposta: sim, só Google\n');
    assert.match(msgs, /3 pergunta\(s\) sem resposta do usuário: P1, P2, P3/);
  });

  test('pergunta sem nenhum bloco também bloqueia', () => {
    assert.match(grillWith('Nada a perguntar.'), /Nenhuma pergunta registrada/);
  });

  test('aceita resposta do usuário, aceite em lote e fonte no código', () => {
    const msgs = grillWith('### P1. A\n- Resposta: sim\n### P2. B\n- **Resposta:** aceita a recomendação (aceite em lote pelo usuário)\n### P3. C\n- Fonte: src/auth.ts — já usa OAuth\n');
    assert.doesNotMatch(msgs, /pergunta/);
  });

  test('exemplos do template não contam como perguntas', () => {
    assert.equal(sdd.parseGrillQuestions(fs.readFileSync(path.join(REPO, 'templates', 'grill.md'), 'utf-8')).length, 0);
  });
});

describe('validação de tarefas', () => {
  function tasksChange(tasksText) {
    let c = sdd.createChange(root, { title: 'T', size: 'M' });
    fs.writeFileSync(art(c, 'grill'), GRILL);
    sdd.approve(root, c, { by: 't' });
    c = sdd.resolveChange(root, c.id);
    fs.writeFileSync(art(c, 'prd'), PRD);
    sdd.approve(root, c, { by: 't' });
    c = sdd.resolveChange(root, c.id);
    fs.writeFileSync(art(c, 'tasks'), tasksText);
    return sdd.validateStage(root, c);
  }

  test('critério sem tarefa de teste, referência inexistente e falta de estimativa', () => {
    const issues = tasksChange('- [ ] T-001 [TEST-UNIT] Só um (~10 min) {AC-001.1}\n- [ ] T-002 [IMPL] x {AC-009.1}\n');
    const msgs = issues.map((i) => i.message).join('\n');
    assert.match(msgs, /AC-001\.2 não é coberto/);
    assert.match(msgs, /AC-009\.1, que não existe/);
    assert.match(msgs, /T-002 sem estimativa/);
  });

  test('IMPL antes do teste gera aviso', () => {
    const issues = tasksChange('- [ ] T-001 [IMPL] Antes (~10 min) {AC-001.1}\n- [ ] T-002 [TEST-UNIT] Depois (~10 min) {AC-001.1}\n- [ ] T-003 [TEST-INT] x (~10 min) {AC-001.2}\n');
    assert.ok(issues.some((i) => i.level === 'warning' && /Teste primeiro/.test(i.message)));
    assert.ok(!issues.some((i) => i.level === 'error'));
  });

  test('exemplos dentro de comentários do template são ignorados', () => {
    const tpl = fs.readFileSync(path.join(REPO, 'templates', 'tasks.md'), 'utf-8');
    assert.equal(sdd.parseTasks(tpl).length, 0);
    assert.equal(sdd.parseAcceptanceCriteria(fs.readFileSync(path.join(REPO, 'templates', 'prd.md'), 'utf-8')).length, 0);
  });
});

describe('parse e estimativa', () => {
  test('lê tipo, paralelismo, estimativa em h, refs e deps', () => {
    const [t] = sdd.parseTasks('- [x] `T-007` [P] [TEST-E2E] Fluxo (~1,5h) {AC-002.1, AC-002.3} deps: T-001, T-002');
    assert.deepEqual(
      { id: t.id, done: t.done, type: t.type, parallel: t.parallel, minutes: t.minutes, refs: t.refs, deps: t.deps, title: t.title },
      { id: 'T-007', done: true, type: 'TEST-E2E', parallel: true, minutes: 90, refs: ['AC-002.1', 'AC-002.3'], deps: ['T-001', 'T-002'], title: 'Fluxo' }
    );
  });

  test('descrição preserva chaves de código e remove só o bloco de referências', () => {
    const [t] = sdd.parseTasks("- [ ] T-002 [IMPL] Usar `toLocaleString('pt-BR', { style: 'currency' })` (~20 min) {AC-001.1, AC-001.2} deps: T-001");
    assert.equal(t.title, "Usar `toLocaleString('pt-BR', { style: 'currency' })`");
    assert.deepEqual(t.refs, ['AC-001.1', 'AC-001.2']);
  });

  test('estimativa usa piso do tipo e sempre fecha com TOTALIZADOR GERAL', () => {
    const c = sdd.createChange(root, { title: 'E', size: 'S' });
    fs.writeFileSync(art(c, 'tasks'), '- [x] T-001 [TEST-UNIT] a (~20 min)\n- [ ] T-002 [IMPL] b\n- [ ] T-003 [TEST-E2E] c (~1h)\n');
    const est = sdd.estimate(root, c);
    assert.deepEqual(est.totals, { tasks: 3, doneTasks: 1, minutes: 100, doneMinutes: 20, pendingMinutes: 80, percent: 20 });
    const md = sdd.estimateMarkdown(est);
    assert.match(md.split('\n').filter((l) => l.startsWith('|')).at(-1), /TOTALIZADOR GERAL.*1h 40min/);
    assert.match(md, /20min\*/);
  });

  test('formatDuration', () => {
    assert.equal(sdd.formatDuration(45), '45min');
    assert.equal(sdd.formatDuration(60), '1h');
    assert.equal(sdd.formatDuration(125), '2h 05min');
  });
});

describe('rastreabilidade', () => {
  test('encontra o ID do critério nos testes e ignora node_modules', () => {
    const c = sdd.createChange(root, { title: 'R', size: 'S' });
    fs.writeFileSync(art(c, 'grill'), GRILL_S);
    fs.writeFileSync(art(c, 'tasks'), '- [ ] T-001 [TEST-UI] x (~10 min) {AC-001.1}\n');
    write('node_modules/lib/x.test.js', 'AC-001.1');
    let m = sdd.traceability(root, c);
    assert.deepEqual(m.rows[0].tests, []);
    write('src/button.spec.tsx', "test('AC-001.1: rótulo', () => {})");
    write('src/other.spec.tsx', "test('AC-001.10: outro', () => {})");
    m = sdd.traceability(root, c);
    assert.deepEqual(m.rows[0].tests, ['src/button.spec.tsx']);
    assert.deepEqual(m.rows[0].tasks, ['T-001']);
  });

  test('globToRegExp', () => {
    assert.ok(sdd.matchesAny('docs/a/b.md', ['docs/**']));
    assert.ok(sdd.matchesAny('README.md', ['**/*.md']));
    assert.ok(sdd.matchesAny('src/a.test.ts', ['**/*.test.*']));
    assert.ok(!sdd.matchesAny('src/a.ts', ['**/*.test.*', 'docs/**']));
  });
});

describe('specs vivas', () => {
  test('mescla adicionados, modificados e removidos', () => {
    const living = '# auth\n\n## Requisitos\n\n### Requisito: Senha\nantigo\n\n### Requisito: Sessão\nexpira em 1h\n';
    const delta = '## ADICIONADOS\n### Requisito: Google\nnovo\n## MODIFICADOS\n### Requisito: Sessão\nexpira em 8h\n## REMOVIDOS\n### Requisito: Senha\n';
    const out = sdd.mergeSpec(living, delta, 'auth');
    assert.match(out, /expira em 8h/);
    assert.match(out, /### Requisito: Google/);
    assert.doesNotMatch(out, /Senha/);
    assert.match(out, /^# auth/);
  });

  test('conflitos de mescla não gravam nada', () => {
    assert.throws(() => sdd.mergeSpec('### Requisito: A\nx\n', '## ADICIONADOS\n### Requisito: A\ny\n', 'cap'), /já existe/);
    assert.throws(() => sdd.mergeSpec(null, '## MODIFICADOS\n### Requisito: B\ny\n', 'cap'), /não existe/);
  });
});

describe('gate de edição', () => {
  test('bloqueia produção sem mudança aprovada e libera .sdd, docs e markdown', () => {
    assert.equal(sdd.gateDecision({ root, filePath: path.join(root, 'src/a.ts'), env: {} }).allow, false);
    for (const f of ['.sdd/changes/x/00-grill.md', 'docs/guia.txt', 'README.md']) {
      assert.equal(sdd.gateDecision({ root, filePath: path.join(root, f), env: {} }).allow, true, f);
    }
  });

  test('libera produção com mudança em implement e respeita warn/off', () => {
    const c = sdd.createChange(root, { title: 'G', size: 'S' });
    assert.equal(sdd.gateDecision({ root, filePath: 'src/a.ts', env: { SDD_GATE: 'warn' } }).allow, true);
    assert.equal(sdd.gateDecision({ root, filePath: 'src/a.ts', env: { SDD_GATE: 'warn' } }).warn, true);
    assert.equal(sdd.gateDecision({ root, filePath: 'src/a.ts', env: { SDD_GATE: 'off' } }).allow, true);
    sdd.approve(root, c, { force: true });
    const c2 = sdd.resolveChange(root, c.id);
    sdd.approve(root, c2, { force: true });
    assert.equal(sdd.resolveChange(root, c.id).stage, 'implement');
    assert.equal(sdd.gateDecision({ root, filePath: 'src/a.ts', env: {} }).allow, true);
  });
});

describe('aprovação humana pelo transcript', () => {
  function transcript(entries) {
    const file = path.join(root, 'transcript.jsonl');
    fs.writeFileSync(file, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
    return file;
  }
  const user = (content, extra = {}) => ({ type: 'user', message: { role: 'user', content }, ...extra });
  const assistant = (text) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } });
  const toolResult = () => user([{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }]);

  test('aceita /sdd:approve no último turno humano, mesmo com tool results depois', () => {
    const f = transcript([
      user('faça o grill'), assistant('Para aprovar digite /sdd:approve'),
      user('<command-message>sdd:approve</command-message>\n<command-name>/sdd:approve</command-name>'),
      user('# /sdd:approve — Aprovação humana ...', { isMeta: true }),
      assistant('rodando'), toolResult(), assistant('mais')
    ]);
    assert.ok(sdd.approvalTurnIndex(f) >= 0);
  });

  test('recusa quando o pedido de aprovação veio do assistente ou de turno antigo', () => {
    assert.equal(sdd.approvalTurnIndex(transcript([user('/sdd:approve'), assistant('ok'), user('agora implemente'), assistant('x')])), -1);
    assert.equal(sdd.approvalTurnIndex(transcript([user('continue'), assistant('vou digitar /sdd:approve')])), -1);
    assert.equal(sdd.approvalTurnIndex(transcript([user('# /sdd:grill\n... digite `/sdd:approve`.')])), -1);
    assert.equal(sdd.approvalTurnIndex(path.join(root, 'nao-existe.jsonl')), -1);
  });

  test('cada /sdd:approve vale uma vez', () => {
    const f = transcript([user('/sdd:approve'), assistant('x')]);
    assert.deepEqual(sdd.consumeApproval(root, f), { ok: true });
    assert.deepEqual(sdd.consumeApproval(root, f), { ok: false, reason: 'used' });
  });

  test('registro do UserPromptSubmit libera uma aprovação na mesma sessão', () => {
    const none = path.join(root, 'nao-existe.jsonl');
    sdd.recordPrompt(root, { prompt: '/sdd:approve 001', sessionId: 's1' });
    assert.deepEqual(sdd.consumeApproval(root, none, 's2'), { ok: false, reason: 'missing' });
    assert.deepEqual(sdd.consumeApproval(root, none, 's1'), { ok: true });
    assert.deepEqual(sdd.consumeApproval(root, none, 's1'), { ok: false, reason: 'missing' });
    sdd.recordPrompt(root, { prompt: '/sdd:approve', sessionId: 's1' });
    sdd.recordPrompt(root, { prompt: 'na verdade, espere', sessionId: 's1' });
    assert.deepEqual(sdd.consumeApproval(root, none, 's1'), { ok: false, reason: 'missing' });
  });

  test('aprovar pelo registro também consome o turno do transcript', () => {
    const f = transcript([user('/sdd:approve'), assistant('x')]);
    sdd.recordPrompt(root, { prompt: '/sdd:approve', sessionId: 's1' });
    assert.deepEqual(sdd.consumeApproval(root, f, 's1'), { ok: true });
    assert.deepEqual(sdd.consumeApproval(root, f, 's1'), { ok: false, reason: 'used' });
  });
});

describe('perfis de padrões', () => {
  test('lista os três perfis com "quando usar"', () => {
    const names = sdd.listProfiles().map((p) => p.name);
    assert.deepEqual(names, ['api-node', 'infra-hostinger', 'web-react']);
    assert.ok(sdd.listProfiles().every((p) => p.when.length > 10));
  });

  test('aplica na constituição, registra no config e é idempotente', () => {
    sdd.addProfile(root, 'web-react');
    sdd.addProfile(root, 'web-react');
    sdd.addProfile(root, 'api-node');
    const text = fs.readFileSync(path.join(root, '.sdd/constitution.md'), 'utf-8');
    assert.equal(text.match(/## Perfis adotados/g).length, 1);
    assert.equal(text.match(/sdd:perfil web-react início/g).length, 1);
    assert.match(text, /### Perfil: Web React/);
    assert.match(text, /#### Ícones/);
    assert.match(text, /Lucide/);
    assert.match(text, /Lordicon/);
    assert.match(text, /Impeccable Style/);
    assert.match(text, /Circuit breaker/);
    assert.deepEqual(sdd.loadConfig(root).profiles, ['web-react', 'api-node']);
  });

  test('perfil inexistente dá erro claro', () => {
    assert.throws(() => sdd.addProfile(root, 'django'), /não existe.*api-node/);
  });

  test('perfis e guia de testes são copiados para o projeto', () => {
    for (const f of ['profiles/web-react.md', 'profiles/api-node.md', 'profiles/infra-hostinger.md', 'testing-guide.md']) {
      assert.ok(fs.existsSync(path.join(root, '.sdd/templates', f)), f);
    }
  });
});

describe('execução resumida (economia de tokens)', () => {
  function setCommands(commands) {
    const file = path.join(root, '.sdd/config.json');
    const config = JSON.parse(fs.readFileSync(file, 'utf-8'));
    config.commands = { ...config.commands, ...commands };
    fs.writeFileSync(file, JSON.stringify(config));
  }

  test('sucesso mostra só o final e guarda o log completo', () => {
    setCommands({ test: 'node -e "for (let i = 1; i <= 200; i++) console.log(\'linha \' + i)"' });
    const r = sdd.runCheck(root, 'test');
    assert.equal(r.ok, true);
    assert.equal(r.lines.length, 25);
    assert.equal(r.lines.at(-1), 'linha 200');
    assert.equal(r.omitted, 175);
    assert.equal(fs.readFileSync(path.join(root, r.log), 'utf-8').split('\n').filter((l) => l.startsWith('linha')).length, 200);
  });

  test('falha mostra as linhas de erro do meio da saída mais o final', () => {
    setCommands({ test: 'node -e "for (let i = 1; i <= 100; i++) console.log(i === 10 ? \'FAIL AC-001.1 expected 2\' : \'ok \' + i); process.exit(1)"' });
    const r = sdd.runCheck(root, 'test');
    assert.equal(r.ok, false);
    assert.equal(r.status, 1);
    assert.ok(r.lines.includes('FAIL AC-001.1 expected 2'));
    assert.ok(r.lines.length < 40);
  });

  test('testFocused troca {files} e protege nomes com espaço', () => {
    assert.equal(sdd.buildCommand('vitest run {files} --reporter=dot', ['a.test.ts', "b c's.test.ts"]), "vitest run a.test.ts 'b c'\\''s.test.ts' --reporter=dot");
    assert.equal(sdd.buildCommand('pytest -q', ['t.py']), 'pytest -q t.py');
    setCommands({ testFocused: 'node -e "console.log(process.argv.slice(1).join(\'|\'))" {files}' });
    assert.deepEqual(sdd.runCheck(root, 'testFocused', ['x.test.js', 'y z.test.js']).lines, ['x.test.js|y z.test.js']);
  });

  test('comando vazio ou desconhecido dá erro orientando a configurar', () => {
    assert.throws(() => sdd.runCheck(root, 'lint'), /commands\.lint está vazio/);
    assert.throws(() => sdd.runCheck(root, 'deploy'), /desconhecido/);
  });

  test('CLI run devolve o exit code do comando', () => {
    setCommands({ lint: 'node -e "process.exit(3)"' });
    const r = spawnSync('node', [CLI, 'run', 'lint'], { cwd: root, encoding: 'utf-8' });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /lint falhou \(exit 3\)/);
  });
});

describe('modo de revisão', () => {
  test('auto: final no porte S, por fatia em M/L; config sobrescreve', () => {
    const config = sdd.loadConfig(root);
    assert.equal(sdd.reviewMode({ size: 'S' }, config), 'final');
    assert.equal(sdd.reviewMode({ size: 'L' }, config), 'per-slice');
    assert.equal(sdd.reviewMode({ size: 'S' }, { ...config, review: { mode: 'per-task' } }), 'per-task');
  });
});

describe('hooks e CLI como processos', () => {
  function runGate(payload, env = {}) {
    return spawnSync('node', [GATE], { input: JSON.stringify({ cwd: root, ...payload }), encoding: 'utf-8', env: { ...process.env, SDD_GATE: '', ...env } });
  }
  function cli(args) {
    return spawnSync('node', [CLI, ...args], { cwd: root, encoding: 'utf-8' });
  }

  test('gate bloqueia Write em produção (exit 2) e libera em markdown', () => {
    const blocked = runGate({ tool_name: 'Write', tool_input: { file_path: path.join(root, 'src/x.ts') } });
    assert.equal(blocked.status, 2);
    assert.match(blocked.stderr, /nenhuma mudança está aprovada/);
    assert.equal(runGate({ tool_name: 'Edit', tool_input: { file_path: 'notas.md' } }).status, 0);
  });

  test('gate protege meta.json e approve sem /sdd:approve', () => {
    const c = sdd.createChange(root, { title: 'M', size: 'S' });
    assert.equal(runGate({ tool_name: 'Edit', tool_input: { file_path: path.join(c.dir, 'meta.json') } }).status, 2);
    const r = runGate({ tool_name: 'Bash', tool_input: { command: 'node .sdd/bin/sdd.mjs approve' }, transcript_path: path.join(root, 'x.jsonl') });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /decisão humana/);
    assert.equal(runGate({ tool_name: 'Bash', tool_input: { command: 'node .sdd/bin/sdd.mjs status' } }).status, 0);
  });

  test('hook de prompt + gate: /sdd:approve libera um approve e só um', () => {
    const prompt = (text) => spawnSync('node', [path.join(REPO, 'hooks', 'prompt.mjs')], { input: JSON.stringify({ cwd: root, session_id: 's9', prompt: text }), encoding: 'utf-8' });
    const approveCall = () => runGate({ tool_name: 'Bash', session_id: 's9', tool_input: { command: 'node .sdd/bin/sdd.mjs approve' } });
    assert.equal(prompt('/sdd:approve').status, 0);
    assert.equal(approveCall().status, 0);
    assert.equal(approveCall().status, 2);
    assert.equal(runGate({ tool_name: 'Bash', session_id: 's9', tool_input: { command: 'node .sdd/bin/sdd.mjs approve --force' } }).status, 2);
  });

  test('gate impede o agente de afrouxar a própria configuração do gate', () => {
    const cfg = path.join(root, '.sdd/config.json');
    const current = fs.readFileSync(cfg, 'utf-8');
    const toWarn = runGate({ tool_name: 'Edit', tool_input: { file_path: cfg, old_string: '"mode": "strict"', new_string: '"mode": "warn"' } });
    assert.equal(toWarn.status, 2);
    assert.match(toWarn.stderr, /decisão do usuário/);
    const allowAll = JSON.parse(current);
    allowAll.gate.allow.push('src/**');
    assert.equal(runGate({ tool_name: 'Write', tool_input: { file_path: cfg, content: JSON.stringify(allowAll) } }).status, 2);
    const commands = JSON.parse(current);
    commands.commands.test = 'npm test';
    assert.equal(runGate({ tool_name: 'Write', tool_input: { file_path: cfg, content: JSON.stringify(commands, null, 2) } }).status, 0);
    assert.equal(runGate({ tool_name: 'Write', tool_input: { file_path: cfg, content: '{ quebrado' } }).status, 2);
  });

  test('gate protege o motor e o estado do gate', () => {
    assert.equal(runGate({ tool_name: 'Edit', tool_input: { file_path: path.join(root, '.sdd/bin/lib.mjs') } }).status, 2);
    assert.equal(runGate({ tool_name: 'Write', tool_input: { file_path: path.join(root, '.sdd/.gate-state.json') } }).status, 2);
    assert.equal(runGate({ tool_name: 'Edit', tool_input: { file_path: path.join(root, '.sdd/constitution.md') } }).status, 0);
  });

  test('gate não interfere em projeto sem esteira', () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'sem-sdd-'));
    const r = spawnSync('node', [GATE], { input: JSON.stringify({ cwd: other, tool_name: 'Write', tool_input: { file_path: path.join(other, 'a.ts') } }), encoding: 'utf-8' });
    assert.equal(r.status, 0);
  });

  test('session-start resume a esteira', () => {
    sdd.createChange(root, { title: 'Ativa', size: 'M' });
    const r = spawnSync('node', [SESSION], { input: JSON.stringify({ cwd: root }), encoding: 'utf-8' });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /001-ativa \(porte M\) em grill/);
  });

  test('CLI devolve exit 1 quando o gate falha e 0 quando passa', () => {
    assert.equal(cli(['new', 'Primeira', 'mudança', '--size', 'S']).status, 0);
    const v = cli(['validate']);
    assert.equal(v.status, 1);
    assert.match(v.stdout, /erro/);
    fs.writeFileSync(path.join(root, '.sdd/changes/001-primeira-mudanca/00-grill.md'), GRILL_S);
    assert.equal(cli(['validate']).status, 0);
    assert.equal(cli(['approve', '--by', 'Douglas']).status, 0);
    assert.match(cli(['status']).stdout, /grill✓ → \[tasks\]/);
  });

  test('cópia do motor em .sdd/bin funciona sem o plugin', () => {
    const r = spawnSync('node', [path.join(root, '.sdd/bin/sdd.mjs'), 'new', 'Via cópia'], { cwd: root, encoding: 'utf-8' });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(root, '.sdd/changes/001-via-copia/00-grill.md')));
  });
});
