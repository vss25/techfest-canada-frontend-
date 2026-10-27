import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
 
var SECTIONS_PRIVACY = [
  {
    title: "1. What this policy covers",
    body: "This policy applies to personal information we handle when you use the website, register or attend the event in person or online, apply to speak, sponsor, exhibit, volunteer, subscribe to updates, or contact us.",
  },
  {
    title: "2. Personal information we collect",
    body: "We collect only what is reasonably necessary for the purposes described in this policy. Depending on your interaction with us, we may collect the following:",
    list: [
      "Contact and profile information such as your name, email address, phone number, organization, title, and location",
      "Registration and participation details such as attendee type, session selections, dietary or accessibility requests you choose to provide, and on-site check-in data",
      "Business information for sponsors, exhibitors, speakers, and partners such as company details, proposals, biographies, headshots, and program submissions",
      "Transaction information such as order details, invoice details, and payment status. Payment card data is typically handled by our payment processor, not stored by us",
      "Communications and feedback such as messages, support requests, survey responses, and preferences",
      "Technical information such as IP address, device and browser details, and website usage data collected through cookies or similar technologies",
    ],
  },
  {
    title: "3. How we use personal information",
    body: "We use personal information for the following purposes:",
    list: [
      "To provide and administer the Services including registrations, ticketing, check-in, credentials, and event communications",
      "To process payments, issue receipts and invoices, and prevent fraud or misuse",
      "To manage speakers, sponsors, exhibitors, partners, and volunteers and to deliver related program logistics",
      "To respond to inquiries and provide customer support",
      "To analyze and improve the website and event experience including performance, analytics, and troubleshooting",
      "To send updates and marketing communications where permitted by law and based on your preferences",
      "To meet legal, regulatory, tax, and security obligations including record-keeping and breach response",
    ],
  },
  {
    title: "4. Consent and your choices",
    body: "We obtain consent where required and provide choices consistent with applicable Canadian privacy laws. You can opt out of marketing emails using the unsubscribe link in our messages. Operational or transactional messages related to registrations and purchases may still be sent because they are necessary to deliver the Services.",
  },
  {
    title: "5. How we share personal information",
    body: "We do not sell your personal information. We may share personal information in limited situations, including:",
    list: [
      "With service providers who help us operate the Services such as website hosting, registration platforms, payment processing, email delivery, analytics, and customer support",
      "With event partners only where this is clearly described at the point of collection and where you have provided consent when required, for example for matchmaking or partner follow-up",
      "With other attendees, when you choose: the contact details you choose to share in the TTFC app go to the people you connect with and to anyone who scans the QR code on your pass",
      "With professional advisors such as lawyers and auditors when needed",
      "With authorities or other parties when required by law or to protect rights, safety, and security",
    ],
    after: "We require every service provider and partner that handles personal information for us to protect it to the same standard as this Privacy Policy and as the law requires, and to use it only to provide their services to us. Our main service providers include Render and Vercel (hosting), Sanity (event content), Stripe (payments), Resend (email delivery), Apple and Google push services (notifications), and Google Gemini (short summaries about organisations, written from public information only).",
  },
  {
    title: "6. Cross-border processing",
    body: "Your personal information may be stored or processed in Canada or in other countries where our service providers operate. When information is processed outside your province or country, it may be subject to the laws of that jurisdiction.",
  },
  {
    title: "7. Cookies and similar technologies",
    body: "We use cookies and similar technologies to operate the website, remember preferences, secure the Services, and understand website traffic and performance. Analytics and advertising cookies (Google Analytics, the Meta Pixel, and a visitor-identification service) are only used if you choose \"Accept All\" in our cookie banner. When you buy a pass or booth on our website, we record how you found us (the website, ad or campaign link that brought you and the page you landed on) with your order so our team can see which channels work; we never store ad click identifiers, and we keep your first visit in your browser only if you choose \"Accept All\". You can change your choice at any time using \"Cookie settings\" in the site footer, and you can also control cookies through your browser settings. Disabling certain cookies may affect site functionality.",
  },
  {
    title: "8. Retention",
    body: "We retain personal information only as long as needed for the purposes described in this policy, including legal and accounting requirements. When it is no longer required, we securely delete, destroy, or anonymize it where appropriate.",
  },
  {
    title: "9. Security",
    body: "We use reasonable administrative, technical, and physical safeguards designed to protect personal information against loss, theft, and unauthorized access, use, or disclosure. No method of transmission or storage is fully secure, but we work to maintain appropriate protections.",
  },
  {
    title: "10. Privacy incidents",
    body: "If a privacy incident occurs, we will assess it and take steps consistent with applicable law, which may include notifying affected individuals and regulators when required.",
  },
  {
    title: "11. Access and correction",
    body: "You may request access to your personal information and ask for corrections where appropriate. We may need to verify your identity before processing certain requests.",
  },
  {
    title: "12. Children",
    body: "The Services are intended for a professional adult audience. You must be 18 or older to attend or to use the TTFC app, and we do not knowingly collect personal information from anyone under 18.",
  },
  {
    title: "13. Third-party links",
    body: "The website may contain links to third-party sites. Their privacy practices are governed by their own policies, not this one.",
  },
  {
    title: "14. Changes to this policy",
    body: "We may update this Privacy Policy from time to time. The updated version will be posted on the website with a revised effective date.",
  },
  {
    title: "15. Contact",
    body: "If you have questions or concerns, contact legal@thetechfestival.com.",
    email: "legal@thetechfestival.com",
  },
];
 
