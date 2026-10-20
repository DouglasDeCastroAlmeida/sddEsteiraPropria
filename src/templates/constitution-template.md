# 📜 Constituição Técnica do Projeto: {{PROJECT_NAME}}
> **Documento Imutável de Arquitetura & Governança (Spec-Kit Pattern)**  
> **Versão:** 1.0.0 | **Atualizado em:** {{DATE}}

---

## 🏛️ 1. Princípios Fundamentais (Invioláveis)
1. **Spec-First & TDD:** Nenhuma linha de código de produção é escrita sem PRD, SDD e tarefas TDD previamente aprovadas.
2. **Tipagem Estrita:** 100% TypeScript com `strict: true`. Proibido o uso de `any` ou casts inseguros.
3. **Simplicidade Orientada ao Problema:** Preferir monólito modular a microsserviços desnecessários, salvo quando a separação de domínios for estritamente justificada no SDD.
4. **Isolamento de Infraestrutura:** Todo serviço deve rodar em container Docker multi-stage com usuário não-root.
5. **Totalizador Obrigatório em Estimativas TLC:** Sempre que o desenvolvedor ou o Agente de IA apresentar uma tabela de tarefas e estimativa de tempo (no chat, em 03-tasks.md, no WhatsApp ou em relatórios executivos), é **TERMINANTEMENTE OBRIGATÓRIO** incluir uma linha final com o **TOTALIZADOR GERAL** contendo o somatório exato do número de tarefas e o tempo total calculado (em horas e minutos), garantindo transparência imediata.

---

## 💻 2. Stack Tecnológica Padrão

| Camada | Tecnologia Homologada | Diretrizes e Bibliotecas Auxiliares |
| :--- | :--- | :--- |
| **Frontend** | **React (Vite / Next.js)** | TypeScript, Tailwind CSS, Estado previsível, Acessibilidade (a11y) |
| **Backend** | **Node.js (TypeScript)** | Arquitetura em camadas (Controller -> Service -> Repository), Fail-Fast |
| **Banco Relacional** | **PostgreSQL** | ORM: Prisma ou Drizzle; Migrations versionadas estritamente |
| **Banco Documentos** | **MongoDB** | ODM: Mongoose; Para dados semiestruturados, logs ou catálogos |
| **Infra & Deploy** | **Docker na Hostinger** | Docker Compose, Caddy / Nginx com SSL automático, Rollback em 2 min |

---

## 🎨 3. Ecossistema Homologado de Frontend & Design Engineering

Ao projetar interfaces, o desenvolvedor e o Agente de IA **DEVEM** consultar as seguintes fontes oficiais:

- **Componentes & Design Systems:**
  - [MUI (Material UI)](https://mui.com/material-ui/getting-started/mcp/) — com suporte a MCP para geração de componentes.
  - [Ant Design](https://ant.design/docs/react/introduce) — componentes corporativos e data-heavy.
- **Refinamento & Estilo:**
  - [Impeccable Style](https://impeccable.style/docs/) — acabamento visual, tipografia e microinterações.
- **Catálogos de Paletas de Cores:**
  - [Color Hunt](https://colorhunt.co/) & [Adobe Color](https://color.adobe.com/br/create/color-wheel) — harmonia cromática e contraste WCAG AA.
- **Bibliotecas de Ícones:**
  - [Lucide Icons](https://lucide.dev/icons/) (padrão preferencial)
  - [Lordicon](https://lordicon.com/) (ícones animados para momentos de deleite)
  - [Heroicons](https://heroicons.com/) e [React Icons](https://react-icons.github.io/react-icons/) (suporte amplo)

---

## 🧠 4. Matriz de Skills & MCPs do Antigravity por Estágio

O Agente de IA no Antigravity deve ativar as capacidades certas no momento certo da esteira:

```
[00-GRILL]  ➔ Sequential Thinking MCP + /spec + /plan
[01-PRD]    ➔ backend-architect + Firecrawl MCP (pesquisa de docs)
[02-SDD]    ➔ backend-architect + mui-mcp (MUI) + Diagramas Mermaid
[03-TASKS]  ➔ test-driven-development (TDD First)
[04-IMPL]   ➔ Frontend Design/Impeccable + Apple Design/UI Motion + Tailwind Specialist
[05-AUDIT]  ➔ vulnerability-scanner / security-hardening + GitHub MCP
```

---

## 🔒 5. Políticas de Segurança & Nuvem
- **Zero Secrets no Código:** Segredos são injetados exclusivamente via variáveis de ambiente (`.env`).
- **Sanitização nas Bordas:** Toda entrada externa é validada com schemas rígidos (ex: Zod) antes de atingir a lógica de negócio.
- **Resiliência:** Timeouts de 5s para serviços externos, Circuit Breaker e políticas de retry exponencial com jitter.
