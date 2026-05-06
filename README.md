# 🏋️ MyCoach

A modern fitness coaching platform built for personal trainers to manage clients, schedule sessions, and track bookings — all in one place.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3FCF8E?logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

## ✨ Features

- **🔐 Authentication** — Secure login for admin and clients via Supabase Auth
- **📊 Admin Dashboard** — Overview of clients, bookings, and business stats
- **👥 Client Management** — Add, edit, and view detailed client profiles
- **📅 Time Slot Management** — Create and manage coaching availability
- **📋 Appointment Management** — Approve, reject, and track session bookings
- **🎯 Client Dashboard** — Clients can book sessions and track their status
- **🌙 Dark Mode** — Sleek dark-themed UI with blue-to-purple gradient branding

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 19, TypeScript                |
| Build Tool  | Vite 7                              |
| Styling     | Tailwind CSS 4, Radix UI           |
| Backend     | Supabase (Auth, PostgreSQL, API)    |
| Routing     | React Router DOM                    |
| Charts      | Recharts                            |
| Hosting     | Vercel                              |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Iwadss/my-coach.git
   cd my-coach
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_ADMIN_EMAIL=your_admin_email
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📁 Project Structure

```
my-coach/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin dashboard components
│   │   ├── client/         # Client dashboard components
│   │   └── ui/             # Reusable UI components (shadcn/ui)
│   ├── pages/              # Route pages
│   ├── supabase/           # Supabase client config
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility functions
├── public/                 # Static assets
└── index.html              # Entry point
```

## 📜 Scripts

| Command          | Description              |
|------------------|--------------------------|
| `npm run dev`    | Start dev server         |
| `npm run build`  | Build for production     |
| `npm run lint`   | Run ESLint               |
| `npm run preview`| Preview production build |

## 📄 License

This project is private and proprietary.

---

Built with ❤️ by **Iwad**
