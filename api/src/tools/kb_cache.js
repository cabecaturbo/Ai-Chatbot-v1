const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const cache = new Map();

function loadFileCached(key, loader) {
  if (cache.has(key)) return cache.get(key);
  const value = loader();
  cache.set(key, value);
  return value;
}

function getSystemPrompt() {
  return loadFileCached('system_prompt', () => {
    const p = path.join(__dirname, '..', 'config', 'system_prompt.txt');
    return fs.readFileSync(p, 'utf8');
  });
}

function getFaqKb() {
  return loadFileCached('faq_yaml', () => {
    const p = path.join(__dirname, '..', 'kb', 'faq.yaml');
    const raw = fs.readFileSync(p, 'utf8');
    return yaml.load(raw);
  });
}

module.exports = { getSystemPrompt, getFaqKb };


