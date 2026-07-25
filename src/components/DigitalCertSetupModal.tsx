import React, { useState } from 'react';
import {
  FileCheck,
  Upload,
  Sparkles,
  X,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Plus,
  RefreshCw,
  Key,
  FileText,
} from 'lucide-react';
import { DigitalCertConfig, VaultSettings } from '../types';
import { generateTestDigitalCert, parseCertPemFile } from '../lib/pki';

interface DigitalCertSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VaultSettings;
  onUpdateCertificates: (certs: DigitalCertConfig[], requireCert: boolean) => void;
}

export const DigitalCertSetupModal: React.FC<DigitalCertSetupModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateCertificates,
}) => {
  if (!isOpen) return null;

  const [certificates, setCertificates] = useState<DigitalCertConfig[]>(
    settings.digitalCertificates || []
  );
  const [requireCert, setRequireCert] = useState<boolean>(settings.requireDigitalCert);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pemText, setPemText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-700/60 text-cyan-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Gerenciador de Certificados Digitais</h3>
              <p className="text-xs text-slate-400 font-mono">Infraestrutura PKI & Validação de Assinatura X.509</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Enable/Disable Certificate Toggle */}
          <label className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 block">
                Exigir Certificado Digital no Acesso ao Cofre
              </span>
              <span className="text-[11px] text-slate-400 block">
                Exige a validação da assinatura digital privada para autorizar o desbloqueio.
              </span>
            </div>
            <input
              type="checkbox"
              checked={requireCert}
              onChange={handleToggleRequireCert}
              className="rounded text-cyan-500 bg-slate-900 border-slate-700 w-5 h-5"
            />
          </label>

          {/* Action Buttons: Generate or Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleGenerateTestCert}
              disabled={isGenerating}
              className="p-3 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-200 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-cyan-400" />
              )}
              <span>Emitir Certificado Dev (RSA-2048)</span>
            </button>

            <label className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-200 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Importar Certificado (.pem/.crt)</span>
              <input
                type="file"
                accept=".pem,.crt,.cer,.pfx,.p12"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Registered Certificates List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono">
              Certificados Digitais Cadastrados ({certificates.length})
            </h4>

            {certificates.length === 0 ? (
              <div className="p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs text-slate-500 space-y-1">
                <FileCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>Nenhum certificado digital foi adicionado ainda.</p>
                <p className="text-[11px] text-slate-600">
                  Clique no botão acima para emitir um certificado de teste ou importar o seu arquivo PEM.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {certificates.map(cert => (
                  <div
                    key={cert.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono text-slate-300 relative"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-cyan-400">{cert.name}</span>
                        <p className="text-[11px] text-slate-400 font-normal">{cert.subject}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteCert(cert.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Remover Certificado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-900 text-slate-400">
                      <div>
                        <span className="text-slate-600 block">Série:</span>
                        <span className="text-slate-300">{cert.serialNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block">Algoritmo:</span>
                        <span className="text-slate-300">{cert.keyType}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-600 block">Fingerprint / Thumbprint:</span>
                        <span className="text-slate-300 truncate block">{cert.thumbprint}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
