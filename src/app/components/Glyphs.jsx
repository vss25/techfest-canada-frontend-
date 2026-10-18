/* A few filled glyphs drawn after the SF Symbols the iOS app uses where
   lucide only has outlines (trophy.fill, person.3.fill, gearshape.fill,
   bubble.left.fill, person.badge.plus). 24×24, currentColor. */

const base = { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", "aria-hidden": true, focusable: "false" };

export function TrophyFill(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h10v6.2a5 5 0 0 1-4 4.9V17h2.6c.6 0 1 .4 1 1V21H7.4v-3c0-.6.4-1 1-1H11v-2.9a5 5 0 0 1-4-4.9z" />
      <path d="M7 5H4.8a.8.8 0 0 0-.8.8v.9A3.8 3.8 0 0 0 7.4 10.5M17 5h2.2c.4 0 .8.4.8.8v.9a3.8 3.8 0 0 1-3.4 3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PeopleFill(props) {
  return (
    <svg {...base} width={22} height={18} viewBox="0 0 28 22" {...props}>
      <circle cx="5.6" cy="7.4" r="2.9" /><circle cx="22.4" cy="7.4" r="2.9" />
      <path d="M.6 17.6c0-3 2.2-5.2 5-5.2 1.3 0 2.4.4 3.3 1.2a7.4 7.4 0 0 0-2 4.9v.6H1.7c-.6 0-1.1-.5-1.1-1.1zM27.4 17.6c0-3-2.2-5.2-5-5.2-1.3 0-2.4.4-3.3 1.2a7.4 7.4 0 0 1 2 4.9v.6h5.2c.6 0 1.1-.5 1.1-1.1z" />
      <circle cx="14" cy="5.6" r="3.9" />
      <path d="M7.8 18.9c0-3.9 2.8-6.8 6.2-6.8s6.2 2.9 6.2 6.8c0 .9-.6 1.5-1.4 1.5H9.2c-.8 0-1.4-.6-1.4-1.5z" />
    </svg>
  );
}

export function GearFill(props) {
  return (
    <svg {...base} {...props}>
      <path fillRule="evenodd" d="M10.3 2.3c.2-.6.8-.9 1.4-.9h.6c.6 0 1.2.4 1.4.9l.4 1.5c.6.2 1.1.5 1.6.8l1.5-.5c.6-.2 1.2 0 1.6.4l.4.4c.4.4.6 1.1.4 1.6l-.5 1.5c.3.5.6 1 .8 1.6l1.5.4c.6.2.9.8.9 1.4v.6c0 .6-.4 1.2-.9 1.4l-1.5.4c-.2.6-.5 1.1-.8 1.6l.5 1.5c.2.6 0 1.2-.4 1.6l-.4.4c-.4.4-1.1.6-1.6.4l-1.5-.5c-.5.3-1 .6-1.6.8l-.4 1.5c-.2.6-.8.9-1.4.9h-.6c-.6 0-1.2-.4-1.4-.9l-.4-1.5c-.6-.2-1.1-.5-1.6-.8l-1.5.5c-.6.2-1.2 0-1.6-.4l-.4-.4c-.4-.4-.6-1.1-.4-1.6l.5-1.5c-.3-.5-.6-1-.8-1.6l-1.5-.4c-.6-.2-.9-.8-.9-1.4v-.6c0-.6.4-1.2.9-1.4l1.5-.4c.2-.6.5-1.1.8-1.6l-.5-1.5c-.2-.6 0-1.2.4-1.6l.4-.4c.4-.4 1.1-.6 1.6-.4l1.5.5c.5-.3 1-.6 1.6-.8zM12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z" />
    </svg>
  );
}

export function BubbleFill(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.2c5.1 0 9.2 3.5 9.2 7.9s-4.1 7.9-9.2 7.9c-.9 0-1.8-.1-2.6-.3L5 20.8c-.6.3-1.2-.2-1.1-.8l.7-3.1A7.6 7.6 0 0 1 2.8 11c0-4.3 4.1-7.8 9.2-7.8z" />
    </svg>
  );
}

export function PersonPlusFill(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.5" cy="7.5" r="4" />
      <path d="M2 19.2c0-3.7 3.4-6.4 7.5-6.4 1.4 0 2.7.3 3.8.9a6 6 0 0 0 .9 7H3.4c-.8 0-1.4-.6-1.4-1.5z" />
      <path fillRule="evenodd" d="M18.5 12.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm.8 1.9h-1.6v1.8h-1.8v1.6h1.8v1.8h1.6v-1.8h1.8v-1.6h-1.8z" />
    </svg>
  );
}
