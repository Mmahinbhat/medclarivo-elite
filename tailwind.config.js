// Tailwind config for the prebuilt www/tailwind.min.css
// Rebuild after adding new classes to any page:  ./scripts/build-tailwind.sh
//
// Theme colours (ink / mist / line …) point at CSS variables so that
// dark mode — which just swaps the variables under [data-theme="dark"] —
// recolours every Tailwind utility too. The second value in each var()
// is the light-mode fallback for pages that don't define the variable.
module.exports = {
  content: ['./www/**/*.html', './www/shared/**/*.js', './www/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy:        '#0A1424',
        'navy-2':    '#0F2038',
        'navy-3':    '#16304F',
        'navy-mid':  '#16283F',
        teal:        '#0FA89A',
        'teal-2':    '#33D9C8',
        'teal-deep': '#0A6E64',
        'teal-dark': '#0A7A70',
        'teal-light':'#14B8A8',
        'teal-pale': '#F0FDFA',
        'teal-dim':  '#E6F7F5',
        'teal-text': '#0B7A70',
        gold:        '#B9924F',
        'gold-soft': 'rgba(185,146,79,0.12)',

        mist:        'var(--mist, #F5F7FA)',
        'mist-2':    'var(--mist-2, #EEF2F6)',
        ink:         'var(--ink, #0B1220)',
        'ink-soft':  'var(--ink-soft, #56657B)',
        'ink-muted': 'var(--ink-muted, var(--ink-soft, #4A5568))',
        'ink-faint': 'var(--ink-faint, #8B97A8)',
        line:        'var(--line, rgba(11,18,32,0.08))',
        surface:     'var(--surface, #FFFFFF)',
        card:        'var(--card, #FFFFFF)',
        outline:     'var(--outline, #E2E8F0)',
        border:      '#E2E8F0',
        bg:          '#F7F9FC',
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')],
};
