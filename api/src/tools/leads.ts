interface Lead {
  name?: string;
  email?: string;
  phone?: string;
  intent?: string;
}

interface LeadOptions {
  dryRun?: boolean;
}

interface LeadResult {
  ok: boolean;
  dry: boolean;
}

function appendLead(lead: Lead, { dryRun = true }: LeadOptions = {}): LeadResult {
  const safeLead = {
    name: lead?.name ? '[redacted]' : undefined,
    email: lead?.email ? '[redacted]' : undefined,
    phone: lead?.phone ? '[redacted]' : undefined,
    intent: lead?.intent,
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

export { appendLead };
