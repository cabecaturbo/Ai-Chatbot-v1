import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const cache = new Map<string, any>();

function loadFileCached<T>(key: string, loader: () => T): T {
  if (cache.has(key)) return cache.get(key);
  const value = loader();
  cache.set(key, value);
  return value;
}

function getSystemPrompt(): string {
  return loadFileCached('system_prompt', () => {
    const p = path.join(__dirname, '..', 'config', 'system_prompt.txt');
    return fs.readFileSync(p, 'utf8');
  });
}

function getFaqKb(): any {
  return loadFileCached('faq_yaml', () => {
    const p = path.join(__dirname, '..', 'kb', 'faq.yaml');
    const raw = fs.readFileSync(p, 'utf8');
    return yaml.load(raw);
  });
}

export { getSystemPrompt, getFaqKb };
