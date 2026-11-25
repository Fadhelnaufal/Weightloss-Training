import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold text-foreground">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm text-muted-foreground">
          Alamat yang Anda buka tidak tersedia di aplikasi ini.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Kembali ke Ringkasan
        </Link>
      </div>
    </div>
  );
}
