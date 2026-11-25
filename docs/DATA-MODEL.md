# DATA MODEL

> ORM: Drizzle + Neon Postgres. Single user, jadi **tidak ada tabel `users`** dan tidak perlu kolom `user_id`.
> Konvensi: `snake_case` di database, `id` bertipe `serial` atau `uuid`, `created_at` / `updated_at` bertipe `timestamptz`.
> Kolom `log_date` bertipe **`date`** dan berisi tanggal lokal WIB. Jangan dihitung dari `new Date().toISOString()`.

## Ringkasan relasi
```
profile (1 baris)
weight_logs
daily_logs
meal_logs
exercises  <-- plan_items --> plan_days
exercises  <-- session_sets --> workout_sessions
```

## Tabel

### `profile` (selalu maksimal 1 baris)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | int PK | selalu 1 |
| height_cm | numeric(5,1) | |
| birth_date | date | |
| sex | enum('male','female') | untuk rumus BMR |
| activity_level | enum('sedentary','light','moderate','active') | |
| start_weight_kg | numeric(5,2) | |
| target_weight_kg | numeric(5,2) | |
| target_date | date | nullable |
| weekly_loss_goal_kg | numeric(3,2) | default 0.5 |
| calorie_target | int | nullable, hasil kalkulator atau override manual |
| protein_target_g | int | nullable |
| step_target | int | default 8000 |
| injury_notes | text | nullable |
| updated_at | timestamptz | |

### `weight_logs`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | serial PK | |
| log_date | date **UNIQUE** | satu entri per hari; input ulang = update |
| weight_kg | numeric(5,2) | validasi 20-300 |
| waist_cm | numeric(5,1) | nullable |
| note | text | nullable |
| created_at | timestamptz | |

### `daily_logs`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | serial PK | |
| log_date | date **UNIQUE** | |
| steps | int | nullable |
| sleep_hours | numeric(3,1) | nullable |
| energy_score | smallint | nullable, 1-5 |
| note | text | nullable |

### `meal_logs`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | serial PK | |
| log_date | date | index |
| meal_type | enum('breakfast','lunch','dinner','snack') | |
| description | text | |
| calories | int | validasi 0-5000 |
| protein_g | numeric(5,1) | nullable |
| created_at | timestamptz | |

### `exercises`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | serial PK | |
| slug | text **UNIQUE** | misal `push-up-standard` |
| name | text | nama tampilan (Indonesia) |
| category | enum('push','pull','squat','hinge','lunge','core','cardio','mobility') | |
| primary_muscle | text | |
| tracking_type | enum('reps','time') | reps atau detik |
| difficulty_level | smallint | 1-5 dalam satu rantai |
| progression_group | text | contoh `push`, `squat`; gerakan sejenis dalam satu rantai |
| is_low_impact | boolean | |
| instructions | text | langkah singkat |
| cues | text | nullable, tips form |
| is_custom | boolean | default false |

### `plan_days`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | serial PK | |
| weekday | smallint | 1=Senin ... 7=Minggu, **UNIQUE** |
| title | text | contoh "Full Body A" |
| day_type | enum('strength','cardio','circuit','rest','active_rest') | |
| note | text | nullable |

### `plan_items`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | serial PK | |
| plan_day_id | int FK -> plan_days (cascade) | |
| exercise_id | int FK -> exercises | |
| position | smallint | urutan dalam sesi |
| target_sets | smallint | |
| target_reps | smallint | nullable (untuk tipe reps) |
| target_seconds | smallint | nullable (untuk tipe time) |
| rest_seconds | smallint | default 45 |
| note | text | nullable |

### `workout_sessions`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | serial PK | |
| session_date | date | index |
| plan_day_id | int FK nullable | null jika sesi bebas |
| title | text | salinan judul saat sesi dibuat |
| started_at | timestamptz | |
| finished_at | timestamptz | nullable; null = belum selesai |
| duration_seconds | int | nullable |
| overall_rpe | smallint | nullable, 1-10 |
| note | text | nullable |

### `session_sets`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | serial PK | |
| session_id | int FK -> workout_sessions (cascade) | |
| exercise_id | int FK -> exercises | |
| set_number | smallint | |
| reps | smallint | nullable |
| seconds | smallint | nullable |
| rpe | smallint | nullable, 1-10 |
| is_completed | boolean | default false |

## Index yang disarankan
- `weight_logs(log_date)` (unique), `daily_logs(log_date)` (unique)
- `meal_logs(log_date)`
- `workout_sessions(session_date)`
- `session_sets(session_id)`, `session_sets(exercise_id)`
- `plan_items(plan_day_id, position)`

## Query turunan (hitung di server, jangan disimpan)
- **Rata-rata bergerak 7 hari**: rata-rata `weight_kg` dalam 7 hari kalender terakhir yang punya data; jika data < 3 titik, tampilkan "data belum cukup".
- **Streak latihan**: jumlah hari berurutan terakhir yang punya `workout_sessions` dengan `finished_at` terisi; hari `rest`/`active_rest` di jadwal tidak memutus streak.
- **Total kalori harian**: `SUM(calories)` per `log_date`.
- **Progres gerakan**: reps terbaik atau detik terbaik per `exercise_id` per sesi.

## Aturan migrasi
- Gunakan `drizzle-kit generate` lalu `drizzle-kit migrate`; simpan folder migrasi di repo.
- Migrasi bersifat **additive** (tambah tabel/kolom). Jangan `DROP` tabel berisi data tanpa persetujuan pemilik.
- Seed gerakan dan template program bersifat **idempoten** (upsert berdasarkan `slug` / `weekday`), aman dijalankan ulang.
