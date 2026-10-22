import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  decryptVaultSettings,
  activateSettingsKey,
  deactivateSettingsKey,
  loadFailedAttempts,
} from './lib/storage';
import { setLegacySyncKey } from './lib/syncEngine';

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
import { ChangeMasterPasswordModal } from './components/ChangeMasterPasswordModal';
import { ClipboardWarningBanner } from './components/ClipboardWarningBanner';
import { ZeroKnowledgeOnboardingModal } from './components/ZeroKnowledgeOnboardingModal';
import { BrowserImportModal } from './components/BrowserImportModal';
import { useVaultSync } from './lib/useVaultSync';
import { forgetFolder } from './lib/syncFolder';
import { HomeView, AppView } from './components/HomeView';
import { GuidedTour, TourStep } from './components/GuidedTour';
import { LanguagePicker } from './components/LanguagePicker';
import { describeStats } from './lib/vaultSync';
import { VaultId, loadAllVaults, recordDeletion } from './lib/storage';
import { getTheme, getAccent } from './lib/theme';
import { motion, AnimatePresence } from 'motion/react';

import { Check, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { tr, setLang, detectLang, Lang } from './lib/i18n';

const VAULT_DISPLAY_NAMES: Record<string, string> = { pessoal: 'Pessoal', trabalho: 'Trabalho', compartilhado: 'Compartilhado' };

const buildTourSteps = (autoLockMinutes: number): TourStep[] => [
  {
    title: tr("Bem-vindo ao seu cofre"),
    body: tr("Tudo o que você guardar aqui é criptografado neste aparelho antes de ser salvo. Vamos ver onde fica cada coisa."),
  },
  {
    target: 'vault-switcher',
    title: tr("Três cofres separados"),
    body: tr("Pessoal, Trabalho e Compartilhado. Troque de cofre aqui para manter cada assunto no seu lugar."),
  },
  {
    target: 'new-item',
    title: tr("Adicione um item"),
    body: tr("Logins, cartões, notas seguras e chaves de API. O botão de gerar senha está dentro do formulário."),
  },
  {
    target: 'home-import',
    title: tr("Traga as senhas do navegador"),
    body: tr("Exporte as senhas do Chrome, Edge, Firefox ou Safari e importe aqui. Você revisa tudo e escolhe o cofre de cada uma."),
  },
  {
    target: 'nav-items',
    title: tr("Seus itens"),
    body: tr("A lista completa, com busca (atalho Ctrl+K) e filtros por tipo. Clique num item para ver, copiar ou editar."),
  },
  {
    target: 'nav-health',
    title: tr("Saúde do cofre"),
    body: tr("Mostra senhas vazadas, fracas ou repetidas e o que corrigir primeiro."),
  },
  {
    target: 'nav-generator',
    title: tr("Gerador de senhas"),
    body: tr("Cria senhas aleatórias e longas, ou frases fáceis de digitar."),
  },
  {
    target: 'nav-settings',
    title: tr("Configurações"),
    body: tr("Tema, verificação em duas etapas e sincronização entre aparelhos por uma pasta do Syncthing, OneDrive ou Drive."),
  },
  {
    target: 'lock',
    title: tr("Bloqueie quando sair"),
    body: autoLockMinutes > 0
      ? tr("O cofre também se bloqueia sozinho após {p0} minutos sem uso.", { p0: autoLockMinutes })
      : tr("O bloqueio automático está desligado. Você pode ativá-lo nas Configurações."),
  },
  {
    title: tr("Uma senha para tudo"),
    body: tr("Sua senha mestra nunca é guardada nem enviada. Se esquecê-la, ninguém consegue recuperar o cofre, nem nós. Veja como isso funciona:"),
  },
];

export default function App() {
  // Vault Settings State
  const [settings, setSettings] = useState<VaultSettings>(() => loadVaultSettings());
  // Language is applied before anything renders; changing it remounts the UI (key={lang})
  const lang: Lang = settings.language ?? detectLang();
  setLang(lang);
  const handleChangeLanguage = (language: Lang) => {
    const updated = { ...loadVaultSettings(), ...settings, language };
    setSettings(updated);
    saveVaultSettings(updated);
  };

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
      failedAttempts: loadFailedAttempts(),
    };
  });

  // Decrypted Vault Items in Memory
  const [items, setItems] = useState<VaultItem[]>([]);

  // Navigation & Filter State
  const [activeView, setActiveView] = useState<AppView>('home');
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
  const [isChangeMasterPassModalOpen, setIsChangeMasterPassModalOpen] = useState(false);
  const [activeVaultId, setActiveVaultId] = useState<string>('pessoal');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isBrowserImportOpen, setIsBrowserImportOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);

  // Toast / Clipboard Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clipboardWarning, setClipboardWarning] = useState<{ label: string; expiresAt: number } | null>(null);
  // Items the online (HIBP) scan found in breaches; feeds the report everywhere, not just the health page
  const [onlineLeakedIds, setOnlineLeakedIds] = useState<Set<string>>(new Set());
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-Lock Inactivity Timer State
  const [autoLockSecondsLeft, setAutoLockSecondsLeft] = useState<number>(
    settings.autoLockMinutes > 0 ? settings.autoLockMinutes * 60 : 300
  );
  // Kept in a ref so mouse movement doesn't re-render the whole app
  const lastActivityRef = useRef(Date.now());

  // Show Toast (a newer toast replaces the old one and gets its full time on screen)
  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  const wipeClipboard = useCallback(() => {
    if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
    clipboardTimerRef.current = null;
    navigator.clipboard.writeText('').catch(() => {});
    setClipboardWarning(null);
  }, []);

  // Lock Vault Action
  const handleLockVault = useCallback(() => {
    // Decrypted secrets (2FA seed, certificates...) leave memory with the key
    deactivateSettingsKey();
    setLegacySyncKey(null);
    setSettings(loadVaultSettings());
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
    setIsAddItemOpen(false);
    setEditingItem(null);
    // A copied password shouldn't outlive the session that revealed it
    wipeClipboard();
    showToast(tr("Cofre bloqueado."));
  }, [wipeClipboard]);

  // Track User Activity for Auto-Lock Timer
  useEffect(() => {
    if (!session.isUnlocked) return;
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'wheel'];
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));
    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
    };
  }, [session.isUnlocked]);

  // Auto-lock countdown tick effect
  useEffect(() => {
    if (!session.isUnlocked || settings.autoLockMinutes === 0) return;
    lastActivityRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const totalAllowed = settings.autoLockMinutes * 60;
      const remaining = totalAllowed - elapsedSeconds;

      if (remaining <= 0) {
        handleLockVault();
      } else {
        setAutoLockSecondsLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.isUnlocked, settings.autoLockMinutes, handleLockVault]);

  // Folder sync between devices. Never runs for the duress decoy.
  const sync = useVaultSync({
    masterKey: session.masterKey,
    salt: session.salt,
    enabled: session.isUnlocked && !session.isDuressMode,
    onVaultsChanged: (vaults, stats) => {
      setItems(vaults[activeVaultId as VaultId] || []);
      setSelectedItem(prev => (prev ? vaults[activeVaultId as VaultId]?.find(i => i.id === prev.id) ?? null : prev));
      showToast(tr("Sincronizado: {p0}.", { p0: describeStats(stats) }));
    },
    onKeyChanged: (masterKey, salt) => setSession(prev => ({ ...prev, masterKey, salt })),
  });

  // Unlock Vault Handler
  // isFirstTimeSetup comes from the lock screen; the guided tour already opens for
  // any vault that hasn't completed it, so a brand-new vault gets it automatically.
  const handleSuccessUnlock = async (masterKey: CryptoKey, salt: Uint8Array, isDuress = false, _isFirstTimeSetup = false) => {
    try {
      if (isDuress) {
        // Decoy session: settings stay the plain ones and the encrypted part is never touched
        deactivateSettingsKey();
        setSettings(loadVaultSettings());
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
        showToast(tr("Cofre aberto."));
        return;
      }

      const decryptedItems = await loadEncryptedVaultItems(masterKey, activeVaultId);
      setItems(decryptedItems);
      // First-run setup writes settings (e.g. the owner's name) straight to storage
      const { settings: stored, duressNeedsReset } = await decryptVaultSettings(masterKey, salt);
      activateSettingsKey(masterKey, salt);
      setSettings(stored);
      setActiveView('home');
      // First time in: walk through the app once the home screen has rendered
      // First time in: ask for a language, then walk through the app
      if (!stored.languageChosen) setTimeout(() => setIsLanguagePickerOpen(true), 400);
      else if (!stored.tourCompleted) setTimeout(() => setIsTourOpen(true), 600);
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
      showToast(duressNeedsReset ? tr("Por segurança, a senha de coação precisa ser definida de novo.") : tr("Cofre aberto."));
    } catch (err: any) {
      console.error(err);
      showToast(tr("Erro ao carregar os itens descriptografados."));
    }
  };

  const handleChangeVault = async (newVaultId: string) => {
    setActiveVaultId(newVaultId);
    if (session.masterKey && !session.isDuressMode) {
      const decrypted = await loadEncryptedVaultItems(session.masterKey, newVaultId);
      setItems(decrypted);
      setSelectedItem(null);
      const vaultName = tr(newVaultId === 'pessoal' ? 'Cofre Pessoal' : newVaultId === 'trabalho' ? 'Cofre de Trabalho' : 'Cofre Compartilhado');
      showToast(tr("Alternado para o {p0}.", { p0: vaultName }));
    }
  };

  // Change Master Password
  const handleChangeMasterPassword = async (currentPass: string, newPass: string) => {
    if (!session.salt) return;
    // Pull in anything other devices wrote before the key changes under them
    await sync.syncNow();
    const res = await changeMasterPassword(currentPass, newPass, items, session.salt);
    setSession(prev => ({
      ...prev,
      masterKey: res.masterKey,
      salt: res.salt,
    }));
    await sync.republish(res.masterKey, res.salt);
    showToast(tr("Senha mestra alterada. Todos os cofres foram recriptografados."));
  };

  // Reset/Reinitialize Vault
  // Callers confirm first (the lock screen dialog). Self-destruct after too many
  // wrong passwords must not be cancellable, so there is no prompt here.
  const handleResetVault = () => {
    {
      clearAllVaultData();
      // A fresh vault must not start syncing with the old one's folder
      void forgetFolder();
      setItems([]);
      setActiveVaultId('pessoal');
      setActiveView('home');
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
      showToast(tr("Cofre resetado."));
    }
  };

  // Global keyboard shortcuts. Ctrl+Shift+V is left alone: it's "paste as plain text".
  //   Alt+Shift+V  back to the item list
  //   Ctrl+K or /  focus search               Esc          close the topmost panel
  useEffect(() => {
    if (!session.isUnlocked) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement;
      const isTyping = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (e.altKey && e.shiftKey && key === 'v') {
        e.preventDefault();
        setActiveView('items');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'k' || (key === '/' && !isTyping)) {
        e.preventDefault();
        setActiveView('items');
        setIsMobileNavOpen(false);
        // The list mounts after the view switch; wait a frame for the input to exist
        requestAnimationFrame(() => searchInputRef.current?.focus());
        return;
      }
      if (key === 'escape') {
        // Close only the topmost layer, in the same order they stack on screen
        if (isChangeMasterPassModalOpen) setIsChangeMasterPassModalOpen(false);
        else if (is2FAWizardOpen) setIs2FAWizardOpen(false);
        else if (isCertWizardOpen) setIsCertWizardOpen(false);
        else if (isCategoryManagerOpen) setIsCategoryManagerOpen(false);
        else if (isBackupOpen) setIsBackupOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isGeneratorOpen) setIsGeneratorOpen(false);
        else if (isOnboardingOpen) setIsOnboardingOpen(false);
        else if (isBrowserImportOpen) setIsBrowserImportOpen(false);
        else if (isAddItemOpen) setIsAddItemOpen(false);
        else if (selectedItem) setSelectedItem(null);
        else if (isMobileNavOpen) setIsMobileNavOpen(false);
        else if (searchQuery && isTyping) setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    session.isUnlocked, isChangeMasterPassModalOpen, is2FAWizardOpen, isCertWizardOpen,
    isCategoryManagerOpen, isBackupOpen, isSettingsOpen, isGeneratorOpen, isOnboardingOpen, isAddItemOpen,
    selectedItem, isMobileNavOpen, searchQuery, isBrowserImportOpen,
  ]);

  // Save / Add Item
  const handleSaveItem = async (itemData: Partial<VaultItem>) => {
    if (!session.masterKey || !session.salt) return;

    let updatedList: VaultItem[];
    const existingIndex = items.findIndex(i => i.id === itemData.id);

    if (existingIndex >= 0) {
      updatedList = [...items];
      // Sync picks the newest version by updatedAt, so every edit must bump it
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...itemData, updatedAt: Date.now() } as VaultItem;
    } else {
      updatedList = [{ ...itemData, updatedAt: itemData.updatedAt || Date.now() } as VaultItem, ...items];
    }

    setItems(updatedList);
    // Keep an open detail panel in sync (e.g. after restoring an old password)
    setSelectedItem(prev => (prev && prev.id === itemData.id ? (updatedList.find(i => i.id === prev.id) ?? prev) : prev));
    if (!session.isDuressMode) {
      await saveEncryptedVaultItems(updatedList, session.masterKey, session.salt, activeVaultId);
      sync.notifyLocalChange();
    }
    showToast(existingIndex >= 0 ? tr("Alterações salvas.") : tr("Item adicionado ao cofre."));
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!session.masterKey || !session.salt) return;

    const updatedList = items.filter(i => i.id !== itemId);
    setItems(updatedList);
    if (!session.isDuressMode) {
      await saveEncryptedVaultItems(updatedList, session.masterKey, session.salt, activeVaultId);
      // Remembered so other devices delete it too instead of syncing it back
      recordDeletion(activeVaultId, itemId);
      sync.notifyLocalChange();
    }
    showToast(tr("Item excluído."));
  };

  // Toggle Favorite
  const handleToggleFavorite = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.masterKey || !session.salt) return;

    const updatedList = items.map(item => {
      if (item.id === itemId) {
        return { ...item, favorite: !item.favorite, updatedAt: Date.now() };
      }
      return item;
    });

    setItems(updatedList);
    if (!session.isDuressMode) {
      await saveEncryptedVaultItems(updatedList, session.masterKey, session.salt, activeVaultId);
      sync.notifyLocalChange();
    }
  };

  // Copy to Clipboard with Auto-Clear Timer & Exposure Detector Warning
  // The wipe timer lives here, not in the banner, so it keeps running even if
  // the banner is dismissed and restarts on every new copy.
  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      showToast(tr("Não foi possível copiar. Verifique a permissão da área de transferência."));
      return;
    }
    setCopiedId(text);
    setTimeout(() => setCopiedId(prev => (prev === text ? null : prev)), 2000);

    const seconds = settings.clipboardClearSeconds || 20;
    if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
    clipboardTimerRef.current = setTimeout(wipeClipboard, seconds * 1000);
    setClipboardWarning({ label, expiresAt: Date.now() + seconds * 1000 });
  };

  const handleClearClipboardNow = () => {
    wipeClipboard();
    showToast(tr("Área de transferência limpa."));
  };

  // Save Settings
  const handleSaveSettings = (newSettings: VaultSettings) => {
    setSettings(newSettings);
    saveVaultSettings(newSettings);
    showToast(tr("Configurações salvas."));
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
    showToast(tr("Autenticação de 2 Fatores (Google Authenticator) Ativada!"));
  };

  const handleDisable2FA = () => {
    const updated = {
      ...settings,
      require2FA: false,
      totpVerified: false,
    };
    setSettings(updated);
    saveVaultSettings(updated);
    showToast(tr("Autenticação 2FA Desativada."));
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
    showToast(tr("Certificados digitais atualizados."));
  };

  // Import Backup Items — the caller (BackupView/BackupExportModal) already
  // resolved merge-vs-replace and vault routing, so this just persists the
  // final list for the currently active vault.
  const handleImportItems = async (finalItems: VaultItem[]) => {
    if (!session.masterKey || !session.salt) return;
    setItems(finalItems);
    if (!session.isDuressMode) {
      await saveEncryptedVaultItems(finalItems, session.masterKey, session.salt, activeVaultId);
      sync.notifyLocalChange();
    }
    showToast(tr("Cofre atualizado: {p0} {p1} no cofre atual.", { p0: finalItems.length, p1: finalItems.length === 1 ? tr("item") : tr("itens") }));
  };

  // Browser import: each item goes to the vault the user chose for it. Add-only:
  // nothing already in any vault is changed or removed.
  const handleImportToVaults = async (byVault: Partial<Record<VaultId, VaultItem[]>>) => {
    if (!session.masterKey || !session.salt) return;
    let total = 0;
    for (const [vaultId, newItems] of Object.entries(byVault) as [VaultId, VaultItem[]][]) {
      if (!newItems?.length) continue;
      const current =
        vaultId === activeVaultId ? items : session.isDuressMode ? [] : await loadEncryptedVaultItems(session.masterKey, vaultId);
      const existingIds = new Set(current.map(i => i.id));
      const merged = [...current, ...newItems.filter(i => !existingIds.has(i.id))];
      total += merged.length - current.length;
      if (vaultId === activeVaultId) setItems(merged);
      if (!session.isDuressMode) await saveEncryptedVaultItems(merged, session.masterKey, session.salt, vaultId);
    }
    if (!session.isDuressMode) sync.notifyLocalChange();
    showToast(tr(total === 1 ? '{n} item importado.' : '{n} itens importados.', { n: total }));
  };

  // Everything the import preview compares against, across all vaults
  const [importExisting, setImportExisting] = useState<VaultItem[]>([]);
  const openBrowserImport = async () => {
    try {
      const all = session.masterKey && !session.isDuressMode ? await loadAllVaults(session.masterKey) : null;
      setImportExisting(all ? Object.values(all).flat() : items);
    } catch {
      setImportExisting(items);
    }
    setIsBrowserImportOpen(true);
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
    return generateSecurityAuditReport(items, onlineLeakedIds);
  }, [items, onlineLeakedIds]);

  // RENDER LOCK SCREEN IF LOCKED
  if (!session.isUnlocked) {
    return (
      <LockScreen
        key={lang}
        onChangeLanguage={handleChangeLanguage}
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
    <div key={lang} className={`h-screen ${activeTheme.bgApp} flex flex-col font-sans overflow-hidden select-none antialiased`}>
      
      {/* Clipboard Monitoring Security Banner */}
      {clipboardWarning && (
        <ClipboardWarningBanner
          label={clipboardWarning.label}
          expiresAt={clipboardWarning.expiresAt}
          totalSeconds={settings.clipboardClearSeconds || 20}
          onClearNow={handleClearClipboardNow}
          onClose={() => setClipboardWarning(null)}
        />
      )}

      {/* Toast Floating Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed ${clipboardWarning ? 'bottom-28' : 'bottom-12'} right-4 sm:right-6 left-4 sm:left-auto z-50 ${activeTheme.bgCard} ${activeTheme.textPrimary} border ${activeTheme.borderMain} pl-3 pr-4 py-2.5 rounded-xl shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)] flex items-center gap-2.5 animate-slide-up text-[13px]`}
        >
          <Check className={`w-4 h-4 ${activeAccent.textAccent} shrink-0`} />
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
        onGoHome={() => setActiveView('home')}
        onLockVault={handleLockVault}
        autoLockTimeRemaining={autoLockSecondsLeft}
        settings={settings}
        securityReport={securityReport}
        itemCount={items.length}
        activeVaultId={activeVaultId}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
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
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Main View Area */}
        <main className={`flex-1 px-4 py-5 lg:px-8 lg:py-7 overflow-y-auto min-w-0 ${activeTheme.bgMain}`}>
          {/* Enter-only page transitions: AnimatePresence mode="wait" could get stuck
              mid-exit on fast navigation and leave the page blank */}
          <>
            {/* HOME */}
            {activeView === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <HomeView
                  settings={settings}
                  items={items}
                  report={securityReport}
                  vaultName={tr(VAULT_DISPLAY_NAMES[activeVaultId] || "Pessoal")}
                  onNavigate={(view, category) => {
                    setActiveView(view);
                    if (category) setActiveCategory(category);
                  }}
                  onOpenAddItem={() => {
                    setEditingItem(null);
                    setIsAddItemOpen(true);
                  }}
                  onOpenBrowserImport={openBrowserImport}
                  onOpenProtectionGuide={() => setIsOnboardingOpen(true)}
                  onStartTour={() => setIsTourOpen(true)}
                  onSelectItem={item => setSelectedItem(item)}
                />
              </motion.div>
            )}

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
                  searchInputRef={searchInputRef}
                  onSelectItem={item => setSelectedItem(item)}
                  onToggleFavorite={handleToggleFavorite}
                  onCopyText={handleCopyText}
                  copiedId={copiedId}
                  settings={settings}
                  onOpenBrowserImport={openBrowserImport}
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
                  onSelectView={v => setActiveView(v as any)}
                  onOpenBrowserImport={openBrowserImport}
                  onOnlineBreachResults={ids => setOnlineLeakedIds(prev => new Set([...prev, ...ids]))}
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
                  activeVaultId={activeVaultId}
                  masterKey={session.masterKey}
                  salt={session.salt}
                  onImportItems={handleImportItems}
                  onAfterImport={() => !session.isDuressMode && sync.notifyLocalChange()}
                  onOpenBrowserImport={openBrowserImport}
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
                  sync={session.isDuressMode ? undefined : sync}
                />
              </motion.div>
            )}
          </>
        </main>

      </div>

      {/* Bottom Status Footer Bar */}
      <footer className={`h-8 ${activeTheme.bgFooter} border-t ${activeTheme.borderMain} px-4 lg:px-6 flex items-center justify-between text-xs ${activeTheme.textMuted} shrink-0`}>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          {/* Same text in duress mode: the decoy must look exactly like the real vault */}
          <span className="hidden sm:inline">{tr("Criptografado neste dispositivo")}</span>
          <span className="sm:hidden">{tr("Criptografado")}</span>
        </span>
        {/* Sync only surfaces here when it needs a click; a quiet "synced" label
            would be missing in duress mode and give the decoy away */}
        {['needs-permission', 'needs-link', 'error'].includes(sync.status) && (
          <button
            onClick={() => setActiveView('settings')}
            className="flex items-center gap-1.5 text-[#D8B65C] hover:underline underline-offset-2 cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {sync.status === 'needs-permission' ? tr("Sincronização pausada: permitir acesso") : sync.status === 'needs-link' ? tr("Vincular aparelhos") : tr("Erro na sincronização")}
          </button>
        )}
        {settings.autoLockMinutes > 0 && (
          <span className={`flex items-center gap-1.5 tabular-nums ${autoLockSecondsLeft <= 30 ? 'text-[#E0533D]' : ''}`}>
            <Lock className="w-3.5 h-3.5" />
            {tr("Bloqueia em")} {Math.floor(autoLockSecondsLeft / 60)}:{(autoLockSecondsLeft % 60).toString().padStart(2, '0')}
          </span>
        )}
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
        activeVaultId={activeVaultId}
        masterKey={session.masterKey}
        salt={session.salt}
        onImportItems={handleImportItems}
        onAfterImport={() => !session.isDuressMode && sync.notifyLocalChange()}
      />

      {/* Categories and Tags Manager Modal */}
      <CategoryTagManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        settings={settings}
        onUpdateSettings={handleSaveSettings}
        items={items}
      />

      {/* Change Master Password Modal */}
      <ChangeMasterPasswordModal
        isOpen={isChangeMasterPassModalOpen}
        onClose={() => setIsChangeMasterPassModalOpen(false)}
        onChangePassword={handleChangeMasterPassword}
        settings={settings}
      />

      {/* Import passwords exported from a browser (CSV) */}
      <BrowserImportModal
        isOpen={isBrowserImportOpen}
        onClose={() => setIsBrowserImportOpen(false)}
        existingItems={importExisting}
        defaultVault={activeVaultId as VaultId}
        settings={settings}
        onImport={handleImportToVaults}
        onShowItems={() => {
          setActiveView('items');
          setActiveCategory('all');
          setSearchQuery('');
        }}
      />

      {/* Onboarding Visual Zero-Knowledge Modal */}
      <LanguagePicker
        isOpen={isLanguagePickerOpen}
        settings={settings}
        onPick={language => {
          const updated = { ...settings, language, languageChosen: true };
          setSettings(updated);
          saveVaultSettings(updated);
          setIsLanguagePickerOpen(false);
          if (!updated.tourCompleted) setTimeout(() => setIsTourOpen(true), 500);
        }}
      />

      <GuidedTour
        isOpen={isTourOpen}
        steps={buildTourSteps(settings.autoLockMinutes)}
        settings={settings}
        onFinish={() => {
          setIsTourOpen(false);
          if (!settings.tourCompleted) {
            const updated = { ...settings, tourCompleted: true };
            setSettings(updated);
            saveVaultSettings(updated);
          }
        }}
        onOpenProtectionGuide={() => setIsOnboardingOpen(true)}
      />

      <ZeroKnowledgeOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        settings={settings}
      />

    </div>
  );
}
