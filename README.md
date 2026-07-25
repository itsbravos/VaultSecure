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
   git clone https://github.com/itsbravos/VaultSecure.git
   cd VaultSecure
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

5. **Instalar como Aplicativo no PC (Windows/Mac/Linux):**
   O VaultSecure é um PWA (Progressive Web App) com Service Worker — funciona instalado, com ícone próprio, janela separada e cache offline dos arquivos da aplicação.

   > ⚠️ O botão de instalar e o Service Worker só ficam ativos em build de produção (`npm run dev` roda sem eles, para não atrapalhar o hot-reload). Além disso, o navegador só permite instalar/registrar Service Worker em contexto seguro: **HTTPS** ou **`localhost`**.

   ```bash
   npm run build
   npm run preview
   ```
   Abra `http://localhost:4173` no Chrome ou Edge e clique no ícone de **instalar** (⊕) que aparece na barra de endereço, ou no menu **⋮ > Instalar VaultSecure**. O app passa a abrir em janela própria, com ícone na área de trabalho/menu iniciar, e continua funcionando **offline** depois do primeiro carregamento.

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
6. O VaultSecure será instalado no seu Android como um app (PWA), com ícone próprio, rodando em tela cheia e funcionando **offline** depois do primeiro carregamento (o Service Worker faz cache dos arquivos da aplicação).

---

### 📶 Método 2: Via Rede Wi-Fi Local do Computador
Se você não quiser publicar no GitHub Pages:
1. No seu computador com o repositório clonado, gere o build de produção e sirva-o na rede local:
   ```bash
   npm run build
   npm run preview -- --host
   ```
2. O terminal exibirá o endereço IP local (exemplo: `http://192.168.1.15:4173`).
3. No celular Android (conectado na mesma rede Wi-Fi do computador), abra o Chrome e acesse o endereço IP.
4. Toque no menu do Chrome **(⋮)** e clique em **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.

   > ⚠️ Navegadores só permitem instalar o app e ativar o cache offline (Service Worker) em contexto seguro (**HTTPS** ou **localhost**). Um IP puro na rede local (`http://192.168.x.x`) normalmente **não** conta como seguro — o Chrome pode abrir o site normalmente, mas sem o botão de instalar nem cache offline. Para instalação de verdade no celular, prefira o **Método 1** (GitHub Pages, já em HTTPS) ou o **Método 3** (APK nativo).

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
   - O arquivo `.vault` é **fortemente criptografado com AES-256-GCM** usando a sua Senha Mestra + Salt PBKDF2 de 250.000 iterações. Cada cofre gera seu próprio salt aleatório de 16 bytes na criação (via `window.crypto.getRandomValues`), nunca reaproveitado entre instalações — o que evita ataques com rainbow tables pré-computadas.
   - Você pode enviar este arquivo com segurança por e-mail, WhatsApp, pendrive, Google Drive ou Bluetooth: **ninguém conseguirá abrir sem a sua Senha Mestra**.

3. **No dispositivo de destino (ex: Celular Android ou PC 2):**
   - Abra o VaultSecure.
   - Na tela de login ou nas Configurações, clique em **"Importar / Restaurar Cofre"**.
   - Selecione o arquivo `.vault` e digite a sua Senha Mestra para descriptografar os dados no novo dispositivo.

---

## 🧪 Testes

O projeto usa [Vitest](https://vitest.dev) para testes unitários, cobrindo principalmente a lógica de criptografia (`src/lib/crypto.ts`): derivação de chave via PBKDF2, round-trip de criptografia/descriptografia AES-256-GCM, geração de salt/IV e força de senha.

```bash
npm test              # roda a suíte uma vez
npm run test:watch    # modo watch
npm run test:coverage # com relatório de cobertura
```

---

## 🛡️ Arquitetura de Segurança

- **Zero-Knowledge**: A Senha Mestra nunca é enviada para nenhum servidor nem armazenada em texto puro.
- **Derivação de Chaves**: PBKDF2 com HMAC-SHA256 e 250.000 iterações, com salt aleatório de 16 bytes único por cofre.
- **Criptografia Simétrica**: AES-256-GCM com IV aleatório de 96-bits para cada registro.
- **Verificação de Vazamentos (k-Anonymity)**: Consulta a base do *HaveIBeenPwned* utilizando apenas os primeiros 5 caracteres do hash SHA-1 da senha, mantendo a privacidade total.
- **Gerador de TOTP (2FA)**: Suporte integrado para códigos de autenticação de dois fatores.
- **Certificados Digitais (PKI)**: Suporte a par de chaves RSA 2048-bit / X.509 para assinar e validar acessos corporativos ou pessoais.
