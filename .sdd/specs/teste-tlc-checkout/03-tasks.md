# Plano de Tarefas & TLC (Test-Led Coding): teste-tlc-checkout
> **Estágio:** 03-TASKS | **Derivado de:** `01-prd.md` e `02-sdd.md` | **Data:** 2026-10-18

---

## 📋 Regras de Execução TLC para Agentes de IA e Desenvolvedores
1. **Rigor TLC (Test-First):** Toda funcionalidade DEVE ter o teste escrito e falhando (`Red`) antes da implementação mínima (`Green`).
2. **Pirâmide de Testes Completa:** Cobrir Contratos (Zod), Domínio (Unitário com cenários Gherkin do PRD), Integração (API/Banco) e E2E (Playwright / DevTools MCP).
3. **Execução Atômica:** Trabalhe em **UMA ÚNICA TAREFA POR VEZ**. Não passe para a próxima sem rodar o teste e comprovar que passou.
4. **Checkpoint Contínuo:** Ao concluir cada microtarefa, marque com `- [x]` no checklist e rode `sdd task complete teste-tlc-checkout <ID>`.

---

## 📌 Checklist de Tarefas TLC (Por Camadas)

### Camada 1: Contratos, Schemas & Tipagem Estrita (Fail-Fast)
- [ ] `T-001` [SETUP] Criar estrutura de arquivos e exportar interfaces/types definidos no SDD (`02-sdd.md`).
- [ ] `T-002` [TEST-CONTRACT] Escrever testes de validação de schemas Zod/Types para entrada e saída. *(Red -> Green)*

### Camada 2: Regras de Negócio & Cenários BDD / Gherkin (Unitário)
- [ ] `T-003` [TEST-UNIT] Escrever testes unitários cobrindo o caso principal (Happy Path) derivado do PRD. *(Red)*
- [ ] `T-004` [IMPL] Implementar a lógica de negócio do Service para fazer o teste `T-003` passar. *(Green)*
- [ ] `T-005` [TEST-UNIT] Escrever testes unitários para casos extremos, timeouts e entradas inválidas mapeadas no Grill. *(Red)*
- [ ] `T-006` [IMPL] Implementar tratamentos de erro, exceções e resiliência no Service para atender `T-005`. *(Green)*

### Camada 3: Integração de API & Persistência (PostgreSQL / MongoDB)
- [ ] `T-007` [TEST-INT] Escrever testes de integração para endpoints HTTP (Supertest) e persistência no banco. *(Red)*
- [ ] `T-008` [IMPL] Implementar Controller, rotas e Repository/DAO atendendo aos testes de integração. *(Green)*

### Camada 4: Frontend, Componentes & E2E (Playwright / DevTools MCP)
- [ ] `T-009` [TEST-UI] Escrever testes de componentes React (Testing Library) validando estados e interações.
- [ ] `T-010` [IMPL] Implementar componentes de UI (adotando MUI / AntD / Tailwind e ícones Lucide/Lordicon).
- [ ] `T-011` [TEST-E2E] Escrever cenário End-to-End no Playwright validando a jornada completa de negócio.

### Camada 5: Qualidade, Smoke Test em Docker & Auditoria
- [ ] `T-012` [REFACTOR] Limpar código, otimizar tipagem estrita, rodar linter e formatador de código.
- [ ] `T-013` [CHECK-SMOKE] Validar execução do container Docker da aplicação simulando ambiente Hostinger.
- [ ] `T-014` [CHECK-COVERAGE] Rodar a suíte completa e verificar cobertura de código (meta mínima: ≥ 85%).

---

## 📊 Status da Execução TLC
- **Total de Tarefas:** 14
- **Tarefas Concluídas:** 0
- **Progresso:** 0%
- **Status Atual:** Aguardando início da Camada 1
