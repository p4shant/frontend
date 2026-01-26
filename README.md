# KAMN Solar CRM Frontend

React + TypeScript + Vite scaffold with a responsive sidebar layout for field teams on mobile and desktop.

## Run
```bash
cd frontend
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Structure
- /src/layouts/AppLayout.tsx — shell with sidebar + topbar, collapse and mobile drawer
- /src/components/Sidebar.tsx — nav with hover tooltips when collapsed
- /src/components/Topbar.tsx — page header, mobile menu button
- /src/pages/* — Dashboard, Register Customer, Mark Attendance, Profile placeholders
- /src/pages/PageStyles.css — shared page cards/grid styles

## Theme
Solar-inspired palette (amber + deep teal) with Manrope font. Responsive behavior: collapsible sidebar on desktop, drawer on mobile, hover labels when collapsed.
