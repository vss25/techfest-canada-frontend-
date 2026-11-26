/* =========================================================
   How to use each admin page (Nov 2026: "a help section and
   how to use under each page … to make it easy for a new person
   to understand"). Keyed by the page's address under /admin
   (nav.js `to`). Each guide:
     what   one or two sentences: what the page is for
     steps  how to do the main job, in order
     tips   good to know: what goes live at once, who can do what
   The ⓘ next to every page title shows its guide (HelpButton.jsx);
   Home › Help & how-to lists them all. When a page changes, change
   its guide here too.
========================================================= */

/** Where the website's content goes live: said once, used by every content guide. */
const FLOW = "Saving keeps your change in the panel only. Send it to staging from Home › Website changes, check it on the staging site, then publish it to the live website.";
const NOW = (what) => `${what} change the live website straight away: they don't go through staging.`;

export const HELP = {
  /* ---------- Home ---------- */
  "": {
    what: "Your starting point: today's numbers across tickets, the website and the app, and shortcuts to the jobs people do most.",
    steps: ["Read the cards at the top for today's numbers.", "Use Quick actions to jump straight to a common job, like giving a pass or checking someone in.", "Use the rail on the left (or the tabs at the bottom on a phone) to go to any other area."],
    tips: ["Revenue figures are for management only.", "Press ⌘K (Ctrl K on Windows) anywhere to search for a person, a ticket or a page."],
  },
  "content/changes": {
    what: "Every website content change on its way to the website: what's saved but not sent, and what's on staging waiting to be published.",
    steps: ["Edit content in its own page (Event pages, Agenda, Speakers, Partners…) and save. It appears here under Saved, not sent.", "Tick the changes you want, or none for all, and click Send to staging.", "Click Open staging site and check the pages. Sign in there once with your staff email and password to see staged content.", "When it looks right, click Publish to live. It's on thetechfestival.com and in the apps within about a minute."],
    tips: ["Only what's on staging can be published, so what goes live is what was checked.", "Throw away removes a change; the live website keeps its current version.", "Older drafts, not from this panel, were left in Sanity before this page existed. They can't be published from here: throw away the ones nobody needs.", "Deleting an item in an editor (a speaker, a session, a partner) takes it off the live website at once, without staging.", "Publish to live turns on for an event's content once its Event page has what's required to go live (city, theme, description, city photo, date or date line). Until then, send changes to staging and review them there."],
  },
  help: {
    what: "How the panel works, and a guide to every page.",
    steps: ["Read Start here once.", "Find a page in the list, or type in the search box, and open its guide.", "On any page, the ⓘ next to its title shows the same guide."],
    tips: [],
  },

  /* ---------- Content ---------- */
  "content/events": {
    what: "Each event's page on the website: its name, dates, venue, theme, photo and the coming-soon details.",
    steps: ["Pick an event on the left, or click New event to start one (it isn't on the website until it's published).", "Change the fields and click Save.", "Click Send to staging, then Open on staging to see the page as visitors will.", "Click Publish to live when it's right."],
    tips: ["Set First day and Last day once the date is fixed: the page then shows the full date and a countdown. Until then, Date line shows something like “February 2027 · One day”.", "Leave Venue empty to show “Venue announced with tickets”.", "Until the event has its own speakers or partners, the page shows another event's. Choose which event, pick the people or logos (or leave them unpicked for featured first) and change the wording under While speakers and partners are being confirmed.", "Sessions and speakers appear on the page when they're tied to this event in Agenda and Speakers. Ticket prices come from Tickets & prices.", "Deleting an event is for management only and takes it off the website."],
  },
  "content/agenda": {
    what: "Every session on the website's agenda and in the app: titles, times, formats, speakers and moderators.",
    steps: ["Pick the event at the top (for example Vancouver Briefing 2027).", "Choose Day 1 or Day 2, then click Add session and fill it in. New sessions are tied to the event you picked.", "Use Edit or Duplicate on a session to change or copy it.", "Save, then send it to staging and publish from Home › Website changes."],
    tips: [FLOW, "The clock button (Running late) moves times on the live agenda straight away: it's for event day.", "Delete takes a session off the live website at once.", "Import Toronto 2026 agenda only appears under All events and is only for the 2026 sessions."],
  },
  "past-participants": {
    what: "People and organisations who took part in an earlier event and aren't part of the event chosen at the top yet. Nothing here is a sale for this event: it's who to invite back.",
    steps: ["Choose the event at the top.", "Filter by what they were: sponsor, partner, exhibitor, speaker, media or delegate.", "Email them, then click “I've reached out”. Your name is recorded and a follow-up task is added to My work.", "Change where it stands: We reached out, Interested in this event, or Not this time."],
    tips: ["Once someone buys a ticket or becomes a partner of this event, they leave this list.", "Staff and volunteers are never listed."],
  },
  "hot-leads": {
    what: "People who replied with real interest to our outreach emails (sent by Explee). They arrive here by themselves.",
    steps: ["Read what they wrote.", "Choose who is handling it. The task “Reply to hot lead” in My work moves to that person.", "Reply to them by email or LinkedIn.", "Change where it stands as it moves: We replied, Meeting booked, Won or Not going ahead."],
    tips: ["New leads are checked for every 10 minutes; a manager can press Check now.", "The sales inbox gets an email when a new hot lead arrives.", "If someone replies again, their card updates and counts the extra reply.", "Managers can hide a lead from staff with Hide from staff, and show it again later."],
  },
  work: {
    what: "Your own list of what you've promised to do and when it's due. Only you and the managers can see it.",
    steps: ["When someone agrees to do something, type it under Add a task, pick who will do it and by when, and click Add task.", "Tick the circle when it's done.", "Given to others shows tasks you gave to someone, so you can see when they're done. Managers see Everyone's.", "If something is stuck or going wrong, click Raise a flag and say what's wrong. Your managers are emailed straight away."],
    tips: ["The person doing a task gets an email a week before it's due, the day before, on the day, and if it becomes overdue.", "Giving a task to someone else emails them.", "A flag stays under Flags until someone resolves it with a note.", "The bell at the top shows flags and your overdue tasks."],
  },
  "content/speakers": {
    what: "Everyone on the website's Speakers pages and in the app.",
    steps: ["Click Add speaker. Add a photo (required), name, job title and company.", "A new speaker is added to the event chosen at the top. Use “Also on another event?” if they speak at more than one.", "Click a speaker to edit them. To change the order, drag a speaker up or down in the list, or use the arrows beside them.", "Save, then send to staging and publish from Home › Website changes."],
    tips: [FLOW, "Every speaker photo comes out the same: choose a photo and the photo studio removes the background, puts the person on the TTFC light purple and suggests a head-and-shoulders crop. Drag or zoom to adjust it, or keep the photo's own background if the cut-out looks wrong.", "Adjust photo reopens the studio from the original upload.", "Delete takes a speaker off the live website at once."],
  },
  "content/partners": {
    what: "Partner logos on the Partners page and in the apps' Organisations, grouped by category.",
    steps: ["Click Add partner: name, logo, category and website link.", "Use the switches to choose whether it shows on the website, in the apps, or both. Active off hides it everywhere without deleting it.", "Use − and + under a logo to make it smaller or bigger.", "Save, then send to staging and publish from Home › Website changes."],
    tips: [FLOW, "Paid partners go in the Featured Partners row; they also show on Featured Partners.", "A partner can sit in a different row for each event: choose the event in the top bar, then set Row on the Partners page. Events without their own row use the usual row.", "Tick the events a partner shows on; none ticked = every event. Each event page shows its own partners.", "Dark preview shows how logos look on the dark parts of the site."],
  },
  "content/sponsors": {
    what: "The paid partners: the Featured Partners row on the Partners page and the first section of the apps' Organisations.",
    steps: ["Add or open a partner and give it a short description (it shows as the logo's tooltip and on the apps' Sponsors cards).", "Choose where it shows with the website and app switches.", "Save, then send to staging and publish from Home › Website changes."],
    tips: ["These are the same records as on Partners: editing one here edits it there too.", FLOW],
  },
  "content/tickets": {
    what: "The tickets the chosen event sells on the website: name, price, how many have sold and when they're on sale, plus the multi-event passes that cover it.",
    steps: ["Choose the event in the top bar.", "Click a ticket to change its price for this event only, or Add ticket. Management only.", "Add pass: one price for this city and the Toronto Main Event; tick more cities for a multi-city pass.", "When it's time to sell, turn on Pricing announced in Operations › Event settings."],
    tips: [NOW("Ticket changes"), "Every event has its own tickets and prices. A new Briefing starts with a copy of Defaults for new Briefings.", "Sold counts paid orders only, so it stays 0 until the first sale.", "A pass shows on every event it covers and buyers get a pass for each; it counts towards each event's delegates.", "A ticket or pass someone has bought can't be deleted: switch it off instead."],
  },
  inventory: {
    what: "TTFC 2026's passes and booths: prices and how many are left.",
    steps: ["Find the ticket type.", "Change its price or stock and save."],
    tips: [NOW("Prices and stock"), "Check the numbers twice before saving while tickets are on sale."],
  },
  "content/settings": {
    what: "Switch parts of the website on or off and edit site-wide text.",
    steps: ["Find the section or setting.", "Flip the switch or change the text; each one saves on its own."],
    tips: ["Homepage section switches, the Partners page year and the About page numbers go through staging: send them from Home › Website changes.", "The Partners page opens on the most recently completed year (2026) unless Open on this year's partners is on.", NOW("The other switches and texts on this page"), "Selling switches are for management only."],
  },
  "content/alumni-logos": {
    what: "The “Our team includes alumni from” logo strip on the Home and Sponsors pages. Not the paid partners.",
    steps: ["Click Add logo, upload it and give it a name.", "Change the number to set the order; use − and + for size.", "Save, then send to staging and publish from Home › Website changes."],
    tips: [FLOW],
  },
  "content/sponsor-marquee": {
    what: "The scrolling logo strips: “Our Community” on the Home page and “Where our speakers work” on the Speakers page. Not sponsors.",
    steps: ["Click Add logo, upload it and give it a name.", "Set the order and size.", "Save, then send to staging and publish from Home › Website changes."],
    tips: [FLOW],
  },
  "content/home-sponsors": {
    what: "Logos for the home page's sponsor strip.",
    steps: ["Add or edit a logo, set its order and size.", "Save, then send to staging and publish from Home › Website changes."],
    tips: [FLOW],
  },
  "content/organisations": {
    what: "The organisations the apps list: partners, speakers' companies and the company of everyone with a pass, one entry each.",
    steps: ["Search for an organisation.", "Hide one that shouldn't be listed, or merge two spellings of the same company into one.", "Add or change a logo where one is missing."],
    tips: ["New organisations appear on their own as people join.", NOW("Hiding, merging and logos")],
  },
  "app/text": {
    what: "The words people see in the TTFC app, and the app's on/off switches.",
    steps: ["Find the text or switch (use the search box).", "Change it and save."],
    tips: [NOW("These"), "The app picks changes up within about a minute.", "Selling switches are for management only."],
  },
  "app/survey": {
    what: "The post-event survey: its questions, when it opens, the answers, and how attendees are invited.",
    steps: ["Write or change the questions and set the opening and closing dates.", "Preview it.", "Invite people: the app notification, the email, or a personal link you copy for one person.", "Read the answers and download them as CSV."],
    tips: ["Only people who checked in can answer: each gets their own link.", "Editing and sending are for management."],
  },
  "app/swag": {
    what: "The app leaderboard's top networkers: an appreciation, not a prize.",
    steps: ["Check the list of top networkers.", "At the announce time they're celebrated in the app automatically, or click Announce."],
    tips: ["Staff, volunteers and moderators are never on the list."],
  },
  app: {
    what: "Everything happening in the TTFC apps (iPhone, Android and the web app) at a glance.",
    steps: ["Read the numbers and charts.", "Open App accounts or Live activity for details."],
    tips: ["Read only."],
  },
  "app/activity": {
    what: "Every screen and button press in the apps, newest first. Refreshes every 10 seconds.",
    steps: ["Watch it live, or filter to find what someone did."],
    tips: ["Read only. Useful when someone says “the app didn't work”."],
  },
  "app/pwa": {
    what: "The web app at thetechfestival.com/app: who saw the install prompt, installed it and opens it.",
    steps: ["Pick a period and read the numbers."],
    tips: ["Read only."],
  },

  /* ---------- Marketing ---------- */
  "form-submissions": {
    what: "Everything sent through the website's forms: volunteer, speaker, booth, sponsor, partnership and general enquiries.",
    steps: ["Click a row to read everything the person sent.", "Reply from your email: each enquiry is also emailed to the team with reply-to set to the person."],
    tips: ["Downloading as CSV is for management.", "Where website forms go (Settings) shows who receives each form."],
  },
  "brochure-downloads": {
    what: "Everyone who asked for a brochure or report on the website.",
    steps: ["Click a row to see who they are and what they downloaded.", "Follow up from your email."],
    tips: ["Each person is emailed the file automatically; sales@ gets a copy."],
  },
  "purchase-email": {
    what: "The email every buyer gets after paying, with their ticket PDF, QR code and Apple Wallet button.",
    steps: ["Pick a pass type to see its version.", "Change any wording and preview it.", "Save."],
    tips: ["Saving is for management. New purchases get the saved version at once."],
  },
  "app/invite": {
    what: "The “Get the TTFC app” email, with the App Store and Google Play buttons.",
    steps: ["Edit the wording and preview it.", "Send a test to yourself.", "Send to one person, a small group, or everyone who isn't on the app yet."],
    tips: ["People already using the app are skipped.", "Sending to many is for management. Unsubscribed people never get it."],
  },
  "app/digest": {
    what: "Short “What you missed” emails to people who missed messages, replies or mentions in the app.",
    steps: ["Preview what an email looks like.", "Send yourself a test.", "Turn the emails on or off (management)."],
    tips: ["Sent at most a few times a day, never at night."],
  },
  "marketing/attending": {
    what: "The “Show the world you're attending” email: each ticket holder makes an “I'm attending” image for LinkedIn.",
    steps: ["Preview the email and send yourself a test.", "Send it to everyone (management), or nudge one person from their People profile."],
    tips: ["People who already posted, or got it in the last 3 days, are skipped."],
  },
  "app/unsubscribes": {
    what: "People who don't want bulk emails from TTFC.",
    steps: ["Search for an address.", "Paste addresses from people who replied “unsubscribe” and add them."],
    tips: ["They still get passes, tickets, sign-in codes and receipts.", "Resubscribing someone is for management."],
  },

  social: {
    what: "Social posts for LinkedIn, Instagram and X: write once, let Claude write each channel's version, preview, schedule, approve, post.",
    steps: ["Fastest: press Create from a template, pick a template (speaker, panel, partner, call for speakers, call for sponsors, tickets), pick the speaker, session, partner or event, pick a design, change anyone's photo if the website's isn't right, click an image to see it large and drag or resize the photos and logos, then press Create post. The copy for each channel and the images in each size are made for you.", "Or press New post. Write the main (LinkedIn) post, or use ✦ Write about… to draft it from a speaker, session, partner or event page.", "Press ✦ Write X and Instagram versions. Edit them, or Suggest another; the arrows flip between versions.", "Add a photo: it's cropped for each channel. Pick a date and time.", "Submit for approval. A manager approves it.", "When it's time, copy each channel's text, download its photo, post it, then Mark posted with the link."],
    tips: ["Drafts save automatically 30 seconds after a change.", "A post for a contract's promised post ticks that task when it's marked posted.", "Settings: hashtags, voice, words to avoid and the monthly writing limit (management)."],
  },
  "linkedin-posts": {
    what: "Posts for your own LinkedIn profile: Claude finds current news on Canadian tech, policy and world events, writes in your voice with sources, and fact-checks every post.",
    steps: ["Press My voice and topics. Add a few lines about yourself, pick a voice and what to write about, then Save.", "Press Write new drafts. In 2 to 4 minutes your drafts appear here.", "Read each draft and its sources. Change anything you like: your edits save when you click away.", "Press Post to my LinkedIn (you sign in to LinkedIn and it's posted as you), or Copy and paste it into LinkedIn yourself."],
    tips: ["Only you see your drafts. Your colleagues get different posts.", "Drafts that can't be backed by a real source are left out.", "Each post invites sponsors, speakers or exhibitors in one light line, never a sales pitch.", "Used Copy? Press I posted it myself so it moves to Posted."],
  },
  "post-templates": {
    what: "Your own blank designs for Social posts › Create from a template, and the rules for where everything goes on them.",
    steps: ["Press New template, name it and pick what it's for: one speaker, a panel, a partner or an event.", "Upload the blank LinkedIn design (no words or photos on it; export it from Canva or Figma). Do the same for X and Instagram, or leave them on the built-in design.", "Drag each box (title, photos, logo, date, venue…) where it belongs; drag the pink corner to resize it. Set its rules on the right: alignment, colours, sizes, lines and character limits; for photos the gap, card and how many in a row.", "Save, then Mark ready. It now appears as a design in Create from a template."],
    tips: ["The rules box under the preview lists the guidelines the template enforces, in plain words.", "Use LinkedIn's box positions copies them to X or Instagram as a start.", "Posts that break a rule (a title too long, a blurry logo, a missing photo) show a warning before they're created."],
  },
  calendar: {
    what: "Everything planned for the month and whether it went out: TTFC's posts, emails, partners' posts about us and contract promises.",
    steps: ["Click Add to calendar (or a day's +) and say what it is, the day, where it goes and who posts it.", "To add many at once, click Upload a spreadsheet and choose your Excel or CSV file. It shows what it will add before adding anything.", "When something has gone out (also a partner's post or email), click it, set the day it went out, paste its link and click Mark as done.", "Planned vs done at the bottom lists the month: planned day beside the day it went out."],
    tips: ["A spreadsheet needs a Date column and a Title column; Download an example in the upload window shows the layout.", "Write a post opens the composer where Claude writes the X and Instagram versions.", "Click a dashed ◇ item to plan a post a partner bought.", "Not done = its day has passed and nobody marked it done."],
  },
  "promo-codes": {
    what: "Discount codes buyers enter at checkout.",
    steps: ["Type a code or press Generate, pick the discount, the passes it's for, a usage limit and an end date.", "Press Create promo code.", "Switch a code off to pause it."],
    tips: ["Staff: a code over 50% off, free, or without a usage limit is saved switched off until a manager approves it.", "Used = paid orders with the code. Revenue and discount given are for management."],
  },
  "content/site-copy": {
    what: "Every piece of text, picture and video on the public website, with the real page beside it. Change the site's built-in wording and pictures here; things that come from records (event details, speakers, partners, prices) show where to change them.",
    steps: ["Choose the page at the top of the preview.", "Click the piece you want to change, on the page or in the list. It is outlined in pink on the page.", "Type the new wording, or upload a new picture: the page changes as you type.", "Press Save, then Send to staging, check it on the staging site, and Publish to live."],
    tips: ["Something inside a menu, a pop-up or the ticket panel? Switch to Browse, open it, then switch back to Click to edit.", "Phone and Computer show the two layouts; some wording is only on one of them.", "“Everywhere it appears” changes the same wording on every page; “Only on this page” leaves the other pages alone.", "Back to built-in undoes a change. All changes lists everything that has been changed, on any page."],
  },
  "content/home": {
    what: "The one home page of the website: its headline, picture and video, the speakers to highlight, and its sections.",
    steps: ["Fill in the top of the page. Any box left empty is filled from the event chosen at the bottom of that card (the next event unless you pin one).", "Pick up to 6 speakers to highlight, and switch sections on or off or reorder them.", "Press Save, then Send to staging, check the home page on the staging site, and Publish to live."],
    tips: ["A pinned event stays until you change it back, even after it's over.", "Other wording on the page is in Website text & media."],
  },
  "content/videos": {
    what: "TTFC's YouTube and Vimeo videos on the website. Only the link is saved, so they cost nothing to host.",
    steps: ["Upload the video to TTFC's YouTube channel or Vimeo.", "Press Add a video and paste its link: the title and picture fill in.", "Pick where it shows: home page, Media page, event pages, speakers.", "Save, then send it to staging and publish from Website changes."],
    tips: ["On the website the player loads only when someone presses play, so pages stay fast.", "Switch “Shown on the website” off to hide a video without deleting it."],
  },

  /* ---------- Sales ---------- */
  contracts: {
    what: "Sponsor and exhibitor contracts for the chosen event, built from the offerings catalogue.",
    steps: ["Press New contract, enter the partner and add offerings or packages.", "Change a price only when a discount was agreed; a big discount waits for a manager's Approve prices.", "Download the PDF, send it, then Mark as sent.", "When it comes back signed, Mark signed and upload the signed copy.", "Tick off each task (LinkedIn post 1 of 2…) with its link once it's done."],
    tips: ["Drafts save automatically 30 seconds after a change.", "Items with a limit (booths) show how many are left to sell.", "Cancelling a contract is for management."],
  },
  offerings: {
    what: "The catalogue contracts are built from: offerings, packages and the contract settings (TTFC's details, signatories, numbering, terms and conditions).",
    steps: ["Add an offering: its category, price, unit and what a signed contract tracks.", "Bundle offerings into a package at one price.", "Set TTFC's details, who signs, numbering and the clauses in Contract settings."],
    tips: ["Only the super admin changes the catalogue and settings; everyone can use them on contracts.", "Retire an offering instead of deleting it once it's on a contract."],
  },
  mous: {
    what: "Memoranda of understanding with community, media and ecosystem partners for the chosen event: what TTFC offers, what the partner delivers, and the terms.",
    steps: ["Press New MOU and enter the partner and their contact.", "Under What TTFC offers, tick each item and set how many, when and any code. Tick Only once ticket sales reach to make it a reward for a sales milestone.", "Under What the partner delivers, tick what you want from them and set the details. Tick Write this MOU's own wording to change a sentence just for this partner.", "Set the terms: binding or not, money or not, dates and the standard clauses. Tick who signs on both sides.", "Open the Review tab, fix anything in red, then press Send to review.", "Read it through, then Export PDF or Export Word. Back to draft lets you change it and export again."],
    tips: ["Drafts save by themselves 30 seconds after a change.", "Draft PDF gives a copy marked DRAFT at any time; signatures print only on an exported PDF.", "Who signs for TTFC comes from Offerings › Contract settings.", "MOUs stay private: they are never on the website."],
  },
  "mou-items": {
    what: "The general items MOUs are built from: what TTFC offers partners and what partners deliver, with their usual wording.",
    steps: ["Start with Add the usual items, or press New item.", "Pick its side, name and category, and tick what an MOU asks for: how many, when, a code or a detail.", "Write its wording with the placeholders, like {partner} and {qty}. The example shows how it reads.", "Switch off Available for new MOUs to retire it."],
    tips: ["Only the super admin changes the catalogue; everyone can use it on MOUs.", "An item on an MOU can't be deleted: retire it instead. MOUs that have it keep their own copy."],
  },
  "waitlist-2027": {
    what: "People who joined the 2027 waitlist, what they're interested in, and the wording and 2027 journey on that page.",
    steps: ["Filter by interest (delegate, exhibitor, sponsorship, delegation) to find the right people.", "Open someone to see their details and follow up.", "Use the Wording and 2027 journey tabs to change the page."],
    tips: ["The team gets an email for each sign-up.", "Downloading as CSV is for management."],
  },
  "india-pavilion": {
    what: "Applications for the India Startup Pavilion, with their $500 deposits.",
    steps: ["Click a row to read the application.", "Change its status as you process it."],
    tips: ["Each application is emailed to sales@; the applicant gets a confirmation."],
  },
  "exhibitor-passes": {
    what: "Passes for exhibitors' staff, with their booth.",
    steps: ["Add the exhibitor's people and their booth.", "Preview the pass email, then send it."],
    tips: ["Creating and sending exhibitor passes is for management."],
  },
  analytics: {
    what: "Ticket revenue and sales, from Stripe (what buyers actually paid).",
    steps: ["Pick a period and read the totals.", "Click into a pass type or a day for detail."],
    tips: ["Management only."],
  },

  /* ---------- Operations ---------- */
  events: {
    what: "Each event's settings: who can see its attendees, how long it stays “just ended”, whether its pricing is announced, and its targets.",
    steps: ["Pick the event.", "Change the setting and save."],
    tips: [NOW("These settings"), "Changing events is for management.", "Targets (delegates and exhibitors) are private: Home shows tickets sold and exhibiting companies against them for the event chosen in the top bar. The website never shows them."],
  },

  /* ---------- People ---------- */
  people: {
    what: "Everyone in one list: delegates, speakers, exhibitors, volunteers, staff, vendors and media.",
    steps: ["Search by name or company; an exact email or ticket ID works too.", "Use the filters to narrow the list (pass, RSVP, VIP, exhibitor…).", "Open someone to see and change their details, pass, meals, RSVP and company logo."],
    tips: ["Volunteers see this page only, read only, without contact details.", "Changes to a person's record apply at once."],
  },
  "issued-passes": {
    what: "Give someone a pass (guest, speaker, media, VIP) and email it to them.",
    steps: ["Click Give a pass and choose the pass type.", "Fill in their name and email.", "Preview the email, then send it."],
    tips: ["Staff can give up to 30 passes an hour; editing and deleting passes is for management."],
  },
  "speaker-passes": {
    what: "Every speaker on the website gets a Speaker Pass: an internal pass, never sold.",
    steps: ["Click Sync to make passes for new speakers.", "Add each speaker's email.", "Preview, then send."],
    tips: ["Sending is for management."],
  },
  attendees: {
    what: "Every ticket record: app accounts and guest checkouts, in one list.",
    steps: ["Search for a ticket or buyer.", "Tidy up what staff see (for example hide a duplicate) without touching anyone's ticket."],
    tips: ["To change someone's pass, meals or RSVP, use People."],
  },
  "app/people": {
    what: "Every account on the TTFC app.",
    steps: ["Search for someone and open their account.", "Change what you need: their type, whether they can message, hide them from the attendee list."],
    tips: ["For passes, meals and RSVP, open their full profile in People."],
  },

  /* ---------- Awards ---------- */
  awards: {
    what: "Every Catalyst Awards nomination.",
    steps: ["Open a nomination to read it in full.", "Shortlist it, mark winners and keep jury notes."],
    tips: ["Changing a nomination's category, exporting and deleting are for management."],
  },
  "awards/jury": {
    what: "The people judging the Catalyst Awards.",
    steps: ["Add a juror with their name and email.", "Send them the invite; they sign in at thetechfestival.com/awards/jury-admin with a code.", "Send reminders to anyone who hasn't finished."],
    tips: ["Jurors only see what you allocate to them, never contact details or each other's scores.", "Sending emails is for management."],
  },
  "awards/allocation": {
    what: "Which jurors score which nominations.",
    steps: ["Tick nominations.", "Assign them to jurors, or click Share out evenly."],
    tips: ["A juror who declares a conflict is skipped automatically."],
  },
  "awards/rubric": {
    what: "What jurors score each nomination on: up to six criteria, each from 1 to 5.",
    steps: ["Edit the criteria and what 1, 3 and 5 mean.", "Save: scores already given are kept."],
    tips: ["Keep it quick: about 5 minutes a nominee."],
  },
  "awards/results": {
    what: "The jury's scores per nomination, the weighted total out of 100, and the rank in each category.",
    steps: ["Pick a category and read the ranking.", "Open a nomination for each juror's scores and comments.", "Download as CSV."],
    tips: ["Management only. Drafts and declared conflicts don't count."],
  },
  "awards/winners": {
    what: "What the website, certificates and apps show for the winners.",
    steps: ["Mark winners in Nominations.", "Check here how the results, each winner's page and certificate will look."],
    tips: [],
  },

  /* ---------- Event day ---------- */
  "event-summary": {
    what: "The event at a glance: passes, RSVPs, meals and check-in for each day. Read only.",
    steps: ["Read the totals for each day and each pass type.", "Use the meals table for catering numbers and dietary needs."],
    tips: ["Counted live from People: each person once."],
  },
  rsvps: {
    what: "Who's coming to each day and each meal, from the RSVP form.",
    steps: ["Click a tile to see who's coming.", "Open someone to see or add to their RSVP.", "Review possible duplicates and merge or keep them apart."],
    tips: ["Staff can add special events to an attendee's RSVP but never remove what the attendee chose."],
  },
  "marketing/rsvp-reminders": {
    what: "Ticket holders who haven't RSVP'd yet, and the reminder email.",
    steps: ["Check who hasn't RSVP'd.", "Send the reminder to one person, or to everyone (management)."],
    tips: ["Each person gets at most one reminder in 20 hours. Unsubscribed people are skipped."],
  },
  "check-in": {
    what: "Check attendees in at the door by scanning their pass.",
    steps: ["Allow camera access when the browser asks.", "Point the camera at the QR code on their pass or phone.", "Check the card: green means checked in; a warning means already checked in or not found."],
    tips: ["Before or after the event days, a scan is a practice scan: nothing is recorded.", "The check-in desk app (lobby, pass desk, meals) is further down the page."],
  },
  "app/sos": {
    what: "Help requests from the app's Help & SOS screen: emergencies only.",
    steps: ["Open a new request: it shows who, where and what.", "Reply: your message reaches the attendee in the app.", "Mark it Resolved when it's dealt with."],
    tips: ["New requests push to every staff phone and email the SOS address.", "For a real emergency, call 911 first."],
  },
  "app/moderation": {
    what: "Approve, hide, edit or delete anything people post in the app, and handle reports.",
    steps: ["Check held posts and reports.", "Approve, hide or delete each one.", "Use Hidden people to see anyone staff hid from the app."],
    tips: ["Hiding can be undone; deleting can't."],
  },
  "app/broadcast": {
    what: "Send a notification to people's phones: one person, or everyone.",
    steps: ["Write a short title and message.", "Choose who gets it.", "Preview, then send (or schedule it)."],
    tips: ["Sending to everyone is for management. It can't be taken back once sent."],
  },

  /* ---------- Settings ---------- */
  staff: {
    what: "Who can sign in to this panel, and at what level.",
    steps: ["Add someone with their email and a starting password.", "Choose Management, Staff or Volunteer."],
    tips: ["Management sees everything; staff can't see sales, revenue, promo codes or staff settings; volunteers see People only.", "Management only."],
  },
  "app/rights": {
    what: "What each type of person can do in the app (message, post, connect…).",
    steps: ["Tick or untick a right for a type of person.", "Save."],
    tips: ["Set someone's type on their People profile. Saving is for management."],
  },
  "email-tracking": {
    what: "Who receives each website form, and what the person who sent it gets back.",
    steps: ["Find the form.", "Check the inbox it goes to."],
    tips: ["Use it to find a missing enquiry or to know who should answer."],
  },
  "app/audit": {
    what: "Every change made by staff, newest first.",
    steps: ["Search or filter by person or kind of change."],
    tips: ["Read only. Every save, send, publish and delete is recorded here."],
  },
  "app/staff-activity": {
    what: "When each staff member worked in the panel, for how long, and what they did. Only the super admin sees this page.",
    steps: ["Pick the dates and, if you like, one person.", "Open Details for their sessions, time per day and pages and edits by hour."],
    tips: ["Time counts only while someone is using the panel; 15 idle minutes end a session.", "Records changed = saves, deletes and other changes made in the panel. Kept for 180 days."],
  },
  account: {
    what: "Your own staff sign-in.",
    steps: ["Change your password here."],
    tips: ["If you forget it, ask someone in management to reset it."],
  },
};

