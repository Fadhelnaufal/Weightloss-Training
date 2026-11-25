import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { DataExportCard } from "@/components/data-export-card";
import { ProfileForm } from "@/components/profile-form";
import { ReminderSettingsCard } from "@/components/reminder-settings-card";
import { todayWIB } from "@/lib/date";
import { getPlanDaysWithItems, getProfile } from "@/lib/db/queries";

async function ProfileLoader() {
  let profileData = null;
  let planDays;
  try {
    [profileData, planDays] = await Promise.all([
      getProfile(),
      getPlanDaysWithItems(),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <ProfileForm initialProfile={profileData} />
      <ReminderSettingsCard
        todayDateWIB={todayWIB()}
        planDays={planDays}
      />
      <DataExportCard />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-12 w-40 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-44 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Profil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur data pribadi, target berat, pengingat kalender, dan ekspor data.
          </p>
        </div>

        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileLoader />
        </Suspense>
      </div>
    </AppShell>
  );
}
