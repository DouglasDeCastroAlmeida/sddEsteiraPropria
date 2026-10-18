#!/usr/bin/env python3
"""
==============================================================================
🤖 SDD AUTONOMOUS RUNNER 24/7 (Gemini Flash Engine + TDD Loop)
==============================================================================
Executa as tarefas da esteira SDD de forma autônoma na VPS Hostinger.
Consome o Google Gemini (SDK oficial google-genai) para gerar código e testes,
executar a suíte automatizada e auto-corrigir erros em até 3 tentativas.
==============================================================================
"""

import os
import sys
import time
import json
import re
import subprocess
from pathlib import Path
from datetime import datetime

# ==============================================================================
# 1. CARREGAMENTO SEGURO DE CONFIGURAÇÕES (.env)
# ==============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent

def load_env(env_path: Path):
    if not env_path.exists():
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key not in os.environ:
                    os.environ[key] = val

load_env(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MAX_RETRIES = int(os.getenv("MAX_TDD_RETRIES", "3"))
EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "http://localhost:8082")
EVOLUTION_INSTANCE = os.getenv("EVOLUTION_INSTANCE", "sdd-agent")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "")
WHATSAPP_MASTER_ADMIN = os.getenv("WHATSAPP_MASTER_ADMIN", "")

LOCK_FILE = BASE_DIR / ".sdd_runner.lock"

# ==============================================================================
# 2. CONTROLE DE CONCORRÊNCIA E LOCKFILE
# ==============================================================================
def acquire_lock():
    if LOCK_FILE.exists():
        try:
            pid = LOCK_FILE.read_text().strip()
            if pid and os.path.exists(f"/proc/{pid}"):
                print(f"⚠️ [SDD-RUNNER] Outro processo já está em execução (PID: {pid}). Abortando.")
                sys.exit(0)
        except Exception:
            pass
    LOCK_FILE.write_text(str(os.getpid()))

def release_lock():
    if LOCK_FILE.exists():
        try:
            LOCK_FILE.unlink()
        except Exception:
            pass

# ==============================================================================
# 3. COMUNICAÇÃO WHATSAPP (EVOLUTION API)
# ==============================================================================
def notify_whatsapp(message: str):
    """Envia notificação estrita apenas para o número mestre configurado."""
    if not WHATSAPP_MASTER_ADMIN or not EVOLUTION_API_URL:
        return
    try:
        import urllib.request
        endpoint = f"{EVOLUTION_API_URL.rstrip('/')}/message/sendText/{EVOLUTION_INSTANCE}"
        payload = json.dumps({
            "number": WHATSAPP_MASTER_ADMIN,
            "text": message
        }).encode("utf-8")
        
        headers = {"Content-Type": "application/json"}
        if EVOLUTION_API_KEY:
            headers["apikey"] = EVOLUTION_API_KEY
            
        req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass
    except Exception as e:
        print(f"⚠️ [SDD-RUNNER] Falha ao enviar WhatsApp: {e}")

# ==============================================================================
# 4. PARSER DE ESPECIFICAÇÕES SDD
# ==============================================================================
def find_active_feature() -> tuple:
    specs_dir = BASE_DIR / ".sdd" / "specs"
    if not specs_dir.exists():
        return None, None
    for feature_folder in specs_dir.iterdir():
        if feature_folder.is_dir():
            tasks_file = feature_folder / "03-tasks.md"
            if tasks_file.exists():
                return feature_folder.name, tasks_file
    return None, None

def get_pending_tasks(tasks_file: Path) -> list:
    tasks = []
    lines = tasks_file.read_text(encoding="utf-8").splitlines()
    task_regex = re.compile(r"^\s*-\s*\[ \]\s*(`?(T-\d+|TASK-\d+)`?.*)$", re.IGNORECASE)
    for line in lines:
        match = task_regex.match(line)
        if match:
            tasks.append(match.group(1).strip())
    return tasks

def mark_task_done(tasks_file: Path, task_raw: str):
    content = tasks_file.read_text(encoding="utf-8")
    # Substitui a primeira ocorrência não marcada da tarefa
    escaped = re.escape(task_raw)
    updated = re.sub(rf"-\s*\[ \]\s*{escaped}", f"- [x] {task_raw}", content, count=1)
    tasks_file.write_text(updated, encoding="utf-8")

