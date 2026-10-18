#!/usr/bin/env bash
# ==============================================================================
# 🚀 SDD REMOTE RUNNER (Hostinger Ubuntu 24.04 LTS / tmux Daemon)
# ==============================================================================
# Gerencia a execução autônoma 24/7 da esteira em sessão desacoplada tmux.
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Carrega variáveis de ambiente se o .env existir
if [ -f "$PROJECT_DIR/.env" ]; then
    # exporta automaticamente as variáveis
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

SESSION_NAME="sdd_remote_runner"
LOCK_FILE="$PROJECT_DIR/.sdd_runner.lock"
LOG_FILE="$PROJECT_DIR/sdd_runner.log"

ACTION="${1:-status}"

case "$ACTION" in
    start)
        echo "🔍 Verificando estado do runner autônomo SDD..."
        if [ -f "$LOCK_FILE" ]; then
            PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
            if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
                echo "⚠️  O runner já está em execução (PID: $PID, sessão tmux: $SESSION_NAME)."
                echo "👉 Use 'bash scripts/sdd_runner.sh attach' para visualizar."
                exit 0
            else
                echo "🧹 Removendo arquivo de trava órfão..."
                rm -f "$LOCK_FILE"
            fi
        fi

        echo "🚀 Iniciando sessão tmux desacoplada: $SESSION_NAME..."
        tmux new-session -d -s "$SESSION_NAME" "python3 scripts/sdd_remote_runner.py 2>&1 | tee -a '$LOG_FILE'"
        
        # Salva o PID do processo em background
        TMUX_PID=$(tmux list-panes -t "$SESSION_NAME" -F "#{pane_pid}" 2>/dev/null || echo $$)
        echo "$TMUX_PID" > "$LOCK_FILE"
        echo "✅ Runner autônomo iniciado com sucesso! (PID: $TMUX_PID)"
        echo "📋 Acompanhe os logs com: tail -f '$LOG_FILE'"
        ;;

    stop)
        echo "🛑 Solicitando parada do runner autônomo SDD..."
        if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
            tmux kill-session -t "$SESSION_NAME"
            echo "✔ Sessão tmux '$SESSION_NAME' encerrada."
        fi
        if [ -f "$LOCK_FILE" ]; then
            rm -f "$LOCK_FILE"
            echo "✔ Arquivo de trava removido."
        fi
        echo "✅ Runner finalizado com sucesso."
        ;;

    status)
        echo "📊 Status da Execução Autônoma SDD:"
        if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
            PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "Desconhecido")
            echo "🟢 ESTADO: ATIVO (Rodando em background via tmux)"
            echo "🔢 PID: $PID"
            echo "📄 Últimas 5 linhas de log:"
            echo "──────────────────────────────────────────────"
            tail -n 5 "$LOG_FILE" 2>/dev/null || echo "Nenhum log registrado ainda."
        else
            echo "⚪ ESTADO: INATIVO (Nenhum runner em execução no momento)"
            if [ -f "$LOCK_FILE" ]; then
                echo "⚠️  Aviso: Arquivo de trava .sdd_runner.lock presente, mas processo inativo."
            fi
        fi
        ;;

    attach)
        if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
            echo "🔌 Conectando ao terminal interativo da sessão tmux..."
            echo "💡 Pressione [Ctrl+B] seguido de [D] para desconectar sem interromper o processo."
            sleep 1
            tmux attach-session -t "$SESSION_NAME"
        else
            echo "❌ Nenhuma sessão tmux ativa com o nome '$SESSION_NAME'."
        fi
        ;;

    logs)
        tail -f "$LOG_FILE"
        ;;

    *)
        echo "Uso: bash scripts/sdd_runner.sh [start|stop|status|attach|logs]"
        exit 1
        ;;
esac
