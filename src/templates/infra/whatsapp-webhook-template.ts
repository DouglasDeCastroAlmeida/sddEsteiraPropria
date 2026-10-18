/**
 * ==============================================================================
 * 💬 SDD WHATSAPP WEBHOOK CONTROLLER (Evolution API v2 Integration)
 * ==============================================================================
 * Servidor HTTP leve para escuta de webhooks da Evolution API (Baileys Engine).
 * ==============================================================================
 * 🛡️ GUARDRAIL DE SEGURANÇA ESTRITA:
 * Este controlador responde EXCLUSIVAMENTE ao número mestre autorizado configurado
 * em WHATSAPP_MASTER_ADMIN no arquivo .env. Qualquer mensagem vinda de qualquer
 * outro remetente é SILENCIOSAMENTE DESCARTADA sem envio de resposta.
 * ==============================================================================
 */

import http from 'node:http';
import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PROJECT_DIR = path.resolve(__dirname, '..');

// Carregamento de variáveis de ambiente do .env se existir
function loadEnv() {
  const envPath = path.join(PROJECT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const PORT = parseInt(process.env.WHATSAPP_WEBHOOK_PORT || '8088', 10);
const MASTER_ADMIN = (process.env.WHATSAPP_MASTER_ADMIN || '').replace(/\D/g, '');
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8082';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'sdd-agent';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

if (!MASTER_ADMIN) {
  console.warn('⚠️ [SDD-GUARDRAIL] WHATSAPP_MASTER_ADMIN não configurado no .env! Nenhuma mensagem será aceita.');
}

/**
 * Validação com tolerância para variação do nono dígito no Brasil
 */
function isAuthorizedMaster(senderRaw: string, masterAdmin: string): boolean {
  const sender = senderRaw.replace(/\D/g, '');
  if (!sender || !masterAdmin) return false;
  if (sender === masterAdmin) return true;

  if (sender.startsWith('55') && masterAdmin.startsWith('55')) {
    const sDdd = sender.slice(2, 4);
    const mDdd = masterAdmin.slice(2, 4);
    if (sDdd === mDdd) {
      const sBody = sender.slice(4);
      const mBody = masterAdmin.slice(4);
      const sCore = sBody.length === 9 ? sBody.slice(1) : sBody;
      const mCore = mBody.length === 9 ? mBody.slice(1) : mBody;
      return sCore === mCore;
    }
  }

  return false;
}

/**
 * Envia mensagem via Evolution API para o número mestre
 */
async function sendWhatsAppMessage(text: string): Promise<boolean> {
  try {
    const endpoint = `${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_INSTANCE}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (EVOLUTION_API_KEY) {
      headers['apikey'] = EVOLUTION_API_KEY;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: MASTER_ADMIN,
        text: text
      })
    });

    return response.ok;
  } catch (err: any) {
    console.error(`[SDD-WPP] Erro ao enviar resposta: ${err.message}`);
    return false;
  }
}

/**
 * Executa comando shell local no projeto
 */
function runShell(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { cwd: PROJECT_DIR }, (err, stdout, stderr) => {
      if (err) {
        resolve(`❌ Erro: ${stderr || err.message}`);
      } else {
        resolve(stdout || stderr || '✔ Executado com sucesso.');
      }
    });
  });
}

// Criação do servidor HTTP para o webhook
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end('Method Not Allowed');
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      const data = payload?.data;
      const key = data?.key;
      const remoteJid = key?.remoteJid || '';
      const fromMe = key?.fromMe || false;

      // Ignora mensagens enviadas pelo próprio robô
      if (fromMe) {
        res.writeHead(200).end('OK');
        return;
      }

      const senderNumber = remoteJid.split('@')[0] || '';

      // 🛡️ GUARDRAIL ESTRITO: Descarta qualquer remetente não autorizado
      if (!isAuthorizedMaster(senderNumber, MASTER_ADMIN)) {
        console.warn(`[SDD-WPP] ⛔ Mensagem descartada de número não autorizado: ${senderNumber}`);
        res.writeHead(200).end('DROPPED');
        return;
      }

      // Extrai o texto da mensagem
      const messageContent = data?.message?.conversation || 
                             data?.message?.extendedTextMessage?.text || 
                             '';
      const text = messageContent.trim();

      if (!text.startsWith('/sdd')) {
        res.writeHead(200).end('IGNORED');
        return;
      }

      console.log(`[SDD-WPP] 📩 Comando recebido do Administrador: "${text}"`);
      const cmdParts = text.split(' ');
      const subCommand = (cmdParts[1] || 'help').toLowerCase();

      switch (subCommand) {
        case 'status':
        case 'info': {
          const statusOutput = await runShell('node bin/sdd.js status');
          // Envia versão resumida
          await sendWhatsAppMessage(
            `📊 *Status da Esteira SDD*\n\n` +
            `\`\`\`\n${statusOutput.slice(0, 1500)}\n\`\`\``
          );
          break;
        }

        case 'estimate':
        case 'tempo': {
          const feature = cmdParts[2] || '';
          const estimateOutput = await runShell(`node bin/sdd.js estimate ${feature} --format wpp`);
          await sendWhatsAppMessage(estimateOutput);
          break;
        }

        case 'run':
        case 'start': {
          await sendWhatsAppMessage('🚀 *Iniciando SDD Autonomous Runner na VPS...*');
          const runOutput = await runShell('bash scripts/sdd_runner.sh start');
          await sendWhatsAppMessage(`✅ ${runOutput}`);
          break;
        }

        case 'stop':
        case 'pausar': {
          await sendWhatsAppMessage('🛑 *Pausando SDD Autonomous Runner na VPS...*');
          const stopOutput = await runShell('bash scripts/sdd_runner.sh stop');
          await sendWhatsAppMessage(`✔ ${stopOutput}`);
          break;
        }

        case 'help':
        default: {
          const helpMsg = 
            `🤖 *Comandos Remotos da Esteira SDD*\n\n` +
            `• */sdd status* - Exibe o progresso das specs e tarefas\n` +
            `• */sdd estimate* - Previsão de término (ETA) e tempo restante\n` +
            `• */sdd run* - Inicia o runner autônomo 24/7 na VPS (tmux)\n` +
            `• */sdd stop* - Interrompe a execução autônoma com segurança\n` +
            `• */sdd help* - Exibe este menu de ajuda\n\n` +
            `🛡️ _Acesso restrito ao Administrador Mestre_`;
          await sendWhatsAppMessage(helpMsg);
          break;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'PROCESSED' }));
    } catch (e: any) {
      console.error(`[SDD-WPP] Erro ao processar payload: ${e.message}`);
      res.writeHead(400).end('BAD_REQUEST');
    }
  });
});

server.listen(PORT, () => {
  console.log(`[SDD-WPP] 🚀 Servidor de Webhook ativo na porta ${PORT}`);
  console.log(`[SDD-WPP] 🛡️ Guardrail Ativo: Respondendo EXCLUSIVAMENTE ao número ${MASTER_ADMIN}`);
});
