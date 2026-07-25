import React from 'react';
import {
  Folder,
  Key,
  Lock,
  Shield,
  Server,
  Database,
  Cloud,
  Mail,
  Globe,
  CreditCard,
  Code2,
  Briefcase,
  User,
  Star,
  Box,
  Terminal,
  FileText,
  FileCheck,
  Wifi,
  Smartphone,
  Landmark,
  ShoppingBag,
  Heart,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface CategoryIconDef {
  id: string;
  label: string;
  icon: React.ElementType;
}

export const CATEGORY_ICON_LIST: CategoryIconDef[] = [
  { id: 'folder', label: 'Pasta', icon: Folder },
  { id: 'key', label: 'Chave', icon: Key },
  { id: 'lock', label: 'Cadeado', icon: Lock },
  { id: 'shield', label: 'Escudo / Proteção', icon: Shield },
  { id: 'server', label: 'Servidor / Cloud', icon: Server },
  { id: 'database', label: 'Banco de Dados', icon: Database },
  { id: 'cloud', label: 'Nuvem', icon: Cloud },
  { id: 'mail', label: 'E-mail / Mensagens', icon: Mail },
  { id: 'globe', label: 'Web / Internet', icon: Globe },
  { id: 'credit-card', label: 'Cartão / Pagamento', icon: CreditCard },
  { id: 'code', label: 'Código / API', icon: Code2 },
  { id: 'briefcase', label: 'Trabalho / Empresa', icon: Briefcase },
  { id: 'user', label: 'Conta / Pessoal', icon: User },
  { id: 'star', label: 'Favorito / Destaque', icon: Star },
  { id: 'box', label: 'Caixa / Arquivo', icon: Box },
  { id: 'terminal', label: 'Terminal / SSH', icon: Terminal },
  { id: 'file-text', label: 'Documento / Nota', icon: FileText },
  { id: 'file-check', label: 'Certificado PKI', icon: FileCheck },
  { id: 'wifi', label: 'Rede / Wi-Fi', icon: Wifi },
  { id: 'smartphone', label: 'Mobile / App', icon: Smartphone },
  { id: 'landmark', label: 'Banco / Finanças', icon: Landmark },
  { id: 'shopping-bag', label: 'E-commerce / Compras', icon: ShoppingBag },
  { id: 'heart', label: 'Saúde / Pessoal', icon: Heart },
  { id: 'cpu', label: 'Hardware / Sistema', icon: Cpu },
];

export function getCategoryIconComponent(iconId?: string): React.ElementType {
  if (!iconId) return Folder;
  const match = CATEGORY_ICON_LIST.find(c => c.id === iconId);
  return match ? match.icon : Folder;
}
