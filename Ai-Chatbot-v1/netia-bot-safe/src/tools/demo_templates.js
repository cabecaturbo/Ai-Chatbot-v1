const PRICING = `Our demo pricing:
- Starter: $29/mo
- Growth: $79/mo
- Scale: $199/mo
Would you like a recommendation?`;

const BOOKING = `I can get you scheduled. Do you prefer mornings or afternoons?`;

const FAQ = `Common Qs: hours (Mon–Fri 9–6), location (NYC), support (standard vs priority).
Which one would you like to know about?`;

const POST_BOOKING = (eventId) =>
  `You're booked! Your confirmation ID is ${eventId}. We'll follow up with details.`;

module.exports = { PRICING, BOOKING, FAQ, POST_BOOKING };


