# 🌿 Sango Fiora — Luxury Artificial Plants & Trees E-Commerce Platform

[![Eleventy](https://img.shields.io/badge/Static%20Generator-Eleventy%20v3-111111?style=for-the-badge&logo=eleventy)](https://www.11ty.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Styling-TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![Google OAuth](https://img.shields.io/badge/Auth-Google%20OAuth%202.0-4285F4?style=for-the-badge&logo=google)](https://cloud.google.com)

Sango Fiora is a modern, high-performance E-Commerce platform for premium handcrafted artificial plants, statement trees, resort palms, and foliage delivered across India. 

Built with a **Hybrid Static + Dynamic Architecture**: Eleventy (11ty) provides lightning-fast page loads and SEO optimization, while Supabase powers real-time database management, 1-click Google authentication, user cart isolation, and a full-featured Admin Dashboard.

---

## ✨ Key Features

### 🛍️ Storefront & User Experience
* **76+ Botanical Varieties**: Categorized into *Foliage*, *Palms*, *Trees*, and *Flowering Plants* with decorative pots included.
* **Live Catalog & Inventory Sync**: Product listings automatically sync with the database — items marked "Sold Out" or deleted by admins reflect instantly for all customers.
* **1-Click Google OAuth & Email Auth**: Seamless authentication powered by Supabase Auth with Google OAuth 2.0.
* **Isolated User Carts & Wishlists**: Private cart and wishlist persistence per user across devices (`user_carts` & `user_wishlists`).
* **Real-time Order Tracking**: Customers can track their orders through a 5-step delivery pipeline (Order Placed → Quality Inspection → Packed → Out for Delivery → Delivered).
* **Printable GST Invoices**: Auto-generated printable receipts with tax breakdown.

### 🛠️ Admin Dashboard (`/admin/`)
* **Product Management (CRUD)**: Add new plants, edit prices/sizes/images, delete items, or toggle "Sold Out" status live.
* **Order Fulfillment Pipeline**: View customer orders, update delivery tracking steps, and attach tracking notes.
* **Coupon Manager**: Create, enable, disable, and delete promo discount codes dynamically.
* **Store Analytics**: Visual dashboard metrics for revenue, total orders, active inventory, and sold-out items.

---

## 🎨 Design & Aesthetic System

* **Primary Palette**: Deep Forest Green (`#1B4332`), Warm Amber Gold (`#F59E0B`), Off-White Canvas (`#FBFBFB`), Clean Glass Cards (`#FFFFFF`).
* **Typography**: Playfair Display (Luxury Serif Headlines) + Inter (UI & Body) + Material Symbols.
* **Micro-Interactions**: Glassmorphism (`backdrop-blur-md`), smooth card hover transformations, badge glows, and instant toast alerts.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, Vanilla JavaScript (ES6+), TailwindCSS
* **Site Generator**: Eleventy (11ty v3)
* **Backend & Database**: Supabase (PostgreSQL with Row Level Security RLS)
* **Authentication**: Google OAuth 2.0 + Supabase Auth Engine
* **Deployment**: Static Web Hosting (Vercel / Netlify / GitHub Pages compatible)

---

## 📁 Repository Structure

```text
├── admin/                 # Standalone Admin Dashboard Single Page App
│   └── index.html
├── _data/                 # Canonical product data & statistics
│   └── plants.json
├── content/               # Storefront pages (Shop All, Collections, Search)
├── layouts/               # Eleventy layouts (base, product detail, collections)
├── partials/              # Reusable UI components (header, footer, product-card)
├── js/                    # Application logic
│   ├── admin.js           # Admin Dashboard CRUD engine
│   ├── cart.js            # Cart & Supabase user_carts sync
│   ├── catalog.js         # Dynamic catalog search, filter & DB sync
│   ├── checkout.js        # Checkout wizard & order database creation
│   ├── orders-tracker.js  # Live order tracking engine
│   ├── supabase-auth.js   # Google OAuth & Email auth system
│   ├── supabase-client.js # Supabase client initialization
│   └── wishlist.js        # Wishlist & Supabase user_wishlists sync
├── scripts/               # Utility scripts & database seeder
├── supabase-schema.sql    # Complete PostgreSQL database schema
├── index.html             # Homepage / Landing page
├── login.html             # Auth login & sign-up page
├── about.html             # About Us page
├── contact.html           # Contact Us & Commercial enquiry page
└── package.json           # Node dependencies & build scripts
```

---

## 🚀 Getting Started Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/sangofiora2-cmyk/Sangofiora.git
cd Sangofiora
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build & Run Local Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser!

---

## 🗄️ Database Setup (Supabase)

1. Create a free project at [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard, copy the contents of [`supabase-schema.sql`](supabase-schema.sql), and click **Run**.
3. Copy your **Project URL** and **Publishable Key** from *Settings → API* into [`js/supabase-client.js`](js/supabase-client.js).
4. Run the seed script to import all 76 products into your database:
   ```bash
   node scripts/seed-products.js
   ```

---

## 📄 License

Distributed under the ISC License. Designed & Developed for **Sango Fiora**.
