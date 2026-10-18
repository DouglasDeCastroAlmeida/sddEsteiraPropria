# Plano de Tarefas & TLC (Test-Led Coding): {{FEATURE_NAME}}
> **Estágio:** 03-TASKS | **Derivado de:** `01-prd.md` e `02-sdd.md` | **Data:** {{DATE}}

---

## 📋 Regras de Execução TLC para Agentes de IA e Desenvolvedores
1. **Rigor TLC (Test-First):** Toda funcionalidade DEVE ter o teste escrito e falhando (`Red`) antes da implementação mínima (`Green`).
2. **Pirâmide de Testes Completa:** Cobrir Contratos (Zod), Domínio (Unitário com cenários Gherkin do PRD), Integração (API/Banco) e E2E (Playwright / DevTools MCP).
3. **Estimativa Híbrida de Tempo:** Toda tarefa DEVE conter uma estimativa de duração no formato `(~XX min)` ou `(~Xh)`. A IA pondera a complexidade real da tarefa, utilizando a tabela de pesos base TLC como piso balizador (`[CONTRACT]`: ~10m, `[UNIT]`: ~20m, `[INT]`: ~35m, `[E2E]`: ~50m, `[SMOKE]`: ~15m, `[IMPL]`: ~20m).
4. **Execução Atômica:** Trabalhe em **UMA ÚNICA TAREFA POR VEZ**. Não passe para a próxima sem rodar o teste e comprovar que passou.
5. **Checkpoint Contínuo:** Ao concluir cada microtarefa, marque com `- [x]` no checklist e rode `sdd task complete {{FEATURE_SLUG}} <ID>`.

---

## 📌 Checklist de Tarefas TLC (Por Camadas)

### Camada 1: Contratos, Schemas & Tipagem Estrita (Fail-Fast)
- [ ] `T-001` [SETUP] Criar estrutura de arquivos e exportar interfaces/types definidos no SDD (`02-sdd.md`) (~10 min).
- [ ] `T-002` [TEST-CONTRACT] Escrever testes de validação de schemas Zod/Types para entrada e saída (~10 min). *(Red -> Green)*

### Camada 2: Regras de Negócio & Cenários BDD / Gherkin (Unitário)
- [ ] `T-003` [TEST-UNIT] Escrever testes unitários cobrindo o caso principal (Happy Path) derivado do PRD (~20 min). *(Red)*
- [ ] `T-004` [IMPL] Implementar a lógica de negócio do Service para fazer o teste `T-003` passar (~25 min). *(Green)*
- [ ] `T-005` [TEST-UNIT] Escrever testes unitários para casos extremos, timeouts e entradas inválidas mapeadas no Grill (~20 min). *(Red)*
- [ ] `T-006` [IMPL] Implementar tratamentos de erro, exceções e resiliência no Service para atender `T-005` (~20 min). *(Green)*

### Camada 3: Integração de API & Persistência (PostgreSQL / MongoDB)
- [ ] `T-007` [TEST-INT] Escrever testes de integração para endpoints HTTP (Supertest) e persistência no banco (~35 min). *(Red)*
- [ ] `T-008` [IMPL] Implementar Controller, rotas e Repository/DAO atendendo aos testes de integração (~30 min). *(Green)*

### Camada 4: Frontend, Componentes & E2E (Playwright / DevTools MCP)
- [ ] `T-009` [TEST-UI] Escrever testes de componentes React (Testing Library) validando estados e interações (~25 min).
- [ ] `T-010` [IMPL] Implementar componentes de UI (adotando MUI / AntD / Tailwind e ícones Lucide/Lordicon) (~35 min).
- [ ] `T-011` [TEST-E2E] Escrever cenário End-to-End no Playwright validando a jornada completa de negócio (~50 min).

### Camada 5: Qualidade, Smoke Test em Docker & Auditoria
- [ ] `T-012` [REFACTOR] Limpar código, otimizar tipagem estrita, rodar linter e formatador de código (~15 min).
- [ ] `T-013` [CHECK-SMOKE] Validar execução do container Docker da aplicação simulando ambiente Hostinger (~15 min).
- [ ] `T-014` [CHECK-COVERAGE] Rodar a suíte completa e verificar cobertura de código (meta mínima: ≥ 85%) (~10 min).

---

## 📊 Status da Execução TLC
- **Total de Tarefas:** 14
- **Tempo Total Estimado:** ~5h 20min (Calcule com `sdd estimate {{FEATURE_SLUG}}`)
- **Tarefas Concluídas:** 0
- **Progresso:** 0%
- **Status Atual:** Aguardando início da Camada 1
