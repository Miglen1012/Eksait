# EXCompany Frontend

React/Vite frontend за сайта на Excite Company.

## Изисквания

- Node.js 20 или по-нова версия
- npm
- Работещ backend API

## Инсталация

```bash
npm install
```

## Environment настройки

Копирайте примерния env файл:

```bash
cp .env.example .env
```

На Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Настройте адреса на backend API в `.env`:

```env
VITE_API_URL=http://localhost:8000
```

Ако backend-ът е на друг адрес, сменете стойността на `VITE_API_URL`.

## Стартиране за разработка

```bash
npm run dev
```

Vite ще покаже локален адрес, обикновено:

```text
http://localhost:5173
```

## Production build

```bash
npm run build
```

Готовите файлове се генерират в `dist/`.

## Преглед на production build

```bash
npm run preview
```

## Полезни команди

```bash
npm run lint
npm run build
```

## Cart session

Frontend-ът пази guest cart session в `localStorage` под ключ:

```text
cart_session_id
```

Този session id се изпраща автоматично към API заявките като header:

```text
X-Cart-Session-Id
```

Същият session id се използва и при guest cart, checkout, login и register flow.