var SECTIONS_TERMS = [
  {
    title: "1. Who we are and how to contact us",
    body: "AtlasLink Markets Inc operates the website and related event services for The Tech Festival Canada. For legal or policy questions, contact legal@thetechfestival.com.",
  },
  {
    title: "2. Eligibility and acceptable use",
    body: "You must be 18 or older to attend the event or use the TTFC app, and you must use the Services lawfully and responsibly. You agree not to:",
    list: [
      "Use the Services in a way that violates any applicable law or regulation",
      "Interfere with the security, integrity, or performance of the Services",
      "Attempt to access accounts, data, or systems you are not authorized to access",
      "Upload or transmit malicious code or harmful content",
      "Misrepresent your identity or affiliation",
    ],
  },
  {
    title: "3. Accounts, registrations, and event participation",
    body: "If you register for the event or create an account through a registration platform, you are responsible for providing accurate information and keeping your login details confidential. We may refuse, revoke, or cancel registrations where we reasonably believe there is fraud, misuse, or a breach of these Terms or event policies.",
  },
  {
    title: "4. Ticketing, payments, and refunds",
    body: "Ticket purchases, invoicing, and refunds are subject to the specific terms presented at checkout or in the applicable order form. If there is a conflict between those terms and these Terms, the checkout or order form terms will govern for that transaction.",
  },
  {
    title: "5. Content on the website",
    body: "The Services may include text, graphics, videos, programs, speaker information, and other materials. We may update, change, or remove content at any time.",
  },
  {
    title: "6. Intellectual property",
    body: "Unless otherwise stated, AtlasLink Markets Inc and its licensors own the intellectual property rights in the Services and related content, including trademarks, logos, and event materials. You may view and use the website for personal or internal business purposes. You must not copy, reproduce, distribute, or create derivative works from the content without our prior written permission, except where permitted by law.",
  },
  {
    title: "7. User submissions",
    body: "If you submit content to us, such as speaker proposals, exhibitor materials, testimonials, images, or feedback, you represent that you have the rights to provide it. You grant us a nonexclusive, worldwide, royalty-free license to use, reproduce, display, and distribute the submission for event operations, promotion, and archival purposes, consistent with our Privacy Policy and your preferences where applicable.",
  },
  {
    title: "8. Third-party services",
    body: "The Services may rely on third-party platforms such as payment processors, ticketing providers, and analytics tools. Their terms and privacy practices apply to their services.",
  },
  {
    title: "9. Disclaimers",
    body: "The Services are provided on an \"as is\" and \"as available\" basis. To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the Services will be uninterrupted or error-free.",
  },
  {
    title: "10. Limitation of liability",
    body: "To the fullest extent permitted by law, AtlasLink Markets Inc will not be liable for indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenues, data, or goodwill arising from or related to your use of the Services.",
  },
  {
    title: "11. Indemnity",
    body: "You agree to indemnify and hold AtlasLink Markets Inc harmless from claims, losses, liabilities, and expenses arising from your misuse of the Services, your breach of these Terms, or your violation of any law or the rights of a third party.",
  },
  {
    title: "12. Suspension and termination",
    body: "We may suspend or terminate access to the Services if we reasonably believe you have breached these Terms, created security risk, or engaged in unlawful activity.",
  },
  {
    title: "13. Governing law",
    body: "These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable in Ontario, without regard to conflict of law principles. You agree to the exclusive jurisdiction of the courts located in Ontario for disputes arising from these Terms or the Services, unless applicable law requires otherwise.",
  },
  {
    title: "14. Changes to these Terms",
    body: "We may update these Terms from time to time. The updated version will be posted on the website with a revised effective date.",
  },
  {
    title: "15. Contact",
    body: "If you have questions or concerns, contact legal@thetechfestival.com.",
    email: "legal@thetechfestival.com",
  },
];
 
