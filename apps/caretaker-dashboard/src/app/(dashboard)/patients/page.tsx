import { listPatients } from "@/server/caregiver-api";
import { PatientsClient } from "@/components/PatientsClient";
import { EmptyState } from "@/components/EmptyState";

export default async function PatientsPage() {
  const patients = await listPatients();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Patients
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          People under your care. Open a profile to review progress and reminders.
        </p>
      </header>

      {patients.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            title="No patients yet"
            description="Create a patient profile to connect the mobile app and start monitoring."
          />
          <PatientsClient patients={[]} />
        </div>
      ) : (
        <PatientsClient patients={patients} />
      )}
    </div>
  );
}
