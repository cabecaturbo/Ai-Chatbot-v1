function generateSlots(days = 3) {
  const slots = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    for (const hour of [10, 11, 14, 15, 16]) {
      const dt = new Date(now);
      dt.setDate(now.getDate() + d + 1);
      dt.setHours(hour, 0, 0, 0);
      slots.push({ iso: dt.toISOString() });
    }
  }
  return slots;
}

function createEvent(slotIso, customer) {
  const eventId = `evt_${Math.random().toString(36).slice(2, 10)}`;
  return { eventId, when: slotIso, customer };
}

module.exports = { generateSlots, createEvent };


