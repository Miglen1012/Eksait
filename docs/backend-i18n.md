# Backend i18n Contract

Frontend language codes: `bg`, `en`, `de`.

## Request Language

Catalog requests send the selected language in two compatible ways:

- Query parameter: `lang=bg|en|de`
- Header: `X-Locale: bg|en|de`

The frontend also sends `Accept-Language` for compatibility. Backend priority should be:

1. `lang` query parameter
2. `X-Locale`
3. `Accept-Language`
4. fallback `bg`

Invalid or missing values should fall back to `bg`.

## Catalog Endpoints

The frontend uses these language-aware endpoints:

- `GET /api/products?lang=...`
- `GET /api/products/search?q=...&limit=...&lang=...`
- `GET /api/equipment?lang=...`
- `GET /api/equipment/search?q=...&limit=...&lang=...`
- `GET /api/home-banner?lang=...`

Do not use a separate translation endpoint. Product and equipment data should be translated directly by these catalog responses.

## Translated Data Fields

Catalog responses should return translated values directly in the existing fields:

- Product: `name`, `description`, `extra_information`, `material`
- Category objects: `name`, `label`, `title`, `category_name`
- Variant/type rows: `size`, `name`, `label`, `title`
- Related products: same product fields as above
- Home banner: `eyebrow`, `title`, `subtitle`, `button_text`

Keep stable identifiers and numeric fields language-independent:

- `id`
- `slug`
- `price`, `sale_price`
- stock and quantity fields
- image URLs
- category `slug`
- variant IDs

## UI Text

UI labels such as `View`, `Open the product for more details`, `Type/Size`, loading states, buttons, and validation copy are localized in the frontend.

## Search

`/api/products/search` and `/api/equipment/search` should search the selected language fields and return the same translated response shape as `/api/products` and `/api/equipment`.
