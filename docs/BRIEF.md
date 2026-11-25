# BRIEF: Weight Loss Tracker & Home Training Planner

> Dokumen sumber utama. Agent wajib membaca file ini sebelum mengerjakan fase apa pun.
> Dokumen pendamping: `DATA-MODEL.md`, `PROGRAM-SEED.md`, `PROMPTS.md`.

## 1. Tujuan
Webapp pribadi untuk membantu menurunkan berat badan secara konsisten: mencatat berat badan, menjalankan program latihan **di rumah tanpa alat (bodyweight)**, mencatat asupan kalori sederhana, dan melihat progres lewat grafik.

- **Single user** (pemilik app saja), tanpa pendaftaran, tanpa multi-user.
- **Mobile-first**, bisa di-install di HP sebagai PWA.
- Bahasa antarmuka: **Indonesia**.
- Zona waktu: **Asia/Jakarta (WIB)**. Semua "tanggal log" adalah tanggal lokal WIB.

## 2. Profil awal (isi sebelum Fase 1)
| Item | Nilai |
|---|---|
| Berat sekarang | `[ISI] kg` |
| Tinggi | `[ISI] cm` |
| Tanggal lahir | `[ISI]` |
| Jenis kelamin (untuk rumus BMR) | `[ISI]` |
| Level aktivitas | `[ISI: sedentari / ringan / sedang / aktif]` |
| Target berat | `[ISI] kg` pada `[ISI] tanggal` |
| Hari latihan per minggu | `[ISI, disarankan mulai 3]` |
| Cedera / batasan fisik | `[ISI atau "tidak ada"]` |
| Kendala tempat | `[ISI, misal: ada tetangga di bawah, hindari lompat keras]` |

Nilai ini dimasukkan lewat halaman **Pengaturan/Profil** di app, bukan di-hardcode.

## 3. Fitur MVP
1. **Dashboard**: berat terkini, selisih ke target, rata-rata 7 hari, streak latihan, ringkasan minggu ini, latihan hari ini.
2. **Log berat badan**: input harian (opsional lingkar pinggang dan catatan), grafik tren berat mentah + rata-rata bergerak 7 hari.
3. **Program latihan mingguan** (bodyweight): jadwal per hari, daftar gerakan, set, reps/durasi. Template bisa diedit.
4. **Mode workout**: checklist gerakan, input reps/detik aktual, RPE (1-10), timer kerja/istirahat dengan getar atau bunyi, tombol selesai.
5. **Progresi otomatis**: aturan saran naik level (lihat `PROGRAM-SEED.md`).
6. **Riwayat workout**: daftar sesi dan progres per gerakan.
7. **Log makanan sederhana**: kalori (dan opsional protein) per waktu makan, total harian vs target.
8. **Pelacak harian**: langkah, jam tidur, skor energi (1-5).
9. **Kalkulator target**: BMR/TDEE (Mifflin-St Jeor) dan saran target kalori.
10. **Pengingat** (fase 4, opsional).

**Di luar cakupan:** multi-user, social, database makanan lengkap, integrasi wearable, pembayaran, AI chatbot.

## 4. Tech stack (cocok untuk Vercel gratis)
- **Next.js (App Router) + TypeScript** (strict)
- **Tailwind CSS + shadcn/ui**, **Recharts** untuk grafik
- **Neon Postgres** (free tier) dengan driver `@neondatabase/serverless` + **Drizzle ORM** + drizzle-kit untuk migrasi
- **Validasi**: Zod
- **Auth single-user**: satu password, hash bcrypt (`bcryptjs`) di env var, sesi lewat cookie bertanda tangan (`jose`), `middleware.ts` memproteksi semua rute dan API kecuali `/login`
- **PWA**: `manifest.webmanifest`, ikon, service worker sederhana
- **Deploy**: Vercel Hobby, repo GitHub, env var di dashboard Vercel

> Catatan: Vercel tidak menjalankan PHP/Laravel secara native, jadi proyek ini memakai ekosistem JS.

### Env var
| Nama | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string Neon |
| `AUTH_PASSWORD_HASH` | Hash bcrypt, disimpan **base64** agar karakter `$` tidak rusak di `.env` |
| `AUTH_SECRET` | String acak panjang untuk menandatangani cookie sesi |
| `APP_TIMEZONE` | `Asia/Jakarta` |

Sediakan `.env.example` tanpa nilai asli. Jangan pernah commit `.env`.

## 5. Aturan perhitungan

**BMR (Mifflin-St Jeor)**
- Pria: `10*berat(kg) + 6.25*tinggi(cm) - 5*usia + 5`
- Wanita: `10*berat(kg) + 6.25*tinggi(cm) - 5*usia - 161`

**TDEE** = BMR x faktor aktivitas: sedentari 1.2, ringan 1.375, sedang 1.55, aktif 1.725.

**Target kalori** = TDEE - defisit harian. Perkiraan: 1 kg lemak ~ 7700 kcal, jadi 0,5 kg/minggu ~ 550 kcal/hari.

**Guardrails (wajib):**
- Target kalori harian **tidak boleh di bawah BMR**; jika hasil hitung lebih rendah, tampilkan nilai BMR sebagai batas dan beri keterangan.
- Tampilkan peringatan jika laju penurunan yang diinginkan > ~1 kg/minggu.
- Saran laju default: 0,25-0,75 kg/minggu.
- Tampilkan catatan tetap: "Alat bantu pencatatan, bukan pengganti saran dokter atau ahli gizi."
- Rata-rata bergerak 7 hari dipakai untuk menilai tren, bukan berat harian tunggal.

## 6. UX
- Log berat maksimal 2-3 tap dari dashboard.
- Tombol besar, nyaman dipakai satu tangan, saat berkeringat.
- Dark/light mode otomatis mengikuti sistem.
- Mode workout: layar tidak boleh mati (Wake Lock API jika tersedia), timer jelas dan besar.
- Tampilan bersih dan minimalis; hindari dekorasi berlebihan.

## 7. Aturan proyek (untuk agent)
- Kerjakan **hanya fase yang diminta**. Jangan menambah fitur di luar brief.
- Semua teks UI berbahasa Indonesia; nama variabel/kode berbahasa Inggris.
- Semua tanggal log disimpan sebagai `date` (tanggal lokal WIB), bukan hasil konversi UTC.
- Semua API route dan server action wajib memeriksa sesi.
- Validasi input dengan Zod di server.
- Setiap fase selesai harus lolos `npm run lint` dan `npm run build`.
- Jangan menghapus atau mengubah data lama lewat migrasi tanpa persetujuan eksplisit.
- Commit kecil dan sering, pesan commit deskriptif.

## 8. Fase pengerjaan
1. **Fase 1**: setup, auth, database, log berat + grafik, deploy
2. **Fase 2**: library gerakan, program mingguan, mode workout, riwayat
3. **Fase 3**: log makanan, pelacak harian, kalkulator target
4. **Fase 4**: PWA, pengingat, polesan UI, hardening

## 9. Kriteria selesai (MVP)
- Login berfungsi dan **semua** halaman/API terblokir tanpa sesi.
- Bisa log berat harian dan melihat grafik tren 7 hari.
- Bisa menjalankan satu sesi workout penuh dan tersimpan di riwayat.
- Target kalori tidak pernah di bawah BMR.
- Bisa di-install di HP lewat URL Vercel.
- Data tidak hilang saat redeploy; tanggal tidak bergeser karena zona waktu.
