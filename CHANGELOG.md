# Changelog

## 2.0.0 — 2026-10-21

Reescrita como plugin do Claude Code, para qualquer projeto (novo ou existente, interno ou de cliente).

### Adicionado
- Plugin do Claude Code (`.claude-plugin/`) com marketplace próprio: comandos `/sdd:*`, skill `sdd-flow`, subagentes e hooks.
- Porte da mudança (S/M/L) com fluxos de tamanhos diferentes: ajuste pequeno não passa por PRD nem design.
- Aprovação humana obrigatória entre etapas via `/sdd:approve`. Um hook impede o agente de se autoaprovar, de usar `--force` e de editar o estado da mudança.
- Gate de edição: código de produção só pode ser alterado com uma mudança em `implement` ou `verify` (modos `strict`, `warn`, `off`).
- Validação real dos artefatos: placeholders pendentes, seções vazias, IDs de requisitos e critérios, critérios verificáveis (Gherkin ou EARS), cobertura de cada critério por tarefa de teste, ordem teste-antes-de-implementação, dependências entre tarefas. Exit code ≠ 0 para uso em CI.
- Rastreabilidade automática critério → tarefa → arquivo de teste (`sdd trace`).
- Specs vivas em `.sdd/specs/` com deltas ADICIONADOS/MODIFICADOS/REMOVIDOS mesclados no arquivamento.
- Subagentes `sdd-implementer` (TDD), `sdd-reviewer` (revisão em duas etapas) e `sdd-auditor` (verificação final com evidências).
- `/sdd:init` gera a constituição a partir do código do projeto; templates copiados para `.sdd/templates/` e customizáveis por projeto.
- Motor sem dependências (`node .sdd/bin/sdd.mjs`), utilizável no terminal e no CI sem o plugin.
- Perfis de padrões opcionais (`sdd profile list|add`), aplicados à constituição:
  - `web-react`: MUI / Ant Design / Tailwind, Impeccable Style, Color Hunt / Adobe Color com contraste WCAG AA, ícones Lucide, Lordicon, Heroicons e React Icons, acessibilidade, Testing Library, Playwright e axe;
  - `api-node`: camadas, Zod nas bordas, timeout de 5 s, retry com jitter, circuit breaker, PostgreSQL/MongoDB, migrações reversíveis;
  - `infra-hostinger`: Docker multi-stage não-root, Caddy, GitHub Actions, rollback em 2 min, smoke test.
- Guia de testes (`templates/testing-guide.md`): pirâmide, TDD, qualidade de teste, testes instáveis, cobertura e economia de tokens. É cobrado pelo revisor e pelo auditor.
- Economia de tokens:
  - `sdd run <comando>` resume a saída de testes, lint e typecheck e guarda o log completo em `.sdd/runs/`;
  - `testFocused` no TDD;
  - revisão por fatia (`review.mode`);
  - revisor e auditor com `model: sonnet`.
- Comandos opcionais `coverage` (com `quality.coverageMin`) e `security` (auditoria de dependências) na verificação.
- O hook impede o agente de alterar a seção `gate` do `config.json`, o motor em `.sdd/bin/` e o estado do gate.
- Validado com `claude plugin validate --strict` e testado de ponta a ponta no Claude Code 2.1.304: init, gate bloqueando edição direta, autoaprovação negada, fluxo S completo e arquivamento.
- Correção de bug começa por teste de regressão; sugestão do `/security-review` nativo em mudanças sensíveis.

### Mantido da v1
- Grill antes dos requisitos, agora uma pergunta por turno, com resposta recomendada e descoberta no código. O gate bloqueia a aprovação enquanto houver pergunta sem resposta do usuário (`PENDENTE`) ou sem fonte no código; aceite em lote fica registrado como tal.
- Pirâmide TLC nas tags das tarefas e estimativa com TOTALIZADOR GERAL obrigatório.
- Arquivamento com histórico e CHANGELOG.

### Removido
- Runner autônomo 24/7: não chamava nenhum modelo e marcava tarefas como concluídas só porque a suíte já passava.
- Webhook de WhatsApp: confiava no remetente informado no corpo da requisição, sem autenticação, e repassava argumentos para o shell (execução remota de comandos).
- Geração de infraestrutura (Docker, Caddy, deploy Hostinger) e sincronização com GitHub Issues: fora do escopo de uma esteira SDD; podem voltar como plugin separado.
- Stack fixa na constituição: cada projeto agora tem a sua, descoberta ou entrevistada no `/sdd:init`. Os padrões da v1 voltaram como perfis opcionais.
- Integração com Antigravity/Gemini.

## 1.0.0 — 2026-10-18

Versão inicial: CLI `sdd` em TypeScript, skill para Antigravity, estágios Grill, PRD, SDD, Tasks, Impl e Audit, infraestrutura Hostinger e controle por WhatsApp.