var SECTIONS_APP = [
  {
    title: "1. Who can use the app",
    body: "The TTFC app is for people aged 18 and over. We don't ask for your date of birth. Alcohol is served only in licensed areas of the event (such as the Apex lounge) to guests of legal drinking age in Ontario (19+) with valid photo ID.",
  },
  {
    title: "2. What the app collects",
    body: "In addition to the information described in the Privacy Policy above, the app handles:",
    list: [
      "Profile details you choose to add: title, organisation, country, LinkedIn URL, job level and function, topics, goals, tagline, profile photo, meeting availability and, if you choose, salutation and gender. If you answered these on the ticket checkout, the app pre-fills them so you are not asked twice",
      "Contact details you choose to add (for example a phone number, extra email or social handles) and which of them you share: with each person you connect with, and with anyone who scans the QR code on your pass (in your email, PDF ticket, Apple Wallet or the app). You choose what is shared in the app's sharing settings. Only the people you share them with can see them",
      "Connecting by scanning a pass: if you scan another attendee's pass QR code in the app, you are connected with them, they are notified that you connected, and each of you receives the contact details the other has chosen to share. At the event entrance, TTFC staff and volunteers scan passes to check people in",
      "Content you create: posts, comments, discussions, direct and group messages, session questions, poll votes, connection requests and the people you tag (@mention) in posts and comments, who are notified and whose name links to their profile",
      "Usage: screens you open, what you tap and search for, and the topics you look at, linked to your account (you can turn this off in Settings → Privacy & data)",
      "Device: app version, an anonymous device identifier and, if you allow notifications, a push token used to deliver notifications",
      "The camera is used only to scan ticket and connection QR codes; images are not stored or sent",
      "Help & SOS: if you send a request, your name, the contact details on your account, the category, where you are at the venue and your message go to TTFC staff only, so they can reach you. Help & SOS is not an emergency service: in an emergency, call 911",
      "Notifications: messages, replies, mentions, connection requests and announcements, and optional \"What you missed\" emails. Choose which you get in Settings → Notifications, or turn notifications off in your phone's settings",
      "Read receipts: in direct and group messages, the sender can see when you have read their message",
      "Points and the leaderboard: your points come from what you do in the app, including sessions or polls you choose to share on LinkedIn. If \"Show me on the leaderboard\" is on, other attendees see your name, photo and points there, and the swag kit winners' names, photos, organisations and points are shown in the app's feed and on the leaderboard",
      "People to meet: the app suggests attendees you may want to meet, worked out from your profile and theirs (topics, titles, organisations, shared availability) and what you look at in the app. Suggestions only help you network; you can ignore them, and booking time with someone just sends them your request",
      "Feedback survey: after the event the app and our website invite attendees to an optional feedback survey. Your answers and the name, email, title and organisation you give go to the TTFC team to improve future events. Every question except your name and email can be skipped or answered \"N/A\". Only if you tick the consent box may we quote your \"In your words\" answers, with your name, title and organisation, when promoting future TTFC events to delegates, exhibitors and sponsors. You can ask us to remove your answers at legal@thetechfestival.com",
      "Sharing: when you share to LinkedIn or another app, we only record that you shared (for points). What you post there is covered by that service's own privacy policy",
      "Your organisation: the organisation on your profile can appear in the app's list of attending organisations, with a logo we may find from its website or from your work email's domain (never the full address)",
    ],
  },
  {
    title: "3. What other attendees see",
    body: "Signed-in attendees can see your name, ticket type, profile photo and the profile details you add. They see your email address or other contact details only if you share them: when you connect with them, or when they scan the QR code on your pass, in which case they receive the details you have chosen to share and you are notified. Everyone with a pass is listed in the attendee directory. To be taken off it, contact the TTFC team at enquire@thetechfestival.com.",
  },
  {
    title: "4. Community rules (zero tolerance)",
    body: "There is no tolerance for objectionable content or abusive users. Harassment, hate, sexual or violent content, spam, scams, illegal content and impersonation are not allowed. Posts and messages may be checked automatically, and staff review reported or flagged content and messages. You can report any content or person and block anyone; we review reports within 24 hours during the event and remove content or accounts that break these rules.",
  },
  {
    title: "5. Deleting your account",
    body: "You can delete your app account in Settings → Privacy & data. This removes your profile, posts, messages, connections and activity. Tickets you paid for stay valid at the door. App data is otherwise deleted or anonymised within 12 months after the event, except records we must keep by law. You can also ask us to delete your data, or withdraw your consent, by emailing legal@thetechfestival.com. You can turn off usage sharing in Settings → Privacy & data, and notifications in Settings → Notifications, at any time.",
  },
  {
    title: "6. Contact",
    body: "Questions or requests about the app: legal@thetechfestival.com.",
    email: "legal@thetechfestival.com",
  },
];

