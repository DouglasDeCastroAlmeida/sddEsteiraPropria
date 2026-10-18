# 💬 Guia de Integração WhatsApp & Evolution API (SDD Remote Controller)

> **API:** Evolution API v2 (Baileys Engine) | **Porta do Webhook:** 8088 | **Instância:** `sdd-agent`

---

## 🛡️ Guardrail de Segurança Estrita

> [!IMPORTANT]
> O webhook foi projetado com um **filtro de segurança absoluto**:
> - O robô responde **EXCLUSIVAMENTE ao número mestre configurado em `WHATSAPP_MASTER_ADMIN`** no arquivo `.env`.
> - Qualquer mensagem recebida de qualquer outro número é **silenciosamente descartada** sem nenhuma resposta.

---

## 📁 Estrutura de Arquivos Criada

```
meu-projeto/
├── .env                              <- Configurações e tokens (NUNCA commitado)
├── scripts/
│   └── whatsapp_webhook.ts           <- Servidor HTTP receptor de webhooks
└── docs/
    └── whatsapp-integration-guide.md <- Este manual
```

---

## ⚙️ Configuração no Painel da Evolution API

1. Acesse o painel da Evolution API (ex: `http://localhost:8082` ou o endereço do seu container).
2. Na instância `sdd-agent`, vá na aba **Webhooks**.
3. Configure o campo **Webhook URL** apontando para o servidor:
   ```
   http://localhost:8088/api/webhook/sdd
   ```
4. Marque os eventos:
   - `MESSAGES_UPSERT` (Ativo)
5. Salve as alterações.

---

## 🎮 Comandos Remotos Disponíveis no WhatsApp

Envie mensagens para o número do robô a partir do seu WhatsApp cadastrado:

| Comando | Descrição |
| :--- | :--- |
| `/sdd status` | Exibe o estado da esteira, estágio atual e progresso das tarefas |
| `/sdd estimate` | Informa a estimativa de término (ETA) e tempo restante em horas |
| `/sdd run` | Dispara o `sdd_runner.sh start` na VPS Hostinger dentro de sessão `tmux` |
| `/sdd stop` | Interrompe com segurança a execução autônoma na VPS |
| `/sdd help` | Apresenta o menu de ajuda com todos os comandos |

---

## 🏃 Como Iniciar o Servidor Webhook na VPS

```bash
# Executar em background ou via PM2 / systemd:
npx tsx scripts/whatsapp_webhook.ts
```
