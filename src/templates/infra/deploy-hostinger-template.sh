#!/bin/bash
set -e

# ==============================================================================
# Script de Deploy Direto na VPS Hostinger
# ==============================================================================

PROJECT_NAME="{{PROJECT_NAME}}"
PROJECT_SLUG="{{PROJECT_SLUG}}"

echo "=========================================================="
echo "🚀 Iniciando Deploy do projeto: $PROJECT_NAME ($PROJECT_SLUG)"
echo "=========================================================="

# 1. Verifica se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "✖ Docker não encontrado na máquina. Instale o Docker antes de continuar."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "✖ Docker Compose não encontrado na máquina."
    exit 1
fi

# 2. Verifica se o arquivo .env existe
if [ ! -f .env ]; then
    echo "⚠ Arquivo .env não encontrado. Copiando de .env.example..."
    cp .env.example .env
    echo "💡 Configure as variáveis reais em .env antes de rodar em produção."
fi

# 3. Executa build e sobe os containers
echo "📦 Construindo imagens Docker e iniciando serviços..."
docker compose up -d --build --remove-orphans

# 4. Smoke Test
echo "⏳ Aguardando serviços inicializarem..."
sleep 5

docker compose ps

echo "=========================================================="
echo "✔ Deploy finalizado com sucesso no ambiente Hostinger!"
echo "=========================================================="
