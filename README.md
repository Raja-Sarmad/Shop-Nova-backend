# Velora Backend

Express + MongoDB + JWT + Cloudinary.

## Quick start

1. Copy env and fill MongoDB + Cloudinary values (see root `SETUP.md`):

```bash
cp .env.example .env
```

2. Install & seed:

```bash
npm install
npm run seed
npm run dev
```

API: [http://localhost:5000](http://localhost:5000)  
Health: [http://localhost:5000/api/health](http://localhost:5000/api/health)

## Default accounts (after seed)

| Role | Email | Password |
| ---- | ----- | -------- |
| Admin | `admin@shopnova.pk` | `Admin@12345` |
| Customer | `customer@shopnova.pk` | `Customer@123` |

Admin dashboard must use `POST /api/auth/admin/login`.  
Storefront uses `POST /api/auth/login` or `/register` (customers only get `role: customer`).

## Main routes

| Method | Path | Auth |
| ------ | ---- | ---- |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/admin/login` | public → admin only |
| GET | `/api/products` | public |
| POST | `/api/products` | admin + multipart images → Cloudinary |
| PUT | `/api/products/:id` | admin |
| DELETE | `/api/products/:id` | admin |
| POST | `/api/orders` | optional JWT |
| GET | `/api/orders/admin/all` | admin |
| GET | `/api/admin/stats` | admin |
| POST | `/api/upload` | admin → Cloudinary |
