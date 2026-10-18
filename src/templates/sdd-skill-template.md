---
name: sdd-flow
description: >-
  Esteira profissional de Spec-Driven Development (SDD) com TLC (Test-Led Coding),
  modo Grill socrático (Matt Pocock), Constituição Viva, estimativa híbrida de tempo,
  automação total no GitHub (Issues e PR), execução autônoma 24/7 na Hostinger VPS (tmux)
  e controle remoto via WhatsApp (Evolution API com guardrail estrito).
  Ative sempre que o usuário pedir para criar ou evoluir projetos com SDD, especificar requisitos (PRD),
  arquitetar soluções (SDD), decompor tarefas TDD, estimar prazos ou configurar infraestrutura e deploy.
---

# 🚀 Skill Oficial: Esteira SDD (Spec-Driven Development Flow)

Esta skill orienta o agente de IA a operar rigorosamente segundo a **Esteira de Spec-Driven Development (SDD)**, eliminando alucinações de código, garantindo a pirâmide de testes TLC e integrando o ecossistema Antigravity, GitHub, Hostinger VPS e WhatsApp.

---

## 🛑 1. Regra de Ouro Inviolável
- **NUNCA** escreva código de produção sem antes validar a existência e a aprovação de:
  1. `constitution.md` (Constituição Técnica e Stack Oficial do Projeto)
  2. `00-grill.md` (Refinamento socrático de premissas e casos extremos)
  3. `01-prd.md` (Requisitos de Negócio e Critérios de Aceite BDD/Gherkin)
  4. `02-sdd.md` (Design Técnico, Modelos, Contratos Zod e ADRs)
  5. `03-tasks.md` (Lista de tarefas atômicas com estimativas TLC)
- Se o usuário pedir para codificar diretamente:
  > *"Seguindo nossa esteira de SDD, vamos primeiro ativar o Modo Grill para blindar premissas e depois estruturar o PRD e o SDD antes de codificar."*

---

## 🔄 2. Funil dos 5 Estágios Sequenciais

```
[00-GRILL] ➔ [01-PRD] ➔ [02-SDD] ➔ [03-TASKS] ➔ [04-IMPL (TLC)] ➔ [05-AUDIT] ➔ [ARCHIVE]
```

### Estágio 00: Grill & Refinamento Socrático (Estilo Matt Pocock)
- **Comando:** `sdd grill <feature>`
- **Arquivo:** `.sdd/specs/<feature>/00-grill.md`
- **Atuação:** Atue como Arquiteto Socrático desafiando suposições em 5 eixos:
  1. *Falhas Catastróficas & Timeouts:* O que acontece se serviços externos caírem?
  2. *Concorrência & Idempotência:* O que ocorre em cliques duplos ou requests paralelas?
  3. *Limites Rígidos de Escopo:* O que está explicitamente PROIBIDO nesta versão?
  4. *Segurança & Permissões:* Quem tem autorização para disparar a ação?
  5. *Estratégia de Rollback:* Como reverter a entrega em menos de 2 minutos?

### Estágio 01: PRD (Product Requirements Document)
- **Comando:** `sdd new <feature>`
- **Arquivo:** `.sdd/specs/<feature>/01-prd.md`
- **Conteúdo:** Problema, Personas, Histórias de Usuário, Requisitos Funcionais (RFs com BDD/Gherkin), Requisitos Não-Funcionais (RNFs) e Fronteiras de Escopo.
- **Validação:** `sdd next <feature>` (valida preenchimento sem TODOs).

### Estágio 02: SDD (Software Design Document)
- **Comando:** `sdd next <feature>`
- **Arquivo:** `.sdd/specs/<feature>/02-sdd.md`
- **Conteúdo:** Diagramas Mermaid (Sequência e Estados), modelos de dados, contratos TypeScript/Zod nas bordas, tratamento de falhas e ADRs.

### Estágio 03: Tasks & Estimativa Híbrida TLC
- **Arquivo:** `.sdd/specs/<feature>/03-tasks.md`
- **Comando:** `sdd estimate <feature>`
- **Formato:** Cada tarefa deve ter sua anotação estimada `(~XX min)` ou `(~Xh)` com piso determinístico:
  - `[TEST-CONTRACT]`: ~10 min
  - `[TEST-UNIT]`: ~20 min
  - `[TEST-INT]`: ~35 min
  - `[TEST-UI]` / `[TEST-E2E]`: ~30-50 min
  - `[CHECK-SMOKE]`: ~15 min
  - `[IMPL]`: ~20 min

