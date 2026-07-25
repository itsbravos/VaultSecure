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
      <div className="w-full max-w-lg bg-[#0F0F0F] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-[#0F0F0F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Configurações de Segurança do Cofre</h3>
              <p className="text-xs text-gray-400 font-mono">Políticas de Acesso e Criptografia Local</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* User Name / Profile Section */}
          <div className="space-y-1.5 p-4 bg-[#050505] rounded-xl border border-gray-800">
            <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-400" /> Seu Nome (Titular do Cofre)
            </label>
            <input
              type="text"
              value={localSettings.userName || ''}
              onChange={e => setLocalSettings({ ...localSettings, userName: e.target.value })}
              placeholder="Digite seu nome completo..."
              className="w-full bg-[#0F0F0F] border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <span className="text-[10px] text-gray-500 block font-mono">
              Este nome identifica você como proprietário do cofre e é exibido no cabeçalho do aplicativo.
            </span>
          </div>

          {/* Mobile & Android Installation Section */}
          <div className="p-4 bg-[#050505] rounded-xl border border-gray-800 space-y-2.5 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Instalação no Celular Android (A partir do Repositório GitHub)</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Como você está rodando diretamente do GitHub sem site comercial, há 3 formas simples de instalar no seu Android:
            </p>
            <ul className="text-[11px] text-gray-400 space-y-2 list-disc pl-4">
              <li>
                <strong className="text-emerald-400">Opção 1: GitHub Pages Grátis (Recomendado):</strong> No repositório do GitHub, ative o <em>GitHub Pages</em> em <em>Settings &gt; Pages</em>. Acesse o link gerado (<code>https://seu-usuario.github.io/nome-do-repo/</code>) no Chrome do seu Android, toque nos <strong className="text-white">⋮ 3 pontinhos</strong> do Chrome e selecione <strong className="text-emerald-400">"Instalar aplicativo"</strong> ou <strong className="text-emerald-400">"Adicionar à tela inicial"</strong>. Ele vira um app PWA nativo e funciona 100% offline depois do 1º acesso!
              </li>
              <li>
                <strong className="text-cyan-400">Opção 2: Pela sua Rede Wi-Fi Local:</strong> No computador onde você clonou o repositório, rode <code>npm run dev -- --host</code>. Acesse o IP mostrado (ex: <code>http://192.168.1.50:3000</code>) no navegador Chrome do seu celular conectado no mesmo Wi-Fi, toque nos <strong className="text-white">⋮ 3 pontinhos</strong> e toque em <strong className="text-cyan-400">"Instalar aplicativo"</strong>.
              </li>
              <li>
                <strong className="text-amber-400">Opção 3: Gerar APK com Capacitor:</strong> O repositório já inclui configurações PWA e Capacitor para compilar um arquivo <code>.apk</code> nativo se desejar.
              </li>
            </ul>
          </div>

          {/* Sync / Transfer between 2 computers */}
          <div className="p-4 bg-[#050505] rounded-xl border border-gray-800 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Transferência entre Computadores (Modo Offline)</span>
              </div>
              {onOpenBackupModal && (
                <button
                  type="button"
                  onClick={onOpenBackupModal}
                  className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Fazer Backup (.vault)
                </button>
              )}
            </div>
            
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Como o VaultSecure é <strong className="text-white">100% local e sem servidores de terceiros</strong>, para mover ou sincronizar suas senhas entre dois computadores com total segurança:
            </p>

            <ol className="text-[11px] text-gray-400 space-y-1.5 list-decimal pl-4">
              <li>
                Exporte o arquivo <strong className="text-emerald-400 font-mono">.vault</strong> no primeiro computador.
              </li>
              <li>
                O arquivo é <strong className="text-white">100% criptografado com AES-256-GCM</strong> usando sua Senha Mestra. Mesmo enviando por e-mail, pendrive ou nuvem, <strong className="text-emerald-400">ninguém conseguirá abrir sem a senha</strong>.
              </li>
              <li>
                No segundo computador, abra o VaultSecure e clique em <strong className="text-white">Importar / Restaurar Cofre</strong> digitando a Senha Mestra.
              </li>
            </ol>
          </div>

          {/* Autenticação em Duas Etapas & Certificado */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">
              Fatores de Autenticação Adicionais
            </h4>

            {/* Google Authenticator Button */}
            <div className="p-4 bg-[#050505] rounded-xl border border-gray-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" /> Google Authenticator (2FA)
                </span>
                <span className="text-[11px] text-gray-400 block font-mono">
                  {localSettings.require2FA ? '2FA Ativado e configurado' : 'Configurar aplicativo de 6 dígitos'}
                </span>
              </div>

              <button
                type="button"
                onClick={onOpen2FAWizard}
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-emerald-400 text-xs font-semibold rounded-lg transition-colors font-mono"
              >
                {localSettings.require2FA ? 'Gerenciar' : 'Configurar'}
              </button>
            </div>

            {/* Digital Cert Manager Button */}
            <div className="p-4 bg-[#050505] rounded-xl border border-gray-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-cyan-400" /> Certificados Digitais (PKI)
                </span>
                <span className="text-[11px] text-gray-400 block font-mono">
                  {localSettings.requireDigitalCert ? 'Validação de Assinatura Ativada' : 'Gerenciar Certificados X.509'}
                </span>
              </div>

              <button
                type="button"
                onClick={onOpenCertWizard}
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 text-xs font-semibold rounded-lg transition-colors font-mono"
              >
                Gerenciar
              </button>
            </div>
          </div>

          {/* Auto Lock & Timers */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">
              Temporizadores e Bloqueio Automático
            </h4>

            {/* Auto Lock Minutes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Auto-bloqueio por Inatividade
              </label>
              <select
                value={localSettings.autoLockMinutes}
                onChange={e => setLocalSettings({ ...localSettings, autoLockMinutes: Number(e.target.value) })}
                className="w-full bg-[#050505] border border-gray-800 rounded-xl p-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value={1}>Após 1 minuto de inatividade</option>
                <option value={5}>Após 5 minutos de inatividade (Recomendado)</option>
                <option value={15}>Após 15 minutos de inatividade</option>
                <option value={30}>Após 30 minutos de inatividade</option>
                <option value={0}>Desativado (Nunca bloquear)</option>
              </select>
            </div>

            {/* Clipboard Clear Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">
                Limpeza Automática da Área de Transferência (Clipboard)
              </label>
              <select
                value={localSettings.clipboardClearSeconds}
                onChange={e => setLocalSettings({ ...localSettings, clipboardClearSeconds: Number(e.target.value) })}
                className="w-full bg-[#050505] border border-gray-800 rounded-xl p-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value={10}>Após 10 segundos</option>
                <option value={20}>Após 20 segundos (Padrão)</option>
                <option value={30}>Após 30 segundos</option>
                <option value={60}>Após 60 segundos</option>
              </select>
            </div>
          </div>

          {/* Emergency & Self-Destruct */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">
              Proteção contra Ataques de Força Bruta
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                Limite de Tentativas Falhas (Proteção Local)
              </label>
              <select
                value={localSettings.selfDestructAttempts}
                onChange={e => setLocalSettings({ ...localSettings, selfDestructAttempts: Number(e.target.value) })}
                className="w-full bg-[#050505] border border-gray-800 rounded-xl p-2.5 text-xs text-gray-200 focus:outline-none focus:border-red-500 font-mono"
              >
                <option value={3}>Bloquear após 3 tentativas incorretas</option>
                <option value={5}>Bloquear após 5 tentativas incorretas (Padrão)</option>
                <option value={10}>Bloquear após 10 tentativas incorretas</option>
                <option value={0}>Desativado (Permitir tentativas ilimitadas)</option>
              </select>
              <span className="text-[10px] text-gray-500 block font-mono">
                Se exceder este limite, o acesso será temporariamente suspenso para mitigar ataques.
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#050505] flex items-center justify-between">
          <button
            onClick={onChangeMasterPassword}
            className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 font-mono"
          >
            <KeyRound className="w-3.5 h-3.5" /> Alterar Senha Mestra
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-colors font-mono"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : null}
            <span>Salvar Configurações</span>
          </button>
        </div>

      </div>
    </div>
  );
};
