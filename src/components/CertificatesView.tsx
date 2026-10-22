import React, { useState } from 'react';
import {
  FileCheck,
  Upload,
  FilePlus2,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Plus,
  RefreshCw,
  Key,
} from 'lucide-react';
import { DigitalCertConfig, VaultSettings } from '../types';
import { generateTestDigitalCert, parseCertPemFile } from '../lib/pki';
import { getAccent, getTheme } from '../lib/theme';
import { PageHeader } from './PageHeader';
import { tr } from '../lib/i18n';

interface CertificatesViewProps {
  settings: VaultSettings;
  onUpdateCertificates: (certs: DigitalCertConfig[], requireCert: boolean) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  settings,
  onUpdateCertificates,
}) => {
  const [certificates, setCertificates] = useState<DigitalCertConfig[]>(
    settings.digitalCertificates || []
  );
  const [requireCert, setRequireCert] = useState<boolean>(settings.requireDigitalCert);
  const [isGenerating, setIsGenerating] = useState(false);

  const accent = getAccent(settings?.accentColor, getTheme(settings?.theme).isLight);
  const theme = getTheme(settings?.theme);

  // Generate 1-click Test Certificate
  const handleGenerateTestCert = async () => {
    setIsGenerating(true);
    try {
      const newCert = await generateTestDigitalCert('Usuário Principal (e-CPF / e-CNPJ Dev)');
      const updated = [...certificates, newCert];
      setCertificates(updated);
      onUpdateCertificates(updated, requireCert);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload PEM file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = await parseCertPemFile(content, file.name);
        const updated = [...certificates, parsed];
        setCertificates(updated);
        onUpdateCertificates(updated, requireCert);
      }
    };
    reader.readAsText(file);
  };

  // Delete certificate
  const handleDeleteCert = (id: string) => {
    const updated = certificates.filter(c => c.id !== id);
    setCertificates(updated);
    onUpdateCertificates(updated, requireCert);
  };

  // Toggle enforce cert
  const handleToggleRequireCert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setRequireCert(val);
    onUpdateCertificates(certificates, val);
  };

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <PageHeader
        theme={theme}
        title={tr("Certificados digitais")}
        description={tr("Certificados X.509 que podem ser exigidos para abrir o cofre.")}
        actions={
          <button onClick={handleGenerateTestCert} disabled={isGenerating} className={`h-9 px-4 rounded-lg ${accent.bgBtn} ${accent.bgBtnHover} ${accent.shadowAccent} text-white text-[13px] font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50`}>
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
            {isGenerating ? tr("Gerando chaves…") : tr("Gerar certificado")}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ENFORCE PKI SWITCH & FILE UPLOAD */}
        <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-5 ${theme.depthShadow} md:col-span-1 transition-colors`}>
          <div className={`flex items-center gap-2 border-b ${theme.borderInner} pb-3`}>
            <ShieldCheck className={`w-4 h-4 ${accent.textAccent}`} />
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>{tr("Política de Autenticação PKI")}</h3>
          </div>

          <button
            type="button"
            onClick={() => {
              const val = !requireCert;
              setRequireCert(val);
              onUpdateCertificates(certificates, val);
            }}
            className={`w-full flex items-center gap-3 p-3 ${theme.bgCardInner} rounded-xl border transition-all cursor-pointer ${
              requireCert ? accent.borderAccent : theme.borderInner
            }`}
          >
            <div
              className="w-4 h-4 rounded-sm border transition-all shrink-0"
              style={{
                backgroundColor: requireCert ? accent.colorHex : 'transparent',
                borderColor: requireCert ? accent.colorHex : '#4B5563',
              }}
            />
            <div className="text-left">
              <span className={`text-xs font-bold ${requireCert ? theme.textPrimary : theme.textSecondary} block`}>{tr("Exigir Certificado no Desbloqueio")}</span>
              <span className={`text-xs ${theme.textMuted} block`}>{tr("Obrigatório selecionar chave válida para abrir o cofre.")}</span>
            </div>
          </button>

          <div className="space-y-3 pt-2">
            <label className={`text-xs font-bold ${theme.textSecondary} block`}>
              {tr("Importar Certificado Existente (.pem / .crt)")}
            </label>
            <div className={`p-4 ${theme.bgCardInner} border-2 border-dashed ${theme.borderInner} hover:${accent.borderAccent} rounded-xl text-center space-y-2 relative shadow-inner`}>
              <input
                type="file"
                accept=".pem,.crt,.cer,.key"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className={`w-5 h-5 ${accent.textAccent} mx-auto`} />
              <p className={`text-xs font-medium ${theme.textSecondary}`}>{tr("Escolher arquivo PEM / X.509")}</p>
            </div>
          </div>
        </div>

        {/* ACTIVE CERTIFICATES LIST */}
        <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-4 ${theme.depthShadow} md:col-span-2 transition-colors`}>
          <div className={`flex items-center justify-between border-b ${theme.borderInner} pb-3`}>
            <h3 className={`text-sm font-bold ${theme.textPrimary} flex items-center gap-2`}>
              <Key className={`w-4 h-4 ${accent.textAccent}`} /> {tr("Certificados Registrados (")}{certificates.length})
            </h3>
          </div>

          {certificates.length === 0 ? (
            <div className={`p-8 text-center ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-2 shadow-inner`}>
              <FileCheck className={`w-8 h-8 ${theme.textMuted} mx-auto`} />
              <p className={`text-xs font-bold ${theme.textSecondary}`}>{tr("Nenhum certificado cadastrado")}</p>
              <p className={`text-[11px] ${theme.textMuted}`}>{tr("Use \"Gerar certificado\" para criar um certificado de teste neste dispositivo, ou importe um arquivo .pem.")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {certificates.map(cert => (
                <div
                  key={cert.id}
                  className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} ${theme.hoverBg} space-y-2 transition-colors shadow-inner`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${accent.textAccent} shrink-0`} />
                      <h4 className={`text-xs font-bold ${theme.textPrimary}`}>{cert.name}</h4>
                    </div>
                    <button
                      onClick={() => handleDeleteCert(cert.id)}
                      className={`${theme.textMuted} hover:text-red-500 transition-colors p-1.5`}
                      title={tr("Excluir Certificado")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 text-xs ${theme.textMuted} pt-1 border-t ${theme.borderInner}`}>
                    <div>
                      <span className={theme.textMuted}>Subject:</span> <span className={theme.textSecondary}>{cert.subject}</span>
                    </div>
                    <div>
                      <span className={theme.textMuted}>Tipo:</span> <span className={theme.textSecondary}>{cert.keyType}</span>
                    </div>
                    <div className="col-span-2 truncate">
                      <span className={theme.textMuted}>{tr("Thumbprint SHA-256:")}</span> <span className={theme.textSecondary}>{cert.thumbprint}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
