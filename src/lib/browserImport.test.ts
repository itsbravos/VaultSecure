import { describe, it, expect } from 'vitest';
import { parseCsv, parseBrowserExport, hostOf, ImportError } from './browserImport';
import { VaultItem } from '../types';

const existingItem = (over: Partial<VaultItem>): VaultItem => ({
  id: 'existing-1',
  title: 'Google',
  category: 'login',
  tags: [],
  favorite: false,
  customFields: [],
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('parseCsv', () => {
  it('handles quoted delimiters, escaped quotes, newlines, BOM and CRLF', () => {
    const csv = '﻿name,password\r\n"Acme, Inc","pa""ss\nword"\r\nOther,x\r\n';
    expect(parseCsv(csv)).toEqual([
      ['name', 'password'],
      ['Acme, Inc', 'pa"ss\nword'],
      ['Other', 'x'],
    ]);
  });

  it('detects semicolon-separated files (Excel pt-BR)', () => {
    expect(parseCsv('url;password\nhttps://a.com;123')).toEqual([
      ['url', 'password'],
      ['https://a.com', '123'],
    ]);
  });

  it('skips blank lines', () => {
    expect(parseCsv('a,b\n\n1,2\n\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('hostOf', () => {
  it('normalizes scheme, www and case', () => {
    expect(hostOf('https://WWW.Example.com/login?x=1')).toBe('example.com');
    expect(hostOf('example.com')).toBe('example.com');
    expect(hostOf('')).toBe('');
  });
});

describe('parseBrowserExport', () => {
  it('reads a Chrome/Edge export', () => {
    const csv = 'name,url,username,password,note\nGitHub,https://github.com/login,dev@ex.com,S3cret!,minha nota\n';
    const { source, rows } = parseBrowserExport(csv, []);
    expect(source).toBe('chromium');
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('new');
    expect(rows[0].item).toMatchObject({
      title: 'GitHub',
      email: 'dev@ex.com',
      password: 'S3cret!',
      url: 'https://github.com/login',
      notes: 'minha nota',
      category: 'login',
    });
  });

  it('reads a Firefox export and derives the title from the host', () => {
    const csv =
      '"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"\n' +
      '"https://www.netflix.com","joao","abc123",,"https://www.netflix.com","{x}","1700000000000","1700000000000","1710000000000"\n';
    const { source, rows } = parseBrowserExport(csv, []);
    expect(source).toBe('firefox');
    expect(rows[0].item.title).toBe('Netflix');
    expect(rows[0].item.username).toBe('joao');
    expect(rows[0].item.createdAt).toBe(1700000000000);
    expect(rows[0].item.updatedAt).toBe(1710000000000);
  });

  it('reads Safari exports including the TOTP secret', () => {
    const csv = 'Title,URL,Username,Password,Notes,OTPAuth\nBanco,https://banco.com.br,ana,pw,,otpauth://totp/Banco:ana?secret=JBSWY3DPEHPK3PXP&issuer=Banco\n';
    const { source, rows } = parseBrowserExport(csv, []);
    expect(source).toBe('safari');
    expect(rows[0].item.totpSecret).toBe('JBSWY3DPEHPK3PXP');
  });

  it('skips non-login Bitwarden rows', () => {
    const csv =
      'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n' +
      'Trabalho,1,login,Jira,,,0,https://jira.ex.com,ana,pw,\n' +
      ',,note,Receita,texto,,0,,,,\n';
    const { source, rows } = parseBrowserExport(csv, []);
    expect(source).toBe('bitwarden');
    expect(rows[0].status).toBe('new');
    expect(rows[0].item.favorite).toBe(true);
    expect(rows[0].item.tags).toContain('Trabalho');
    expect(rows[1].status).toBe('invalid');
  });

  it('classifies duplicates and conflicts against the vault and within the file', () => {
    const vault = [existingItem({ url: 'https://accounts.google.com', email: 'me@gmail.com', password: 'same', title: 'Google' })];
    const csv =
      'name,url,username,password\n' +
      'Google,https://accounts.google.com,me@gmail.com,same\n' + // already in vault
      'Google,https://accounts.google.com/x,me@gmail.com,changed\n' + // vault has another password
      'Site,https://site.com,u,1\n' +
      'Site,https://site.com,u,1\n' + // repeated in file
      'Site,https://site.com,u,2\n' + // repeated with different password
      'Vazio,https://vazio.com,u,\n'; // no password
    const statuses = parseBrowserExport(csv, vault).rows.map(r => r.status);
    expect(statuses).toEqual(['duplicate', 'conflict', 'new', 'duplicate', 'conflict', 'invalid']);
  });

  it('rejects files without a password column', () => {
    expect(() => parseBrowserExport('name,url\nA,https://a.com', [])).toThrow(ImportError);
  });

  it('rejects empty files', () => {
    expect(() => parseBrowserExport('', [])).toThrow(ImportError);
  });
});
