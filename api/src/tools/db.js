const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
let pool = null;

function getPool() {
  if (!connectionString) return null;
  if (!pool) pool = new Pool({ connectionString, ssl: getSsl() });
  return pool;
}

function getSsl() {
  if (process.env.PGSSL === 'false') return false;
  return { rejectUnauthorized: false };
}

async function ensureSchema() {
  const p = getPool();
  if (!p) return;
  await p.query(`
    create table if not exists conversations (
      id text primary key,
      created_at timestamptz default now()
    );
    create table if not exists messages (
      id bigserial primary key,
      conversation_id text references conversations(id),
      role text not null,
      content text not null,
      ts timestamptz default now()
    );
    create table if not exists leads (
      id bigserial primary key,
      intent text,
      created_at timestamptz default now()
    );
  `);
}

async function saveMessage(conversationId, role, content) {
  const p = getPool();
  if (!p) return;
  await p.query('insert into conversations(id) values($1) on conflict do nothing', [conversationId]);
  await p.query('insert into messages(conversation_id, role, content) values($1,$2,$3)', [conversationId, role, content]);
}

async function saveLead(intent) {
  const p = getPool();
  if (!p) return;
  await p.query('insert into leads(intent) values($1)', [intent]);
}

module.exports = { getPool, ensureSchema, saveMessage, saveLead };


