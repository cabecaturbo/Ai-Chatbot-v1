const BASE_URL = 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

async function main() {
  const conversations = 20;
  const messagesPerConv = 10;
  const tasks = [];

  for (let c = 0; c < conversations; c++) {
    const convId = `load-${c}-${Date.now()}`;
    for (let m = 0; m < messagesPerConv; m++) {
      tasks.push(
        post('/crisp/webhook', { conversation_id: convId, message: `msg ${m}` })
      );
    }
  }

  const started = Date.now();
  const results = await Promise.allSettled(tasks);
  const durationSec = (Date.now() - started) / 1000;
  const okCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  console.log(`Sent ${tasks.length} requests in ${durationSec.toFixed(2)}s, ok=${okCount}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