var SECTIONS_COOKIES = [
  {
    title: "1. What cookies are",
    body: "Cookies are small files stored on your device when you visit a website. Similar technologies include pixels, local storage, and identifiers used for analytics and security.",
  },
  {
    title: "2. How we use cookies",
    body: "We use cookies and similar technologies for the following purposes:",
    list: [
      "Essential operations such as security, fraud prevention, load balancing, and basic site functionality",
      "Preferences such as remembering choices you make and improving your experience",
      "Analytics such as understanding traffic, page performance, and how visitors use the site",
      "Communications measurement such as understanding whether emails are opened or links are clicked where permitted by law and enabled by the provider",
      "Order source: when you buy a pass or booth, how you found us (the website, ad or campaign link that brought you and the page you landed on) is kept in your browser for that visit and saved with your order. We never store ad click identifiers, and your first visit is kept only if you choose \"Accept All\"",
    ],
  },
  {
    title: "3. Types of cookies",
    body: "Depending on the tools enabled on the site, we may use the following categories:",
    list: [
      "Strictly necessary cookies that help the site work and cannot be easily turned off without affecting functionality",
      "Preference cookies that remember settings and choices",
      "Analytics cookies (Google Analytics) that help us understand site usage in aggregate, used only if you choose \"Accept All\"",
      "Advertising and marketing technologies (the Meta Pixel and a visitor-identification service) that help us measure and promote the event, used only if you choose \"Accept All\"",
    ],
  },
  {
    title: "4. Your choices",
    body: "When you first visit, our cookie banner lets you choose \"Accept All\" or \"Essential Only\". Analytics and advertising cookies are only used if you choose \"Accept All\". If you choose \"Essential Only\" or close the banner, they are not loaded. You can change your choice at any time using \"Cookie settings\" in the site footer. You can also manage cookies through your browser settings. You can typically delete existing cookies, block cookies, or set your browser to alert you when cookies are being used. If you disable certain cookies, some parts of the site may not work properly.",
  },
  {
    title: "5. Third-party cookies",
    body: "Some cookies may be set by third-party service providers we use for hosting, analytics, advertising, payments, sign-in (such as Google Sign-In), or embedded content. Analytics and advertising providers (Google Analytics, Meta, and our visitor-identification provider) are only loaded if you choose \"Accept All\". Those providers may process information under their own policies.",
  },
  {
    title: "6. Updates to this policy",
    body: "We may update this Cookie Policy from time to time. The updated version will be posted on the website with a revised effective date.",
  },
  {
    title: "7. Contact",
    body: "If you have questions or concerns, contact legal@thetechfestival.com.",
    email: "legal@thetechfestival.com",
  },
];
 