/** The guide for a page under /admin, or null. Sub-pages (a person's profile) use their list's guide. */
export function helpFor(to) {
  if (to == null) return null;
  return HELP[to] || null;
}

/* Start here: the few things a new person needs before any page. */
export const START_HERE = [
  { h: "Finding your way", p: "The navy rail on the left has the areas of work: Home, Content, Marketing, Sales, Operations, People, Awards, Event day and Settings. Pick one and its pages appear beside it. On a phone, use the tabs at the bottom and More. Press ⌘K (Ctrl K on Windows) to search for anything: a person, a ticket ID or a page." },
  { h: "Changing the website", p: "Website content (event pages, agenda, speakers, partners, logos) never changes the live site when you save. Send it to staging from Home › Website changes, check it on the staging site, then publish it to the live website." },
  { h: "What changes at once", p: "Some things take effect as soon as you save: ticket prices and stock, event settings, app text and switches, people's records, passes you send, check-ins and app notifications. Deleting a speaker, session or partner also takes it off the website at once. Their guides say so." },
  { h: "Who can do what", p: "Management sees everything. Staff can't see sales, revenue, promo codes or staff settings, and pages marked with a lock are management only. Volunteers see People only, read only." },
  { h: "Getting help", p: "Every page has an ⓘ next to its title with how to use it. If something looks wrong, check Settings › Audit log for who changed what, then ask management." },
];

