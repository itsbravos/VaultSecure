import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Tag, FolderPlus, Check, Folder, Key, CreditCard, FileText, FileCheck, Code2 } from 'lucide-react';
import { CustomCategory, VaultSettings, VaultItem } from '../types';
import { CATEGORY_ICON_LIST, getCategoryIconComponent } from '../lib/categoryIcons';
import { confirmDialog } from './DialogHost';
import { tr } from '../lib/i18n';

interface CategoryTagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VaultSettings;
  onUpdateSettings: (newSettings: VaultSettings) => void;
  items: VaultItem[];
  onUpdateItemsTags?: (oldTag: string, newTag: string) => void;
}

export const CategoryTagManagerModal: React.FC<CategoryTagManagerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  items,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [selectedIconId, setSelectedIconId] = useState('folder');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatIcon, setEditingCatIcon] = useState('folder');

  // Tag State
  const [newTagName, setNewTagName] = useState('');

  const customCategories = settings.customCategories || [];

  // Extract all unique tags used in items + managed tags in settings
  const allUsedTags = Array.from(
    new Set([
      ...(settings.managedTags || []),
      ...items.flatMap(i => i.tags || []),
    ])
  ).filter(Boolean);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: CustomCategory = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: selectedIconId,
    };

    onUpdateSettings({
      ...settings,
      customCategories: [...customCategories, newCat],
    });

    setNewCatName('');
    setSelectedIconId('folder');
  };

  const handleSaveEditCategory = (catId: string) => {
    if (!editingCatName.trim()) return;

    const updated = customCategories.map(c =>
      c.id === catId ? { ...c, name: editingCatName.trim(), icon: editingCatIcon } : c
    );

    onUpdateSettings({
      ...settings,
      customCategories: updated,
    });

    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleDeleteCategory = async (catId: string) => {
    if (await confirmDialog({ title: tr("Excluir esta categoria?"), message: tr("Os itens dela continuam no cofre."), confirmLabel: tr("Excluir"), danger: true })) {
      const updated = customCategories.filter(c => c.id !== catId);
      onUpdateSettings({
        ...settings,
        customCategories: updated,
      });
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const cleanTag = newTagName.trim().toLowerCase().replace(/^#/, '');
    const currentManaged = settings.managedTags || [];

    if (!currentManaged.includes(cleanTag)) {
      onUpdateSettings({
        ...settings,
        managedTags: [...currentManaged, cleanTag],
      });
    }

    setNewTagName('');
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    if (await confirmDialog({ title: tr("Remover a tag \"{p0}\"?", { p0: tagToDelete }), message: tr("Ela sai da lista de tags gerenciadas."), confirmLabel: tr("Remover"), danger: true })) {
      const currentManaged = settings.managedTags || [];
      onUpdateSettings({
        ...settings,
        managedTags: currentManaged.filter(t => t !== tagToDelete),
      });
    }
  };

  // Standard system categories for reference
  const DEFAULT_SYSTEM_CATS = [
    { id: 'login', name: tr("Emails e Logins"), icon: Key, color: 'text-emerald-400' },
    { id: 'card', name: tr("Cartões de Crédito"), icon: CreditCard, color: 'text-cyan-400' },
    { id: 'note', name: tr("Notas Seguras"), icon: FileText, color: 'text-indigo-400' },
    { id: 'certificate', name: tr("Certificados PKI"), icon: FileCheck, color: 'text-blue-400' },
    { id: 'api_key', name: tr("Chaves API e SSH"), icon: Code2, color: 'text-purple-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-[#13282E] border border-[#2C4A50] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2C4A50] bg-[#13282E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Gerenciar Categorias & Ícones</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#183238] text-[#86A19B] hover:text-[#D3E0DC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#0B1A1E] p-1 border-b border-[#2C4A50] text-xs">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2 rounded-lg text-center font-semibold transition-colors ${
              activeTab === 'categories'
                ? 'bg-[#183238] text-emerald-400'
                : 'text-[#86A19B] hover:text-[#D3E0DC]'
            }`}
          >
            {tr("Categorias Customizadas (")}{customCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex-1 py-2 rounded-lg text-center font-semibold transition-colors ${
              activeTab === 'tags'
                ? 'bg-[#183238] text-emerald-400'
                : 'text-[#86A19B] hover:text-[#D3E0DC]'
            }`}
          >
            {tr("Tags (")}{allUsedTags.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              
              {/* Form to add new Category with Icon Selector */}
              <form onSubmit={handleAddCategory} className="space-y-3 bg-[#0B1A1E] p-3.5 border border-[#2C4A50] rounded-xl">
                <p className="text-xs font-bold text-emerald-400">
                  {tr("Criar Nova Categoria Customizada")}
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder={tr("Nome da Categoria (ex: Finanças, Servidores)")}
                    className="flex-1 bg-[#13282E] border border-[#2C4A50] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> {tr("Criar")}
                  </button>
                </div>

                {/* ICON SELECTOR GRID */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs text-[#86A19B]">{tr("Escolha o Ícone Representativo:")}</label>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-32 overflow-y-auto p-1 bg-[#13282E] border border-[#2C4A50] rounded-xl">
                    {CATEGORY_ICON_LIST.map(ic => {
                      const IconComp = ic.icon;
                      const isSelected = selectedIconId === ic.id;
                      return (
                        <button
                          key={ic.id}
                          type="button"
                          onClick={() => setSelectedIconId(ic.id)}
                          className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                              : 'bg-[#0B1A1E] border-[#2C4A50] text-[#86A19B] hover:text-[#D3E0DC]'
                          }`}
                          title={tr(ic.label)}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>

              {/* LIST OF CUSTOM CATEGORIES */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-[#6E8A85]">
                  {tr("Suas Categorias Personalizadas")}
                </p>

                {customCategories.length === 0 ? (
                  <p className="text-xs text-[#6E8A85] italic py-2">
                    {tr("Nenhuma categoria personalizada criada. Escolha um nome e ícone acima para personalizar seu cofre.")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customCategories.map(cat => {
                      const IconComp = getCategoryIconComponent(cat.icon);
                      const isEditing = editingCatId === cat.id;

                      return (
                        <div
                          key={cat.id}
                          className="bg-[#0B1A1E] border border-[#2C4A50] rounded-xl p-3 space-y-2 text-xs"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingCatName}
                                  onChange={e => setEditingCatName(e.target.value)}
                                  className="flex-1 bg-[#13282E] border border-emerald-500 rounded px-2.5 py-1.5 text-xs text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCategory(cat.id)}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-bold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> {tr("Salvar")}
                                </button>
                              </div>

                              {/* Edit Icon Picker */}
                              <div className="grid grid-cols-8 gap-1 p-1 bg-[#13282E] border border-[#2C4A50] rounded-lg">
                                {CATEGORY_ICON_LIST.map(ic => {
                                  const IcComp = ic.icon;
                                  const isSel = editingCatIcon === ic.id;
                                  return (
                                    <button
                                      key={ic.id}
                                      type="button"
                                      onClick={() => setEditingCatIcon(ic.id)}
                                      className={`p-1.5 rounded border flex items-center justify-center ${
                                        isSel
                                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                          : 'bg-[#0B1A1E] border-[#2C4A50] text-[#6E8A85]'
                                      }`}
                                      title={tr(ic.label)}
                                    >
                                      <IcComp className="w-3.5 h-3.5" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                                  <IconComp className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[#D3E0DC] font-bold">{cat.name}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCatId(cat.id);
                                    setEditingCatName(cat.name);
                                    setEditingCatIcon(cat.icon || 'folder');
                                  }}
                                  className="p-1.5 text-[#86A19B] hover:text-white rounded-lg hover:bg-[#183238]"
                                  title={tr("Editar Nome/Ícone")}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 text-[#6E8A85] hover:text-red-400 rounded-lg hover:bg-[#183238]"
                                  title={tr("Excluir Categoria")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIST OF SYSTEM DEFAULT CATEGORIES FOR REFERENCE */}
              <div className="space-y-2 pt-3 border-t border-[#2C4A50]/60">
                <p className="text-xs font-bold text-[#6E8A85]">
                  {tr("Categorias Padrão do Sistema")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEFAULT_SYSTEM_CATS.map(sc => {
                    const Ic = sc.icon;
                    return (
                      <div
                        key={sc.id}
                        className="bg-[#0B1A1E] border border-[#2C4A50]/80 rounded-xl p-2.5 flex items-center gap-2 text-xs"
                      >
                        <div className={`w-6 h-6 rounded-md bg-[#183238]/60 flex items-center justify-center ${sc.color}`}>
                          <Ic className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[#B9CBC6] font-medium">{sc.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAGS TAB */}
          {activeTab === 'tags' && (
            <div className="space-y-4">
              
              {/* Form to add new Tag */}
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder={tr("Nova Tag (ex: trabalho, urgente, pessoal)")}
                  className="flex-1 bg-[#0B1A1E] border border-[#2C4A50] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> {tr("Adicionar")}
                </button>
              </form>

              {/* Tag Cloud */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-[#6E8A85]">
                  {tr("Tags Cadastradas e Em Uso")}
                </p>

                {allUsedTags.length === 0 ? (
                  <p className="text-xs text-[#6E8A85] italic py-2">
                    {tr("Nenhuma tag cadastrada.")}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allUsedTags.map(tag => {
                      const count = items.filter(i => i.tags?.includes(tag)).length;
                      return (
                        <div
                          key={tag}
                          className="bg-[#0B1A1E] border border-[#2C4A50] rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs text-[#B9CBC6]"
                        >
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-emerald-400" />
                            #{tag}
                          </span>
                          <span className="text-xs text-[#6E8A85]">({count})</span>
                          <button
                            onClick={() => handleDeleteTag(tag)}
                            className="text-[#6E8A85] hover:text-red-400 ml-1 cursor-pointer"
                            title={tr("Excluir Tag")}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2C4A50] bg-[#0B1A1E] text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#183238] hover:bg-gray-700 text-[#D3E0DC] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {tr("Concluído")}
          </button>
        </div>

      </div>
    </div>
  );
};