function PolicySection(props) {
  var s = props.section;
  var dark = props.dark;
  var cardBg = dark ? "rgba(155,135,245,0.07)" : "rgba(122,63,209,0.025)";
  var cardBdr = dark ? "rgba(155,135,245,0.14)" : "rgba(122,63,209,0.08)";
 
  return (
    <div style={{
      marginBottom: "1.8rem",
      background: cardBg,
      border: "1px solid " + cardBdr,
      borderRadius: 18,
      padding: "28px 30px",
    }}>
      <h3 style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "0.88rem",
        fontWeight: 800,
        letterSpacing: "0.3px",
        color: "var(--brand-orange, #f5a623)",
        marginBottom: 14,
      }}>{s.title}</h3>
 
      <p style={{
        fontSize: "0.94rem",
        lineHeight: 1.8,
        color: dark ? "rgba(255,255,255,0.78)" : "rgba(13,5,32,0.72)",
        marginBottom: s.list ? 14 : 0,
      }}>{s.body}</p>
 
      {s.list && (
        <ol style={{
          paddingLeft: 22,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {s.list.map(function (item, i) {
            return (
              <li key={i} style={{
                fontSize: "0.9rem",
                lineHeight: 1.75,
                color: dark ? "rgba(255,255,255,0.72)" : "rgba(13,5,32,0.65)",
              }}>{item}</li>
            );
          })}
        </ol>
      )}
 
      {s.after && (
        <p style={{
          fontSize: "0.9rem",
          lineHeight: 1.75,
          color: dark ? "rgba(255,255,255,0.72)" : "rgba(13,5,32,0.65)",
          marginTop: 14,
        }}>{s.after}</p>
      )}
 
      {s.email && (
        <p style={{ marginTop: 10 }}>
          <a
            href={"mailto:" + s.email}
            style={{
              color: "var(--brand-orange, #f5a623)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >{s.email}</a>
        </p>
      )}
    </div>
  );
}
 
function PolicyBlock(props) {
  var title = props.title;
  var subtitle = props.subtitle;
  var effective = props.effective;
  var sections = props.sections;
  var dark = props.dark;
 
  return (
    <div style={{ marginBottom: "5rem" }}>
      {/* Title */}
      <h1 style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
        fontWeight: 900,
        letterSpacing: "-0.5px",
        color: dark ? "#ffffff" : "#0d0520",
        marginBottom: 6,
      }}>{title}</h1>
 
      {subtitle && (
        <p style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          color: dark ? "rgba(200,185,255,0.5)" : "rgba(90,40,180,0.5)",
          marginBottom: 4,
        }}>{subtitle}</p>
      )}
 
      <p style={{
        fontSize: "0.78rem",
        fontWeight: 600,
        color: dark ? "rgba(255,255,255,0.35)" : "rgba(13,5,32,0.40)",
        marginBottom: "2.5rem",
      }}>Effective date: {effective}</p>
 
      {/* Intro */}
      {props.intro && (
        <p style={{
          fontSize: "0.95rem",
          lineHeight: 1.85,
          color: dark ? "rgba(255,255,255,0.75)" : "rgba(13,5,32,0.68)",
          marginBottom: "2.5rem",
          textAlign: "justify",
        }}>{props.intro}</p>
      )}
 
      {/* Sections */}
      {sections.map(function (s, i) {
        return <PolicySection key={i} section={s} dark={dark} />;
      })}
    </div>
  );
}
 
