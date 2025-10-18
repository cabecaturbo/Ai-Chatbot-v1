export const DEMO_TEMPLATES = {
  PRICING: `Our demo pricing:
- Starter: $29/mo
- Growth: $79/mo
- Scale: $199/mo
Would you like a recommendation?`,

  BOOKING: `I can get you scheduled. Do you prefer mornings or afternoons?`,

  FAQ: `Common Qs: hours (Mon–Fri 9–6), location (NYC), support (standard vs priority).
Which one would you like to know about?`,

  POST_BOOKING: (eventId: string): string =>
    `You're booked! Your confirmation ID is ${eventId}. We'll follow up with details.`
} as const;
