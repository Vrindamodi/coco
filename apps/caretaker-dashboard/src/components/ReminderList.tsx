"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@coco/ui";
import { Check, Plus, Trash2 } from "lucide-react";

import type { Reminder, ReminderType } from "@coco/shared-types";

import { formatTime } from "@/lib/format-date";
import {
  createReminderAction,
  deleteReminderAction,
  updateReminderAction,
} from "@/server/actions";

const TYPE_LABELS: Record<ReminderType, string> = {
  medicine: "Medicine",
  hydration: "Hydration",
  activity: "Activity",
  appointment: "Appointment",
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReminderList({
  patientId,
  reminders,
}: {
  patientId: string;
  reminders: Reminder[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ReminderType>("medicine");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(new Date())
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setMessage("");
    setType("medicine");
    setScheduledAt(toLocalInputValue(new Date()));
    setShowForm(false);
    setError(null);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createReminderAction({
          patient_id: patientId,
          title: title.trim(),
          message: message.trim() || null,
          reminder_type: type,
          scheduled_at: new Date(scheduledAt).toISOString(),
        });
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create reminder");
      }
    });
  }

  function toggleDone(reminder: Reminder) {
    startTransition(async () => {
      await updateReminderAction(reminder.id, patientId, {
        is_done: !reminder.is_done,
      });
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteReminderAction(id, patientId);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Today&apos;s reminders</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {showForm ? "Cancel" : "Add"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <form
            onSubmit={onCreate}
            className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-mist)] p-4"
          >
            <div className="space-y-2">
              <Label htmlFor="reminder-title">Title</Label>
              <Input
                id="reminder-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reminder-type">Type</Label>
                <select
                  id="reminder-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ReminderType)}
                  className="flex h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  {(Object.keys(TYPE_LABELS) as ReminderType[]).map((key) => (
                    <option key={key} value={key}>
                      {TYPE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder-time">Scheduled</Label>
                <Input
                  id="reminder-time"
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-message">Message (optional)</Label>
              <Input
                id="reminder-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending ? "Saving…" : "Save reminder"}
            </Button>
          </form>
        ) : null}

        {reminders.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No reminders scheduled for today.
          </p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`font-medium ${
                        reminder.is_done
                          ? "text-[var(--color-muted-foreground)] line-through"
                          : "text-[var(--color-ink)]"
                      }`}
                    >
                      {reminder.title}
                    </p>
                    <Badge variant="default">
                      {TYPE_LABELS[reminder.reminder_type]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {formatTime(reminder.scheduled_at)}
                    {reminder.message ? ` · ${reminder.message}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={
                      reminder.is_done
                        ? `Mark ${reminder.title} not done`
                        : `Mark ${reminder.title} done`
                    }
                    disabled={pending}
                    onClick={() => toggleDone(reminder)}
                  >
                    <Check
                      className={`h-4 w-4 ${
                        reminder.is_done ? "text-[var(--color-sage)]" : ""
                      }`}
                      aria-hidden
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${reminder.title}`}
                    disabled={pending}
                    onClick={() => onDelete(reminder.id)}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--color-destructive)]" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
