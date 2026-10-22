import { VaultItem } from '../types';
import { tr } from './i18n';

// Browsers can't hand their saved passwords to a web page, but every major one
// exports them as CSV. This module turns those CSVs into vault items, entirely
// in memory: nothing here touches the network or storage.

export type ImportSource =
  | 'chromium'
  | 'firefox'
  | 'safari'
  | 'bitwarden'
  | 'lastpass'
  | '1password'
  | 'generic';

export const SOURCE_LABELS: Record<ImportSource, string> = {
  chromium: 'Chrome / Edge / Brave / Opera',
  firefox: 'Firefox',
  safari: 'Safari',
  bitwarden: 'Bitwarden',
  lastpass: 'LastPass',
  '1password': '1Password',
  generic: 'CSV genérico',
};

// Short label used as the tag on imported items
const SOURCE_TAGS: Record<ImportSource, string> = {
  chromium: 'Navegador',
  firefox: 'Firefox',
  safari: 'Safari',
  bitwarden: 'Bitwarden',
  lastpass: 'LastPass',
  '1password': '1Password',
  generic: 'Importado',
};

export type RowStatus = 'new' | 'duplicate' | 'conflict' | 'invalid';

export interface ImportRow {
  index: number; // 1-based line in the file (header excluded) for error messages
  item: VaultItem;
  status: RowStatus;
  reason?: string; // why it's invalid / what it collides with
  matchId?: string; // existing vault item it duplicates or conflicts with
}

export interface ImportResult {
  source: ImportSource;
  rows: ImportRow[];
  totalLines: number;
}

export class ImportError extends Error {}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 20_000;

/* ------------------------------------------------------------------ CSV */

const detectDelimiter = (text: string): string => {
  // Look only at the header line, ignoring anything inside quotes
  let inQuotes = false;
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';
};

/** RFC 4180 parser: quoted fields may contain delimiters, newlines and "" escapes. */
export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^﻿/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully blank lines (trailing newline, spacer rows)
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
};

/* -------------------------------------------------------- column mapping */

type Field = 'title' | 'url' | 'username' | 'password' | 'notes' | 'totp' | 'group' | 'favorite' | 'type' | 'created' | 'updated';

const ALIASES: Record<Field, string[]> = {
  title: ['name', 'title', 'nome', 'título', 'titulo'],
  url: ['url', 'login_uri', 'website', 'uri', 'site', 'origin', 'endereço', 'endereco'],
  username: ['username', 'login_username', 'login', 'user', 'usuário', 'usuario', 'email', 'e-mail'],
  password: ['password', 'login_password', 'senha', 'pass'],
  notes: ['note', 'notes', 'extra', 'comments', 'notas', 'observações', 'observacoes'],
  totp: ['otpauth', 'totp', 'login_totp', 'otp'],
  group: ['grouping', 'folder', 'tags', 'pasta', 'group'],
  favorite: ['favorite', 'fav', 'favorito'],
  type: ['type'],
  created: ['timecreated'],
  updated: ['timepasswordchanged'],
};

const detectSource = (headers: string[]): ImportSource => {
  const h = new Set(headers);
  if (h.has('login_password') && h.has('login_uri')) return 'bitwarden';
  if (h.has('httprealm') || h.has('formactionorigin')) return 'firefox';
  if (h.has('grouping') && h.has('extra')) return 'lastpass';
  if (h.has('otpauth') && h.has('archived')) return '1password';
  if (h.has('otpauth') && h.has('title')) return 'safari';
  if (h.has('name') && h.has('url') && h.has('username') && h.has('password')) return 'chromium';
  return 'generic';
};

const buildColumnMap = (headers: string[]) => {
  const map: Partial<Record<Field, number>> = {};
  (Object.keys(ALIASES) as Field[]).forEach(field => {
    const idx = headers.findIndex(h => ALIASES[field].includes(h));
    if (idx >= 0) map[field] = idx;
  });
  return map;
};

/* ------------------------------------------------------------ normalizing */

export const hostOf = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const { hostname, protocol } = new URL(withScheme);
    // android://… entries from Chrome have opaque hosts; keep them distinct but readable
    if (protocol === 'android:') return trimmed.split('@').pop() || trimmed;
    return hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
};

// Keep only the base32 secret, whatever form the exporter wrote it in
const extractTotpSecret = (raw?: string): string | undefined => {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.toLowerCase().startsWith('otpauth://')) {
    try {
      return new URL(value).searchParams.get('secret')?.replace(/\s/g, '').toUpperCase() || undefined;
    } catch {
      return undefined;
    }
  }
  const compact = value.replace(/\s/g, '').toUpperCase();
  return /^[A-Z2-7]+=*$/.test(compact) ? compact : undefined;
};

