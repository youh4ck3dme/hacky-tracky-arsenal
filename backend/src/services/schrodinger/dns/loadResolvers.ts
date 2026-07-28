import fs from 'node:fs';

const FALLBACK = ['1.1.1.1', '8.8.8.8', '9.9.9.9'];

export function loadResolverList(resolversPath: string): string[] {
  try {
    if (!fs.existsSync(resolversPath)) return [...FALLBACK];
    const lines = fs
      .readFileSync(resolversPath, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^\d{1,3}(\.\d{1,3}){3}$/.test(l));
    return lines.length > 0 ? lines : [...FALLBACK];
  } catch {
    return [...FALLBACK];
  }
}

export { FALLBACK as FALLBACK_RESOLVERS };
