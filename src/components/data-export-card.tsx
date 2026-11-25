import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DataExportCard() {
  return (
    <Card id="ekspor" className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Ekspor Data Pribadi</CardTitle>
        <CardDescription>
          Unduh seluruh catatan Anda sebagai cadangan dalam format JSON atau CSV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href="/api/export/json"
            download
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Unduh Semua Data (JSON)
          </a>

          <a
            href="/api/export/csv?type=weights"
            download
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Unduh Berat Badan (CSV)
          </a>

          <a
            href="/api/export/csv?type=meals"
            download
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Unduh Log Makanan (CSV)
          </a>

          <a
            href="/api/export/csv?type=sessions"
            download
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Unduh Sesi Workout (CSV)
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
