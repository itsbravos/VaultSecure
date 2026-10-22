import React, { useState } from 'react';
import {
  X,
  Key,
  CreditCard,
  FileText,
  FileCheck,
  Code2,
  Dices,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  QrCode,
  Tag as TagIcon,
  FolderPlus,
  ShieldAlert,
  Paperclip,
  FileUp,
} from 'lucide-react';
import { VaultItem, ItemCategory, CustomField, VaultSettings, VaultAttachment } from '../types';
import { calculatePasswordStrength, generatePassword, isLocalLeakedPassword, randomString } from '../lib/crypto';
import { getAccent, getTheme, strengthTone } from '../lib/theme';
import { alertDialog } from './DialogHost';
import { tr } from '../lib/i18n';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<VaultItem>) => void;
  initialItem?: VaultItem | null;
  settings?: VaultSettings;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  settings,
}) => {
  if (!isOpen) return null;

  const [category, setCategory] = useState<ItemCategory>(initialItem?.category || 'login');
  const [title, setTitle] = useState(initialItem?.title || '');
  const [username, setUsername] = useState(initialItem?.username || '');
  const [email, setEmail] = useState(initialItem?.email || '');
  const [password, setPassword] = useState(initialItem?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [url, setUrl] = useState(initialItem?.url || '');
  const [notes, setNotes] = useState(initialItem?.notes || '');
  const [totpSecret, setTotpSecret] = useState(initialItem?.totpSecret || '');
  const [tagsInput, setTagsInput] = useState(initialItem?.tags?.join(', ') || '');
  const [favorite, setFavorite] = useState(initialItem?.favorite || false);

  // Card specific
  const [cardNumber, setCardNumber] = useState(initialItem?.cardNumber || '');
  const [cardHolder, setCardHolder] = useState(initialItem?.cardHolder || '');
  const [cardExpiry, setCardExpiry] = useState(initialItem?.cardExpiry || '');
  const [cardCvc, setCardCvc] = useState(initialItem?.cardCvc || '');

  // Custom Fields
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialItem?.customFields || []
  );

  // Encrypted Attachments
  const [attachments, setAttachments] = useState<VaultAttachment[]>(
    initialItem?.attachments || []
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 3 * 1024 * 1024) {
        alertDialog(tr("\"{p0}\" é grande demais", { p0: file.name }), tr("Anexos podem ter no máximo 3 MB."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const newAtt: VaultAttachment = {
          id: `att-${Date.now()}-${randomString(8)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl: reader.result as string,
          createdAt: Date.now(),
        };
        setAttachments(prev => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleGeneratePassword = () => {
    const newPass = generatePassword({
      length: 18,
      useUppercase: true,
      useLowercase: true,
      useNumbers: true,
      useSymbols: true,
      avoidAmbiguous: true,
      passphraseMode: false,
      wordCount: 4,
      wordSeparator: '-',
    });
    setPassword(newPass);
    setShowPassword(true);
  };

  const handleAddCustomField = () => {
    setCustomFields([
      ...customFields,
      { id: Date.now().toString(), label: '', value: '', type: 'text' },
    ]);
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    let passwordHistory = initialItem?.passwordHistory || [];
    if (initialItem && initialItem.password && password && initialItem.password !== password) {
      passwordHistory = [
        ...passwordHistory,
        {
          id: `hist-${Date.now()}-${randomString(8)}`,
          password: initialItem.password,
          updatedAt: initialItem.updatedAt || Date.now(),
        },
      ];
    }

    onSave({
      id: initialItem?.id || `item-${Date.now()}`,
      title,
      category,
      username,
      email,
      password,
      passwordHistory,
      url,
      notes,
      totpSecret: totpSecret.toUpperCase().replace(/\s+/g, ''),
      tags,
      favorite,
      customFields,
      attachments,
      cardNumber,
      cardHolder,
      cardExpiry,
      cardCvc,
      updatedAt: Date.now(),
      createdAt: initialItem?.createdAt || Date.now(),
    });

    onClose();
  };

  const passStrength = password ? calculatePasswordStrength(password) : null;

  const activeTheme = getTheme(settings?.theme);
  const activeAccent = getAccent(settings?.accentColor, getTheme(settings?.theme).isLight);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className={`w-full max-w-xl ${activeTheme.bgCard} border ${activeTheme.borderMain} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${activeTheme.depthShadow}`}>
        
        {/* Header */}
        <div className={`p-5 border-b ${activeTheme.borderMain} ${activeTheme.bgCardInner} flex items-center justify-between`}>
          <h3 className={`text-sm font-bold ${activeTheme.textPrimary} flex items-center gap-2`}>
            <Key className={`w-4 h-4 ${activeAccent.textAccent}`} />
            {initialItem ? tr("Editar Credencial") : tr("Novo Registro no Cofre")}
          </h3>
          <button onClick={onClose} className={`p-2 rounded-lg ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary} transition-colors border ${activeTheme.borderMain}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("Categoria do Registro")}</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs font-medium">
              {[
                { id: 'login', label: tr("Login"), icon: Key },
                { id: 'card', label: tr("Cartão"), icon: CreditCard },
                { id: 'note', label: tr("Nota"), icon: FileText },
                { id: 'certificate', label: tr("Certificado"), icon: FileCheck },
                { id: 'api_key', label: 'API/SSH', icon: Code2 },
                ...(settings?.customCategories || []).map(cc => ({
                  id: cc.id,
                  label: cc.name,
                  icon: FolderPlus,
                })),
              ].map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as ItemCategory)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      isSelected
                        ? `${activeAccent.badgeBg} ${activeAccent.borderAccent} ${activeAccent.textAccent} font-semibold`
                        : `${activeTheme.bgInput} ${activeTheme.borderMain} ${activeTheme.textSecondary} ${activeTheme.hoverBg}`
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[11px] truncate max-w-[80px]">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("Título / Nome do Serviço")}</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={tr("Ex: Conta Google, Banco Itaú, AWS SSH")}
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2.5 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent} ${activeAccent.borderAccent}`}
            />
          </div>

          {/* LOGIN / EMAIL FIELDS */}
          {(category === 'login' || category === 'api_key') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("Nome de Usuário")}</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={tr("ex: admin, usuario123")}
                  className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2.5 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("E-mail de Login")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={tr("ex: usuario@email.com")}
                  className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2.5 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent}`}
                />
              </div>
            </div>
          )}

          {/* PASSWORD FIELD WITH GENERATOR */}
          {category !== 'note' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("Senha / Chave Secreta")}</label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className={`text-xs ${activeAccent.textAccent} hover:underline flex items-center gap-1 font-semibold`}
                >
                  <Dices className="w-3.5 h-3.5 " /> {tr("Gerar senha forte")}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2.5 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent} font-mono pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-2.5 ${activeTheme.textMuted}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {isLocalLeakedPassword(password) && (
                <div className={`p-2.5 ${activeTheme.isLight ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-orange-950/90 border-orange-800 text-orange-300'} rounded-xl text-xs flex items-center justify-between`}>
                  <span className="flex items-center gap-1.5 font-bold text-[11px]">
                    <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0 " />
                    {tr("ATENÇÃO: Esta senha é conhecida por ter sido vazada na internet!")}
                  </span>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className={`text-[11px] font-bold ${activeTheme.isLight ? 'text-orange-900 hover:text-orange-950' : 'text-orange-200 hover:text-white'} underline shrink-0 ml-2`}
                  >
                    {tr("Gerar Segura")}
                  </button>
                </div>
              )}

              {passStrength && (
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className={`${activeTheme.textMuted}`}>{tr("Força da Senha:")}</span>
                  <span className={`font-medium ${strengthTone(passStrength.score, activeTheme.isLight)}`}>
                    {tr(passStrength.label)} ({passStrength.score}%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* CREDIT CARD FIELDS */}
          {category === 'card' && (
            <div className={`space-y-3 p-3 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner}`}>
              <div className="space-y-1">
                <label className={`text-xs ${activeTheme.textMuted}`}>{tr("Nome impresso no Cartão")}</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={e => setCardHolder(e.target.value)}
                  placeholder={tr("Ex: NOME SOBRENOME")}
                  className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-lg p-2 text-xs ${activeTheme.textPrimary} font-mono`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className={`text-xs ${activeTheme.textMuted}`}>{tr("Número do Cartão")}</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    placeholder="4000 0000 0000 0000"
                    className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-lg p-2 text-xs ${activeTheme.textPrimary} font-mono`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={`text-xs ${activeTheme.textMuted}`}>{tr("Validade")}</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                    placeholder="MM/AA"
                    className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-lg p-2 text-xs ${activeTheme.textPrimary} font-mono`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ACCOUNT TOTP SECRET (GOOGLE AUTHENTICATOR FOR THIS SPECIFIC SERVICE) */}
          {category === 'login' && (
            <div className="space-y-1.5">
              <label className={`text-xs font-bold ${activeTheme.textMuted} flex items-center gap-1.5`}>
                <QrCode className={`w-3.5 h-3.5 ${activeAccent.textAccent}`} />
                {tr("Segredo TOTP (2FA da Conta - Opcional)")}
              </label>
              <input
                type="text"
                value={totpSecret}
                onChange={e => setTotpSecret(e.target.value)}
                placeholder={tr("Ex: JBSWY3DPEHPK3PXP")}
                className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent}`}
              />
              <span className={`text-xs ${activeTheme.textMuted} block`}>
                {tr("Insira a chave Base32 para que o cofre gere códigos 2FA automaticamente.")}
              </span>
            </div>
          )}

          {/* URL */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("URL / Website")}</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://exemplo.com.br"
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2.5 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent}`}
            />
          </div>

          {/* TAGS */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("Tags (Separadas por vírgula)")}</label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder={tr("Pessoal, Trabalho, Importante")}
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent}`}
            />
            {settings?.managedTags && settings.managedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className={`text-xs ${activeTheme.textMuted} self-center`}>{tr("Adicionar tag rápida:")}</span>
                {settings.managedTags.map(mt => {
                  const currentList = tagsInput.split(',').map(t => t.trim().toLowerCase());
                  const isPresent = currentList.includes(mt.toLowerCase());
                  return (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => {
                        if (isPresent) {
                          const updated = currentList.filter(t => t !== mt.toLowerCase()).join(', ');
                          setTagsInput(updated);
                        } else {
                          const updated = tagsInput.trim() ? `${tagsInput}, ${mt}` : mt;
                          setTagsInput(updated);
                        }
                      }}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        isPresent
                          ? `${activeAccent.badgeBg} ${activeAccent.textAccent} ${activeAccent.borderAccent}`
                          : `${activeTheme.bgInput} ${activeTheme.textMuted} ${activeTheme.borderMain}`
                      }`}
                    >
                      #{mt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CUSTOM FIELDS */}
          <div className={`space-y-2 pt-2 border-t ${activeTheme.borderInner}`}>
            <div className="flex justify-between items-center">
              <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("Campos Adicionais")}</label>
              <button
                type="button"
                onClick={handleAddCustomField}
                className={`text-xs ${activeAccent.textAccent} hover:underline flex items-center gap-1 font-semibold`}
              >
                <Plus className="w-3.5 h-3.5" /> {tr("Adicionar Campo")}
              </button>
            </div>

            {customFields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={tr("Rótulo (ex: PIN)")}
                  value={field.label}
                  onChange={e => {
                    const newFields = [...customFields];
                    newFields[idx].label = e.target.value;
                    setCustomFields(newFields);
                  }}
                  className={`w-1/3 ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-2 text-xs ${activeTheme.textPrimary}`}
                />
                <input
                  type="text"
                  placeholder={tr("Valor")}
                  value={field.value}
                  onChange={e => {
                    const newFields = [...customFields];
                    newFields[idx].value = e.target.value;
                    setCustomFields(newFields);
                  }}
                  className={`flex-1 ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-2 text-xs ${activeTheme.textPrimary}`}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(field.id)}
                  className={`p-2 ${activeTheme.textMuted} hover:text-red-400`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* NOTES */}
          <div className={`space-y-1.5 pt-2 border-t ${activeTheme.borderInner}`}>
            <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("Notas / Observações Criptografadas")}</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={tr("Escreva anotações secretas aqui...")}
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-3 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent}`}
            />
          </div>

          {/* ENCRYPTED ATTACHMENTS */}
          <div className={`space-y-2 pt-2 border-t ${activeTheme.borderInner}`}>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold ${activeTheme.textMuted} flex items-center gap-1.5`}>
                <Paperclip className={`w-3.5 h-3.5 ${activeAccent.textAccent}`} /> {tr("Anexos Criptografados (Documentos / Imagens)")}
              </label>
              <label className={`cursor-pointer text-xs ${activeAccent.textAccent} hover:underline flex items-center gap-1 font-semibold`}>
                <FileUp className="w-3.5 h-3.5" />
                <span>{tr("Anexar Arquivo")}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-1.5">
                {attachments.map(att => (
                  <div
                    key={att.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgCardInner} text-xs`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className={`truncate max-w-[220px] ${activeTheme.textPrimary}`}>{att.name}</span>
                      <span className={`text-xs ${activeTheme.textMuted}`}>({(att.size / 1024).toFixed(1)} {tr("KB)")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      title={tr("Remover anexo")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-[11px] ${activeTheme.textMuted} italic`}>
                {tr("Nenhum arquivo anexado. Você pode anexar fotos de RG, comprovantes ou notas em PDF de até 3MB.")}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className={`pt-4 border-t ${activeTheme.borderInner} flex justify-end gap-3`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary} text-xs font-semibold border ${activeTheme.borderMain} transition-colors`}
            >
              {tr("Cancelar")}
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white text-xs font-bold ${activeAccent.shadowAccent} transition-colors cursor-pointer`}
            >
              {tr("Salvar Criptografado")}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
