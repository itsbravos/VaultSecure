import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AuthSession,
  VaultItem,
  VaultSettings,
  ItemCategory,
  SecurityReport,
} from './types';
import {
  isVaultInitialized,
  loadVaultSettings,
  saveVaultSettings,
  loadEncryptedVaultItems,
  saveEncryptedVaultItems,
  generateSecurityAuditReport,
  DEFAULT_SETTINGS,
  clearAllVaultData,
  changeMasterPassword,
  DECOY_DURESS_ITEMS,
} from './lib/storage';

import { LockScreen } from './components/LockScreen';
import { VaultHeader } from './components/VaultHeader';
import { VaultSidebar } from './components/VaultSidebar';
import { VaultItemList } from './components/VaultItemList';
import { VaultItemDetail } from './components/VaultItemDetail';
import { ItemFormModal } from './components/ItemFormModal';
import { PasswordGeneratorModal } from './components/PasswordGeneratorModal';
import { SecurityAuditView } from './components/SecurityAuditView';
import { TwoFactorSetupModal } from './components/TwoFactorSetupModal';
import { DigitalCertSetupModal } from './components/DigitalCertSetupModal';
import { SettingsModal } from './components/SettingsModal';
import { BackupExportModal } from './components/BackupExportModal';
import { CategoryTagManagerModal } from './components/CategoryTagManagerModal';
import { SettingsView } from './components/SettingsView';
import { BackupView } from './components/BackupView';
import { CertificatesView } from './components/CertificatesView';
import { PasswordGeneratorView } from './components/PasswordGeneratorView';
import { AutoFillCompanionModal } from './components/AutoFillCompanionModal';
import { ChangeMasterPasswordModal } from './components/ChangeMasterPasswordModal';
import { ClipboardWarningBanner } from './components/ClipboardWarningBanner';
import { ZeroKnowledgeOnboardingModal } from './components/ZeroKnowledgeOnboardingModal';
import { getTheme, getAccent } from './lib/theme';
import { motion, AnimatePresence } from 'motion/react';

import { Check, ShieldCheck, Lock, AlertCircle } from 'lucide-react';

