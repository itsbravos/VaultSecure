import React, { useState } from 'react';
import {
  Key,
  CreditCard,
  FileText,
  FileCheck,
  Code2,
  Folder,
  Globe,
  Mail,
  Smartphone,
  Shield,
  Server,
  Terminal,
  Database,
  Lock,
  Landmark,
  Bot,
  Gamepad2,
  Tv,
  ShoppingBag,
  Briefcase,
  Music,
  Share2,
} from 'lucide-react';
import { VaultItem, VaultSettings } from '../types';
import { getCategoryIconComponent } from '../lib/categoryIcons';
import { getTheme } from '../lib/theme';

interface ItemIconProps {
  item: VaultItem;
  size?: 'sm' | 'md' | 'lg';
  settings?: VaultSettings;
  className?: string;
}

// Brand SVG path definitions or color styling for known sites
interface KnownBrand {
  keywords: string[];
  colorBg: string;
  colorText: string;
  borderColor: string;
  icon?: React.ElementType;
  svgIcon?: React.ReactNode;
}

const KNOWN_BRANDS: KnownBrand[] = [
  {
    keywords: ['google', 'gmail', 'youtube', 'drive', 'google.com'],
    colorBg: 'bg-red-500/10 dark:bg-red-500/20',
    colorText: 'text-red-500',
    borderColor: 'border-red-500/30',
    svgIcon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
    ),
  },
  {
    keywords: ['facebook', 'meta', 'fb.com', 'facebook.com'],
    colorBg: 'bg-blue-600/10 dark:bg-blue-600/20',
    colorText: 'text-blue-500',
    borderColor: 'border-blue-600/30',
    svgIcon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    keywords: ['github', 'github.com', 'octocat'],
    colorBg: 'bg-stone-500/10 dark:bg-stone-500/20',
    colorText: 'text-stone-900 dark:text-stone-100',
    borderColor: 'border-stone-500/30',
    svgIcon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    keywords: ['microsoft', 'outlook', 'office365', 'azure', 'live.com', 'hotmail'],
    colorBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    colorText: 'text-cyan-500',
    borderColor: 'border-cyan-500/30',
    icon: Mail,
  },
  {
    keywords: ['apple', 'icloud', 'apple.com'],
    colorBg: 'bg-gray-500/10 dark:bg-gray-500/20',
    colorText: 'text-gray-800 dark:text-[#D3E0DC]',
    borderColor: 'border-gray-500/30',
    icon: Shield,
  },
  {
    keywords: ['netflix', 'netflix.com'],
    colorBg: 'bg-red-600/10 dark:bg-red-600/20',
    colorText: 'text-red-600',
    borderColor: 'border-red-600/30',
    icon: Tv,
  },
  {
    keywords: ['amazon', 'aws', 'prime'],
    colorBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    colorText: 'text-amber-500',
    borderColor: 'border-amber-500/30',
    icon: ShoppingBag,
  },
  {
    keywords: ['twitter', 'x.com', 'twitter.com'],
    colorBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    colorText: 'text-sky-500',
    borderColor: 'border-sky-500/30',
    icon: Share2,
  },
  {
    keywords: ['spotify', 'spotify.com'],
    colorBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    colorText: 'text-emerald-500',
    borderColor: 'border-emerald-500/30',
    icon: Music,
  },
  {
    keywords: ['linkedin', 'linkedin.com'],
    colorBg: 'bg-blue-700/10 dark:bg-blue-700/20',
    colorText: 'text-blue-600',
    borderColor: 'border-blue-700/30',
    icon: Briefcase,
  },
  {
    keywords: ['discord', 'discord.com'],
    colorBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    colorText: 'text-indigo-500',
    borderColor: 'border-indigo-500/30',
    icon: Smartphone,
  },
  {
    keywords: ['chatgpt', 'openai', 'claude', 'gemini'],
    colorBg: 'bg-emerald-600/10 dark:bg-emerald-600/20',
    colorText: 'text-emerald-400',
    borderColor: 'border-emerald-600/30',
    icon: Bot,
  },
  {
    keywords: ['steam', 'playstation', 'xbox', 'nintendo'],
    colorBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    colorText: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    icon: Gamepad2,
  },
  {
    keywords: ['nubank', 'itaú', 'itau', 'bradesco', 'santander', 'inter', 'bb.com', 'caixa', 'banco', 'paypal', 'stripe'],
    colorBg: 'bg-purple-600/10 dark:bg-purple-600/20',
    colorText: 'text-purple-500',
    borderColor: 'border-purple-600/30',
    icon: Landmark,
  },
];

