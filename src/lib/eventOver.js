/* TTFC 2026 is over (Oct 27 2026, the organiser: "The Tech Festival 2026 is over. Move the tickets page to say see
   you soon … Early bird prices will be live soon."). After the last session, the Tickets page, the checkout and the
   web app's passes sheet show "See you soon" while ticket sales are switched off in Admin (site.ticket_sales_open);
   before then, switching sales off still reads "Ticket sales are paused". */
export const EVENT_OVER_AT = new Date("2026-10-27T18:00:00-04:00");
export const eventOver = (now = new Date()) => now >= EVENT_OVER_AT;
/** The TTFC 2027 page (the waitlist), from the homepage's note. */
export const STAY_UPDATED_PATH = "/stay-updated";
/** Where people sign up to hear when the next early bird passes go live. */
export const EARLY_BIRD_PATH = "/stay-updated#join";
