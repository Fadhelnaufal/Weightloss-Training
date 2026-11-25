import { eq } from "drizzle-orm";
import { exercises, planDays, planItems } from "./schema";
import { getDb } from "../lib/db";

interface ExerciseSeed {
  slug: string;
  name: string;
  category:
    | "push"
    | "pull"
    | "squat"
    | "hinge"
    | "lunge"
    | "core"
    | "cardio"
    | "mobility";
  primaryMuscle: string;
  trackingType: "reps" | "time";
  difficultyLevel: number;
  progressionGroup: string;
  isLowImpact: boolean;
  instructions: string;
  cues: string;
}

const EXERCISE_SEEDS: ReadonlyArray<ExerciseSeed> = [
  // Push
  {
    slug: "push-up-wall",
    name: "Push-up Dinding",
    category: "push",
    primaryMuscle: "Dada, Bahu, Triceps",
    trackingType: "reps",
    difficultyLevel: 1,
    progressionGroup: "push",
    isLowImpact: true,
    instructions:
      "Berdiri menghadap dinding dengan jarak sekitar satu lengan, letakkan kedua telapak tangan sejajar bahu di dinding. Tekuk siku perlahan hingga dada mendekati dinding, lalu dorong kembali ke posisi awal.",
    cues: "Jaga tubuh tetap lurus dari kepala sampai tumit dan arahkan siku sekitar 45 derajat dari badan.",
  },
  {
    slug: "push-up-incline",
    name: "Push-up Miring",
    category: "push",
    primaryMuscle: "Dada, Bahu, Triceps",
    trackingType: "reps",
    difficultyLevel: 2,
    progressionGroup: "push",
    isLowImpact: true,
    instructions:
      "Letakkan kedua tangan di tepi meja atau kursi kokoh, mundurkan kaki hingga tubuh membentuk garis lurus. Turunkan dada mendekati tumpuan lalu dorong kembali hingga lengan lurus.",
    cues: "Makin rendah tumpuan, makin menantang gerakannya. Kencangkan perut agar pinggul tidak turun.",
  },
  {
    slug: "push-up-knee",
    name: "Push-up Lutut",
    category: "push",
    primaryMuscle: "Dada, Bahu, Triceps",
    trackingType: "reps",
    difficultyLevel: 3,
    progressionGroup: "push",
    isLowImpact: true,
    instructions:
      "Ambil posisi push-up di lantai atau matras dengan lutut menempel lantai dan tangan selebar bahu. Turunkan dada mendekati lantai secara terkontrol lalu dorong kembali ke atas.",
    cues: "Pertahankan garis lurus dari bahu, pinggul, hingga lutut dan hindari mengangkat pinggul terlalu tinggi.",
  },
  {
    slug: "push-up-standard",
    name: "Push-up Standar",
    category: "push",
    primaryMuscle: "Dada, Bahu, Triceps",
    trackingType: "reps",
    difficultyLevel: 4,
    progressionGroup: "push",
    isLowImpact: true,
    instructions:
      "Mulai dari posisi plank dengan telapak tangan di lantai tepat di bawah bahu dan ujung kaki bertumpu. Turunkan tubuh hingga dada hampir menyentuh lantai lalu dorong kuat kembali ke posisi awal.",
    cues: "Kencangkan core dan bokong, jaga siku mengarah sekitar 45 derajat ke belakang.",
  },
  {
    slug: "push-up-diamond",
    name: "Push-up Diamond",
    category: "push",
    primaryMuscle: "Triceps, Dada Dalam",
    trackingType: "reps",
    difficultyLevel: 5,
    progressionGroup: "push",
    isLowImpact: true,
    instructions:
      "Ambil posisi push-up standar dengan ibu jari dan jari telunjuk kedua tangan saling bertemu membentuk berlian di bawah dada. Turunkan dada perlahan ke arah tangan lalu dorong kembali ke atas.",
    cues: "Fokuskan dorongan pada triceps dan jaga siku tetap dekat dengan sisi tubuh.",
  },

  // Squat
  {
    slug: "sit-to-stand",
    name: "Duduk-Berdiri dari Kursi",
    category: "squat",
    primaryMuscle: "Paha Depan, Bokong",
    trackingType: "reps",
    difficultyLevel: 1,
    progressionGroup: "squat",
    isLowImpact: true,
    instructions:
      "Berdiri di depan kursi kokoh dengan kaki selebar bahu. Dorong pinggul ke belakang hingga bokong menyentuh dudukan kursi perlahan, lalu berdiri kembali dengan menekan tumit.",
    cues: "Lakukan tanpa berpegangan jika memungkinkan dan jaga dada tetap tegak.",
  },
  {
    slug: "squat-bodyweight",
    name: "Squat",
    category: "squat",
    primaryMuscle: "Paha Depan, Bokong",
    trackingType: "reps",
    difficultyLevel: 2,
    progressionGroup: "squat",
    isLowImpact: true,
    instructions:
      "Berdiri dengan kaki selebar bahu dan jari kaki sedikit mengarah keluar. Tekuk lutut dan turunkan pinggul ke belakang seolah hendak duduk, lalu dorong kembali berdiri.",
    cues: "Pastikan lutut searah dengan jari kaki dan tumit tetap menapak penuh di lantai.",
  },
  {
    slug: "squat-pause",
    name: "Squat Tahan 3 Detik",
    category: "squat",
    primaryMuscle: "Paha Depan, Bokong",
    trackingType: "reps",
    difficultyLevel: 3,
    progressionGroup: "squat",
    isLowImpact: true,
    instructions:
      "Turun ke posisi squat standar hingga paha sejajar atau sedalam rentang gerak yang nyaman. Tahan posisi bawah selama 3 detik sambil menjaga ketegangan otot, lalu bangkit terkontrol.",
    cues: "Jangan memantul di posisi bawah; jaga punggung tetap netral selama jeda.",
  },
  {
    slug: "split-squat-rear-foot",
    name: "Bulgarian Split Squat",
    category: "squat",
    primaryMuscle: "Paha Depan, Bokong",
    trackingType: "reps",
    difficultyLevel: 4,
    progressionGroup: "squat",
    isLowImpact: true,
    instructions:
      "Berdiri membelakangi kursi kokoh dan letakkan punggung salah satu kaki di atas dudukan. Turunkan tubuh dengan menekuk lutut depan secara terkontrol, lalu dorong lewat tumit depan untuk berdiri.",
    cues: "Hitung repetisi per kaki dan jaga keseimbangan dengan pandangan lurus ke depan.",
  },
  {
    slug: "pistol-assisted",
    name: "Pistol Squat Berpegangan",
    category: "squat",
    primaryMuscle: "Paha Depan, Bokong, Stabilitas",
    trackingType: "reps",
    difficultyLevel: 5,
    progressionGroup: "squat",
    isLowImpact: true,
    instructions:
      "Pegang kusen pintu atau tiang kokoh untuk menjaga keseimbangan, lalu angkat satu kaki lurus ke depan. Turunkan tubuh dengan satu kaki tumpuan sedalam mungkin secara perlahan, lalu dorong naik kembali.",
    cues: "Lakukan per kaki dengan kontrol penuh dan gunakan pegangan hanya sebagai penyeimbang.",
  },

  // Hinge / Glute
  {
    slug: "glute-bridge",
    name: "Glute Bridge",
    category: "hinge",
    primaryMuscle: "Bokong, Paha Belakang",
    trackingType: "reps",
    difficultyLevel: 1,
    progressionGroup: "bridge",
    isLowImpact: true,
    instructions:
      "Berbaring telentang dengan lutut ditekuk dan telapak kaki menapak di lantai selebar pinggul. Tekan tumit untuk mengangkat pinggul hingga bahu, pinggul, dan lutut membentuk garis lurus, lalu turunkan perlahan.",
    cues: "Remas otot bokong di puncak gerakan tanpa melengkungkan punggung bawah berlebihan.",
  },
  {
    slug: "glute-bridge-march",
    name: "Glute Bridge Marching",
    category: "hinge",
    primaryMuscle: "Bokong, Paha Belakang, Core",
    trackingType: "reps",
    difficultyLevel: 2,
    progressionGroup: "bridge",
    isLowImpact: true,
    instructions:
      "Angkat pinggul ke posisi glute bridge dan tahan ketinggiannya. Secara bergantian, angkat satu lutut mendekati dada lalu turunkan kembali sambil menjaga pinggul tetap stabil.",
    cues: "Jaga agar pinggul tidak miring ke kiri atau kanan saat salah satu kaki diangkat.",
  },
  {
    slug: "glute-bridge-single",
    name: "Glute Bridge Satu Kaki",
    category: "hinge",
    primaryMuscle: "Bokong, Paha Belakang",
    trackingType: "reps",
    difficultyLevel: 3,
    progressionGroup: "bridge",
    isLowImpact: true,
    instructions:
      "Berbaring telentang dengan satu kaki menapak di lantai dan kaki lainnya lurus atau ditekuk di udara. Dorong tumit kaki tumpuan untuk mengangkat pinggul setinggi mungkin lalu turunkan perlahan.",
    cues: "Selesaikan target repetisi untuk satu sisi sebelum berpindah ke kaki lainnya.",
  },

  // Lunge
  {
    slug: "lunge-reverse",
    name: "Reverse Lunge",
    category: "lunge",
    primaryMuscle: "Paha Depan, Bokong",
    trackingType: "reps",
    difficultyLevel: 2,
    progressionGroup: "lunge",
    isLowImpact: true,
    instructions:
      "Berdiri tegak lalu langkahkan satu kaki ke belakang sambil menurunkan lutut belakang mendekati lantai. Dorong tubuh kembali ke posisi berdiri menggunakan kaki depan.",
    cues: "Jaga tubuh tetap tegak dan pastikan lutut depan sejajar dengan jari kaki.",
  },
  {
    slug: "lunge-side",
    name: "Side Lunge",
    category: "lunge",
    primaryMuscle: "Paha Dalam, Paha Depan, Bokong",
    trackingType: "reps",
    difficultyLevel: 2,
    progressionGroup: "lunge",
    isLowImpact: true,
    instructions:
      "Dari posisi berdiri, langkahkan satu kaki lebar ke samping sambil mendorong pinggul ke belakang dan menekuk lutut sisi tersebut. Dorong kembali ke posisi awal dan ulangi ke sisi lain.",
    cues: "Jaga kaki yang diam tetap lurus dan kedua telapak kaki menghadap ke depan.",
  },
  {
    slug: "lunge-walking",
    name: "Walking Lunge",
    category: "lunge",
    primaryMuscle: "Paha Depan, Bokong, Keseimbangan",
    trackingType: "reps",
    difficultyLevel: 3,
    progressionGroup: "lunge",
    isLowImpact: true,
    instructions:
      "Langkahkan satu kaki ke depan dan turunkan pinggul hingga kedua lutut membentuk sudut sekitar 90 derajat. Dorong kaki depan untuk melangkahkan kaki belakang langsung ke depan untuk repetisi berikutnya.",
    cues: "Melangkah dengan kontrol dan hindari membenturkan lutut belakang ke lantai.",
  },

  // Core (plank & core-misc)
  {
    slug: "plank-knee",
    name: "Plank Lutut",
    category: "core",
    primaryMuscle: "Perut, Bahu",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "plank",
    isLowImpact: true,
    instructions:
      "Bertumpulah pada kedua lengan bawah dan lutut di atas matras dengan siku tepat di bawah bahu. Tahan tubuh dalam garis lurus dari kepala hingga lutut selama durasi target.",
    cues: "Tarik pusar perlahan ke arah tulang belakang dan bernapas secara teratur.",
  },
  {
    slug: "plank-standard",
    name: "Plank",
    category: "core",
    primaryMuscle: "Perut, Bahu, Punggung",
    trackingType: "time",
    difficultyLevel: 2,
    progressionGroup: "plank",
    isLowImpact: true,
    instructions:
      "Bertumpu pada kedua lengan bawah dan ujung jari kaki dengan siku tepat di bawah bahu. Tahan garis tubuh tetap lurus dari kepala sampai tumit selama durasi yang ditentukan.",
    cues: "Kencangkan perut dan bokong agar pinggul tidak turun atau terlalu menungging.",
  },
  {
    slug: "plank-shoulder-tap",
    name: "Plank Tepuk Bahu",
    category: "core",
    primaryMuscle: "Perut, Bahu, Anti-Rotasi",
    trackingType: "reps",
    difficultyLevel: 3,
    progressionGroup: "plank",
    isLowImpact: true,
    instructions:
      "Mulai dari posisi high plank dengan tangan lurus dan kaki sedikit dibuka agar stabil. Sentuh bahu kiri dengan tangan kanan secara perlahan, kembalikan ke lantai, lalu ulangi di sisi berlawanan.",
    cues: "Minimalkan goyangan pinggul ke kiri dan kanan selama tangan berpindah.",
  },
  {
    slug: "plank-long-lever",
    name: "Plank Tangan Maju",
    category: "core",
    primaryMuscle: "Perut Dalam, Bahu",
    trackingType: "time",
    difficultyLevel: 4,
    progressionGroup: "plank",
    isLowImpact: true,
    instructions:
      "Dari posisi plank lengan bawah, geser posisi siku beberapa sentimeter lebih jauh ke depan melewati garis bahu. Tahan tubuh tetap lurus dan stabil sesuai target waktu.",
    cues: "Jaga bokong tetap kencang dan hentikan jika punggung bawah mulai terasa melengkung.",
  },
  {
    slug: "dead-bug",
    name: "Dead Bug",
    category: "core",
    primaryMuscle: "Perut Dalam, Stabilitas Punggung",
    trackingType: "reps",
    difficultyLevel: 1,
    progressionGroup: "core-misc",
    isLowImpact: true,
    instructions:
      "Berbaring telentang dengan kedua tangan lurus ke atas dan lutut ditekuk 90 derajat di udara. Turunkan lengan kanan ke belakang dan luruskan kaki kiri mendekati lantai secara bersamaan, lalu kembali dan ganti sisi.",
    cues: "Pastikan punggung bawah tetap menempel ke lantai sepanjang gerakan.",
  },
  {
    slug: "bird-dog",
    name: "Bird Dog",
    category: "core",
    primaryMuscle: "Punggung Bawah, Bokong, Perut",
    trackingType: "reps",
    difficultyLevel: 1,
    progressionGroup: "core-misc",
    isLowImpact: true,
    instructions:
      "Ambil posisi merangkak dengan tangan di bawah bahu dan lutut di bawah pinggul. Luruskan lengan kanan ke depan dan kaki kiri ke belakang secara perlahan hingga sejajar tubuh, lalu kembali dan ganti sisi.",
    cues: "Arahkan pandangan ke lantai dan jaga pinggul tetap sejajar tanpa berputar.",
  },
  {
    slug: "superman",
    name: "Superman",
    category: "core",
    primaryMuscle: "Punggung Bawah, Bokong",
    trackingType: "reps",
    difficultyLevel: 1,
    progressionGroup: "core-misc",
    isLowImpact: true,
    instructions:
      "Berbaring tengkurap dengan kedua lengan lurus ke depan dan kaki lurus ke belakang. Angkat dada, lengan, dan kedua kaki beberapa sentimeter dari lantai secara bersamaan, tahan sejenak lalu turunkan perlahan.",
    cues: "Gerakkan secara terkontrol tanpa menyentak leher atau punggung bawah.",
  },
  {
    slug: "leg-raise-lying",
    name: "Leg Raise Berbaring",
    category: "core",
    primaryMuscle: "Perut Bawah, Fleksor Pinggul",
    trackingType: "reps",
    difficultyLevel: 3,
    progressionGroup: "core-misc",
    isLowImpact: true,
    instructions:
      "Berbaring telentang dengan kedua tangan di samping tubuh atau sedikit di bawah bokong untuk menopang punggung. Angkat kedua kaki lurus hingga tegak lurus lantai, lalu turunkan perlahan tanpa menyentuh lantai.",
    cues: "Tekan punggung bawah ke matras; tekuk lutut sedikit jika punggung mulai terangkat.",
  },

  // Cardio
  {
    slug: "march-in-place",
    name: "Jalan di Tempat",
    category: "cardio",
    primaryMuscle: "Kardiovaskular, Kaki",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "cardio",
    isLowImpact: true,
    instructions:
      "Berdiri tegak dan berjalanlah di tempat dengan ritme konstan sambil mengangkat lutut setinggi pinggul yang nyaman. Ayunkan kedua lengan secara alami mengikuti langkah.",
    cues: "Mendarat dengan lembut di bola kaki agar tidak berisik dan nyaman untuk sendi.",
  },
  {
    slug: "step-jack",
    name: "Step Jack (Tanpa Lompat)",
    category: "cardio",
    primaryMuscle: "Kardiovaskular, Bahu, Kaki",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "cardio",
    isLowImpact: true,
    instructions:
      "Berdiri tegak dengan kaki rapat, lalu langkahkan satu kaki ke samping sambil mengangkat kedua tangan ke atas kepala. Kembalikan ke posisi awal dan ulangi ke sisi berlawanan dengan ritme cepat.",
    cues: "Opsi aman tanpa lompatan yang senyap untuk lantai bertingkat.",
  },
  {
    slug: "shadow-boxing",
    name: "Shadow Boxing",
    category: "cardio",
    primaryMuscle: "Kardiovaskular, Bahu, Core",
    trackingType: "time",
    difficultyLevel: 2,
    progressionGroup: "cardio",
    isLowImpact: true,
    instructions:
      "Ambil kuda-kuda ringan dengan lutut sedikit ditekuk dan kedua tangan melindungi dagu. Lontarkan pukulan jab dan cross ke udara secara bergantian dengan ritme cepat sambil menggerakkan kaki ringan.",
    cues: "Putar sedikit bahu dan pinggul saat memukul serta jaga napas tetap lancar.",
  },
  {
    slug: "squat-to-reach",
    name: "Squat to Reach",
    category: "cardio",
    primaryMuscle: "Kardiovaskular, Paha, Bahu",
    trackingType: "time",
    difficultyLevel: 2,
    progressionGroup: "cardio",
    isLowImpact: true,
    instructions:
      "Turun ke posisi squat ringan dengan tangan mengarah ke bawah. Saat berdiri kembali, dorong pinggul ke depan dan raih kedua tangan tinggi ke atas dengan ritme bertenaga tanpa melompat.",
    cues: "Jaga lutut sejajar jari kaki dan fokus pada ritme yang konsisten.",
  },
  {
    slug: "mountain-climber",
    name: "Mountain Climber",
    category: "cardio",
    primaryMuscle: "Kardiovaskular, Perut, Bahu",
    trackingType: "time",
    difficultyLevel: 3,
    progressionGroup: "cardio",
    isLowImpact: true,
    instructions:
      "Ambil posisi high plank dengan tangan tepat di bawah bahu. Tarik satu lutut ke arah dada lalu kembalikan ke belakang sambil menarik lutut lainnya secara bergantian dengan tempo terkontrol.",
    cues: "Jaga pinggul tetap rendah dan sejajar bahu; atur tempo agar tidak mengentak lantai.",
  },
  {
    slug: "jumping-jack",
    name: "Jumping Jack",
    category: "cardio",
    primaryMuscle: "Kardiovaskular, Betis, Bahu",
    trackingType: "time",
    difficultyLevel: 3,
    progressionGroup: "cardio",
    isLowImpact: false,
    instructions:
      "Berdiri dengan kaki rapat dan tangan di samping tubuh. Lompat membuka kaki selebar bahu sambil mengangkat kedua lengan di atas kepala, lalu lompat kembali ke posisi awal.",
    cues: "Mendarat lembut dengan lutut sedikit ditekuk; pilih Step Jack jika perlu low-impact.",
  },
  {
    slug: "high-knees",
    name: "High Knees",
    category: "cardio",
    primaryMuscle: "Kardiovaskular, Kaki, Core",
    trackingType: "time",
    difficultyLevel: 4,
    progressionGroup: "cardio",
    isLowImpact: false,
    instructions:
      "Berlari di tempat dengan tempo cepat sambil mengangkat lutut setinggi pinggul secara bergantian. Gerakkan lengan aktif seperti sedang berlari sprint.",
    cues: "Mendarat di bagian depan kaki dengan lembut; ganti ke Jalan di Tempat jika perlu low-impact.",
  },
  {
    slug: "burpee-no-jump",
    name: "Burpee Tanpa Lompat",
    category: "cardio",
    primaryMuscle: "Seluruh Tubuh, Kardiovaskular",
    trackingType: "reps",
    difficultyLevel: 4,
    progressionGroup: "cardio",
    isLowImpact: true,
    instructions:
      "Bungkukkan tubuh dan letakkan tangan di lantai, lalu langkahkan kaki satu per satu ke belakang menjadi posisi plank. Langkahkan kembali kaki ke depan satu per satu lalu berdiri tegak sambil mengangkat tangan.",
    cues: "Cocok sebagai pengganti burpee standar tanpa entakan keras pada lutut atau lantai.",
  },
  {
    slug: "burpee",
    name: "Burpee",
    category: "cardio",
    primaryMuscle: "Seluruh Tubuh, Kardiovaskular",
    trackingType: "reps",
    difficultyLevel: 5,
    progressionGroup: "cardio",
    isLowImpact: false,
    instructions:
      "Turunkan tangan ke lantai lalu lompatkan kedua kaki ke belakang ke posisi plank. Lompatkan kembali kaki ke depan mendekati tangan dan akhiri dengan lompatan ringan ke atas.",
    cues: "Jaga core kencang saat masuk ke posisi plank agar pinggul tidak turun mendadak.",
  },

  // Mobility
  {
    slug: "warmup-arm-circle",
    name: "Putar Lengan",
    category: "mobility",
    primaryMuscle: "Bahu, Punggung Atas",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "mobility",
    isLowImpact: true,
    instructions:
      "Berdiri tegak dan rentangkan kedua lengan lurus ke samping setinggi bahu. Buat gerakan memutar ke depan selama separuh waktu, lalu putar ke arah belakang secara perlahan.",
    cues: "Jaga bahu tetap rileks menjauh dari telinga dan perbesar lingkaran secara bertahap.",
  },
  {
    slug: "warmup-hip-circle",
    name: "Putar Pinggul",
    category: "mobility",
    primaryMuscle: "Pinggul, Punggung Bawah",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "mobility",
    isLowImpact: true,
    instructions:
      "Berdiri dengan kaki sedikit lebih lebar dari bahu dan letakkan kedua tangan di pinggang. Putar pinggul membentuk lingkaran lebar searah jarum jam, lalu ulangi ke arah berlawanan.",
    cues: "Gerakkan dengan santai untuk melenturkan area pinggul sebelum latihan utama.",
  },
  {
    slug: "warmup-cat-cow",
    name: "Cat-Cow",
    category: "mobility",
    primaryMuscle: "Tulang Belakang, Bahu",
    trackingType: "reps",
    difficultyLevel: 1,
    progressionGroup: "mobility",
    isLowImpact: true,
    instructions:
      "Ambil posisi merangkak dengan tangan di bawah bahu dan lutut di bawah pinggul. Tarik napas sambil melengkungkan perut ke bawah dan mengangkat dada, lalu hembuskan sambil membulatkan punggung ke atas.",
    cues: "Ikuti ritme napas perlahan tanpa memaksa rentang gerak.",
  },
  {
    slug: "stretch-hamstring",
    name: "Peregangan Hamstring",
    category: "mobility",
    primaryMuscle: "Paha Belakang",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "mobility",
    isLowImpact: true,
    instructions:
      "Duduk di lantai dengan satu kaki lurus ke depan dan kaki lain ditekuk ke dalam, atau berdiri dengan satu tumit ditumpukan ke depan. Condongkan badan dari pinggul perlahan hingga terasa tarikan ringan di paha belakang.",
    cues: "Jaga punggung tetap panjang dan tahan peregangan tanpa memantul.",
  },
  {
    slug: "stretch-quad",
    name: "Peregangan Paha Depan",
    category: "mobility",
    primaryMuscle: "Paha Depan",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "mobility",
    isLowImpact: true,
    instructions:
      "Berdiri tegak sambil berpegangan pada dinding atau kursi jika perlu, tekuk satu lutut ke belakang dan pegang pergelangan kaki. Tarik perlahan tumit mendekati bokong dan tahan sesuai durasi.",
    cues: "Rapatkan kedua lutut dan jaga pinggul tetap netral lalu ulangi di sisi lainnya.",
  },
  {
    slug: "stretch-chest",
    name: "Peregangan Dada",
    category: "mobility",
    primaryMuscle: "Dada, Bahu Depan",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "mobility",
    isLowImpact: true,
    instructions:
      "Berdiri di kusen pintu atau kaitkan kedua tangan di belakang punggung sambil membuka bahu. Dorong dada perlahan ke depan hingga terasa regangan nyaman di dada dan bahu depan.",
    cues: "Bernapas dalam dan rileks selama menahan posisi pendinginan.",
  },
];

