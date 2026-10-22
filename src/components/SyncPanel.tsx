import React, { useEffect, useRef, useState } from 'react';
import { FolderSync, RefreshCw, FolderOpen, Unplug, Download, Upload, AlertTriangle, Check, Link2 } from 'lucide-react';
import { EncryptedVaultPayload } from '../types';
import { AccentTheme, ThemeStyles, getSignals } from '../lib/theme';
import { VaultSync } from '../lib/useVaultSync';
import { SyncNeedsLinkError } from '../lib/syncEngine';
import { describeStats, SYNC_FILE_NAME } from '../lib/vaultSync';
import { confirmDialog } from './DialogHost';
import { tr, locale } from '../lib/i18n';

interface SyncPanelProps {
  sync: VaultSync;
  theme: ThemeStyles;
  accent: AccentTheme;
}

export const formatAgo = (t: number | null, now = Date.now()): string => {
  if (!t) return tr('nunca');
  const s = Math.round((now - t) / 1000);
  if (s < 10) return tr("agora mesmo");
  if (s < 60) return tr("há {p0} s", { p0: s });
  const m = Math.round(s / 60);
  if (m < 60) return tr("há {p0} min", { p0: m });
  return new Date(t).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' });
};

export const SyncPanel: React.FC<SyncPanelProps> = ({ sync, theme, accent }) => {
  const signal = getSignals(theme.isLight);
  const [, tick] = useState(0);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [manualLink, setManualLink] = useState<{ payload: EncryptedVaultPayload; file: File } | null>(null);
  const [manualMsg, setManualMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep "há 2 min" fresh
  useEffect(() => {
    const i = setInterval(() => tick(n => n + 1), 15_000);
    return () => clearInterval(i);
  }, []);

  const btn = `h-9 px-3.5 rounded-lg border ${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg} text-[13px] font-medium cursor-pointer inline-flex items-center gap-2 disabled:opacity-50`;
  const primary = `h-9 px-4 rounded-lg ${accent.bgBtn} ${accent.bgBtnHover} ${accent.shadowAccent} text-white text-[13px] font-semibold cursor-pointer inline-flex items-center gap-2 disabled:opacity-50`;
  const input = `w-full h-10 px-3 rounded-lg ${theme.bgInput} ${theme.inputDepth} ${theme.textPrimary} text-sm focus:outline-none focus:ring-2 ${accent.ringAccent}`;

  const confirmLink = () =>
    confirmDialog({
      title: tr("Vincular a este arquivo?"),
      message:
        tr("Os cofres deste aparelho serão recriptografados com a chave do arquivo. Se a senha mestra do outro aparelho for diferente, ela passa a valer aqui também."),
      confirmLabel: tr("Vincular"),
    });

  const submitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPassword || !(await confirmLink())) return;
    setIsLinking(true);
    setLinkError(null);
    try {
      if (manualLink) {
        await sync.link(linkPassword, manualLink.payload);
        const stats = await sync.mergeFile(manualLink.file);
        setManualMsg(tr("Vinculado e mesclado: {p0}.", { p0: describeStats(stats) }));
        setManualLink(null);
      } else {
        await sync.link(linkPassword);
      }
      setLinkPassword('');
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : tr("Não foi possível vincular."));
    } finally {
      setIsLinking(false);
    }
  };

  const handleManualFile = async (file: File) => {
    setManualMsg(null);
    try {
      const stats = await sync.mergeFile(file);
      setManualMsg(tr("Mesclado: {p0}. Baixe o arquivo atualizado para levar as mudanças deste aparelho.", { p0: describeStats(stats) }));
    } catch (err) {
      if (err instanceof SyncNeedsLinkError) setManualLink({ payload: err.payload, file });
      else setManualMsg(err instanceof Error ? err.message : tr("Não foi possível mesclar o arquivo."));
    }
  };

  const linkForm = (
    <form onSubmit={submitLink} className={`p-4 rounded-xl border ${theme.borderMain} ${theme.bgCardInner} space-y-3`}>
      <div className="flex items-start gap-2.5">
        <Link2 className={`w-4 h-4 mt-0.5 shrink-0 ${signal.warnText}`} />
        <div>
          <p className={`text-sm font-semibold ${theme.textPrimary}`}>{tr("Este arquivo veio de outro aparelho")}</p>
          <p className={`text-[13px] ${theme.textMuted} mt-0.5`}>
            {tr("Digite a senha mestra usada no outro aparelho para vincular os dois. Isso só é preciso uma vez.")}
          </p>
        </div>
      </div>
      <input
        type="password"
        autoFocus
        value={linkPassword}
        onChange={e => setLinkPassword(e.target.value)}
        placeholder={tr("Senha mestra do outro aparelho")}
        className={input}
        aria-label={tr("Senha mestra do outro aparelho")}
      />
      {linkError && <p className={`text-[13px] ${signal.dangerText}`}>{linkError}</p>}
      <button type="submit" disabled={!linkPassword || isLinking} className={primary}>
        {isLinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {isLinking ? tr("Vinculando…") : tr("Vincular aparelhos")}
      </button>
    </form>
  );

  /* ------------------------------------------------- automatic (folder) */
  const statusLine = (() => {
    switch (sync.status) {
      case 'syncing':
        return { text: tr("Sincronizando…"), tone: theme.textMuted };
      case 'needs-permission':
        return { text: tr("O navegador precisa da sua permissão para acessar a pasta de novo."), tone: signal.warnText };
      case 'needs-link':
        return { text: tr("Aguardando vínculo com o outro aparelho."), tone: signal.warnText };
      case 'error':
        return { text: sync.error || tr("Falha ao sincronizar."), tone: signal.dangerText };
      case 'idle':
        return {
          text: tr("Sincronizado {p0}{p1}.", { p0: formatAgo(sync.lastSyncAt), p1: sync.lastStats ? `, ${describeStats(sync.lastStats)}` : '' }),
          tone: signal.safeText,
        };
      default:
        return null;
    }
  })();

  return (
    <section className={`${theme.bgCard} border ${theme.borderMain} rounded-2xl p-5 sm:p-6 space-y-5`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl border ${theme.borderInner} ${theme.bgCardInner} ${accent.textAccent} flex items-center justify-center shrink-0`}>
          <FolderSync className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className={`text-[15px] font-semibold ${theme.textPrimary}`}>{tr("Sincronizar entre aparelhos")}</h3>
          <p className={`text-[13px] ${theme.textMuted} mt-0.5 max-w-prose`}>
            {tr("O cofre grava um arquivo criptografado (")}{SYNC_FILE_NAME}{tr(") numa pasta que já sincroniza, como Syncthing, OneDrive ou Google Drive. Edições, novos itens e exclusões chegam aos outros aparelhos. Ninguém consegue ler o arquivo sem a senha mestra.")}
          </p>
        </div>
      </div>

      {sync.supported ? (
        <div className="space-y-4">
          {sync.folderName ? (
            <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border ${theme.borderMain} ${theme.bgCardInner}`}>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${theme.textPrimary} flex items-center gap-2`}>
                  <FolderOpen className={`w-4 h-4 shrink-0 ${theme.textMuted}`} />
                  <span className="truncate">{sync.folderName}</span>
                </p>
                {statusLine && (
                  <p role="status" className={`text-[13px] mt-1 flex items-center gap-1.5 ${statusLine.tone}`}>
                    {sync.status === 'idle' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    {(sync.status === 'error' || sync.status === 'needs-permission') && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    {statusLine.text}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {sync.status === 'needs-permission' ? (
                  <button onClick={sync.reconnect} className={primary}>
                    {tr("Permitir acesso")}
                  </button>
                ) : (
                  <button onClick={() => sync.syncNow()} disabled={sync.status === 'syncing' || sync.status === 'needs-link'} className={btn}>
                    <RefreshCw className={`w-4 h-4 ${sync.status === 'syncing' ? 'animate-spin' : ''}`} />
                    {tr("Sincronizar agora")}
                  </button>
                )}
                <button onClick={sync.connectFolder} className={btn} title={tr("Escolher outra pasta")}>
                  {tr("Trocar pasta")}
                </button>
                <button
                  onClick={async () => {
                    if (
                      await confirmDialog({
                        title: tr("Parar de sincronizar?"),
                        message: tr("Os itens continuam neste aparelho e o arquivo continua na pasta. Só a sincronização automática para."),
                        confirmLabel: tr("Parar"),
                      })
                    )
                      sync.disconnect();
                  }}
                  className={btn}
                  title={tr("Desconectar pasta")}
                >
                  <Unplug className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <ol className={`space-y-1.5 text-[13px] ${theme.textSecondary} list-decimal pl-5`}>
                <li>{tr("Crie ou escolha uma pasta sincronizada (Syncthing, OneDrive, Google Drive, Dropbox).")}</li>
                <li>{tr("Clique em \"Escolher pasta\" e selecione-a. O navegador vai pedir permissão de edição.")}</li>
                <li>{tr("Repita nos outros computadores, escolhendo a mesma pasta.")}</li>
              </ol>
              <button onClick={sync.connectFolder} className={primary}>
                <FolderOpen className="w-4 h-4" />
                {tr("Escolher pasta")}
              </button>
            </div>
          )}

          {sync.needsLink && linkForm}
        </div>
      ) : (
        <p className={`text-[13px] p-3 rounded-lg border ${theme.borderInner} ${theme.textSecondary}`}>
          {tr("Este navegador não permite sincronizar automaticamente por pasta (só Chrome e Edge no computador permitem). Use o modo manual abaixo.")}
          <br />
          <strong className={theme.textPrimary}>{tr("No celular, o cofre existe só neste navegador:")}</strong>{' '}
          {tr("limpar os dados do Chrome ou desinstalar o app apaga tudo. Baixe um backup criptografado de vez em quando.")}
        </p>
      )}

      {/* Manual mode: works everywhere, including phones */}
      <details className="group" open={!sync.supported}>
        <summary className={`text-[13px] font-medium ${theme.textSecondary} cursor-pointer select-none list-none flex items-center gap-1.5`}>
          <span className="group-open:rotate-90 transition-transform">›</span>
          {tr("Modo manual (celular, Firefox, Safari)")}
        </summary>
        <div className="mt-3 space-y-3">
          <p className={`text-[13px] ${theme.textMuted}`}>
            {tr("Abra o arquivo")} {SYNC_FILE_NAME} {tr("da pasta sincronizada para trazer as mudanças dos outros aparelhos. Depois baixe o arquivo atualizado e coloque-o de volta na pasta para levar as mudanças deste aparelho.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileRef.current?.click()} className={btn}>
              <Upload className="w-4 h-4" />
              {tr("Mesclar arquivo")}
            </button>
            <button onClick={sync.exportFile} className={btn}>
              <Download className="w-4 h-4" />
              {tr("Baixar arquivo atualizado")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".vault"
              className="sr-only"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleManualFile(file);
                e.target.value = '';
              }}
            />
          </div>
          {manualMsg && (
            <p role="status" className={`text-[13px] ${theme.textSecondary}`}>
              {manualMsg}
            </p>
          )}
          {manualLink && linkForm}
        </div>
      </details>
    </section>
  );
};
