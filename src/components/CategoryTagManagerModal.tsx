import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Tag, FolderPlus, Check, Folder, Key, CreditCard, FileText, FileCheck, Code2 } from 'lucide-react';
import { CustomCategory, VaultSettings, VaultItem } from '../types';
import { CATEGORY_ICON_LIST, getCategoryIconComponent } from '../lib/categoryIcons';

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

  const handleDeleteCategory = (catId: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria personalizada?')) {
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

  const handleDeleteTag = (tagToDelete: string) => {
    if (confirm(`Remover a tag "#${tagToDelete}" da lista de tags gerenciadas?`)) {
      const currentManaged = settings.managedTags || [];
      onUpdateSettings({
        ...settings,
        managedTags: currentManaged.filter(t => t !== tagToDelete),
      });
    }
  };

  // Standard system categories for reference
  const DEFAULT_SYSTEM_CATS = [
    { id: 'login', name: 'Emails e Logins', icon: Key, color: 'text-emerald-400' },
    { id: 'card', name: 'Cartões de Crédito', icon: CreditCard, color: 'text-cyan-400' },
    { id: 'note', name: 'Notas Seguras', icon: FileText, color: 'text-indigo-400' },
    { id: 'certificate', name: 'Certificados PKI', icon: FileCheck, color: 'text-blue-400' },
    { id: 'api_key', name: 'Chaves API e SSH', icon: Code2, color: 'text-purple-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-[#0F0F0F] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-[#0F0F0F] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Gerenciar Categorias & Ícones</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#050505] p-1 border-b border-gray-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2 rounded-lg text-center font-semibold transition-colors ${
              activeTab === 'categories'
                ? 'bg-gray-800 text-emerald-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Categorias Customizadas ({customCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex-1 py-2 rounded-lg text-center font-semibold transition-colors ${
              activeTab === 'tags'
                ? 'bg-gray-800 text-emerald-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Tags ({allUsedTags.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div className="space-y-4 font-mono">
              
              {/* Form to add new Category with Icon Selector */}
              <form onSubmit={handleAddCategory} className="space-y-3 bg-[#050505] p-3.5 border border-gray-800 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Criar Nova Categoria Customizada
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Nome da Categoria (ex: Finanças, Servidores)"
                    className="flex-1 bg-[#0F0F0F] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Criar
                  </button>
                </div>

                {/* ICON SELECTOR GRID */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] text-gray-400 font-mono">Escolha o Ícone Representativo:</label>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-32 overflow-y-auto p-1 bg-[#0F0F0F] border border-gray-800 rounded-xl">
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
                              : 'bg-[#050505] border-gray-800 text-gray-400 hover:text-gray-200'
                          }`}
                          title={ic.label}
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
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Suas Categorias Personalizadas
                </p>

                {customCategories.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">
                    Nenhuma categoria personalizada criada. Escolha um nome e ícone acima para personalizar seu cofre.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customCategories.map(cat => {
                      const IconComp = getCategoryIconComponent(cat.icon);
                      const isEditing = editingCatId === cat.id;

                      return (
                        <div
                          key={cat.id}
                          className="bg-[#050505] border border-gray-800 rounded-xl p-3 space-y-2 text-xs"
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingCatName}
                                  onChange={e => setEditingCatName(e.target.value)}
                                  className="flex-1 bg-[#0F0F0F] border border-emerald-500 rounded px-2.5 py-1.5 text-xs text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCategory(cat.id)}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-bold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Salvar
                                </button>
                              </div>

                              {/* Edit Icon Picker */}
                              <div className="grid grid-cols-8 gap-1 p-1 bg-[#0F0F0F] border border-gray-800 rounded-lg">
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
                                          : 'bg-[#050505] border-gray-800 text-gray-500'
                                      }`}
                                      title={ic.label}
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
                                <span className="text-gray-200 font-bold">{cat.name}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCatId(cat.id);
                                    setEditingCatName(cat.name);
                                    setEditingCatIcon(cat.icon || 'folder');
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                                  title="Editar Nome/Ícone"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800"
                                  title="Excluir Categoria"
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
              <div className="space-y-2 pt-3 border-t border-gray-800/60">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Categorias Padrão do Sistema
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEFAULT_SYSTEM_CATS.map(sc => {
                    const Ic = sc.icon;
                    return (
                      <div
                        key={sc.id}
                        className="bg-[#050505] border border-gray-800/80 rounded-xl p-2.5 flex items-center gap-2 text-xs"
                      >
                        <div className={`w-6 h-6 rounded-md bg-gray-800/60 flex items-center justify-center ${sc.color}`}>
                          <Ic className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-gray-300 font-medium">{sc.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAGS TAB */}
          {activeTab === 'tags' && (
            <div className="space-y-4 font-mono">
              
              {/* Form to add new Tag */}
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="Nova Tag (ex: trabalho, urgente, pessoal)"
                  className="flex-1 bg-[#050505] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </form>

              {/* Tag Cloud */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Tags Cadastradas e Em Uso
                </p>

                {allUsedTags.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">
                    Nenhuma tag cadastrada.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allUsedTags.map(tag => {
                      const count = items.filter(i => i.tags?.includes(tag)).length;
                      return (
                        <div
                          key={tag}
                          className="bg-[#050505] border border-gray-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs text-gray-300"
                        >
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-emerald-400" />
                            #{tag}
                          </span>
                          <span className="text-[10px] text-gray-500">({count})</span>
                          <button
                            onClick={() => handleDeleteTag(tag)}
                            className="text-gray-500 hover:text-red-400 ml-1 cursor-pointer"
                            title="Excluir Tag"
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
        <div className="p-4 border-t border-gray-800 bg-[#050505] text-right font-mono">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