interface PlanItemSeed {
  exerciseSlug: string;
  position: number;
  targetSets: number;
  targetReps: number | null;
  targetSeconds: number | null;
  restSeconds: number;
  note: string | null;
}

interface PlanDaySeed {
  weekday: number;
  title: string;
  dayType: "strength" | "cardio" | "circuit" | "rest" | "active_rest";
  note: string | null;
  items: ReadonlyArray<PlanItemSeed>;
}

const PLAN_DAY_SEEDS: ReadonlyArray<PlanDaySeed> = [
  {
    weekday: 1,
    title: "Full Body A",
    dayType: "strength",
    note: "Awali pemanasan 3-5 menit dan akhiri pendinginan 3-5 menit. Istirahat 45-60 dtk antar set.",
    items: [
      {
        exerciseSlug: "squat-bodyweight",
        position: 1,
        targetSets: 3,
        targetReps: 10,
        targetSeconds: null,
        restSeconds: 45,
        note: null,
      },
      {
        exerciseSlug: "push-up-incline",
        position: 2,
        targetSets: 3,
        targetReps: 8,
        targetSeconds: null,
        restSeconds: 45,
        note: null,
      },
      {
        exerciseSlug: "glute-bridge",
        position: 3,
        targetSets: 3,
        targetReps: 12,
        targetSeconds: null,
        restSeconds: 45,
        note: null,
      },
      {
        exerciseSlug: "dead-bug",
        position: 4,
        targetSets: 3,
        targetReps: 8,
        targetSeconds: null,
        restSeconds: 45,
        note: "Per sisi",
      },
      {
        exerciseSlug: "plank-knee",
        position: 5,
        targetSets: 3,
        targetReps: null,
        targetSeconds: 20,
        restSeconds: 45,
        note: null,
      },
    ],
  },
  {
    weekday: 2,
    title: "Kardio Ringan",
    dayType: "cardio",
    note: "Jalan cepat di luar 30-40 menit atau 4 putaran di rumah (40 dtk kerja / 20 dtk istirahat).",
    items: [
      {
        exerciseSlug: "march-in-place",
        position: 1,
        targetSets: 4,
        targetReps: null,
        targetSeconds: 40,
        restSeconds: 20,
        note: null,
      },
      {
        exerciseSlug: "step-jack",
        position: 2,
        targetSets: 4,
        targetReps: null,
        targetSeconds: 40,
        restSeconds: 20,
        note: null,
      },
      {
        exerciseSlug: "shadow-boxing",
        position: 3,
        targetSets: 4,
        targetReps: null,
        targetSeconds: 40,
        restSeconds: 20,
        note: null,
      },
      {
        exerciseSlug: "squat-to-reach",
        position: 4,
        targetSets: 4,
        targetReps: null,
        targetSeconds: 40,
        restSeconds: 20,
        note: null,
      },
    ],
  },
  {
    weekday: 3,
    title: "Full Body B",
    dayType: "strength",
    note: "Awali pemanasan 3-5 menit dan akhiri pendinginan 3-5 menit. Istirahat 45-60 dtk antar set.",
    items: [
      {
        exerciseSlug: "lunge-reverse",
        position: 1,
        targetSets: 3,
        targetReps: 8,
        targetSeconds: null,
        restSeconds: 45,
        note: "Per kaki",
      },
      {
        exerciseSlug: "push-up-knee",
        position: 2,
        targetSets: 3,
        targetReps: 6,
        targetSeconds: null,
        restSeconds: 45,
        note: null,
      },
      {
        exerciseSlug: "superman",
        position: 3,
        targetSets: 3,
        targetReps: 10,
        targetSeconds: null,
        restSeconds: 45,
        note: null,
      },
      {
        exerciseSlug: "bird-dog",
        position: 4,
        targetSets: 3,
        targetReps: 8,
        targetSeconds: null,
        restSeconds: 45,
        note: "Per sisi",
      },
      {
        exerciseSlug: "plank-standard",
        position: 5,
        targetSets: 3,
        targetReps: null,
        targetSeconds: 20,
        restSeconds: 45,
        note: null,
      },
    ],
  },
  {
    weekday: 4,
    title: "Istirahat Aktif",
    dayType: "active_rest",
    note: "Jalan santai 20-30 menit ditambah peregangan hamstring, paha depan, dan dada.",
    items: [
      {
        exerciseSlug: "stretch-hamstring",
        position: 1,
        targetSets: 2,
        targetReps: null,
        targetSeconds: 30,
        restSeconds: 15,
        note: "Per sisi",
      },
      {
        exerciseSlug: "stretch-quad",
        position: 2,
        targetSets: 2,
        targetReps: null,
        targetSeconds: 30,
        restSeconds: 15,
        note: "Per sisi",
      },
      {
        exerciseSlug: "stretch-chest",
        position: 3,
        targetSets: 2,
        targetReps: null,
        targetSeconds: 30,
        restSeconds: 15,
        note: null,
      },
    ],
  },
  {
    weekday: 5,
    title: "Circuit",
    dayType: "circuit",
    note: "3 putaran, 40 dtk kerja / 20 dtk istirahat, istirahat 90 dtk antar putaran.",
    items: [
      {
        exerciseSlug: "squat-bodyweight",
        position: 1,
        targetSets: 3,
        targetReps: 12,
        targetSeconds: null,
        restSeconds: 20,
        note: null,
      },
      {
        exerciseSlug: "push-up-incline",
        position: 2,
        targetSets: 3,
        targetReps: 10,
        targetSeconds: null,
        restSeconds: 20,
        note: null,
      },
      {
        exerciseSlug: "mountain-climber",
        position: 3,
        targetSets: 3,
        targetReps: null,
        targetSeconds: 40,
        restSeconds: 20,
        note: "Ganti step-jack jika perlu senyap",
      },
      {
        exerciseSlug: "glute-bridge-march",
        position: 4,
        targetSets: 3,
        targetReps: 12,
        targetSeconds: null,
        restSeconds: 20,
        note: null,
      },
      {
        exerciseSlug: "plank-standard",
        position: 5,
        targetSets: 3,
        targetReps: null,
        targetSeconds: 40,
        restSeconds: 20,
        note: null,
      },
      {
        exerciseSlug: "shadow-boxing",
        position: 6,
        targetSets: 3,
        targetReps: null,
        targetSeconds: 40,
        restSeconds: 90,
        note: "Istirahat 90 dtk setelah putaran selesai",
      },
    ],
  },
  {
    weekday: 6,
    title: "Kardio Interval",
    dayType: "cardio",
    note: "5 menit pemanasan, 8 x (1 menit cepat / 1 menit santai) jalan atau jogging di tempat, 5 menit pendinginan. Pilih low-impact jika lutut tidak nyaman.",
    items: [
      {
        exerciseSlug: "march-in-place",
        position: 1,
        targetSets: 4,
        targetReps: null,
        targetSeconds: 60,
        restSeconds: 60,
        note: "Interval cepat atau jogging di tempat",
      },
      {
        exerciseSlug: "step-jack",
        position: 2,
        targetSets: 4,
        targetReps: null,
        targetSeconds: 60,
        restSeconds: 60,
        note: "Alternatif kardio low-impact",
      },
    ],
  },
  {
    weekday: 7,
    title: "Istirahat + Timbang",
    dayType: "rest",
    note: "Tidak ada latihan. Timbang berat badan dan review mingguan.",
    items: [],
  },
];