### Estágio 04: Implementação & Rigor TLC (Test-Led Coding)
- **Comandos:** `sdd task list <feature>` e `sdd task complete <feature> <id>`
- **Regra:** Trabalhe em **UMA ÚNICA TAREFA POR VEZ**. Se for `[TEST]`, escreva o teste automatizado e comprove a falha (`Red`) antes de escrever o código mínimo de produção (`Green`).
- **Autonomia 24/7:** Pode ser executado localmente ou de forma contínua na Hostinger VPS via `scripts/sdd_runner.sh` (sessão `tmux` com trava de concorrência `.sdd_runner.lock`).

### Estágio 05: Auditoria & Arquivamento (Open Spec)
- **Comando:** `sdd next <feature>` e `sdd archive <feature>`
- **Ações:** Gera o relatório de auditoria `05-audit.md`, valida a matriz de rastreabilidade (Gherkin vs Testes), move as especificações para `.sdd/archive/YYYY-MM-DD-<feature>/` e atualiza automaticamente o `CHANGELOG.md`.

---

## 🚢 3. Automação de Infraestrutura & Deploy (`sdd infra`)

- **`sdd infra docker`**: Gera `Dockerfile` multi-stage (usuário não-root `nodejs`), `docker-compose.yml` orquestrado com PostgreSQL ou MongoDB, `Caddyfile` com HTTPS/TLS automático Let's Encrypt e `.env.example`.
- **`sdd infra hostinger`**: Gera pipeline de CI/CD no GitHub Actions (`.github/workflows/deploy.yml`) para deploy contínuo via SSH na VPS Hostinger e script idempotente `scripts/deploy-hostinger.sh`.
- **`sdd infra github <feature>`**: Sincroniza cada tarefa como **GitHub Issue** com labels TLC (`sdd-task`, `tlc-contract`, `tlc-unit`, etc.), salva `github-sync.json` e gera o rascunho de Pull Request (`PULL_REQUEST.md`) com `Closes #XX`.
- **`sdd infra vps`**: Gera o kit de execução autônoma 24/7 na Hostinger VPS (`scripts/sdd_runner.sh`, `scripts/sdd_runner.ps1` e `scripts/sdd_remote_runner.py`).
- **`sdd infra whatsapp`**: Gera o servidor de webhook na porta 8088 conectado à Evolution API v2 (`bot_imobiliario_evolution`), com **guardrail estrito de segurança** (responde exclusivamente a `WHATSAPP_MASTER_ADMIN`).

---

## 🧠 4. Superpowers, Skills e MCPs Recomendados no Antigravity

| Fase da Esteira | MCPs & Ferramentas Externas | Skills & Superpowers Antigravity |
| :--- | :--- | :--- |
| **00-GRILL & 01-PRD** | `sequential-thinking` (avaliação profunda de trade-offs) | `/spec`, `/plan` |
| **02-SDD** | `mui-mcp` (Material UI), Impeccable Style, Mermaid | `backend-architect` |
| **03-TASKS** | `sdd estimate` | `test-driven-development` |
| **04-IMPL (Frontend)** | `Color Hunt`, `Adobe Color`, `Lucide`, `Lordicon` | `Frontend Design / Impeccable`, `Apple Design / UI Motion` |
| **04-IMPL (Backend)** | Node.js + PostgreSQL / MongoDB | `backend-architect` |
| **04-IMPL (Testes/A11y)** | `chrome-devtools-mcp` (auditoria no navegador) | `a11y-debugging` |
| **05-AUDIT & Deploy** | GitHub Actions, Caddy SSL, Hostinger SSH | `agent-containerizer`, `vulnerability-scanner` |

---

## 🔐 5. Segurança & Variáveis de Ambiente
- Todas as credenciais, tokens do GitHub, IPs de VPS e números de telefone devem ser configurados no arquivo `.env` (baseado no `.env.example`).
- **NUNCA** exiba ou versione segredos no código de produção ou no repositório Git.
