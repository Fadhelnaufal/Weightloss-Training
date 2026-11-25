<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aturan Proyek (Weight Loss Tracker & Home Training Planner)

Dokumen acuan utama: `docs/BRIEF.md`, `docs/DATA-MODEL.md`, dan `docs/PROGRAM-SEED.md`.

- Kerjakan **hanya fase yang diminta**. Jangan menambah fitur di luar brief.
- Proyek bersifat **single-user** (tidak ada tabel `users` atau `user_id`), **mobile-first** (PWA), dan fokus latihan bodyweight di rumah.
- Semua teks UI berbahasa Indonesia; nama variabel, simbol, dan kode berbahasa Inggris (`snake_case` di database).
- Semua tanggal log disimpan sebagai `date` (tanggal lokal `Asia/Jakarta` / WIB), bukan hasil konversi UTC dari `new Date().toISOString()`.
- Semua API route dan server action wajib memeriksa sesi (terkecuali endpoint login/publik yang memang diizinkan), dan `middleware.ts` memproteksi rute.
- Validasi semua input di server menggunakan Zod.
- Jangan menghapus atau mengubah data lama lewat migrasi tanpa persetujuan eksplisit; gunakan migrasi additive (`drizzle-kit generate` lalu `drizzle-kit migrate`).
- Setiap fase selesai harus lolos `npm run lint` dan `npm run build`.
- Commit kecil dan sering dengan pesan commit deskriptif. Jangan pernah commit `.env`.
