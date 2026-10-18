# Regras de Operação da Esteira SDD para Agentes de IA

Este repositório adota **Spec-Driven Development (SDD)** com controle rigoroso de qualidade. Como Agente de IA, você **DEVE** seguir estas diretrizes sem qualquer exceção:

---

## 🛑 1. Regra de Ouro: Proibido Escrever Código sem Especificação
- **NUNCA** gere código de produção sem antes validar a existência e a aprovação de:
  1. `constitution.md` (Constituição Técnica e Stack Oficial do Projeto)
  2. `00-grill.md` (Refinamento socrático de premissas e casos extremos)
  3. `01-prd.md` (Requisitos de Negócio e Critérios de Aceite)
  4. `02-sdd.md` (Design Técnico, Modelos, Contratos e ADRs)
  5. `03-tasks.md` (Lista de tarefas atômicas e TDD)
- Se o usuário pedir para implementar uma feature diretamente, **recuse educadamente a implementação imediata** e inicie o fluxo da esteira:
  > *"Seguindo nossa esteira de SDD, vamos primeiro ativar o Modo Grill para blindar premissas e depois estruturar o PRD e o SDD antes de codificar."*

---

## 🔥 2. Protocolo Grill & Refinamento Socrático (Estilo Matt Pocock)
Antes de redigir o PRD definitivo ou desenhar contratos técnicos:
- **Atue como Arquiteto Socrático:** Desafie ativamente o pedido do usuário para extrair requisitos ocultos, ambiguidades e decisões de trade-off.
- **Faça de 3 a 5 perguntas desafiadoras focando em:**
  1. **Falhas Catastróficas & Timeouts:** O que acontece se o serviço externo, banco ou rede cair?
  2. **Concorrência & Idempotência:** O que ocorre com cliques duplos ou requisições concorrentes?
  3. **Limites Rígidos de Escopo:** O que está explicitamente PROIBIDO de ser feito nesta versão?
  4. **Segurança & Permissões:** Quem tem autorização para disparar a ação?
  5. **Estratégia de Rollback:** Como revertemos em menos de 2 minutos se quebrar em produção?
- Registre o resultado no arquivo `.sdd/specs/<feature>/00-grill.md`.

---

## 🔄 3. Ciclo de Estágios da Esteira
A esteira possui estágios sequenciais rigorosos:

```
[00-GRILL] ➔ [01-PRD] ➔ [02-SDD] ➔ [03-TASKS] ➔ [04-IMPL (TDD)] ➔ [05-AUDIT]
```

1. **Estágio 00 (Grill):** Desafio socrático e blindagem contra suposições falsas em `00-grill.md`.
2. **Estágio 01 (PRD):** Alinhe o problema, requisitos funcionais (RFs) com histórias de usuário, requisitos não-funcionais (RNFs) e o que está expressamente FORA de escopo.
3. **Estágio 02 (SDD):** Elabore a arquitetura, diagramas Mermaid, modelos de dados, contratos de API e ADRs.
4. **Estágio 03 (Tasks):** Quebre a entrega em microtarefas atômicas organizadas sob a ótica de TDD.
5. **Estágio 04 (Implementação & Rigor TLC):**
   - **TLC (Test-Led Coding):** Cada funcionalidade é guiada por testes em camadas:
     1. `[TEST-CONTRACT]`: Validação de schemas Zod/Types de entrada e saída (Fail-Fast).
     2. `[TEST-UNIT]`: Regras de negócio derivadas diretamente dos cenários BDD/Gherkin do PRD (`Red` -> `Green`).
     3. `[TEST-INT]`: Integração com API (Supertest) e persistência (PostgreSQL / MongoDB).
     4. `[TEST-E2E] / [TEST-UI]`: Validação de ponta a ponta no navegador via Playwright e inspeção de erros/a11y via Chrome DevTools MCP.
     5. `[CHECK-SMOKE]`: Teste de sanidade do container Docker simulando ambiente Hostinger.
   - **Execução Atômica:** Trabalhe em **UMA ÚNICA TAREFA POR VEZ**. Após concluir e validar, marque `- [x]` no arquivo `03-tasks.md`.
6. **Estágio 05 (Auditoria):** Gere o relatório de auditoria `05-audit.md`, valide a matriz de rastreabilidade (confrontando Gherkin com testes) e garanta que não houve desvio de escopo (*Scope Creep*).

---

## 🧠 4. Ativação de Superpowers, Skills e MCPs do Antigravity
Como agente atuando no Antigravity, acione as ferramentas certas em cada fase:

| Estágio | Skills & Superpowers Antigravity | MCPs & Recursos Externos |
| :--- | :--- | :--- |
| **00-GRILL & 01-PRD** | Slash commands `/spec`, `/plan` | `Sequential Thinking`, `Firecrawl MCP` (para scraping de referências) |
| **02-SDD** | `backend-architect` | `mui-mcp` (Material UI), Docs Ant Design, Impeccable Style, Mermaid |
| **03-TASKS** | `test-driven-development` (TDD First) | Rastreabilidade de contratos |
| **04-IMPL (Frontend)** | `Frontend Design / Impeccable`, `Apple Design / UI Motion`, `Tailwind Specialist` | [Color Hunt](https://colorhunt.co/), [Adobe Color](https://color.adobe.com/), [Lucide](https://lucide.dev/), [Lordicon](https://lordicon.com/) |
| **04-IMPL (Backend)** | `backend-architect` | Node.js + PostgreSQL (Prisma/Drizzle) ou MongoDB (Mongoose) |
| **05-AUDIT & DevOps** | `vulnerability-scanner / security-hardening`, `agent-containerizer` | Dockerfile multi-stage, Docker Compose na Hostinger, `GitHub MCP` |

---

## 🛡️ 5. Prevenção de Desvios (Scope Creep)
- Não invente funcionalidades extras, bibliotecas desnecessárias ou arquiteturas superdimensionadas que não estejam no SDD ou na `constitution.md`.
- Se durante a codificação você identificar a necessidade de um novo método público, endpoint ou refatoração profunda, **pause a codificação**, atualize o documento de SDD e só então prossiga.

---

## 🧪 6. Critérios de Qualidade de Código
- **Tipagem Estrita:** Proibido uso de `any`, `unknown` sem narrowing ou casts inseguros.
- **Cobertura de Testes:** Todo código de negócio deve possuir testes unitários associados cobrindo caso feliz e casos de falha.
- **Fail-Fast & Validação de Entrada:** Valide dados nas bordas antes de invocar a lógica de negócio.
- **Comentários & Documentação:** Preserve comentários e gere documentação em Português do Brasil.
