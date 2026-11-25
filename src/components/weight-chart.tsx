"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildWeightChartSeries,
  filterChartSeriesByRange,
  type WeightChartPoint,
  type WeightChartRange,
} from "@/lib/calc/weight";
import { formatDateID, formatShortDateID } from "@/lib/date";
import type { WeightLogItem } from "@/lib/db/queries";

interface WeightChartProps {
  logs: ReadonlyArray<WeightLogItem>;
  todayDateWIB: string;
}

const RANGE_OPTIONS: Array<{ value: WeightChartRange; label: string }> = [
  { value: "30d", label: "30 Hari" },
  { value: "90d", label: "90 Hari" },
  { value: "all", label: "Semua" },
];

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: WeightChartPoint;
  }>;
}

function WeightChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-popover-foreground">
        {formatDateID(point.logDate)}
      </p>
      <p className="mt-1 tabular-nums text-muted-foreground">
        Berat harian:{" "}
        <span className="font-semibold text-foreground">
          {point.weightKg.toFixed(1)} kg
        </span>
      </p>
      <p className="tabular-nums text-muted-foreground">
        Rata-rata 7 hari:{" "}
        <span className="font-semibold text-primary">
          {point.movingAvg7d !== null
            ? `${point.movingAvg7d.toFixed(2)} kg`
            : "Data belum cukup"}
        </span>
      </p>
    </div>
  );
}

export function WeightChart({ logs, todayDateWIB }: WeightChartProps) {
  const isClient = useIsClient();
  const [range, setRange] = useState<WeightChartRange>("30d");

  const fullSeries = useMemo(
    () =>
      buildWeightChartSeries(
        logs.map((item) => ({
          logDate: item.logDate,
          weightKg: item.weightKg,
        })),
      ),
    [logs],
  );

  const visibleSeries = useMemo(
    () => filterChartSeriesByRange(fullSeries, range, todayDateWIB),
    [fullSeries, range, todayDateWIB],
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-bold">Tren Berat Badan</CardTitle>
          <CardDescription>
            Garis penuh menunjukkan rata-rata bergerak 7 hari (minimal 3 titik).
          </CardDescription>
        </div>

        <div
          role="group"
          aria-label="Pilih rentang grafik"
          className="flex flex-wrap gap-2"
        >
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={range === option.value ? "default" : "outline"}
              onClick={() => setRange(option.value)}
              aria-pressed={range === option.value}
              className="min-h-11 px-3.5 text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {visibleSeries.length === 0 ? (
          <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
            Belum ada data berat badan pada rentang waktu ini.
          </div>
        ) : !isClient ? (
          <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="space-y-3">
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={visibleSeries}
                  margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="logDate"
                    tickFormatter={formatShortDateID}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={46}
                    tickFormatter={(val: number) => `${val}`}
                  />
                  <Tooltip content={<WeightChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="weightKg"
                    name="Berat harian"
                    stroke="var(--chart-1)"
                    strokeWidth={1.75}
                    strokeDasharray="4 3"
                    dot={{ r: 3, fill: "var(--chart-1)" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvg7d"
                    name="Rata-rata 7 hari"
                    stroke="var(--chart-2)"
                    strokeWidth={2.75}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-5 border-t-2 border-dashed border-chart-1"
                />
                Berat harian
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-5 bg-chart-2"
                />
                Rata-rata 7 hari
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
