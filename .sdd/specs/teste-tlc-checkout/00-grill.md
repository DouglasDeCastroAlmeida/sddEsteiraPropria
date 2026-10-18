# Grill Técnico & Refinamento Socrático: teste-tlc-checkout
> **Estágio:** 00-GRILL (Pré-PRD) | **Referência:** Matt Pocock Workflow | **Data:** 2026-10-18

---

## 🎯 Objetivo do Grill
Antes de redigir o PRD ou desenhar contratos técnicos, o Agente de IA atua como um Arquiteto Socrático, desafiando o pedido, expondo premissas ocultas, identificando falhas catastróficas e forçando decisões claras sobre o que **NÃO** fazer.

---

## 🔥 1. Desafio da Necessidade & Valor Real
- **Por que construir isso agora? O que acontece se NÃO fizermos nada?**
  <!-- Resposta do Grill: Justificativa real de negócio/técnica -->
- **Quem é o cliente/consumidor real dessa funcionalidade?**
  <!-- Ex: Usuário mobile final, microsserviço de billing, script batch interno -->
- **Qual é o critério de sucesso mensurável mais simples possível?**
  <!-- Ex: Latência < 150ms ou redução de 30% em chamadas manuais -->

---

## 💣 2. Casos Extremos & Falhas Catastróficas (Chaos Questions)
- **O que acontece se o serviço/banco dependente estiver indisponível ou lento (timeout)?**
  <!-- Decisão: Falhar com erro amigável, enfileirar para retry ou retornar cache degradado? -->
- **O que acontece se recebermos entradas duplicadas, concorrentes ou maliciosas?**
  <!-- Decisão: Idempotency Key, transação no banco, validação de rate-limit -->
- **Qual é o pior cenário possível de corrupção de dados ou quebra de segurança?**
  <!-- Decisão: Como prevenimos que isso aconteça por design? -->

---

## 🚫 3. Fronteiras Invioláveis de Escopo (O que NUNCA fazer)
- [ ] **Não fazer:** 
- [ ] **Não fazer:** 
- [ ] **Não fazer:** 

---

## 🛠️ 4. Decisões de Stack & Design (Alinhamento com constitution.md)
- **Frontend & Design System:**
  - Qual biblioteca será adotada? `[ ] MUI (Material UI)  [ ] Ant Design  [ ] Tailwind / Impeccable`
  - Quais fontes de ícones e cores? (Ex: Lucide, Lordicon, paleta Color Hunt)
- **Persistência de Dados:**
  - Qual banco atende melhor esta demanda? `[ ] PostgreSQL (Relacional/ACID)  [ ] MongoDB (Documentos/Flexível)`
  - Justificativa técnica:
- **Implantação na Hostinger:**
  - Modelo de container: `[ ] Parte do Monólito Modular  [ ] Microsserviço Isolado via Docker Compose`

---

## 🔐 5. Segurança, Permissões & Auditoria
- **Quem pode executar essa ação? Quais permissões/roles são obrigatórias?**
  <!-- Ex: Apenas admins, qualquer usuário autenticado com JWT, chamada interna mTLS -->
- **Existem dados sensíveis (PII, tokens, senhas, cartões) trafegando?**
  <!-- Decisão: Mascaramento em logs, criptografia em trânsito e repouso -->

---

## 🔄 5. Estratégia de Rollback & Falha em Produção
- **Se essa funcionalidade quebrar em produção, como revertemos em menos de 2 minutos?**
  <!-- Decisão: Feature flag, backward-compatible migration, rollback do container -->

---

## 💡 6. Conclusões do Grill (Inputs Diretos para o PRD)
- **Decisão 1:** 
- **Decisão 2:** 
- **Decisão 3:** 

> 🔒 **Portão de Saída do Grill:** Uma vez respondidas as perguntas acima, a spec está blindada para a redação do `01-prd.md` sem risco de refatorações tardias ou alucinações.
