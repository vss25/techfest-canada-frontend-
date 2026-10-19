/* Contact detail kinds, drawn after the SF Symbols the iOS app uses (envelope.fill,
   phone.fill, message.fill, link, globe, at, camera.fill, bubble.left.and.bubble.right.fill,
   ellipsis.circle.fill). Plain glyphs, no brand logos. 24×24, currentColor. */

const base = { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", "aria-hidden": true, focusable: "false" };
const line = { fill: "none", stroke: "currentColor", strokeWidth: 2.1, strokeLinecap: "round", strokeLinejoin: "round" };

function EnvelopeFill(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.2 5h15.6c1.1 0 2 .8 2.1 1.9L12 12.9 2.1 6.9C2.2 5.8 3.1 5 4.2 5z" />
      <path d="M2 9.3l9.4 5.7c.4.2.8.2 1.2 0L22 9.3v7.6c0 1.2-.9 2.1-2.1 2.1H4.1C2.9 19 2 18.1 2 16.9z" />
    </svg>
  );
}

function PhoneFill(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7.2 2.6c.6-.4 1.4-.3 1.8.3l2.1 3c.4.6.3 1.3-.2 1.8L9.6 8.9c-.3.3-.3.7-.1 1 1.1 1.9 2.7 3.5 4.6 4.6.3.2.7.2 1-.1l1.2-1.3c.5-.5 1.2-.6 1.8-.2l3 2.1c.6.4.7 1.2.3 1.8l-1.3 1.8c-.8 1.1-2.1 1.6-3.4 1.3C10.4 18.6 5.4 13.6 4.1 7.3c-.3-1.3.2-2.6 1.3-3.4z" />
    </svg>
  );
}

function MessageFill(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3c5 0 9 3.6 9 8.1s-4 8.1-9 8.1c-1.1 0-2.2-.2-3.2-.5l-4.1 1.6c-.6.2-1.1-.3-.9-.9l1.2-3.2A7.7 7.7 0 0 1 3 11.1C3 6.6 7 3 12 3z" />
    </svg>
  );
}

function LinkGlyph(props) {
  return (
    <svg {...base} {...props}>
      <g {...line}>
        <path d="M10.2 13.8a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1.2 1.2" />
        <path d="M13.8 10.2a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1.2-1.2" />
      </g>
    </svg>
  );
}

function GlobeGlyph(props) {
  return (
    <svg {...base} {...props}>
      <g {...line} strokeWidth={1.9}>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="3.8" ry="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8" />
      </g>
    </svg>
  );
}

function AtGlyph(props) {
  return (
    <svg {...base} {...props}>
      <g {...line}>
        <circle cx="12" cy="12" r="3.7" />
        <path d="M15.7 8.4v4.8c0 1.5 1 2.5 2.3 2.5 1.7 0 2.9-1.6 2.9-3.9a8.9 8.9 0 1 0-3.5 7.1" />
      </g>
    </svg>
  );
}

function CameraFill(props) {
  return (
    <svg {...base} {...props}>
      <path fillRule="evenodd" d="M9.3 4h5.4c.6 0 1.1.3 1.4.8l1 1.7h2.4C20.9 6.5 22 7.6 22 9v8.5c0 1.4-1.1 2.5-2.5 2.5h-15C3.1 20 2 18.9 2 17.5V9c0-1.4 1.1-2.5 2.5-2.5h2.4l1-1.7c.3-.5.8-.8 1.4-.8zM12 9.1a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2z" />
      <circle cx="12" cy="13.2" r="2.5" />
    </svg>
  );
}

function BubblesFill(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9.2 3.4c4 0 7.2 2.7 7.2 6.1s-3.2 6.1-7.2 6.1c-.8 0-1.6-.1-2.3-.3l-3.2 1.4c-.5.2-.9-.2-.8-.7l.8-2.4A5.8 5.8 0 0 1 2 9.5c0-3.4 3.2-6.1 7.2-6.1z" />
      <path d="M17.9 8.7c2.4.7 4.1 2.6 4.1 4.9 0 1.3-.5 2.4-1.4 3.3l.6 1.9c.1.4-.3.8-.7.6l-2.5-1.1c-.6.2-1.3.3-2 .3-2 0-3.8-.8-4.9-2.1 3.8-.4 6.8-3.2 6.8-6.8z" />
    </svg>
  );
}

function EllipsisFill(props) {
  return (
    <svg {...base} {...props}>
      <path fillRule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zM7.4 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm4.6 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm4.6 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z" />
    </svg>
  );
}

const ICONS = {
  email: EnvelopeFill, phone: PhoneFill, whatsapp: MessageFill, linkedin: LinkGlyph, website: GlobeGlyph,
  x: AtGlyph, instagram: CameraFill, wechat: BubblesFill, other: EllipsisFill,
};

/** The glyph for a contact detail kind. */
export function KindIcon({ kind, ...props }) {
  const Icon = ICONS[kind] || EllipsisFill;
  return <Icon {...props} />;
}

/** The glyph in a tinted circle (rows, pickers, share sheets). */
export function KindBubble({ kind, size = 34 }) {
  return (
    <span className="kind-bubble" style={{ width: size, height: size }} aria-hidden="true">
      <KindIcon kind={kind} width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} />
    </span>
  );
}
