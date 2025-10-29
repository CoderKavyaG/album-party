module.exports = {
  plugins: {
    // Tailwind v4 uses a separate PostCSS plugin package. We reference the
    // installed plugin name so PostCSS loads the correct integration.
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
