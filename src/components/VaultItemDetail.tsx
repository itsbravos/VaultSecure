import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Edit2,
  Star,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Globe,
  Tag,
  CreditCard,
  FileText,
  FileCheck,
  Code2,
  History,
  RotateCcw,
  Zap,
  Sparkles,
  MousePointerClick,
  Paperclip,
  Download,
} from 'lucide-react';
import { VaultItem, VaultSettings } from '../types';
import { calculatePasswordStrength, isLocalLeakedPassword } from '../lib/crypto';
import { generateTOTP, getTotpRemainingSeconds } from '../lib/totp';
import { getAccent, getTheme } from '../lib/theme';
import { ItemIcon } from './ItemIcon';

interface VaultItemDetailProps {
  item: VaultItem | null;
  onClose: () => void;
  onEdit: (item: VaultItem) => void;
  onDelete: (itemId: string) => void;
  onCopyText: (text: string, label: string) => void;
  copiedId: string | null;
  onSaveItem?: (updatedItem: VaultItem) => void;
  settings?: VaultSettings;
}

export const VaultItemDetail: React.FC<VaultItemDetailProps> = ({
  item,
  onClose,
  onEdit,
  onDelete,
  onCopyText,
  copiedId,
  onSaveItem,
  settings,
}) => {
  if (!item) return null;

  const activeTheme = getTheme(settings?.theme);
  const activeAccent = getAccent(settings?.accentColor);

  const [showPassword, setShowPassword] = useState(false);
  const [isMinimalMode, setIsMinimalMode] = useState(false);
  const [totpCode, setTotpCode] = useState<string | null>(null);
  const [totpSeconds, setTotpSeconds] = useState(getTotpRemainingSeconds());
  const [showHistoryPasswords, setShowHistoryPasswords] = useState<{ [key: string]: boolean }>({});

  const toggleShowHistoryPassword = (histId: string) => {
    setShowHistoryPasswords(prev => ({
      ...prev,
      [histId]: !prev[histId],
    }));
  };

  const handleRestorePasswordVersion = (targetPassword: string) => {
    if (!item || !onSaveItem) return;
    if (confirm('Deseja restaurar esta senha antiga? A senha atual será arquivada no histórico de versões.')) {
      const currentPassword = item.password || '';
      const existingHistory = item.passwordHistory || [];
      const newHistoryEntry = currentPassword
        ? [{ id: crypto.randomUUID(), password: currentPassword, updatedAt: Date.now() }]
        : [];
      
      // Filter out the target password from history if present
      const filteredHistory = existingHistory.filter(h => h.password !== targetPassword);

      const updatedItem: VaultItem = {
        ...item,
        password: targetPassword,
        passwordHistory: [...filteredHistory, ...newHistoryEntry],
        updatedAt: Date.now(),
      };

      onSaveItem(updatedItem);
      onCopyText(targetPassword, 'Senha Restaurada');
    }
  };

  // Live Account TOTP Generator (if item has account 2FA secret)
  useEffect(() => {
    if (item.totpSecret) {
      const updateCode = async () => {
        const code = await generateTOTP(item.totpSecret!);
        setTotpCode(code);
        setTotpSeconds(getTotpRemainingSeconds());
      };
      updateCode();

      const interval = setInterval(() => {
        updateCode();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [item.totpSecret]);

  const passStrength = item.password ? calculatePasswordStrength(item.password) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-lg ${activeTheme.bgCard} border ${activeTheme.borderMain} rounded-2xl ${activeTheme.depthShadow} overflow-hidden flex flex-col max-h-[90vh]`}>
        
        {/* Modal Header */}
        <div className={`p-5 border-b ${activeTheme.borderMain} flex items-start justify-between gap-4 ${activeTheme.bgCard}`}>
          <div className="flex items-center gap-3">
            <ItemIcon item={item} settings={settings} size="lg" />
            <div>
              <h3 className={`text-base font-bold ${activeTheme.textPrimary}`}>{item.title}</h3>
              <p className={`text-xs ${activeTheme.textMuted} font-mono`}>
                {item.username || item.email || item.cardHolder || 'Credencial Criptografada'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimalMode(!isMinimalMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                isMinimalMode
                  ? `${activeAccent.badgeBg} ${activeAccent.textAccent} ${activeAccent.borderAccent} shadow-sm font-bold`
                  : `${activeTheme.bgInput} ${activeTheme.textSecondary} ${activeTheme.borderMain} ${activeTheme.hoverBg}`
              }`}
              title="Alternar Modo Leitura Minimalista (Cópia Rápida)"
            >
              <Zap className={`w-3.5 h-3.5 ${isMinimalMode ? `${activeAccent.textAccent} animate-pulse` : activeTheme.textMuted}`} />
              <span className="hidden sm:inline">{isMinimalMode ? 'Modo Normal' : 'Modo Minimalista'}</span>
            </button>
            <button
              onClick={() => onEdit(item)}
              className={`p-2 rounded-lg ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary} transition-colors border ${activeTheme.borderMain}`}
              title="Editar Item"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary} transition-colors border ${activeTheme.borderMain}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* MODO LEITURA MINIMALISTA (BOTÕES GIGANTES DE CÓPIA RÁPIDA) */}
          {isMinimalMode ? (
            <div className="space-y-4 animate-fade-in">
              <div className={`p-3.5 rounded-2xl border ${activeAccent.borderAccent} ${activeAccent.badgeBg} flex items-center gap-3 ${activeAccent.textAccent} text-xs font-mono`}>
                <MousePointerClick className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Modo Leitura Minimalista</p>
                  <p className="text-[10px] opacity-80">Toque em qualquer botão para copiar instantaneamente sem poluição visual.</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* COPIAR USUÁRIO */}
                {(item.username || item.email) && (
                  <button
                    type="button"
                    onClick={() => onCopyText(item.username || item.email!, 'Usuário/Email')}
                    className={`w-full p-4 rounded-2xl ${activeTheme.bgInput} border ${activeTheme.borderInner} hover:${activeAccent.borderAccent} transition-all flex items-center justify-between group cursor-pointer text-left`}
                  >
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.textMuted} font-mono block`}>
                        Usuário / E-mail
                      </span>
                      <span className={`text-sm font-mono font-bold ${activeTheme.textPrimary} group-hover:${activeAccent.textAccent} transition-colors block truncate max-w-[280px]`}>
                        {item.username || item.email}
                      </span>
                    </div>
                    <div className={`px-3 py-2 ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} text-xs font-bold font-mono rounded-xl flex items-center gap-1.5 shrink-0 group-hover:scale-105 transition-transform`}>
                      {copiedId === (item.username || item.email) ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedId === (item.username || item.email) ? 'COPIADO!' : 'COPIAR USUÁRIO'}</span>
                    </div>
                  </button>
                )}

                {/* COPIAR SENHA */}
                {item.password && (
                  <button
                    type="button"
                    onClick={() => onCopyText(item.password!, 'Senha')}
                    className={`w-full p-4 rounded-2xl ${activeTheme.bgInput} border ${activeTheme.borderInner} hover:${activeAccent.borderAccent} transition-all flex items-center justify-between group cursor-pointer text-left`}
                  >
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.textMuted} font-mono block`}>
                        Senha Secreta
                      </span>
                      <span className={`text-sm font-mono font-bold ${activeTheme.textPrimary} group-hover:${activeAccent.textAccent} transition-colors block tracking-widest`}>
                        ••••••••••••••••
                      </span>
                    </div>
                    <div className={`px-3 py-2 ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} text-xs font-bold font-mono rounded-xl flex items-center gap-1.5 shrink-0 group-hover:scale-105 transition-transform`}>
                      {copiedId === item.password ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedId === item.password ? 'COPIADA!' : 'COPIAR SENHA'}</span>
                    </div>
                  </button>
                )}

                {/* COPIAR TOTP 2FA */}
                {item.totpSecret && (
                  <button
                    type="button"
                    onClick={() => totpCode && onCopyText(totpCode, 'Código 2FA')}
                    className={`w-full p-4 rounded-2xl ${activeTheme.bgInput} border ${activeAccent.borderAccent} transition-all flex items-center justify-between group cursor-pointer text-left`}
                  >
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeAccent.textAccent} font-mono flex items-center gap-1`}>
                        <QrCode className="w-3.5 h-3.5" /> Authenticator 2FA ({totpSeconds}s)
                      </span>
                      <span className={`text-xl font-mono font-extrabold ${activeAccent.textAccent} tracking-[0.3em] block`}>
                        {totpCode || '000000'}
                      </span>
                    </div>
                    <div className={`px-3 py-2 ${activeAccent.bgBtn} text-white text-xs font-extrabold font-mono rounded-xl flex items-center gap-1.5 shrink-0 group-hover:scale-105 transition-transform ${activeAccent.shadowAccent}`}>
                      {copiedId === totpCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedId === totpCode ? 'COPIADO!' : 'COPIAR 2FA'}</span>
                    </div>
                  </button>
                )}

                {/* COPIAR URL */}
                {item.url && (
                  <button
                    type="button"
                    onClick={() => onCopyText(item.url!, 'URL')}
                    className={`w-full p-4 rounded-2xl ${activeTheme.bgInput} border ${activeTheme.borderInner} hover:${activeAccent.borderAccent} transition-all flex items-center justify-between group cursor-pointer text-left`}
                  >
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.textMuted} font-mono block`}>
                        Endereço Web / URL
                      </span>
                      <span className={`text-xs font-mono ${activeAccent.textAccent} block truncate max-w-[280px]`}>
                        {item.url}
                      </span>
                    </div>
                    <div className={`px-3 py-2 ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} text-xs font-bold font-mono rounded-xl flex items-center gap-1.5 shrink-0 group-hover:scale-105 transition-transform`}>
                      {copiedId === item.url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedId === item.url ? 'COPIADO!' : 'COPIAR LINK'}</span>
                    </div>
                  </button>
                )}

                {/* COPIAR CARTÃO DE CRÉDITO */}
                {item.category === 'card' && item.cardNumber && (
                  <button
                    type="button"
                    onClick={() => onCopyText(item.cardNumber!, 'Número do Cartão')}
                    className={`w-full p-4 rounded-2xl ${activeTheme.bgInput} border ${activeTheme.borderInner} hover:${activeAccent.borderAccent} transition-all flex items-center justify-between group cursor-pointer text-left`}
                  >
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.textMuted} font-mono block`}>
                        Número do Cartão de Crédito
                      </span>
                      <span className={`text-sm font-mono font-bold ${activeTheme.textPrimary} block`}>
                        {item.cardNumber}
                      </span>
                    </div>
                    <div className={`px-3 py-2 ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} text-xs font-bold font-mono rounded-xl flex items-center gap-1.5 shrink-0`}>
                      {copiedId === item.cardNumber ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>COPIAR CARTÃO</span>
                    </div>
                  </button>
                )}

                {/* COPIAR OBSERVAÇÕES / NOTAS */}
                {item.notes && (
                  <button
                    type="button"
                    onClick={() => onCopyText(item.notes!, 'Notas')}
                    className={`w-full p-4 rounded-2xl ${activeTheme.bgInput} border ${activeTheme.borderInner} hover:${activeAccent.borderAccent} transition-all flex items-center justify-between group cursor-pointer text-left`}
                  >
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.textMuted} font-mono block`}>
                        Anotações do Registro
                      </span>
                      <span className={`text-xs font-mono ${activeTheme.textSecondary} block truncate max-w-[280px]`}>
                        {item.notes}
                      </span>
                    </div>
                    <div className={`px-3 py-2 ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} text-xs font-bold font-mono rounded-xl flex items-center gap-1.5 shrink-0`}>
                      {copiedId === item.notes ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>COPIAR NOTAS</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* LOGIN CREDENTIALS SECTION */}
          {(item.username || item.email) && (
            <div className="space-y-1.5">
              <label className={`text-[10px] uppercase font-bold ${activeTheme.textMuted} tracking-wider font-mono`}>Usuário / E-mail</label>
              <div className={`${activeTheme.bgInput} border ${activeTheme.borderInner} rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-mono ${activeTheme.textPrimary}`}>
                <span>{item.username || item.email}</span>
                <button
                  onClick={() => onCopyText(item.username || item.email!, 'Usuário/Email')}
                  className={`${activeAccent.textAccent} hover:opacity-80 font-semibold text-xs flex items-center gap-1 transition-colors`}
                  title="Copiar"
                >
                  {copiedId === (item.username || item.email) ? <Check className={`w-3.5 h-3.5 ${activeAccent.textAccent}`} /> : <Copy className="w-3.5 h-3.5" />}
                  COPIAR
                </button>
              </div>
            </div>
          )}

          {/* PASSWORD FIELD & HISTORY */}
          {item.password && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className={`text-[10px] uppercase font-bold ${activeTheme.textMuted} tracking-wider font-mono`}>Senha Atual Criptografada</label>
                  {passStrength && (
                    <span className={`font-mono text-[11px] font-semibold ${passStrength.color.split(' ')[0]}`}>
                      {passStrength.label} ({passStrength.crackTime})
                    </span>
                  )}
                </div>
                <div className={`${activeTheme.bgInput} border ${activeTheme.borderInner} rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-mono ${activeTheme.textPrimary}`}>
                  <span className="tracking-wider">
                    {showPassword ? item.password : '••••••••••••••••••••'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className={`${activeTheme.textMuted} hover:${activeTheme.textPrimary}`}
                      title="Alternar Visibilidade"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => onCopyText(item.password!, 'Senha')}
                      className={`${activeAccent.textAccent} hover:opacity-80 font-semibold text-xs flex items-center gap-1 transition-colors`}
                    >
                      {copiedId === item.password ? <Check className={`w-3.5 h-3.5 ${activeAccent.textAccent}`} /> : <Copy className="w-3.5 h-3.5" />}
                      COPIAR
                    </button>
                  </div>
                </div>

                {item.password && isLocalLeakedPassword(item.password) && (
                  <div className={`p-3 ${activeTheme.isLight ? 'bg-orange-100 border-orange-300 text-orange-900' : 'bg-orange-950/90 border-orange-800 text-orange-300'} rounded-xl text-xs font-mono flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0 animate-pulse" />
                      <div>
                        <p className="font-bold">Senha Encontrada em Vazamentos Públicos!</p>
                        <p className={`text-[10px] ${activeTheme.isLight ? 'text-orange-700' : 'text-orange-400'}`}>Esta senha consta na lista de vazamentos conhecidos na internet. Altere imediatamente.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onEdit(item)}
                      className="px-3 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors shrink-0 ml-2 shadow-sm"
                    >
                      Alterar
                    </button>
                  </div>
                )}

                {item.password && !isLocalLeakedPassword(item.password) && passStrength && passStrength.score < 50 && (
                  <div className={`p-3 ${activeTheme.isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-950/90 border-amber-800 text-amber-300'} rounded-xl text-xs font-mono flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-bold">Senha Vulnerável (Abaixo de 50 bits)</p>
                        <p className={`text-[10px] ${activeTheme.isLight ? 'text-amber-700' : 'text-amber-400'}`}>Fortaleça sua senha com mais caracteres e símbolos.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onEdit(item)}
                      className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0 ml-2 shadow-sm"
                    >
                      Fortalecer
                    </button>
                  </div>
                )}
              </div>

              {/* Password Version History Sub-Section */}
              <div className={`${activeTheme.bgInput} border ${activeTheme.borderInner} rounded-xl p-3.5 space-y-2.5`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`text-[10px] uppercase font-bold ${activeAccent.textAccent} tracking-wider font-mono flex items-center gap-1.5`}>
                    <History className="w-3.5 h-3.5" />
                    Histórico de Versões da Senha ({item.passwordHistory?.length || 0})
                  </span>
                </div>

                {!item.passwordHistory || item.passwordHistory.length === 0 ? (
                  <p className={`text-[11px] ${activeTheme.textMuted} font-mono italic`}>
                    Nenhuma versão anterior registrada. As senhas anteriores serão salvas automaticamente quando modificadas.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {item.passwordHistory.slice().reverse().map((hist, idx) => (
                      <div
                        key={hist.id || idx}
                        className={`${activeTheme.bgCardInner} border ${activeTheme.borderInner} rounded-lg p-2.5 flex items-center justify-between text-xs font-mono`}
                      >
                        <div className="space-y-0.5">
                          <p className={`${activeTheme.textSecondary} font-semibold tracking-wider`}>
                            {showHistoryPasswords[hist.id] ? hist.password : '••••••••••••'}
                          </p>
                          <p className={`text-[10px] ${activeTheme.textMuted}`}>
                            Versão de {new Date(hist.updatedAt).toLocaleString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleShowHistoryPassword(hist.id)}
                            className={`${activeTheme.textMuted} hover:${activeTheme.textPrimary} p-1`}
                            title="Mostrar/Ocultar"
                          >
                            {showHistoryPasswords[hist.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopyText(hist.password, 'Senha Antiga')}
                            className={`p-1 ${activeTheme.textMuted} hover:${activeAccent.textAccent}`}
                            title="Copiar Versão"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestorePasswordVersion(hist.password)}
                            className={`px-2 py-1 ${activeAccent.badgeBg} ${activeAccent.textAccent} border ${activeAccent.borderAccent} rounded text-[10px] font-semibold flex items-center gap-1 transition-colors`}
                            title="Restaurar esta versão de senha"
                          >
                            <RotateCcw className="w-3 h-3" /> Restaurar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WEBSITE URL */}
          {item.url && (
            <div className="space-y-1.5">
              <label className={`text-[10px] uppercase font-bold ${activeTheme.textMuted} tracking-wider font-mono`}>Endereço / URL</label>
              <div className={`${activeTheme.bgInput} border ${activeTheme.borderInner} rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs ${activeTheme.textSecondary} font-mono`}>
                <span className="truncate">{item.url}</span>
                <a
                  href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${activeAccent.textAccent} hover:opacity-80 flex items-center gap-1 shrink-0 ml-2 font-semibold`}
                >
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* LIVE ACCOUNT 2FA TOTP CODE (IF CONFIGURED FOR THIS ITEM) */}
          {item.totpSecret && (
            <div className={`p-4 ${activeAccent.badgeBg} border ${activeAccent.borderAccent} rounded-xl space-y-2`}>
              <div className={`flex items-center justify-between text-xs ${activeAccent.textAccent} font-mono`}>
                <span className="flex items-center gap-1.5 font-semibold">
                  <QrCode className="w-4 h-4" /> Authenticator 2FA Ativo
                </span>
                <span className="text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {totpSeconds}s
                </span>
              </div>

              <div className={`flex items-center justify-between ${activeTheme.bgInput} p-3 rounded-lg border ${activeTheme.borderInner}`}>
                <span className={`text-xl font-mono tracking-[0.4em] font-bold ${activeAccent.textAccent}`}>
                  {totpCode || '000000'}
                </span>
                <button
                  onClick={() => totpCode && onCopyText(totpCode, 'Código 2FA')}
                  className={`px-3 py-1.5 ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white rounded text-xs font-semibold font-mono transition-colors`}
                >
                  COPIAR 2FA
                </button>
              </div>
            </div>
          )}

          {/* CREDIT CARD FIELDS */}
          {item.category === 'card' && (
            <div className="grid grid-cols-2 gap-3">
              <div className={`space-y-1 ${activeTheme.bgInput} p-3 rounded-xl border ${activeTheme.borderInner}`}>
                <span className={`text-[10px] ${activeTheme.textMuted} uppercase font-mono`}>Número</span>
                <p className={`text-xs font-mono ${activeTheme.textPrimary}`}>{item.cardNumber || '—'}</p>
              </div>
              <div className={`space-y-1 ${activeTheme.bgInput} p-3 rounded-xl border ${activeTheme.borderInner}`}>
                <span className={`text-[10px] ${activeTheme.textMuted} uppercase font-mono`}>Validade / CVC</span>
                <p className={`text-xs font-mono ${activeTheme.textPrimary}`}>
                  {item.cardExpiry || '—'} (CVC: {item.cardCvc || '—'})
                </p>
              </div>
            </div>
          )}

          {/* CUSTOM FIELDS */}
          {item.customFields && item.customFields.length > 0 && (
            <div className={`space-y-2 pt-2 border-t ${activeTheme.borderInner}`}>
              <span className={`text-[10px] uppercase font-bold ${activeTheme.textMuted} tracking-wider font-mono`}>Campos Personalizados</span>
              <div className="space-y-2">
                {item.customFields.map(field => (
                  <div key={field.id} className={`${activeTheme.bgInput} p-3 rounded-xl border ${activeTheme.borderInner} flex justify-between items-center text-xs`}>
                    <span className={`${activeTheme.textMuted} font-mono`}>{field.label}:</span>
                    <span className={`${activeTheme.textPrimary} font-mono font-medium`}>{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTES */}
          {item.notes && (
            <div className={`space-y-1.5 pt-2 border-t ${activeTheme.borderInner}`}>
              <label className={`text-[10px] uppercase font-bold ${activeTheme.textMuted} tracking-wider font-mono`}>Notas / Observações</label>
              <div className={`${activeTheme.bgInput} border ${activeTheme.borderInner} rounded-xl p-3 text-xs ${activeTheme.textSecondary} font-mono whitespace-pre-wrap`}>
                {item.notes}
              </div>
            </div>
          )}

          {/* ENCRYPTED ATTACHMENTS */}
          {item.attachments && item.attachments.length > 0 && (
            <div className={`space-y-2 pt-2 border-t ${activeTheme.borderInner}`}>
              <label className={`text-[10px] uppercase font-bold ${activeTheme.textMuted} tracking-wider font-mono flex items-center gap-1.5`}>
                <Paperclip className={`w-3.5 h-3.5 ${activeAccent.textAccent}`} /> Anexos Criptografados
              </label>
              <div className="space-y-2 font-mono">
                {item.attachments.map(att => (
                  <div
                    key={att.id}
                    className={`p-3 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgInput} flex items-center justify-between gap-3 text-xs`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`w-8 h-8 rounded-lg ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} flex items-center justify-center shrink-0`}>
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className={`font-bold ${activeTheme.textPrimary} truncate`}>{att.name}</p>
                        <p className={`text-[10px] ${activeTheme.textMuted}`}>{(att.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>

                    <a
                      href={att.dataUrl}
                      download={att.name}
                      className={`px-3 py-1.5 rounded-lg ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white text-[11px] font-bold flex items-center gap-1.5 shadow transition-colors shrink-0`}
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAGS & METADATA */}
          <div className={`pt-2 border-t ${activeTheme.borderInner} flex items-center justify-between text-[11px] ${activeTheme.textMuted} font-mono`}>
            <span>Criado em: {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
            <div className="flex gap-1">
              {item.tags.map((t, idx) => (
                <span key={idx} className={`${activeTheme.bgInput} ${activeTheme.textMuted} px-2 py-0.5 rounded text-[10px] border ${activeTheme.borderInner}`}>
                  #{t}
                </span>
              ))}
            </div>
          </div>
          </>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t ${activeTheme.borderMain} ${activeTheme.bgCardInner} flex items-center justify-between`}>
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir este registro do cofre?')) {
                onDelete(item.id);
                onClose();
              }
            }}
            className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-300 text-xs rounded-lg flex items-center gap-1.5 transition-colors font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir Item
          </button>

          <button
            onClick={onClose}
            className={`px-4 py-2 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textPrimary} text-xs font-semibold rounded-lg border ${activeTheme.borderMain}`}
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
