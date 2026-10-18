# 🚀 Guia de Operação Autônoma 24/7 na Hostinger VPS (SDD Autonomous Runner)

> **Ambiente:** Ubuntu 24.04 LTS | **Orquestração:** tmux daemon | **Concorrência:** Lockfile

---

## 🧭 Visão Geral

O **SDD Autonomous Runner** permite que sua esteira de Spec-Driven Development execute o ciclo TDD (Red $\rightarrow$ Green $\rightarrow$ Refactor) de forma contínua e desacoplada diretamente na VPS Hostinger, liberando sua máquina local durante noites ou finais de semana.

---

## 📁 Estrutura de Arquivos Gerados

```
meu-projeto/
├── .env.example                     <- Modelo com todas as variáveis obrigatórias
├── .env                             <- Suas credenciais reais (NUNCA commitado)
├── scripts/
│   ├── sdd_runner.sh                <- Script executado no Ubuntu dentro do tmux
│   ├── sdd_runner.ps1               <- Script PowerShell para acionamento local via SSH
│   └── sdd_remote_runner.py         <- Motor autônomo com Gemini Flash e TDD loop
└── docs/
    └── vps-autonomous-guide.md      <- Este manual de operação
```

---

## 🛠️ Como Operar a Partir da sua Máquina Local (Windows)

Você pode controlar o runner na VPS sem precisar abrir o terminal SSH manualmente:

```powershell
# 1. Iniciar a execução autônoma na VPS
.\scripts\sdd_runner.ps1 -Action start

# 2. Consultar o status e o PID ativo
.\scripts\sdd_runner.ps1 -Action status

# 3. Conectar-se ao terminal visual interativo da sessão tmux
.\scripts\sdd_runner.ps1 -Action attach
# (Para desconectar sem parar o processo: pressione Ctrl+B e depois D)

# 4. Pausar a execução
.\scripts\sdd_runner.ps1 -Action stop
```

---

## 🛡️ Segurança e Guardrails
1. **Lockfile de Concorrência (`.sdd_runner.lock`):** Impede que duas instâncias do runner rodem ao mesmo tempo sobre a mesma especificação.
2. **Notificações Exclusivas no WhatsApp:** O runner só envia mensagens e obedece comandos vindos do número mestre configurado em `WHATSAPP_MASTER_ADMIN` no `.env`. Qualquer outro número é descartado.
3. **Loop TDD com Auto-correção:** Se os testes falharem, o runner tenta auto-corrigir em até 3 tentativas. Se persistir, o processo pausa com segurança e alerta no WhatsApp.
