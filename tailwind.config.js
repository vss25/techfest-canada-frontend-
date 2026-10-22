const twColors = require("tailwindcss/colors");

/* TTFC admin panel colours are CSS variables holding RGB channels, so opacity
   modifiers (bg-ttfc-pink/10) keep working. The fallback is the dark panel;
   src/admin/admin.css sets the light values under html[data-admin-theme="light"]. */
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const adm = (name, hex) => `rgb(var(--ttfc-${name}, ${rgbOf(hex)}) / <alpha-value>)`;
/* The pale status shades (text-red-200, text-emerald-300 ...) the panel uses for
   text on its dark surfaces: in the admin's light mode, admin.css swaps them for
   deep shades of the same hue. Nothing else sets these variables, so everywhere
   else (the website, the jury portal) they're Tailwind's usual colours. */
const paleTones = (hue) => Object.fromEntries([100, 200, 300].map((s) => [s, adm(`${hue}-${s}`, twColors[hue][s])]));

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			/* TTFC admin panel palette (deep ink + logo accents); dark values here, light in admin.css */
  			ttfc: {
  				ink: adm('ink', '#0B0716'),
  				panel: adm('panel', '#130D22'),
  				panel2: adm('panel2', '#1B1430'),
  				panel3: adm('panel3', '#251C40'),
  				line: adm('line', '#2A2143'),
  				text: adm('text', '#F4F0FB'),
  				muted: adm('muted', '#A9A1C2'),
  				dim: adm('dim', '#7B7296'),
  				pink: adm('pink', '#E8458B'),
  				purple: adm('purple', '#8B5CF6'),
  				orange: adm('orange', '#F59E42'),
  				/* Solid status fills (danger / success buttons) */
  				good: adm('good', '#10B981'),
  				bad: adm('bad', '#EF4444'),
  				warn: adm('warn', '#FBBF24'),
  				/* White on the dark panel, ink on the light one: bg-ttfc-contrast/5 hovers and tints, text-ttfc-contrast for the brightest text */
  				contrast: adm('contrast', '#FFFFFF'),
  				/* Form field borders, the off track of a switch, and the toasts' tinted backgrounds */
  				field: adm('field', '#2A2143'),
  				track: adm('track', '#251C40'),
  				'good-surface': adm('good-surface', '#0F2A22'),
  				'bad-surface': adm('bad-surface', '#2D1018')
  			},
  			red: paleTones('red'),
  			emerald: paleTones('emerald'),
  			amber: paleTones('amber'),
  			violet: paleTones('violet'),
  			pink: paleTones('pink'),
  			orange: paleTones('orange'),
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}