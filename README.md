# Cozy Creations (Web)

Cozy Creations is a multi-page React + Vite web app for a handcrafted candle brand. It includes product browsing, filtering/sorting, cart, authentication, and an admin area, plus GSAP-powered hero navbar styling on the Home page.

## Tech stack

- **React 19** + **React Router**
- **Vite** (dev/build tooling)
- **Tailwind CSS**
- **Firebase** (Auth + Firestore products)
- **GSAP + ScrollTrigger** (Home hero navbar appearance changes)

## Pages / routes

- **`/`**: Home (hero + scroll interactions)
- **`/about`**: About Us
- **`/products`**: Products (collections, filters, sort, pagination)
- **`/custom`**: Custom candle configurator
- **`/contact`**: Contact Us (excluded from hero auto-scroll + pajama scroll indicator)
- **`/cart`**: Cart
- **`/admin`**: Admin dashboard (requires admin user)

## Features

- **Global navbar + footer** across pages
- **Home-only navbar behavior**:
  - On Home hero: navbar uses a “hero” style
  - After hero: navbar switches to solid style
- **Auto-scroll from hero after 5s** on Home/About/Products/Custom (cancels on user interaction)
- **“Pajama” scroll indicator** on hero for all pages except Contact Us
- **Products** loaded from **Firestore** (`products` collection, `isActive == true`)
- **Cart** + auth-powered navbar states

## Getting started

### 1) Install

```bash
npm install
```

### 2) Environment variables

Create a `.env` file in the project root with the following variables:

```bash
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Backend (used by some admin/enquiry flows)
VITE_BACKEND_URL=
```

> Note: In Vite, only variables prefixed with `VITE_` are exposed to the client.

### 3) Run the app

```bash
npm run dev
```

## Scripts

- **`npm run dev`**: start dev server
- **`npm run build`**: production build
- **`npm run preview`**: preview production build locally
- **`npm run lint`**: run ESLint

## Assets

- **Favicon**: `public/favicon.png` (lamp image used from the footer decor)

## Notes for deployment

- This is a single-page app served by Vite; make sure your host rewrites all routes to `index.html`.