export default function Privacy() {
  var s1 = useState(false); var dark = s1[0]; var setDark = s1[1];
 
  useEffect(function () {
    setDark(document.body.classList.contains("dark-mode"));
    var obs = new MutationObserver(function () {
      setDark(document.body.classList.contains("dark-mode"));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return function () { obs.disconnect(); };
  }, []);
 
  var bg = dark ? "#06020f" : "#ffffff";
 
  return (
    <>
      <Navbar />
 
      <div style={{ background: bg, minHeight: "100vh" }}>
        <div style={{
          padding: "4rem 6% 6rem",
          maxWidth: 860,
          margin: "0 auto",
        }}>
 
        {/* ═══ PRIVACY POLICY ═══ */}
        <PolicyBlock
          title="Privacy Policy"
          subtitle="The Tech Festival Canada"
          effective="October 27, 2026"
          intro="This website thetechfestival.com is organized by AtlasLink Markets Inc. We are responsible for the personal information handled through this site and related event services. This Privacy Policy explains how we collect, use, disclose, store, and protect personal information when you visit thetechfestival.com or interact with The Tech Festival Canada event services. We aim to comply with applicable Canadian privacy laws, including the Personal Information Protection and Electronic Documents Act and relevant provincial private sector privacy laws where they apply."
          sections={SECTIONS_PRIVACY}
          dark={dark}
        />
 
        {/* Divider */}
        <div style={{
          height: 2,
          background: dark
            ? "linear-gradient(90deg, transparent, rgba(122,63,209,0.25), rgba(245,166,35,0.15), transparent)"
            : "linear-gradient(90deg, transparent, rgba(122,63,209,0.15), rgba(245,166,35,0.10), transparent)",
          borderRadius: 2,
          marginBottom: "5rem",
        }} />
 
        {/* ═══ TERMS OF USE ═══ */}
        <PolicyBlock
          title="Terms of Use"
          subtitle="The Tech Festival Canada"
          effective="March 9, 2026"
          intro="These Terms of Use govern your access to and use of thetechfestival.com and related services provided by AtlasLink Markets Inc. By accessing or using the Services, you agree to these Terms."
          sections={SECTIONS_TERMS}
          dark={dark}
        />
 
        {/* Divider */}
        <div style={{
          height: 2,
          background: dark
            ? "linear-gradient(90deg, transparent, rgba(122,63,209,0.25), rgba(245,166,35,0.15), transparent)"
            : "linear-gradient(90deg, transparent, rgba(122,63,209,0.15), rgba(245,166,35,0.10), transparent)",
          borderRadius: 2,
          marginBottom: "5rem",
        }} />
 
        {/* ═══ TTFC APP (privacy + terms for the iOS/Android app) ═══ */}
        <div id="app">
          <PolicyBlock
            title="The TTFC App"
            subtitle="Privacy and Terms for the mobile app"
            effective="October 27, 2026"
            intro="These sections apply to the TTFC mobile app in addition to the Privacy Policy and Terms of Use above. The full app versions are also shown inside the app (Settings → Privacy & data)."
            sections={SECTIONS_APP}
            dark={dark}
          />
        </div>

        {/* Divider */}
        <div style={{
          height: 2,
          background: dark
            ? "linear-gradient(90deg, transparent, rgba(122,63,209,0.25), rgba(245,166,35,0.15), transparent)"
            : "linear-gradient(90deg, transparent, rgba(122,63,209,0.15), rgba(245,166,35,0.10), transparent)",
          borderRadius: 2,
          marginBottom: "5rem",
        }} />

        {/* ═══ COOKIE POLICY ═══ */}
        <PolicyBlock
          title="Cookie Policy"
          subtitle="The Tech Festival Canada"
          effective="October 19, 2026"
          intro="This Cookie Policy explains how AtlasLink Markets Inc uses cookies and similar technologies on thetechfestival.com."
          sections={SECTIONS_COOKIES}
          dark={dark}
        />
 
        </div>
      </div>
 
      <Footer />
    </>
  );
}