/* ---------- Field help ----------
   The ⓘ after a field's label (HelpButton.jsx HelpLabel): what to put in it and what it changes.
   Keyed by page (nav.js `to`), then by the field's label exactly as shown. Only fields where a
   new person could go wrong; a label with no entry shows no ⓘ. */
const LOGO_FIELDS = {
  Name: "The organisation's name as people know it, e.g. “Deloitte”. Used for the logo's alt text and search.",
  Logo: "Upload the logo image. It is tidied automatically: a plain white background removed, empty margins trimmed and centred like every other logo. An SVG or large PNG looks sharpest; check it with Dark preview.",
  "Website link": "Where the logo goes when someone clicks it: the organisation's own website, starting with https://.",
  "Display order": "Lower numbers show first. Leave gaps (10, 20, 30) so you can slot logos in later without renumbering.",
  "Logo size": "Makes this logo bigger or smaller than the others (100% is normal). Use it to balance wide and square logos.",
  Active: "Off hides this logo everywhere (website and apps) without deleting it. Turn it back on any time.",
  "Show on the website": "Off hides it from the website only; the apps follow their own switch.",
  "Show in the app": "Off hides it from the apps' Organisations only; the website follows its own switch.",
};
const PARTNER_FIELDS = {
  ...LOGO_FIELDS,
  Category: "The group the logo sits in on the Partners page, e.g. Government Partners or Industry Associates.",
  "Partners page row": "Featured Partners is the row for paid partners: they also appear first in the apps. Pick a pillar or sector row for everyone else.",
  "Row on the Partners page": "This partner's row for the event chosen in the top bar. Same as the usual row unless you pick one, e.g. Featured in Vancouver and AI in Toronto.",
  "Usual row (events without their own)": "The row used for every event that has no row of its own, and in the apps.",
  Description: "One or two sentences about the partner. Shown when someone hovers the logo on the website and on the apps' Sponsors cards.",
};

