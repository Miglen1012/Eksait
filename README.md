# EXCompany Frontend

React/Vite frontend for the Excite Company storefront.

## Overview

The application includes:

- home page with hero banners and category sections
- product catalog with filters, sorting, and pagination
- product details with variants and availability
- guest cart and checkout flow
- login, register, forgot password, and reset password pages
- contact and company information pages

## Suggested Screenshots

The README is prepared for product screenshots under `docs/screenshots/`.
The most useful views for this project are:

- `docs/screenshots/products-grid.png` - main catalog page with product cards
- `docs/screenshots/products-filters.png` - catalog with filters panel open
- `docs/screenshots/product-details.png` - product details page with variants table
- `docs/screenshots/checkout.png` - checkout form with cart summary
- `docs/screenshots/order-success.png` - centered success state after checkout
- `docs/screenshots/login.png` - login page
- `docs/screenshots/register.png` - register page

If you add these files to the repository, they can be embedded here directly.

## Requirements

- Node.js 20 or newer
- npm
- running backend API

## Installation

```bash
npm install
```

## Environment

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Set the backend base URL:

```env
VITE_API_URL=http://localhost:8000
```

## Development

Start the local dev server:

```bash
npm run dev
```

Vite usually serves the app at:

```text
http://localhost:5173
```

## Production Build

Create a production build:

```bash
npm run build
```

The generated files are written to `dist/`.

Preview the production build locally:

```bash
npm run preview
```

## Useful Commands

```bash
npm run lint
npm run build
```

## Cart Session

The frontend stores the guest cart session in `localStorage` under:

```text
cart_session_id
```

That value is sent automatically with API requests through:

```text
X-Cart-Session-Id
```

The same session id is also used during guest cart, checkout, login, and register flows.
