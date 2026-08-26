module.exports = {
  content: [
    './*.html',
    './src/**/*.html',
    './content/**/*.html',
    './layouts/**/*.html',
    './partials/**/*.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'deep-forest': '#1B5E20',
        'amber-gold': '#FFBF00',
        'background': '#FAF9F7',
        'on-background': '#1A1C1B',
        'surface': '#FAF9F7',
        'surface-bright': '#FAF9F7',
        'surface-container-low': '#F4F3F1',
        'surface-container': '#EFEEEC',
        'surface-container-high': '#E9E8E6',
        'surface-container-highest': '#E3E2E0',
        'surface-container-lowest': '#FFFFFF',
        'on-surface-variant': '#41493E',
        'outline': '#717A6D',
        'outline-variant': '#C0C9BB',
        'primary': '#00450D',
        'primary-container': '#1B5E20',
        'on-primary': '#FFFFFF',
        'on-primary-container': '#90D689',
        'secondary': '#795900',
        'secondary-container': '#FFBF00',
        'on-secondary': '#FFFFFF',
        'charcoal-text': '#1A1A1A',
        'moss-muted': '#4E7051',
        'ivory-base': '#F9F8F6',
        plant: {
          dark: '#1b5e20',
          main: '#2e7d32',
          light: '#66bb6a',
          accent: '#ffbf00',
          amber: '#ffbf00',
          ivory: '#faf9f7',
          moss: '#4e7051',
        }
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        'full': '9999px'
      },
      spacing: {
        'margin-mobile': '20px',
        'margin-desktop': '80px',
        'section-gap': '120px',
        'gutter': '24px',
        'base': '8px'
      },
      fontFamily: {
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'headline-lg': ['"Playfair Display"', 'serif'],
        'headline-sm': ['"Playfair Display"', 'serif'],
        'display-lg': ['"Playfair Display"', 'serif'],
        'display-lg-mobile': ['"Playfair Display"', 'serif'],
        'label-md': ['Inter', 'sans-serif'],
        'label-sm': ['Inter', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'headline-lg': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-sm': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'display-lg': ['64px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['40px', { lineHeight: '1.2', fontWeight: '700' }],
        'label-md': ['14px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-sm': ['12px', { lineHeight: '1.2', fontWeight: '500' }]
      }
    }
  },
  plugins: []
};