export async function runSeed() {
  const db = getDb();
  const slugToId = new Map<string, number>();

  for (const item of EXERCISE_SEEDS) {
    const [row] = await db
      .insert(exercises)
      .values({
        slug: item.slug,
        name: item.name,
        category: item.category,
        primaryMuscle: item.primaryMuscle,
        trackingType: item.trackingType,
        difficultyLevel: item.difficultyLevel,
        progressionGroup: item.progressionGroup,
        isLowImpact: item.isLowImpact,
        instructions: item.instructions,
        cues: item.cues,
        isCustom: false,
      })
      .onConflictDoUpdate({
        target: exercises.slug,
        set: {
          name: item.name,
          category: item.category,
          primaryMuscle: item.primaryMuscle,
          trackingType: item.trackingType,
          difficultyLevel: item.difficultyLevel,
          progressionGroup: item.progressionGroup,
          isLowImpact: item.isLowImpact,
          instructions: item.instructions,
          cues: item.cues,
        },
      })
      .returning({ id: exercises.id, slug: exercises.slug });

    slugToId.set(row.slug, row.id);
  }

  for (const day of PLAN_DAY_SEEDS) {
    const [existingDay] = await db
      .select()
      .from(planDays)
      .where(eq(planDays.weekday, day.weekday))
      .limit(1);

    let dayId: number;
    if (!existingDay) {
      const [inserted] = await db
        .insert(planDays)
        .values({
          weekday: day.weekday,
          title: day.title,
          dayType: day.dayType,
          isActive: true,
          note: day.note,
        })
        .returning({ id: planDays.id });
      dayId = inserted.id;
    } else {
      dayId = existingDay.id;
    }

    const existingItems = await db
      .select({ id: planItems.id })
      .from(planItems)
      .where(eq(planItems.planDayId, dayId))
      .limit(1);

    if (existingItems.length === 0 && day.items.length > 0) {
      await db.insert(planItems).values(
        day.items.map((item) => {
          const exerciseId = slugToId.get(item.exerciseSlug);
          if (!exerciseId) {
            throw new Error(`Slug gerakan tidak ditemukan: ${item.exerciseSlug}`);
          }
          return {
            planDayId: dayId,
            exerciseId,
            position: item.position,
            targetSets: item.targetSets,
            targetReps: item.targetReps,
            targetSeconds: item.targetSeconds,
            restSeconds: item.restSeconds,
            note: item.note,
          };
        }),
      );
    }
  }

  return {
    exercisesCount: EXERCISE_SEEDS.length,
    planDaysCount: PLAN_DAY_SEEDS.length,
  };
}

const isDirectExecution =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith("seed.ts");

if (isDirectExecution) {
  runSeed()
    .then((result) => {
      console.log(
        `Seed selesai: ${result.exercisesCount} gerakan dan ${result.planDaysCount} hari program.`,
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("Gagal menjalankan seed:", error);
      process.exit(1);
    });
}
