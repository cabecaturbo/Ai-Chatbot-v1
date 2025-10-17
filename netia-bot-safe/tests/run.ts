import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { res, json: await res.json().catch(() => ({})) };
}

async function get(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { res, json: await res.json().catch(() => ({})) };
}

async function testHealth() {
  const { res, json } = await get('/health');
  assert.equal(res.status, 200);
  assert.equal(json.status, 'ok');
}

async function testWebhookBooking() {
  const { res, json } = await post('/crisp/webhook', {
    conversation_id: 'conv-run-1',
    message: 'I want to book an appointment',
  });
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.intent, 'booking');
}

async function testCalendar() {
  const { res: resSlots, json: slotsJson } = await get('/calendar/slots');
  assert.equal(resSlots.status, 200);
  assert.ok(slotsJson.slots && Array.isArray(slotsJson.slots) && slotsJson.slots.length > 0);
  const slot = slotsJson.slots[0].iso;
  const { res: resBook, json: bookJson } = await post('/calendar/book', { slot });
  assert.equal(resBook.status, 200);
  assert.equal(bookJson.ok, true);
  assert.ok(bookJson.event && bookJson.event.eventId);
}

async function run() {
  await testHealth();
  await testWebhookBooking();
  await testCalendar();
  console.log('All conversation tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


