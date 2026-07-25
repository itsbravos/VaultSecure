import React, { useState } from 'react';
import {
  FileCheck,
  Upload,
  Sparkles,
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

  const accent = getAccent(settings?.accentColor);
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Banner Header */}
      <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 ${theme.depthShadow} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${accent.bgBtn} text-white flex items-center justify-center ${accent.shadowAccent} shrink-0`}>
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${theme.textPrimary} tracking-tight`}>Gerenciador de Certificados Digitais (PKI)</h2>
            <p className={`text-xs ${theme.textMuted} font-mono`}>Infraestrutura de Chaves Públicas e Validação X.509 / RSA 2048-bit</p>
          </div>
        </div>

        <button
          onClick={handleGenerateTestCert}
          disabled={isGenerating}
          className={`${accent.bgBtn} ${accent.bgBtnHover} text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all ${accent.shadowAccent} disabled:opacity-50`}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gerando Par de Chaves...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Gerar Certificado em 1 Clique</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ENFORCE PKI SWITCH & FILE UPLOAD */}
        <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-5 ${theme.depthShadow} md:col-span-1 transition-colors`}>
          <div className={`flex items-center gap-2 border-b ${theme.borderInner} pb-3`}>
            <ShieldCheck className={`w-4 h-4 ${accent.textAccent}`} />
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>Política de Autenticação PKI</h3>
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
              <span className={`text-xs font-bold ${requireCert ? theme.textPrimary : theme.textSecondary} block`}>Exigir Certificado no Desbloqueio</span>
              <span className={`text-[10px] ${theme.textMuted} font-mono block`}>Obrigatório selecionar chave válida para abrir o cofre.</span>
            </div>
          </button>

          <div className="space-y-3 pt-2">
            <label className={`text-xs font-bold ${theme.textSecondary} block font-mono`}>
              Importar Certificado Existente (.pem / .crt)
            </label>
            <div className={`p-4 ${theme.bgCardInner} border-2 border-dashed ${theme.borderInner} hover:${accent.borderAccent} rounded-xl text-center space-y-2 relative shadow-inner`}>
              <input
                type="file"
                accept=".pem,.crt,.cer,.key"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className={`w-5 h-5 ${accent.textAccent} mx-auto`} />
              <p className={`text-xs font-medium ${theme.textSecondary}`}>Escolher arquivo PEM / X.509</p>
            </div>
          </div>
        </div>

        {/* ACTIVE CERTIFICATES LIST */}
        <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-4 ${theme.depthShadow} md:col-span-2 transition-colors`}>
          <div className={`flex items-center justify-between border-b ${theme.borderInner} pb-3`}>
            <h3 className={`text-sm font-bold ${theme.textPrimary} flex items-center gap-2`}>
              <Key className={`w-4 h-4 ${accent.textAccent}`} /> Certificados Registrados ({certificates.length})
            </h3>
          </div>

          {certificates.length === 0 ? (
            <div className={`p-8 text-center ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-2 shadow-inner`}>
              <FileCheck className={`w-8 h-8 ${theme.textMuted} mx-auto`} />
              <p className={`text-xs font-bold ${theme.textSecondary}`}>Nenhum certificado cadastrado</p>
              <p className={`text-[11px] ${theme.textMuted} font-mono`}>Clique no botão "Gerar Certificado em 1 Clique" para criar um certificado de teste local instantâneo.</p>
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
                      title="Excluir Certificado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono ${theme.textMuted} pt-1 border-t ${theme.borderInner}`}>
                    <div>
                      <span className={theme.textMuted}>Subject:</span> <span className={theme.textSecondary}>{cert.subject}</span>
                    </div>
                    <div>
                      <span className={theme.textMuted}>Tipo:</span> <span className={theme.textSecondary}>{cert.keyType}</span>
                    </div>
                    <div className="col-span-2 truncate">
                      <span className={theme.textMuted}>Thumbprint SHA-256:</span> <span className={theme.textSecondary}>{cert.thumbprint}</span>
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
