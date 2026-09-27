import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import {
  getAlertsSummary,
  getCaregiverMe,
  listPatients,
} from "@/server/caregiver-api";
import { ApiError } from "@/server/server-api";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let caregiver;
  let activeAlertCount = 0;
  let patients: { id: string; full_name: string }[] = [];
  try {
    caregiver = await getCaregiverMe();
    const [summary, patientList] = await Promise.all([
      getAlertsSummary().catch(() => null),
      listPatients().catch(() => []),
    ]);
    activeAlertCount = summary?.active_count ?? 0;
    patients = patientList.map((p) => ({
      id: p.id,
      full_name: p.full_name,
    }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect("/login");
    }
    throw err;
  }

  return (
    <AppShell
      caregiverName={caregiver.full_name}
      activeAlertCount={activeAlertCount}
      patients={patients}
    >
      {children}
    </AppShell>
  );
}
