function appendLead(lead, { dryRun = true } = {}) {
  const safeLead = {
    name: lead && lead.name ? '[redacted]' : undefined,
    email: lead && lead.email ? '[redacted]' : undefined,
    phone: lead && lead.phone ? '[redacted]' : undefined,
    intent: lead && lead.intent,
    ts: new Date().toISOString(),
  };
  if (dryRun) {
    console.log('[LEAD][DRY]', JSON.stringify(safeLead));
    return { ok: true, dry: true };
  }
  // TODO: integrate with Sheets/DB in live mode
  console.log('[LEAD][LIVE]', JSON.stringify(safeLead));
  return { ok: true, dry: false };
}

module.exports = { appendLead };


