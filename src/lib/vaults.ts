import { Shield, Briefcase, Users, LucideIcon } from 'lucide-react';

export interface VaultDefinition {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

export const VAULTS: VaultDefinition[] = [
  {
    id: 'pessoal',
    name: 'Cofre Pessoal',
    desc: 'Contas & senhas individuais',
    icon: Shield,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'trabalho',
    name: 'Cofre de Trabalho',
    desc: 'Empresa & acessos corporativos',
    icon: Briefcase,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'compartilhado',
    name: 'Cofre Compartilhado',
    desc: 'Chaves & dados de equipe',
    icon: Users,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
];
