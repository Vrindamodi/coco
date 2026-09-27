import type { GameSession } from "@coco/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@coco/ui";

import { formatDateTime } from "@/lib/format-date";

const GAME_LABELS: Record<string, string> = {
  memory_match: "Memory match",
  sequence_recall: "Sequence recall",
  object_recognition: "Object recognition",
};

export function SessionTable({ sessions }: { sessions: GameSession[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent sessions</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No game sessions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-3 font-medium">Game</th>
                  <th className="pb-2 pr-3 font-medium">Score</th>
                  <th className="pb-2 pr-3 font-medium">Level</th>
                  <th className="pb-2 font-medium">Played</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="py-2.5 pr-3 text-[var(--color-foreground)]">
                      {GAME_LABELS[s.game_type] ?? s.game_type}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {s.score ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {s.difficulty_level}
                    </td>
                    <td className="py-2.5 text-[var(--color-muted-foreground)]">
                      {formatDateTime(s.played_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