export default function App() {
  // Vault Settings State
  const [settings, setSettings] = useState<VaultSettings>(() => loadVaultSettings());

  // Session Auth State
  const [session, setSession] = useState<AuthSession>(() => {
    const initialized = isVaultInitialized();
    return {
      isVaultInitialized: initialized,
      isUnlocked: false,
      masterKey: null,
      salt: null,
      lastActivity: Date.now(),
      step: 'master_pass',
      passedMasterPass: false,
      passedTotp: false,
      passedCert: false,
      failedAttempts: 0,
    };
  });

  // Decrypted Vault Items in Memory
  const [items, setItems] = useState<VaultItem[]>([]);

  // Navigation & Filter State
  const [activeView, setActiveView] = useState<'items' | 'generator' | 'audit' | 'settings' | 'certificates' | 'backup'>('items');
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Selected Items State
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [is2FAWizardOpen, setIs2FAWizardOpen] = useState(false);
  const [isCertWizardOpen, setIsCertWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isAutoFillModalOpen, setIsAutoFillModalOpen] = useState(false);
  const [isChangeMasterPassModalOpen, setIsChangeMasterPassModalOpen] = useState(false);
  const [activeVaultId, setActiveVaultId] = useState<string>('pessoal');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Toast / Clipboard Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clipboardWarning, setClipboardWarning] = useState<{ label: string } | null>(null);

  // Auto-Lock Inactivity Timer State
  const [autoLockSecondsLeft, setAutoLockSecondsLeft] = useState<number>(
    settings.autoLockMinutes > 0 ? settings.autoLockMinutes * 60 : 300
  );

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Lock Vault Action
  const handleLockVault = useCallback(() => {
    setSession(prev => ({
      ...prev,
      isUnlocked: false,
      masterKey: null,
      salt: null,
      step: 'master_pass',
      passedMasterPass: false,
      passedTotp: false,
      passedCert: false,
    }));
    setItems([]);
    setSelectedItem(null);
    showToast('Cofre bloqueado com segurança.');
  }, []);

  // Track User Activity for Auto-Lock Timer
  const updateActivity = useCallback(() => {
    if (session.isUnlocked) {
      setSession(prev => ({ ...prev, lastActivity: Date.now() }));
      if (settings.autoLockMinutes > 0) {
        setAutoLockSecondsLeft(settings.autoLockMinutes * 60);
      }
    }
  }, [session.isUnlocked, settings.autoLockMinutes]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    const handleUserActivity = () => updateActivity();

    events.forEach(evt => window.addEventListener(evt, handleUserActivity));
    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
    };
  }, [updateActivity]);

  // Auto-lock countdown tick effect
  useEffect(() => {
    if (!session.isUnlocked || settings.autoLockMinutes === 0) return;

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - session.lastActivity) / 1000);
      const totalAllowed = settings.autoLockMinutes * 60;
      const remaining = totalAllowed - elapsedSeconds;

      if (remaining <= 0) {
        handleLockVault();
      } else {
        setAutoLockSecondsLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.isUnlocked, session.lastActivity, settings.autoLockMinutes, handleLockVault]);

  // Unlock Vault Handler
  const handleSuccessUnlock = async (masterKey: CryptoKey, salt: Uint8Array, isDuress = false) => {
    try {
      if (isDuress) {
        setItems(DECOY_DURESS_ITEMS);
        setSession(prev => ({
          ...prev,
          isUnlocked: true,
          isDuressMode: true,
          masterKey,
          salt,
          lastActivity: Date.now(),
          step: 'unlocked',
        }));
        showToast('Cofre secundário desbloqueado (Modo Coação).');
        return;
      }

      const decryptedItems = await loadEncryptedVaultItems(masterKey, activeVaultId);
      setItems(decryptedItems);
      setSession(prev => ({
        ...prev,
        isUnlocked: true,
        isDuressMode: false,
        masterKey,
        salt,
        lastActivity: Date.now(),
        step: 'unlocked',
      }));
      if (settings.autoLockMinutes > 0) {
        setAutoLockSecondsLeft(settings.autoLockMinutes * 60);
      }
      showToast('Cofre descriptografado com sucesso.');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao carregar os itens descriptografados.');
    }
  };

  const handleChangeVault = async (newVaultId: string) => {
    setActiveVaultId(newVaultId);
    if (session.masterKey && !session.isDuressMode) {
      const decrypted = await loadEncryptedVaultItems(session.masterKey, newVaultId);
      setItems(decrypted);
      setSelectedItem(null);
      const vaultName = newVaultId === 'pessoal' ? 'Cofre Pessoal' : newVaultId === 'trabalho' ? 'Cofre de Trabalho' : 'Cofre Compartilhado';
      showToast(`Alternado para o ${vaultName}.`);
    }
  };

  // Change Master Password
  const handleChangeMasterPassword = async (currentPass: string, newPass: string) => {
    if (!session.salt) return;
    const res = await changeMasterPassword(currentPass, newPass, items, session.salt);
    setSession(prev => ({
      ...prev,
      masterKey: res.masterKey,
      salt: res.salt,
    }));
    showToast('Senha mestra alterada e cofre re-criptografado com sucesso!');
  };

  // Reset/Reinitialize Vault
  const handleResetVault = () => {
    if (confirm('Tem certeza que deseja apagar o cofre local? Todos os dados armazenados serão permanentemente excluídos.')) {
      clearAllVaultData();
      setItems([]);
      setSettings(DEFAULT_SETTINGS);
      setSession({
        isVaultInitialized: false,
        isUnlocked: false,
        masterKey: null,
        salt: null,
        lastActivity: Date.now(),
        step: 'master_pass',
        passedMasterPass: false,
        passedTotp: false,
        passedCert: false,
        failedAttempts: 0,
      });
      showToast('Cofre resetado.');
    }
  };

  // Global Hotkey Listener (Abrir Cofre: Alt+Shift+V / Ctrl+Shift+V, Auto-Fill: Alt+Shift+A / Ctrl+Shift+A)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isAltShiftV = (e.altKey && e.shiftKey && (e.key === 'V' || e.key === 'v')) || (e.ctrlKey && e.shiftKey && (e.key === 'V' || e.key === 'v'));
      const isAltShiftA = (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) || (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a'));

      if (isAltShiftV) {
        e.preventDefault();
        if (!session.isUnlocked) {
          showToast('Atalho Global: Abrir Cofre acionado!');
        } else {
          setActiveView('items');
          showToast('Atalho Global: Cofre Aberto (Visão Principal)');
        }
      }

      if (isAltShiftA) {
        e.preventDefault();
        setIsAutoFillModalOpen(true);
        showToast('Atalho Global: Assistente de Auto-Preenchimento iniciado!');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [session.isUnlocked]);

  // Save / Add Item
  const handleSaveItem = async (itemData: Partial<VaultItem>) => {
    if (!session.masterKey || !session.salt) return;

    let updatedList: VaultItem[];
    const existingIndex = items.findIndex(i => i.id === itemData.id);

    if (existingIndex >= 0) {
      updatedList = [...items];
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...itemData } as VaultItem;
    } else {
      updatedList = [itemData as VaultItem, ...items];
    }

    setItems(updatedList);
    if (!session.isDuressMode) {
      await saveEncryptedVaultItems(updatedList, session.masterKey, session.salt, activeVaultId);
    }
    showToast('Registro criptografado e salvo com sucesso!');
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!session.masterKey || !session.salt) return;

    const updatedList = items.filter(i => i.id !== itemId);
    setItems(updatedList);
    if (!session.isDuressMode) {
      await saveEncryptedVaultItems(updatedList, session.masterKey, session.salt, activeVaultId);
    }
    showToast('Item removido do cofre.');
  };

  // Toggle Favorite
  const handleToggleFavorite = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.masterKey || !session.salt) return;

    const updatedList = items.map(item => {
      if (item.id === itemId) {
        return { ...item, favorite: !item.favorite };
      }
      return item;
    });

    setItems(updatedList);
    if (!session.isDuressMode) {
      await saveEncryptedVaultItems(updatedList, session.masterKey, session.salt, activeVaultId);
    }
  };

  // Copy to Clipboard with Auto-Clear Timer & Exposure Detector Warning
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setClipboardWarning({ label });
    showToast(`${label} copiado para a área de transferência.`);

    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleClearClipboardNow = () => {
    navigator.clipboard.writeText('');
    setClipboardWarning(null);
    showToast('Área de transferência limpa com sucesso por segurança.');
  };

  // Save Settings
  const handleSaveSettings = (newSettings: VaultSettings) => {
    setSettings(newSettings);
    saveVaultSettings(newSettings);
    showToast('Configurações salvas.');
  };

  // Update 2FA Settings
  const handleSave2FA = (totpSecret: string, backupCodes: string[]) => {
    const updated = {
      ...settings,
      totpSecret,
      require2FA: true,
      totpVerified: true,
      backupCodes,
    };
    setSettings(updated);
    saveVaultSettings(updated);
    showToast('Autenticação de 2 Fatores (Google Authenticator) Ativada!');
  };

  const handleDisable2FA = () => {
    const updated = {
      ...settings,
      require2FA: false,
      totpVerified: false,
    };
    setSettings(updated);
    saveVaultSettings(updated);
    showToast('Autenticação 2FA Desativada.');
  };

  // Update Digital Certificates Settings
  const handleUpdateCertificates = (certs: any[], requireCert: boolean) => {
    const updated = {
      ...settings,
      digitalCertificates: certs,
      requireDigitalCert: requireCert,
    };
    setSettings(updated);
    saveVaultSettings(updated);
    showToast('Certificados digitais atualizados.');
  };

  // Import Backup Items
  const handleImportItems = async (newItems: VaultItem[]) => {
    if (!session.masterKey || !session.salt) return;

    // Merge by id or append
    const existingIds = new Set(items.map(i => i.id));
    const merged = [...items];

    newItems.forEach(item => {
      if (!existingIds.has(item.id)) {
        merged.push(item);
      }
    });

    setItems(merged);
    await saveEncryptedVaultItems(merged, session.masterKey, session.salt);
    showToast(`${newItems.length} registros integrados ao cofre.`);
  };

  // Computed Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: items.length,
      favorites: items.filter(i => i.favorite).length,
      login: 0,
      card: 0,
      note: 0,
      certificate: 0,
      api_key: 0,
    };

    items.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });

    return counts;
  }, [items]);

  // Computed Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (activeCategory === 'favorites' && !item.favorite) return false;
      if (activeCategory !== 'all' && activeCategory !== 'favorites' && item.category !== activeCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchUser = item.username?.toLowerCase().includes(q) || item.email?.toLowerCase().includes(q);
        const matchUrl = item.url?.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        const matchTag = item.tags.some(t => t.toLowerCase().includes(q));

        if (!matchTitle && !matchUser && !matchUrl && !matchNotes && !matchTag) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeCategory, searchQuery]);

  // Security Audit Report
  const securityReport: SecurityReport = useMemo(() => {
    return generateSecurityAuditReport(items);
  }, [items]);

  // RENDER LOCK SCREEN IF LOCKED
  if (!session.isUnlocked) {
    return (
      <LockScreen
        session={session}
        settings={settings}
        onSuccessUnlock={handleSuccessUnlock}
        onSessionUpdate={updater => setSession(updater)}
        onResetVault={handleResetVault}
      />
    );
  }

  const activeTheme = getTheme(settings.theme);
  const activeAccent = getAccent(settings.accentColor);

  return (
    <div className={`h-screen ${activeTheme.bgMain} text-gray-200 flex flex-col font-sans overflow-hidden select-none antialiased`}>
      
      {/* Clipboard Monitoring Security Banner */}
      {clipboardWarning && (
        <ClipboardWarningBanner
          label={clipboardWarning.label}
          autoClearSeconds={settings.clipboardClearSeconds || 20}
          onClearNow={handleClearClipboardNow}
          onClose={() => setClipboardWarning(null)}
        />
      )}

      {/* Toast Floating Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 bg-[#0F0F0F] border border-emerald-500/60 text-gray-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up text-xs font-mono">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <VaultHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddItemModal={() => {
          setEditingItem(null);
          setIsAddItemOpen(true);
        }}
        onOpenGeneratorModal={() => setActiveView('generator')}
        onLockVault={handleLockVault}
        autoLockTimeRemaining={autoLockSecondsLeft}
        settings={settings}
        securityReport={securityReport}
        itemCount={items.length}
        onOpenAutoFillModal={() => setIsAutoFillModalOpen(true)}
        activeVaultId={activeVaultId}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
        
        {/* Sidebar */}
        <VaultSidebar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          activeView={activeView}
          onSelectView={setActiveView}
          categoryCounts={categoryCounts}
          securityReport={securityReport}
          settings={settings}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
          onOpenAddItemModal={() => {
            setEditingItem(null);
            setIsAddItemOpen(true);
          }}
          activeVaultId={activeVaultId}
          onChangeVault={handleChangeVault}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
        />

        {/* Main View Area */}
        <main className={`flex-1 p-4 lg:p-6 overflow-y-auto min-w-0 ${activeTheme.bgMain}`}>
          <AnimatePresence mode="wait">
            {/* ITEMS LIST VIEW */}
            {activeView === 'items' && (
              <motion.div
                key="items"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <VaultItemList
                  items={filteredItems}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectItem={item => setSelectedItem(item)}
                  onToggleFavorite={handleToggleFavorite}
                  onCopyText={handleCopyText}
                  copiedId={copiedId}
                  settings={settings}
                  onOpenAddItem={() => {
                    setEditingItem(null);
                    setIsAddItemOpen(true);
                  }}
                />
              </motion.div>
            )}

            {/* SECURITY AUDIT VIEW */}
            {activeView === 'audit' && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <SecurityAuditView
                  report={securityReport}
                  allItems={items}
                  onSelectItem={item => setSelectedItem(item)}
                  onOpenGenerator={() => setActiveView('generator')}
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  onOpenAddItem={category => {
                    setEditingItem(category ? ({ category } as any) : null);
                    setIsAddItemOpen(true);
                  }}
                  onOpenAutoFillModal={() => setIsAutoFillModalOpen(true)}
                  onSelectView={v => setActiveView(v as any)}
                />
              </motion.div>
            )}

            {/* PASSWORD GENERATOR VIEW */}
            {activeView === 'generator' && (
              <motion.div
                key="generator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <PasswordGeneratorView
                  onCopyText={handleCopyText}
                  copiedId={copiedId}
                  settings={settings}
                />
              </motion.div>
            )}

            {/* DIGITAL CERTIFICATES VIEW */}
            {activeView === 'certificates' && (
              <motion.div
                key="certificates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <CertificatesView
                  settings={settings}
                  onUpdateCertificates={(certs, requireCert) => {
                    const updated = {
                      ...settings,
                      digitalCertificates: certs,
                      requireDigitalCert: requireCert,
                    };
                    handleSaveSettings(updated);
                  }}
                />
              </motion.div>
            )}

            {/* BACKUP VIEW */}
            {activeView === 'backup' && (
              <motion.div
                key="backup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <BackupView
                  items={items}
                  masterKey={session.masterKey}
                  salt={session.salt}
                  onImportItems={async importedItems => {
                    setItems(importedItems);
                    if (session.masterKey && session.salt) {
                      await saveEncryptedVaultItems(importedItems, session.masterKey, session.salt);
                    }
                    setToastMessage(`${importedItems.length} registros restaurados!`);
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  settings={settings}
                />
              </motion.div>
            )}

            {/* SETTINGS VIEW */}
            {activeView === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <SettingsView
                  settings={settings}
                  onSaveSettings={newSettings => {
                    handleSaveSettings(newSettings);
                  }}
                  onOpen2FAWizard={() => setIs2FAWizardOpen(true)}
                  onOpenCertWizard={() => setActiveView('certificates')}
                  onChangeMasterPassword={() => setIsChangeMasterPassModalOpen(true)}
                  onLockVault={handleLockVault}
                  onOpenAutoFillModal={() => setIsAutoFillModalOpen(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      </div>

      {/* Bottom Status Footer Bar */}
      <footer className={`h-10 ${activeTheme.bgFooter} border-t ${activeTheme.borderMain} px-6 lg:px-8 flex items-center justify-between text-[10px] ${activeTheme.textMuted} uppercase tracking-widest font-bold font-mono shrink-0 transition-colors`}>
        <div className="flex items-center gap-6">
          <span className={`flex items-center gap-1.5 ${activeTheme.textSecondary}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activeAccent.bgBtn} animate-pulse`} />
            Database: Local Encrypted
          </span>
          <span className={`hidden sm:inline-block ${activeTheme.textMuted}`}>|</span>
          <span className={`hidden sm:inline-flex items-center gap-1 ${activeTheme.textMuted}`}>
            Network: Isolated (Offline Vault)
          </span>
        </div>
        <div className="flex items-center gap-4">
          {settings.autoLockMinutes > 0 && (
            <span className={activeTheme.textMuted}>
              Auto-lock em: <span className={`${activeAccent.textAccent} font-bold`}>{Math.floor(autoLockSecondsLeft / 60)}:{(autoLockSecondsLeft % 60).toString().padStart(2, '0')}</span>
            </span>
          )}
        </div>
      </footer>

      {/* ALL MODALS */}

      {/* Detail Modal */}
      <VaultItemDetail
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={item => {
          setSelectedItem(null);
          setEditingItem(item);
          setIsAddItemOpen(true);
        }}
        onDelete={handleDeleteItem}
        onCopyText={handleCopyText}
        copiedId={copiedId}
        onSaveItem={handleSaveItem}
        settings={settings}
      />

      {/* Create / Edit Modal */}
      <ItemFormModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
        settings={settings}
      />

      {/* Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onCopyText={handleCopyText}
        copiedId={copiedId}
      />

      {/* 2FA Setup Wizard Modal */}
      <TwoFactorSetupModal
        isOpen={is2FAWizardOpen}
        onClose={() => setIs2FAWizardOpen(false)}
        currentSecret={settings.totpSecret}
        onSave2FA={handleSave2FA}
        onDisable2FA={handleDisable2FA}
        isEnabled={settings.require2FA}
        settings={settings}
      />

      {/* Digital Cert Setup Modal */}
      <DigitalCertSetupModal
        isOpen={isCertWizardOpen}
        onClose={() => setIsCertWizardOpen(false)}
        settings={settings}
        onUpdateCertificates={handleUpdateCertificates}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onOpen2FAWizard={() => {
          setIsSettingsOpen(false);
          setIs2FAWizardOpen(true);
        }}
        onOpenCertWizard={() => {
          setIsSettingsOpen(false);
          setIsCertWizardOpen(true);
        }}
        onChangeMasterPassword={() => {
          setIsSettingsOpen(false);
          setIsChangeMasterPassModalOpen(true);
        }}
        onOpenBackupModal={() => {
          setIsSettingsOpen(false);
          setIsBackupOpen(true);
        }}
      />

      {/* Backup / Export Modal */}
      <BackupExportModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        items={items}
        masterKey={session.masterKey}
        salt={session.salt}
        onImportItems={handleImportItems}
      />

      {/* Categories and Tags Manager Modal */}
      <CategoryTagManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        settings={settings}
        onUpdateSettings={handleSaveSettings}
        items={items}
      />

      {/* Auto-Fill Companion Assistant Modal */}
      <AutoFillCompanionModal
        isOpen={isAutoFillModalOpen}
        onClose={() => setIsAutoFillModalOpen(false)}
        vaultItems={items}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onCopyText={handleCopyText}
        isUnlocked={session.isUnlocked}
      />

      {/* Change Master Password Modal */}
      <ChangeMasterPasswordModal
        isOpen={isChangeMasterPassModalOpen}
        onClose={() => setIsChangeMasterPassModalOpen(false)}
        onChangePassword={handleChangeMasterPassword}
        settings={settings}
      />

      {/* Onboarding Visual Zero-Knowledge Modal */}
      <ZeroKnowledgeOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        settings={settings}
      />

    </div>
  );
}
