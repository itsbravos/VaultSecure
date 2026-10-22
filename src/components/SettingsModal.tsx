import React, { useState } from 'react';
import {
  Settings,
  X,
  Lock,
  Clock,
  QrCode,
  FileCheck,
  ShieldAlert,
  KeyRound,
  Trash2,
  Check,
  Monitor,
  HardDrive,
  Download,
  User,
  Smartphone,
} from 'lucide-react';
import { VaultSettings } from '../types';
import { tr } from '../lib/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VaultSettings;
  onSaveSettings: (newSettings: VaultSettings) => void;
  onOpen2FAWizard: () => void;
  onOpenCertWizard: () => void;
  onChangeMasterPassword: () => void;
  onOpenBackupModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onOpen2FAWizard,
  onOpenCertWizard,
  onChangeMasterPassword,
  onOpenBackupModal,
}) => {
  if (!isOpen) return null;

  const [localSettings, setLocalSettings] = useState<VaultSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#13282E] border border-[#2C4A50] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2C4A50] bg-[#13282E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#183238] border border-[#3D5F65] text-[#B9CBC6] flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{tr("Configurações de Segurança do Cofre")}</h3>
              <p className="text-xs text-[#86A19B]">{tr("Políticas de Acesso e Criptografia Local")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-[#183238] text-[#86A19B] hover:text-[#D3E0DC] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* User Name / Profile Section */}
          <div className="space-y-1.5 p-4 bg-[#0B1A1E] rounded-xl border border-[#2C4A50]">
            <label className="text-xs font-semibold text-[#D3E0DC] flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-400" /> {tr("Seu Nome (Titular do Cofre)")}
            </label>
            <input
              type="text"
              value={localSettings.userName || ''}
              onChange={e => setLocalSettings({ ...localSettings, userName: e.target.value })}
              placeholder={tr("Digite seu nome completo...")}
              className="w-full bg-[#13282E] border border-[#2C4A50] rounded-lg p-2.5 text-xs text-[#D3E0DC] focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-[#6E8A85] block">
              {tr("Este nome identifica você como proprietário do cofre e é exibido no cabeçalho do aplicativo.")}
            </span>
          </div>

          {/* Mobile & Android Installation Section */}
          <div className="p-4 bg-[#0B1A1E] rounded-xl border border-[#2C4A50] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>{tr("Instalação no Celular Android (A partir do Repositório GitHub)")}</span>
            </div>
            <p className="text-[11px] text-[#B9CBC6] leading-relaxed">
              {tr("Como você está rodando diretamente do GitHub sem site comercial, há 3 formas simples de instalar no seu Android:")}
            </p>
            <ul className="text-[11px] text-[#86A19B] space-y-2 list-disc pl-4">
              <li>
                <strong className="text-emerald-400">{tr("Opção 1: GitHub Pages Grátis (Recomendado):")}</strong> {tr("No repositório do GitHub, ative o")} <em>{tr("GitHub Pages")}</em> {tr("em")} <em>Settings &gt; Pages</em>. Acesse o link gerado (<code>https://seu-usuario.github.io/nome-do-repo/</code>{tr(") no Chrome do seu Android, toque nos")} <strong className="text-white">{tr("⋮ 3 pontinhos")}</strong> {tr("do Chrome e selecione")} <strong className="text-emerald-400">{tr("\"Instalar aplicativo\"")}</strong> {tr("ou")} <strong className="text-emerald-400">{tr("\"Adicionar à tela inicial\"")}</strong>. Ele vira um app PWA nativo e funciona 100% offline depois do 1º acesso!
              </li>
              <li>
                <strong className="text-cyan-400">{tr("Opção 2: Pela sua Rede Wi-Fi Local:")}</strong> {tr("No computador onde você clonou o repositório, rode")} <code>{tr("npm run dev -- --host")}</code>. Acesse o IP mostrado (ex: <code>http://192.168.1.50:3000</code>{tr(") no navegador Chrome do seu celular conectado no mesmo Wi-Fi, toque nos")} <strong className="text-white">{tr("⋮ 3 pontinhos")}</strong> {tr("e toque em")} <strong className="text-cyan-400">{tr("\"Instalar aplicativo\"")}</strong>.
              </li>
              <li>
                <strong className="text-amber-400">{tr("Opção 3: Gerar APK com Capacitor:")}</strong> {tr("O repositório já inclui configurações PWA e Capacitor para compilar um arquivo")} <code>.apk</code> {tr("nativo se desejar.")}
              </li>
            </ul>
          </div>

          {/* Sync / Transfer between 2 computers */}
          <div className="p-4 bg-[#0B1A1E] rounded-xl border border-[#2C4A50] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>{tr("Transferência entre Computadores (Modo Offline)")}</span>
              </div>
              {onOpenBackupModal && (
                <button
                  type="button"
                  onClick={onOpenBackupModal}
                  className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> {tr("Fazer Backup (.vault)")}
                </button>
              )}
            </div>
            
            <p className="text-[11px] text-[#B9CBC6] leading-relaxed">
              {tr("Como o VaultSecure é")} <strong className="text-white">{tr("100% local e sem servidores de terceiros")}</strong>{tr(", para mover ou sincronizar suas senhas entre dois computadores com total segurança:")}
            </p>

            <ol className="text-[11px] text-[#86A19B] space-y-1.5 list-decimal pl-4">
              <li>
                {tr("Exporte o arquivo")} <strong className="text-emerald-400">.vault</strong> {tr("no primeiro computador.")}
              </li>
              <li>
                {tr("O arquivo é")} <strong className="text-white">{tr("100% criptografado com AES-256-GCM")}</strong> {tr("usando sua Senha Mestra. Mesmo enviando por e-mail, pendrive ou nuvem,")} <strong className="text-emerald-400">{tr("ninguém conseguirá abrir sem a senha")}</strong>.
              </li>
              <li>
                {tr("No segundo computador, abra o VaultSecure e clique em")} <strong className="text-white">{tr("Importar / Restaurar Cofre")}</strong> {tr("digitando a Senha Mestra.")}
              </li>
            </ol>
          </div>

          {/* Autenticação em Duas Etapas & Certificado */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#86A19B]">
              {tr("Fatores de Autenticação Adicionais")}
            </h4>

            {/* Google Authenticator Button */}
            <div className="p-4 bg-[#0B1A1E] rounded-xl border border-[#2C4A50] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[#D3E0DC] flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" /> {tr("Google Authenticator (2FA)")}
                </span>
                <span className="text-[11px] text-[#86A19B] block">
                  {localSettings.require2FA ? tr("2FA Ativado e configurado") : tr("Configurar aplicativo de 6 dígitos")}
                </span>
              </div>

              <button
                type="button"
                onClick={onOpen2FAWizard}
                className="px-3.5 py-2 bg-[#183238] hover:bg-gray-700 text-emerald-400 text-xs font-semibold rounded-lg transition-colors"
              >
                {localSettings.require2FA ? tr("Gerenciar") : tr("Configurar")}
              </button>
            </div>

            {/* Digital Cert Manager Button */}
            <div className="p-4 bg-[#0B1A1E] rounded-xl border border-[#2C4A50] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[#D3E0DC] flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-cyan-400" /> {tr("Certificados Digitais (PKI)")}
                </span>
                <span className="text-[11px] text-[#86A19B] block">
                  {localSettings.requireDigitalCert ? tr("Validação de Assinatura Ativada") : tr("Gerenciar Certificados X.509")}
                </span>
              </div>

              <button
                type="button"
                onClick={onOpenCertWizard}
                className="px-3.5 py-2 bg-[#183238] hover:bg-gray-700 text-cyan-400 text-xs font-semibold rounded-lg transition-colors"
              >
                {tr("Gerenciar")}
              </button>
            </div>
          </div>

          {/* Auto Lock & Timers */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#86A19B]">
              {tr("Temporizadores e Bloqueio Automático")}
            </h4>

            {/* Auto Lock Minutes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#B9CBC6] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#86A19B]" /> {tr("Auto-bloqueio por Inatividade")}
              </label>
              <select
                value={localSettings.autoLockMinutes}
                onChange={e => setLocalSettings({ ...localSettings, autoLockMinutes: Number(e.target.value) })}
                className="w-full bg-[#0B1A1E] border border-[#2C4A50] rounded-xl p-2.5 text-xs text-[#D3E0DC] focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>{tr("Após 1 minuto de inatividade")}</option>
                <option value={5}>{tr("Após 5 minutos de inatividade (Recomendado)")}</option>
                <option value={15}>{tr("Após 15 minutos de inatividade")}</option>
                <option value={30}>{tr("Após 30 minutos de inatividade")}</option>
                <option value={0}>{tr("Desativado (Nunca bloquear)")}</option>
              </select>
            </div>

            {/* Clipboard Clear Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#B9CBC6]">
                {tr("Limpeza Automática da Área de Transferência (Clipboard)")}
              </label>
              <select
                value={localSettings.clipboardClearSeconds}
                onChange={e => setLocalSettings({ ...localSettings, clipboardClearSeconds: Number(e.target.value) })}
                className="w-full bg-[#0B1A1E] border border-[#2C4A50] rounded-xl p-2.5 text-xs text-[#D3E0DC] focus:outline-none focus:border-emerald-500"
              >
                <option value={10}>{tr("Após 10 segundos")}</option>
                <option value={20}>{tr("Após 20 segundos (Padrão)")}</option>
                <option value={30}>{tr("Após 30 segundos")}</option>
                <option value={60}>{tr("Após 60 segundos")}</option>
              </select>
            </div>
          </div>

          {/* Emergency & Self-Destruct */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#86A19B]">
              {tr("Proteção contra Ataques de Força Bruta")}
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#B9CBC6] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                {tr("Limite de Tentativas Falhas (Proteção Local)")}
              </label>
              <select
                value={localSettings.selfDestructAttempts}
                onChange={e => setLocalSettings({ ...localSettings, selfDestructAttempts: Number(e.target.value) })}
                className="w-full bg-[#0B1A1E] border border-[#2C4A50] rounded-xl p-2.5 text-xs text-[#D3E0DC] focus:outline-none focus:border-red-500"
              >
                <option value={3}>{tr("Bloquear após 3 tentativas incorretas")}</option>
                <option value={5}>{tr("Bloquear após 5 tentativas incorretas (Padrão)")}</option>
                <option value={10}>{tr("Bloquear após 10 tentativas incorretas")}</option>
                <option value={0}>{tr("Desativado (Permitir tentativas ilimitadas)")}</option>
              </select>
              <span className="text-xs text-[#6E8A85] block">
                {tr("Se exceder este limite, o acesso será temporariamente suspenso para mitigar ataques.")}
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2C4A50] bg-[#0B1A1E] flex items-center justify-between">
          <button
            onClick={onChangeMasterPassword}
            className="text-xs text-[#86A19B] hover:text-[#D3E0DC] flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" /> {tr("Alterar Senha Mestra")}
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-colors"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : null}
            <span>{tr("Salvar Configurações")}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