const titleFromHost = (host: string): string => {
  if (!host) return '';
  const main = host.split('.').filter(p => !['com', 'br', 'org', 'net', 'gov', 'edu', 'co', 'io'].includes(p));
  const base = main[main.length - 1] || host;
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const parseTimestamp = (raw?: string): number | undefined => {
  const n = Number(raw);
  if (raw && Number.isFinite(n) && n > 946684800000) return n; // after 2000-01-01, in ms
  return undefined;
};

const loginKey = (host: string, login: string) => `${host}\u0000${login.trim().toLowerCase()}`;

/* ------------------------------------------------------------------- main */

export const parseBrowserExport = (csvText: string, existing: VaultItem[], now = Date.now()): ImportResult => {
  const table = parseCsv(csvText);
  if (table.length === 0) throw new ImportError(tr("O arquivo está vazio."));

  const headers = table[0].map(h => h.trim().toLowerCase());
  const cols = buildColumnMap(headers);
  if (cols.password === undefined) {
    throw new ImportError(tr("Não encontrei uma coluna de senha. Confira se é o CSV exportado pelo navegador."));
  }
  if (cols.url === undefined && cols.title === undefined) {
    throw new ImportError(tr("Não encontrei colunas de site ou nome no arquivo."));
  }

  const body = table.slice(1);
  if (body.length > MAX_ROWS) {
    throw new ImportError(tr('O arquivo tem {p0} linhas; o limite é {p1}.', { p0: body.length.toLocaleString(), p1: MAX_ROWS.toLocaleString() }));
  }

  const source = detectSource(headers);
  const get = (row: string[], field: Field) => {
    const idx = cols[field];
    return idx === undefined ? '' : (row[idx] ?? '').trim();
  };

  // Index what's already in the vault so each row can be classified
  const existingByKey = new Map<string, VaultItem>();
  existing.forEach(item => {
    if (!item.password) return;
    const login = item.username || item.email || '';
    existingByKey.set(loginKey(hostOf(item.url) || item.title.toLowerCase(), login), item);
  });
  const seenInFile = new Map<string, string>(); // key -> password, to catch repeats inside the CSV

  const rows: ImportRow[] = body.map((row, i) => {
    const url = get(row, 'url');
    const host = hostOf(url);
    const login = get(row, 'username');
    const password = get(row, 'password');
    const group = get(row, 'group');
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login);
    const created = parseTimestamp(get(row, 'created')) ?? now;

    const item: VaultItem = {
      id: crypto.randomUUID(),
      title: get(row, 'title') || titleFromHost(host) || tr('Sem nome'),
      category: 'login',
      username: isEmail ? undefined : login || undefined,
      email: isEmail ? login : undefined,
      password,
      url: url || undefined,
      notes: get(row, 'notes') || undefined,
      totpSecret: extractTotpSecret(get(row, 'totp')),
      tags: [tr(SOURCE_TAGS[source]), ...(group ? [group] : [])],
      favorite: ['1', 'true', 'sim', 'yes'].includes(get(row, 'favorite').toLowerCase()),
      customFields: [],
      createdAt: created,
      updatedAt: parseTimestamp(get(row, 'updated')) ?? created,
    };

    const base = { index: i + 1, item };

    const type = get(row, 'type').toLowerCase();
    if (type && type !== 'login') return { ...base, status: 'invalid' as const, reason: tr("Não é um login (cartão, nota ou identidade).") };
    if (!password) return { ...base, status: 'invalid' as const, reason: tr("Sem senha.") };
    if (!host && !get(row, 'title')) return { ...base, status: 'invalid' as const, reason: tr("Sem site e sem nome.") };

    const key = loginKey(host || item.title.toLowerCase(), login);
    const match = existingByKey.get(key);
    if (match) {
      return match.password === password
        ? { ...base, status: 'duplicate' as const, reason: tr("Já está no cofre."), matchId: match.id }
        : { ...base, status: 'conflict' as const, reason: tr("Já existe no cofre com outra senha."), matchId: match.id };
    }
    const earlier = seenInFile.get(key);
    if (earlier !== undefined) {
      return earlier === password
        ? { ...base, status: 'duplicate' as const, reason: tr("Repetido no arquivo.") }
        : { ...base, status: 'conflict' as const, reason: tr("Aparece mais de uma vez no arquivo com senhas diferentes.") };
    }
    seenInFile.set(key, password);
    return { ...base, status: 'new' as const };
  });

  return { source, rows, totalLines: body.length };
};
