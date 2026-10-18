# 📚 Biblioteca de Prompts da Esteira SDD

Cole estes prompts no seu assistente de IA (Antigravity, Cursor, Claude Code, ChatGPT) para guiar cada estágio da esteira com máxima precisão.

---

## 🔥 0. Prompt para Estágio 00: Modo Grill & Refinamento Técnico (Matt Pocock)
```text
Atue como Arquiteto Socrático no "Modo Grill" da nossa esteira SDD para a funcionalidade: "[NOME DA FEATURE]".

Minha intenção inicial é:
[DESCREVA AQUI O QUE VOCÊ QUER CONSTRUIR]

Por favor, NÃO escreva código e NÃO gere o PRD ainda. Em vez disso, faça-me um "interrogatório técnico" com 3 a 5 perguntas duras e cirúrgicas para expor:
1. Trade-offs ocultos e alternativas mais simples.
2. Casos extremos e falhas catastróficas (timeouts, quedas de serviço, concorrência).
3. O que deve ser expressamente PROIBIDO nesta versão (limite de escopo rígido).
4. Como garantimos reversão/rollback imediato em produção se algo der errado.

Após minhas respostas, registre o sumário em .sdd/specs/[NOME DA FEATURE]/00-grill.md.
```

---

## 🎯 1. Prompt para Estágio 01: Criação e Refinamento de PRD
```text
Atue como Product Manager especialista. Estamos no estágio 01-PRD da nossa esteira de SDD para a funcionalidade: "[NOME DA FEATURE]".

Contexto e problema:
[DESCREVA EM 2 OU 3 FRASES A DOR OU NECESSIDADE]

Por favor, elabore o documento .sdd/specs/[NOME DA FEATURE]/01-prd.md preenchendo:
1. Contexto & Problema de Negócio claro e com personas.
2. Requisitos Funcionais detalhados com histórias de usuário e critérios de aceite no formato BDD (Dado, Quando, Então).
3. Requisitos Não-Funcionais mensuráveis (performance, segurança, observabilidade).
4. O que está expressamente FORA de escopo nesta iteração para blindar contra Scope Creep.
```

---

## 🏗️ 2. Prompt para Estágio 02: Arquitetura Técnica & SDD
```text
Atue como Arquiteto de Software Principal. O PRD da funcionalidade "[NOME DA FEATURE]" já está aprovado. Estamos no estágio 02-SDD.

Com base em .sdd/specs/[NOME DA FEATURE]/01-prd.md, elabore a especificação técnica completa em 02-sdd.md:
1. Diagrama de Sequência em Mermaid com o fluxo de ponta a ponta.
2. Diagrama de Fluxo ou Estados em Mermaid.
3. Tipagem estrita de contratos e modelos em TypeScript (interfaces, types de sucesso e erro tipado).
4. Tabela de contratos de API/Entrypoint.
5. Pelo menos 1 ADR (Architecture Decision Record) justificando as escolhas técnicas.
6. Mapeamento detalhado de casos extremos (edge cases) e resiliência a falhas.
```

---

## 📝 3. Prompt para Estágio 03: Decomposição de Tarefas TDD
```text
Atue como Tech Lead. O PRD e o SDD de "[NOME DA FEATURE]" foram aprovados. Estamos no estágio 03-TASKS.

Decomponha a implementação em .sdd/specs/[NOME DA FEATURE]/03-tasks.md em microtarefas atômicas seguindo a metodologia TDD rigorosa:
1. Cada tarefa deve ser pequena o suficiente para ser executada em um único passo.
2. Para cada funcionalidade ou regra de negócio, crie primeiro a tarefa [TEST] que deve falhar (Red), seguida da tarefa [IMPL] para fazê-la passar (Green).
3. Inclua tarefas de validação de tipagem estrita, lint e teste de integração final.
```

---

## 💻 4. Prompt para Estágio 04: Execução TDD Atômica
```text
Atue como Engenheiro de Software Sênior em modo de Execução TDD. Estamos no estágio 04-IMPL da feature "[NOME DA FEATURE]".

Consulte a lista de tarefas em .sdd/specs/[NOME DA FEATURE]/03-tasks.md e execute APENAS a próxima tarefa pendente:
1. Se for uma tarefa [TEST], crie o arquivo de teste automatizado e rode a suíte para comprovar que o teste falha (Red).
2. Se for uma tarefa [IMPL], implemente o código mínimo estritamente necessário para fazer o teste passar (Green).
3. Execute o comando de teste para comprovar o sucesso.
4. Rode: node bin/sdd.js task complete [NOME DA FEATURE] [ID DA TAREFA].
NÃO avance para a próxima tarefa sem minha validação e sem o teste passar.
```

---

## 🔍 5. Prompt para Estágio 05: Auditoria de Conformidade
```text
Atue como Auditor de Qualidade e Governança de Software. Concluímos todas as tarefas de "[NOME DA FEATURE]". Estamos no estágio 05-AUDIT.

Por favor, audite a implementação contra o PRD e o SDD preenchendo o relatório em .sdd/specs/[NOME DA FEATURE]/05-audit.md:
1. Verifique se todos os requisitos funcionais (RFs) do PRD foram implementados e testados.
2. Identifique se houve qualquer Scope Creep (código criado além da spec).
3. Confirme que todos os testes automatizados passaram e o linter não possui erros.
4. Emita o parecer final de aprovação para merge/liberação.
```