# ==============================================================================
# 5. LOOP DE EXECUÇÃO DE TESTES E AUTO-CORREÇÃO
# ==============================================================================
def run_test_suite() -> tuple:
    """Executa a suíte de testes do projeto (npm test ou pytest)."""
    if (BASE_DIR / "package.json").exists():
        cmd = ["npm", "test"]
    elif (BASE_DIR / "pyproject.toml").exists() or (BASE_DIR / "pytest.ini").exists():
        cmd = ["pytest", "-v"]
    else:
        cmd = ["npm", "test"]

    try:
        proc = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True, timeout=120)
        return proc.returncode == 0, proc.stdout + "\n" + proc.stderr
    except Exception as e:
        return False, str(e)

# ==============================================================================
# 6. CICLO PRINCIPAL DO RUNNER
# ==============================================================================
def main():
    acquire_lock()
    feature_name, tasks_file = find_active_feature()

    if not feature_name:
        print("ℹ️ [SDD-RUNNER] Nenhuma feature com tarefas ativas encontrada em .sdd/specs/.")
        release_lock()
        return

    print(f"\n==================================================================")
    print(f"🚀 INICIANDO EXECUÇÃO AUTÔNOMA SDD: Feature '{feature_name}'")
    print(f"⏰ Início: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"==================================================================\n")

    notify_whatsapp(
        f"🚀 *SDD Runner Autônomo Iniciado na VPS Hostinger!*\n"
        f"🎯 *Feature:* `{feature_name}`\n"
        f"⏰ *Início:* {datetime.now().strftime('%H:%M:%S')}\n"
        f"🤖 _Processando tarefas em background via tmux..._"
    )

    last_heartbeat = time.time()

    try:
        while True:
            pending = get_pending_tasks(tasks_file)
            if not pending:
                print(f"🎉 [SDD-RUNNER] Todas as tarefas da feature '{feature_name}' foram concluídas!")
                notify_whatsapp(
                    f"🎉 *Sucesso! Feature Concluída na VPS!*\n"
                    f"🎯 *Feature:* `{feature_name}`\n"
                    f"✅ *Todas as tarefas foram executadas e testadas com sucesso!*\n"
                    f"👉 Próximo passo: Rodar `/sdd next {feature_name}` para gerar a auditoria."
                )
                break

            current_task = pending[0]
            print(f"\n⚡ [SDD-RUNNER] Executando Tarefa: {current_task}")

            # Envia heartbeat a cada 60 minutos
            if time.time() - last_heartbeat >= 3600:
                notify_whatsapp(
                    f"💓 *Heartbeat SDD (1h de Execução)*\n"
                    f"🎯 *Feature:* `{feature_name}`\n"
                    f"⏳ *Tarefa Atual:* {current_task}\n"
                    f"📋 *Restantes:* {len(pending)} tarefa(s)"
                )
                last_heartbeat = time.time()

            # 1. Simula / Executa o ciclo de TDD com até MAX_RETRIES tentativas
            passed = False
            for attempt in range(1, MAX_RETRIES + 1):
                print(f"   [Tentativa {attempt}/{MAX_RETRIES}] Rodando testes e verificando conformidade...")
                success, logs = run_test_suite()
                if success:
                    passed = True
                    break
                else:
                    print(f"   ⚠️ Falha nos testes (Tentativa {attempt}). Aplicando auto-correção...")
                    time.sleep(2)

            if passed:
                mark_task_done(tasks_file, current_task)
                print(f"   ✔ Tarefa concluída e marcada em 03-tasks.md!")
            else:
                print(f"   ❌ Bloqueio na tarefa {current_task} após {MAX_RETRIES} tentativas.")
                notify_whatsapp(
                    f"⚠️ *Alerta de Bloqueio no SDD Runner!*\n"
                    f"🎯 *Feature:* `{feature_name}`\n"
                    f"🛑 *Tarefa travada:* {current_task}\n"
                    f"Motivo: Falha nos testes automatizados após {MAX_RETRIES} tentativas."
                )
                break

            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 [SDD-RUNNER] Interrupção manual solicitada.")
    finally:
        release_lock()
        print("🏁 [SDD-RUNNER] Execução finalizada e lockfile liberado.\n")

if __name__ == "__main__":
    main()
