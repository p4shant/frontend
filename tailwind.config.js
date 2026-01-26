/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: 'rgb(232 244 252 / <alpha-value>)',
                'bg-alt': 'rgb(212 235 249 / <alpha-value>)',
                panel: 'rgb(255 255 255 / <alpha-value>)',
                'panel-strong': 'rgb(248 251 254 / <alpha-value>)',
                text: 'rgb(26 58 82 / <alpha-value>)',
                muted: 'rgb(90 122 146 / <alpha-value>)',
                brand: 'rgb(253 185 19 / <alpha-value>)',
                'brand-strong': 'rgb(243 156 18 / <alpha-value>)',
                success: 'rgb(39 174 96 / <alpha-value>)',
                blue: 'rgb(0 119 190 / <alpha-value>)',
                'blue-dark': 'rgb(0 90 148 / <alpha-value>)',
            },
            fontFamily: {
                body: ['Manrope', 'Segoe UI', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                sm: '0 2px 8px rgba(0, 119, 190, 0.06)',
                md: '0 4px 16px rgba(0, 119, 190, 0.12)',
                lg: '0 4px 20px rgba(0, 119, 190, 0.08)',
                xl: '0 6px 24px rgba(0, 119, 190, 0.12)',
            },
            borderRadius: {
                DEFAULT: '14px',
            },
        },
    },
    plugins: [],
}
