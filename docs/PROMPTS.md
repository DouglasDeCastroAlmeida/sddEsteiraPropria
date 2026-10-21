# Modelos de prompt para usar a esteira

Textos prontos para copiar e adaptar no Claude Code. Os comandos são os do plugin `sdd`; veja o [README](../README.md) para o fluxo completo.

## Regras que valem para todos os modelos

- **Contexto vai em prompt separado do `/sdd:init`.** Digite `/sdd:init` sozinho e responda à entrevista depois. O texto que vem depois do comando é repassado ao CLI (`init $ARGUMENTS`), e texto livre ali pode confundir o comando.
- **`/sdd:new` aceita texto livre.** Quanto mais contexto de negócio, melhor o Grill. Não escreva a solução técnica, que é papel do design.
- **O Grill faz uma pergunta por vez.** Responda cada uma, ou diga "aceito as recomendações restantes".
- **Aprovação é só sua:** `/sdd:approve` ao fim de cada etapa.

## 1. Projeto novo

**Passo 1.** Numa pasta vazia, com `git init` feito:

```text
/sdd:init
```

**Passo 2.** Quando o agente começar a entrevista, envie este contexto (apague o que não souber):

```text
Contexto do projeto:
- O que é: <em uma frase>
- Para quem: <usuários e quem paga>
- Problema que resolve: <a dor, em linguagem de negócio>
- Stack: <a definir | preferência: React + Node + PostgreSQL | restrição do cliente: ...>
- Onde roda: <VPS Hostinger | cloud do cliente | ainda não definido>
- Restrições: <prazo, orçamento, LGPD, integrações obrigatórias, multi-cliente>
- Perfis: <aplique web-react / api-node / infra-hostinger se fizer sentido>
- Fora de escopo agora: <o que NÃO quero nesta fase>
```

**Passo 3.** Projeto novo costuma ser grande demais para uma mudança só. Antes de abrir mudanças, peça a divisão (é uma conversa, não um comando da esteira):

```text
Com base na constituição, proponha a divisão do projeto em mudanças pequenas e ordenadas,
começando pelo caminho mais fino que atravessa o sistema inteiro (esqueleto andante).
Para cada mudança: título, porte sugerido (S/M/L), valor entregue e dependências.
Não abra nenhuma mudança ainda; quero revisar a lista antes.
```

**Passo 4.** A primeira mudança, normalmente porte L:

```text
/sdd:new Esqueleto do sistema: <jornada mínima ponta a ponta, ex.: cadastrar cliente e listar clientes>,
incluindo estrutura do projeto, banco, autenticação básica e pipeline de testes.
Resultado esperado: <o que consigo fazer ao final>.
Fora de escopo: <o que fica para depois>.
```

## 2. Projeto em andamento

**Passo 1.** Abra o Claude Code na raiz do projeto:

```text
/sdd:init
```

**Passo 2.** Responda à entrevista (o agente explora o código antes de perguntar). Se a equipe ainda está se adaptando, peça:

```text
Configure o gate em modo warn para a adoção gradual.
Não aplique perfis que conflitem com o que o projeto já usa; o que existe prevalece.
Confirme os comandos de teste, lint e typecheck rodando cada um uma vez.
```

**Passo 3.** Comece com uma mudança pequena, para a equipe aprender o fluxo (porte S):

```text
/sdd:new <ajuste pequeno e bem delimitado, ex.: validar o CPF no cadastro de cliente>
```

**Passo 4.** Depois, as features normais com o modelo da seção 3. Quando a equipe estiver confortável, troque o gate para `strict` editando você mesmo o `.sdd/config.json` (o agente não pode alterar a seção `gate`).

## 3. Nova feature

```text
/sdd:new <título curto da feature>

Problema: <qual dor existe hoje e quem sente>
Resultado esperado: <o que o usuário consegue fazer depois>
Como medir sucesso: <número, prazo, comportamento observável>
Regras de negócio que já conheço: <regras, limites, permissões>
Integrações ou telas envolvidas: <sistemas externos, módulos, telas>
Não quero: <o que fica fora, mesmo que pareça relacionado>
Referências: <links, tickets, documentos, exemplos>
```

## 4. Correção de bug

```text
/sdd:new Corrigir: <o que está errado, em uma frase>

Como reproduzir: <passos exatos>
Resultado atual: <o que acontece>
Resultado esperado: <o que deveria acontecer>
Impacto: <quem é afetado e com que frequência>
Evidência: <mensagem de erro, log, print, ticket>
```

O agente deve propor porte S, e a primeira tarefa é um teste que reproduz o bug e falha, que fica como teste de regressão.

## 5. Retomar o trabalho (nova sessão ou outra máquina)

```text
/sdd:status
```

O agente mostra o estágio de cada mudança, o que falta para o gate e o próximo comando.

## 6. Quando o agente sair do trilho

| Situação | O que dizer |
| :-- | :-- |
| Pulou uma pergunta do Grill ou fez várias juntas | `Faça uma pergunta por vez e aguarde minha resposta.` |
| Escreveu mais do que foi pedido | `Isso está fora do escopo aprovado. Volte ao que está no PRD e nas tarefas.` |
| Começou a implementar antes da hora | `Pare. Estamos na etapa <etapa>. Siga o comando /sdd:<etapa>.` |
| Quer mudar algo já aprovado | `Quero ajustar o <PRD/design/tarefas>: <mudança>. Atualize o artefato e revalide antes de continuar.` |