export const FIELD_HELP = {
  "content/events": {
    "Event name": "The name on the page and everywhere the event is listed, e.g. “Vancouver Briefing 2027”.",
    City: "Changing the city changes the page's address (thetechfestival.com/<city>/<year>/<type>), so old links stop working. Only change it before the event is announced.",
    Type: "Briefing is a one-day event; Main Event is the Toronto flagship. Changes the page's address too.",
    Year: "The year of the event. Part of the page's address.",
    "First day": "Set this once the date is confirmed. The page then shows the full date instead of the date line below.",
    "Last day": "The same as the first day for a one-day event.",
    "Date line while the day isn't fixed": "Shown instead of a date until First day is set, e.g. “February 2027 · One day”. Also decides where the event sits in date order.",
    Venue: "The venue's name, e.g. “The Westin Harbour Castle”. Leave it empty until it's confirmed: the page then says the venue will be announced.",
    "Venue address": "The street address, shown with the venue. Leave it empty until it's confirmed.",
    "City photo": "The large photo at the top of the event page in the new website design. Landscape, at least 2000 pixels wide.",
    "Photo credit": "Required for photos you don't own (Creative Commons). Shown on the photo, e.g. “Photo: Kyle Pearce, CC BY-SA 2.0”.",
    Theme: "The event's focus in a few words, e.g. “Energy & Critical Infrastructure”. Shown on the event's card and page.",
    "One line under the name": "One sentence under the event name that says why someone should come.",
    Format: "The shape of the day, e.g. “One day · 8 sessions”.",
    "Who's in the room": "Who attends, e.g. “150 senior delegates”.",
    "About this event": "A longer description for the event page. A few short paragraphs.",
    "Page version": "Automatic shows the coming-soon page until the event has its own sessions in Agenda, then the full page. Choose one to override it.",
    "Coming-soon page: What we know so far": "Facts shown on the coming-soon page, as label and value pairs (e.g. Date / February 2027). Leave empty to use the date, venue, format and theme above.",
    "Coming-soon page: Coming next": "The steps ahead (e.g. Speakers announced, Tickets on sale). Tick Done as each one happens.",
    "Heading on the notify-me form": "The heading above the email sign-up on the coming-soon page.",
    "Show the Toronto 2026 post-show report card": "Shows a card linking to the 2026 report, so visitors can see what past events were like.",
  },
  "content/agenda": {
    Title: "The session's name as it appears on the agenda and in the app.",
    Day: "Day 1 or Day 2 of the event. One-day events use Day 1.",
    Starts: "Start time, local time at the venue.",
    Ends: "End time. The agenda shows the length from Starts and Ends.",
    "Session type": "The small label on the session's card, e.g. “Case Study” or “Roundtable”. Pick from the list; add or rename types with the Session types button at the top of the Agenda page.",
    Colour: "The colour and badge on the agenda. Picking a session type sets it; change it here for just this session.",
    "Stage / room": "Where it happens, e.g. “Harbour Ballroom”. Leave empty for the main stage.",
    "Tech pillar": "The theme it belongs to, for the agenda's filters.",
    Sector: "The industry it's about, for the agenda's filters.",
    Description: "A short paragraph shown when someone opens the session.",
    Featured: "Featured sessions get a star and stand out on the agenda.",
    "Break / meal": "Turn on for breaks, lunches and receptions: they're styled differently and have no polls or Q&A.",
    "Moderator name": "Who runs the session. Sessions with a moderator get live polls and Q&A in the app automatically (not keynotes or breaks).",
    "Moderator organisation": "The moderator's company, shown next to their name.",
  },
  "content/speakers": {
    "Profile photo": "Required. Any clear photo of the person: the studio cuts out the background, adds the light purple and suggests the crop (4:5, like the speaker cards). The original is kept.",
    "Full name": "As the speaker wants it shown, e.g. “Dr. Jane Smith”.",
    "Job title": "Their role, e.g. “Chief Technology Officer”.",
    Company: "Their organisation. It's also added to the apps' Organisations.",
    Bio: "Two or three sentences in the third person. Shown on their speaker page.",
    "Display order": "Lower numbers show first on the Speakers page. Leave gaps (10, 20, 30) so you can slot speakers in later.",
    "Speaker type": "Keynote, Panelist, Moderator or Speaker. Shown as a badge and used by the filters.",
    "Tech pillar": "The theme they speak on, for the Speakers page filters.",
    Sector: "Their industry, for the Speakers page filters.",
    "Featured speaker": "Featured speakers are marked with a star and highlighted on the website.",
    "LinkedIn URL": "Their LinkedIn profile, starting with https://www.linkedin.com/in/.",
    "X / Twitter URL": "Their X profile link, if they want it shown.",
    "GitHub URL": "Their GitHub profile link, if relevant.",
    "Personal website URL": "Their own website, if they want it shown.",
  },
  "content/partners": PARTNER_FIELDS,
  "content/sponsors": PARTNER_FIELDS,
  "content/alumni-logos": LOGO_FIELDS,
  "content/sponsor-marquee": LOGO_FIELDS,
  "content/home-sponsors": LOGO_FIELDS,
  "issued-passes": {
    Pass: "The pass type decides what they get: days, meals, lounge and CxO Breakfasts. The email lists what's included.",
    "Full name": "The person's name as it should appear on the pass and in the email.",
    "Title (optional)": "Their job title, shown on the pass.",
    "Name on the pass (optional)": "Changes the pass's printed name, e.g. “Media Pass”. Leave empty for the pass type's usual name.",
  },
  "exhibitor-passes": {
    "Booth no.": "The booth number from the floor plan, e.g. 07. Printed in the exhibitor manual and on the booth sign.",
    "Zone / location": "Where the booth is in the venue, so the exhibitor can find it on the day.",
    "Passes allotted": "How many staff passes this exhibitor gets with their booth.",
    "Full name": "The exhibitor contact's name, as it should appear on the pass.",
  },
};

/** The explanation of a field on a page, or "". */
export function fieldHelpFor(to, label) {
  if (to == null || !label) return "";
  return FIELD_HELP[to]?.[label] || "";
}
