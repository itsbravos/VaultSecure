# 🔐 VaultSecure - Cofre de Senhas Criptografado & Zero-Knowledge

O **VaultSecure** é um gerenciador de senhas moderno, local e de conhecimento zero (Zero-Knowledge). Todos os dados são criptografados no próprio dispositivo do usuário antes de qualquer armazenamento.

---

## 🚀 Como Instalar e Rodar Localmente (PC / Servidor)

Para rodar o VaultSecure no seu computador localmente a partir deste repositório do GitHub:

### Requisitos
- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**

### Passo a Passo
1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/seu-usuario/vault-secure.git
   cd vault-secure
   ```

2. **Instalar Dependências:**
   ```bash
   npm install
   ```

3. **Executar em Modo de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000` (ou na porta indicada no terminal).

4. **Gerar Versão de Produção (Build Estático):**
   ```bash
   npm run build
   ```
   Os arquivos compilados ficarão na pasta `dist/` para servir em qualquer servidor web ou usar offline.

---

## 📱 Como Instalar no Celular Android (A partir do Repositório GitHub)

Como o projeto é hospedado diretamente no **GitHub sem um site de terceiros**, você tem 3 opções simples e 100% gratuitas para instalar o VaultSecure no seu celular Android:

### 🌟 Método 1: Via GitHub Pages Grátis (Mais Recomendado)
O próprio GitHub permite hospedar o aplicativo do cofre gratuitamente em 1 clique:
1. No seu repositório do GitHub, vá em **Settings > Pages**.
2. Em **Source**, selecione **GitHub Actions** ou a branch `main` / `gh-pages` com a pasta `/dist`.
3. O GitHub gerará a URL segura com HTTPS: `https://seu-usuario.github.io/vault-secure/`.
4. Abra esse link no **Google Chrome** do seu Android.
5. Toque nos **⋮ (3 pontinhos)** do Chrome no canto superior direito e selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
6. O VaultSecure será instalado no seu Android como um aplicativo nativo (PWA), rodando em tela cheia e funcionando **100% offline** a partir daí!

---

### 📶 Método 2: Via Rede Wi-Fi Local do Computador
Se você não quiser publicar no GitHub Pages:
1. No seu computador com o repositório clonado, inicie o servidor na rede local:
   ```bash
   npm run dev -- --host
   ```
2. O terminal exibirá o endereço IP local (exemplo: `http://192.168.1.15:3000`).
3. No celular Android (conectado na mesma rede Wi-Fi do computador), abra o Chrome e acesse o endereço IP.
4. Toque no menu do Chrome **(⋮)** e clique em **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.

---

### 📦 Método 3: Gerar APK Nativo para Android (Capacitor)
O repositório está pronto para ser compilado em arquivo `.apk` Android:
1. Instale o Capacitor CLI: `npm install @capacitor/core @capacitor/cli @capacitor/android`
2. Adicione a plataforma Android: `npx cap add android`
3. Abra e compile no Android Studio: `npx cap open android` -> *Build APK*.

---

## 🔄 Como Transferir / Sincronizar Senhas Entre Dispositivos (Ex: PC ➔ Celular ou PC ➔ PC)

Como o VaultSecure opera em modelo **100% Local / Zero-Server**, a sincronização é feita com máxima privacidade via backup criptografado:

1. **No dispositivo de origem (ex: PC 1):**
   - Vá no menu de engrenagem **(Configurações)** ou clique no botão **Fazer Backup / Exportar**.
   - Escolha **Exportação Criptografada (.vault)**.
   - Será baixado um arquivo contendo todo o seu cofre.

2. **Segurança do Arquivo `.vault`:**
   - O arquivo `.vault` é **fortemente criptografado com AES-256-GCM** usando a sua Senha Mestra + Salt PBKDF2 de 100.000 iterações.
   - Você pode enviar este arquivo com segurança por e-mail, WhatsApp, pendrive, Google Drive ou Bluetooth: **ninguém conseguirá abrir sem a sua Senha Mestra**.

3. **No dispositivo de destino (ex: Celular Android ou PC 2):**
   - Abra o VaultSecure.
   - Na tela de login ou nas Configurações, clique em **"Importar / Restaurar Cofre"**.
   - Selecione o arquivo `.vault` e digite a sua Senha Mestra para descriptografar os dados no novo dispositivo.

---

## 🛡️ Arquitetura de Segurança

- **Zero-Knowledge**: A Senha Mestra nunca é enviada para nenhum servidor nem armazenada em texto puro.
- **Derivação de Chaves**: PBKDF2 com HMAC-SHA256 e 100.000 iterações.
- **Criptografia Simétrica**: AES-256-GCM com IV aleatório de 96-bits para cada registro.
- **Verificação de Vazamentos (k-Anonymity)**: Consulta a base do *HaveIBeenPwned* utilizando apenas os primeiros 5 caracteres do hash SHA-1 da senha, mantendo a privacidade total.
- **Gerador de TOTP (2FA)**: Suporte integrado para códigos de autenticação de dois fatores.
- **Certificados Digitais (PKI)**: Suporte a par de chaves RSA 2048-bit / X.509 para assinar e validar acessos corporativos ou pessoais.
