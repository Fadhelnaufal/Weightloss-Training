# PROGRAM SEED: Gerakan & Template Latihan (Bodyweight, di Rumah)

> Dipakai agent untuk membuat script seed (`db/seed.ts`) yang **idempoten**: upsert `exercises` berdasarkan `slug`, upsert `plan_days` berdasarkan `weekday`.
> Peralatan: tanpa alat. Opsional: matras, kursi/meja kokoh, botol air.
> Konten ini panduan umum, bukan pengganti saran profesional. Jika ada cedera atau kondisi medis, konsultasikan dulu.

## 1. Library gerakan

Kolom: `type` = reps atau time, `Lv` = level dalam rantai progresi, `LI` = low-impact.

### Push (progression_group: `push`)
| slug | Nama | type | Lv | LI | Catatan form |
|---|---|---|---|---|---|
| push-up-wall | Push-up Dinding | reps | 1 | ya | Badan lurus, siku 45 derajat dari badan |
| push-up-incline | Push-up Miring (tangan di kursi/meja) | reps | 2 | ya | Makin rendah tumpuan, makin sulit |
| push-up-knee | Push-up Lutut | reps | 3 | ya | Garis lurus bahu-pinggul-lutut |
| push-up-standard | Push-up Standar | reps | 4 | ya | Dada hampir menyentuh lantai, core kencang |
| push-up-diamond | Push-up Diamond | reps | 5 | ya | Tangan membentuk berlian, fokus triceps |

### Squat (progression_group: `squat`)
| slug | Nama | type | Lv | LI | Catatan form |
|---|---|---|---|---|---|
| sit-to-stand | Duduk-Berdiri dari Kursi | reps | 1 | ya | Tanpa berpegangan jika bisa |
| squat-bodyweight | Squat | reps | 2 | ya | Lutut searah jari kaki, tumit menapak |
| squat-pause | Squat Tahan 3 Detik | reps | 3 | ya | Tahan di bawah, bangkit terkontrol |
| split-squat-rear-foot | Bulgarian Split Squat (kaki belakang di kursi) | reps | 4 | ya | Per kaki; jaga keseimbangan |
| pistol-assisted | Pistol Squat Berpegangan | reps | 5 | ya | Per kaki; pegang kusen/pintu |

### Hinge / Glute (progression_group: `bridge`)
| slug | Nama | type | Lv | LI |
|---|---|---|---|---|
| glute-bridge | Glute Bridge | reps | 1 | ya |
| glute-bridge-march | Glute Bridge Marching | reps | 2 | ya |
| glute-bridge-single | Glute Bridge Satu Kaki | reps | 3 | ya |

### Lunge (progression_group: `lunge`)
| slug | Nama | type | Lv | LI |
|---|---|---|---|---|
| lunge-reverse | Reverse Lunge | reps | 2 | ya |
| lunge-side | Side Lunge | reps | 2 | ya |
| lunge-walking | Walking Lunge | reps | 3 | ya |

### Core (progression_group: `plank` dan `core-misc`)
| slug | Nama | type | Lv | LI | Group |
|---|---|---|---|---|---|
| plank-knee | Plank Lutut | time | 1 | ya | plank |
| plank-standard | Plank | time | 2 | ya | plank |
| plank-shoulder-tap | Plank Tepuk Bahu | reps | 3 | ya | plank |
| plank-long-lever | Plank Tangan Maju | time | 4 | ya | plank |
| dead-bug | Dead Bug | reps | 1 | ya | core-misc |
| bird-dog | Bird Dog | reps | 1 | ya | core-misc |
| superman | Superman | reps | 1 | ya | core-misc |
| leg-raise-lying | Leg Raise Berbaring | reps | 3 | ya | core-misc |

### Kardio (progression_group: `cardio`)
| slug | Nama | type | Lv | LI |
|---|---|---|---|---|
| march-in-place | Jalan di Tempat (angkat lutut) | time | 1 | ya |
| step-jack | Step Jack (tanpa lompat) | time | 1 | ya |
| shadow-boxing | Shadow Boxing | time | 2 | ya |
| squat-to-reach | Squat to Reach | time | 2 | ya |
| mountain-climber | Mountain Climber | time | 3 | ya |
| jumping-jack | Jumping Jack | time | 3 | tidak |
| high-knees | High Knees | time | 4 | tidak |
| burpee-no-jump | Burpee Tanpa Lompat | reps | 4 | ya |
| burpee | Burpee | reps | 5 | tidak |