export const ItemIcon: React.FC<ItemIconProps> = ({
  item,
  size = 'md',
  settings,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Extract domain from url if present
  let domain = '';
  if (item.url) {
    try {
      const clean = item.url.startsWith('http') ? item.url : `https://${item.url}`;
      domain = new URL(clean).hostname.replace(/^www\./, '');
    } catch (e) {
      domain = item.url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
    }
  }

  const searchText = `${item.title} ${domain} ${item.url || ''}`.toLowerCase();

  // Match known brand
  const matchedBrand = KNOWN_BRANDS.find(brand =>
    brand.keywords.some(kw => searchText.includes(kw))
  );

  const isLight = getTheme(settings?.theme).isLight;

  const dimensionClass =
    size === 'sm'
      ? 'w-7 h-7 text-[13px] rounded-lg'
      : size === 'lg'
      ? 'w-12 h-12 text-xl rounded-xl'
      : 'w-10 h-10 text-base rounded-xl';

  const iconSizeClass =
    size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  // Favicons are drawn for white backgrounds, so they sit on a light tile in both themes
  const canFetchOnline = settings?.enableOnlineFavicons !== false;
  if (domain && canFetchOnline && !imgError) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    return (
      <div
        className={`${dimensionClass} bg-[#F7FAF8] ring-1 ring-inset ring-black/[0.08] flex items-center justify-center overflow-hidden shrink-0 ${className}`}
        title={item.title}
      >
        <img
          src={faviconUrl}
          alt=""
          // Google answers unknown domains with a generic 16px globe; show our monogram instead
          onLoad={e => e.currentTarget.naturalWidth <= 16 && setImgError(true)}
          onError={() => setImgError(true)}
          className="w-[62%] h-[62%] object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // Known brand without a usable favicon
  if (matchedBrand) {
    const IconComp = matchedBrand.icon;
    return (
      <div
        className={`${dimensionClass} ${matchedBrand.colorBg} ${matchedBrand.colorText} flex items-center justify-center shrink-0 ${className}`}
        title={item.title}
      >
        {matchedBrand.svgIcon ? matchedBrand.svgIcon : IconComp ? <IconComp className={iconSizeClass} /> : <Globe className={iconSizeClass} />}
      </div>
    );
  }

  // Stable soft color per name, readable on both paper and ink themes
  const hue = [...(item.title || '?')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
  const tint = isLight
    ? { background: `hsl(${hue} 32% 90%)`, color: `hsl(${hue} 45% 28%)` }
    : { background: `hsl(${hue} 28% 21%)`, color: `hsl(${hue} 55% 80%)` };

  // Logins and keys read best as a monogram; other types keep their category glyph
  const CATEGORY_ICONS: Record<string, React.ElementType> = {
    card: CreditCard,
    note: FileText,
    certificate: FileCheck,
  };
  const customCat = (settings?.customCategories || []).find(c => c.id === item.category);
  const CategoryIconComponent: React.ElementType | null =
    CATEGORY_ICONS[item.category] || (customCat?.icon ? getCategoryIconComponent(customCat.icon) : null);

  const letter = (item.title.trim().match(/[\p{L}\p{N}]/u)?.[0] || '?').toUpperCase();

  return (
    <div
      className={`${dimensionClass} flex items-center justify-center shrink-0 font-semibold ${className}`}
      style={tint}
      title={item.title}
      aria-hidden
    >
      {CategoryIconComponent ? <CategoryIconComponent className={iconSizeClass} /> : letter}
    </div>
  );
};
