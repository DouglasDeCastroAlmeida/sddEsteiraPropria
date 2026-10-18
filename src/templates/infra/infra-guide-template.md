# 🌐 Guia de Configuração e Deploy na VPS Hostinger

Este documento orienta a configuração do ambiente de produção na **Hostinger VPS** e a ativação do pipeline de **CI/CD via GitHub Actions**.

---

## 🔑 1. Configurando Chave SSH para o GitHub Actions

1. No terminal da sua máquina (ou na VPS da Hostinger), gere um par de chaves SSH dedicado para o deploy:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/hostinger_deploy
   ```
2. Adicione a chave pública (`hostinger_deploy.pub`) no arquivo `~/.ssh/authorized_keys` da sua VPS Hostinger:
   ```bash
   cat ~/.ssh/hostinger_deploy.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
3. No seu repositório no GitHub, acesse **Settings > Secrets and variables > Actions** e adicione os seguintes segredos:
   - `HOSTINGER_SSH_HOST`: O endereço IP da sua VPS Hostinger (ex: `185.xxx.xxx.xxx`).
   - `HOSTINGER_SSH_USER`: O usuário SSH da VPS (ex: `root` ou `ubuntu`).
   - `HOSTINGER_SSH_KEY`: O conteúdo da chave privada (`hostinger_deploy` inteira).
   - `HOSTINGER_SSH_PORT`: Porta SSH (padrão: `22`).

---

## 🌍 2. Apontamento de Domínio & SSL Automático (Caddy)

1. No painel da Hostinger (ou do seu registrador de domínio), crie um registro **Tipo A**:
   - **Nome:** `@` (ou subdomínio como `app`)
   - **Destino / IP:** O endereço IP público da sua VPS Hostinger.
2. No arquivo `Caddyfile` gerado na raiz do projeto, defina o domínio:
   ```caddy
   app.meudominio.com {
       reverse_proxy app:3000
   }
   ```
3. O Caddy cuidará automaticamente da emissão e renovação dos certificados HTTPS/SSL via Let's Encrypt!

---

## 🚀 3. Deploy Contínuo (CI/CD)

- A cada `git push origin main`, o workflow `.github/workflows/deploy.yml` executará:
  1. Suíte de testes automatizados e checagem de tipos (TLC Gate).
  2. Conexão segura via SSH com a VPS Hostinger.
  3. Atualização do código e recriação dos containers Docker.
  4. Verificação de integridade dos serviços.

---

## 🛠️ 4. Comandos Úteis na VPS Hostinger

```bash
# Ver status dos containers
docker compose ps

# Acompanhar logs em tempo real
docker compose logs -f app

# Reiniciar serviços
docker compose restart

# Parar serviços
docker compose down
```