### Mobilitas (progression_group: `mobility`)
| slug | Nama | type | Lv | LI |
|---|---|---|---|---|
| warmup-arm-circle | Putar Lengan | time | 1 | ya |
| warmup-hip-circle | Putar Pinggul | time | 1 | ya |
| warmup-cat-cow | Cat-Cow | reps | 1 | ya |
| stretch-hamstring | Peregangan Hamstring | time | 1 | ya |
| stretch-quad | Peregangan Paha Depan | time | 1 | ya |
| stretch-chest | Peregangan Dada | time | 1 | ya |

Untuk `instructions` dan `cues` tiap gerakan, agent menulis deskripsi singkat 2-3 kalimat berbahasa Indonesia berdasarkan catatan form di atas. Jangan mengarang klaim kesehatan.

## 2. Template program mingguan (minggu 1-3)

Semua sesi diawali **pemanasan 3-5 menit** (putar lengan, putar pinggul, cat-cow, march in place) dan diakhiri **pendinginan 3-5 menit** (peregangan). Pemanasan/pendinginan dicatat sebagai bagian sesi tetapi tidak dihitung dalam set utama.

| weekday | title | day_type |
|---|---|---|
| 1 Senin | Full Body A | strength |
| 2 Selasa | Kardio Ringan | cardio |
| 3 Rabu | Full Body B | strength |
| 4 Kamis | Istirahat Aktif | active_rest |
| 5 Jumat | Circuit | circuit |
| 6 Sabtu | Kardio Interval | cardio |
| 7 Minggu | Istirahat + Timbang | rest |

> Pengguna pemula disarankan memulai dengan **3 hari inti** (Senin, Rabu, Jumat) lalu menambah kardio setelah minggu ke-2. App menyediakan toggle "aktifkan hari kardio".

### Senin: Full Body A (3 set, istirahat 45-60 dtk)
| # | Gerakan | Target awal |
|---|---|---|
| 1 | squat-bodyweight | 3 x 10 |
| 2 | push-up-incline | 3 x 8 |
| 3 | glute-bridge | 3 x 12 |
| 4 | dead-bug | 3 x 8 per sisi |
| 5 | plank-knee | 3 x 20 dtk |

### Selasa: Kardio Ringan
- Jalan cepat di luar 30-40 menit **atau** di rumah: march-in-place, step-jack, shadow-boxing, squat-to-reach, 40 dtk kerja / 20 dtk istirahat x 4 putaran.

### Rabu: Full Body B (3 set, istirahat 45-60 dtk)
| # | Gerakan | Target awal |
|---|---|---|
| 1 | lunge-reverse | 3 x 8 per kaki |
| 2 | push-up-knee | 3 x 6 |
| 3 | superman | 3 x 10 |
| 4 | bird-dog | 3 x 8 per sisi |
| 5 | plank-standard | 3 x 20 dtk |

### Kamis: Istirahat Aktif
- Jalan santai 20-30 menit + peregangan (hamstring, paha depan, dada).

### Jumat: Circuit (3 putaran, 40 dtk kerja / 20 dtk istirahat, istirahat 90 dtk antar putaran)
squat-bodyweight, push-up-incline, mountain-climber (atau step-jack jika perlu senyap), glute-bridge-march, plank-standard, shadow-boxing.

### Sabtu: Kardio Interval
- 5 menit pemanasan, lalu 8 x (1 menit cepat / 1 menit santai) jalan atau jogging di tempat, 5 menit pendinginan. Gunakan opsi low-impact jika lutut tidak nyaman.

### Minggu: Istirahat + Timbang
- Tidak ada latihan. Pengingat: timbang berat badan dan review mingguan.

## 3. Aturan progresi otomatis

Dievaluasi setiap sesi selesai, per gerakan:

1. **Naik reps/durasi**: jika semua set mencapai target dengan RPE <= 7 pada **2 sesi berturut-turut**, sarankan +1-2 reps (atau +5 dtk) per set.
2. **Naik varian**: jika target reps mencapai batas atas (misal 15 reps atau 45 dtk) pada semua set dengan RPE <= 7 dalam **3 sesi berturut-turut**, sarankan pindah ke gerakan `difficulty_level + 1` dalam `progression_group` yang sama, dengan target reps diturunkan ke ~6-8.
3. **Turun/tahan**: jika RPE >= 9 atau set tidak selesai pada **2 sesi berturut-turut**, sarankan menahan target atau turun satu level.
4. **Deload**: setiap 4 minggu, tawarkan minggu ringan (volume 60%).
5. App hanya **menyarankan**; pengguna yang menyetujui perubahan. Jangan mengubah program secara otomatis tanpa konfirmasi.

## 4. Batas keamanan yang ditampilkan di UI
- Hentikan latihan jika nyeri tajam, pusing, atau sesak berlebihan.
- Opsi "versi low-impact" selalu tersedia untuk gerakan lompat.
- Tidak ada saran latihan harian berturut-turut tanpa hari istirahat.
