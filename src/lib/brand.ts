// src/lib/brand.ts
// Single source of truth for the sidebar/nav logo mark, shared by the
// client, coach, and admin shells (client-shell.tsx, coach-shell.tsx,
// admin-layout.tsx) so there's one place to swap it instead of three.
//
// To use your own logo: replace the file at public/logo.svg (SVG or any
// raster format — just update the extension below to match), or point
// LOGO_SRC at a different path/URL entirely. Every nav bar picks it up
// automatically.
export const LOGO_SRC = '/logo.svg'
