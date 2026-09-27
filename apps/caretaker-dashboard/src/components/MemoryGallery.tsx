"use client";

import { useTransition } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@coco/ui";
import { FileText, Film, Mic, Star, Trash2 } from "lucide-react";

import type { MediaType, MyWorldCategory, MyWorldItem } from "@coco/shared-types";

import { formatDate } from "@/lib/format-date";
import { deleteMemoryAction, updateMemoryAction } from "@/server/actions";

const CATEGORY_LABELS: Record<MyWorldCategory, string> = {
  person: "Person",
  place: "Place",
  object: "Object",
  event: "Event",
  moment: "Moment",
};

const MEDIA_ICONS: Record<Exclude<MediaType, "photo">, typeof Film> = {
  video: Film,
  audio: Mic,
  note: FileText,
};

function MemoryCard({
  item,
  pending,
  onToggleFavourite,
  onDelete,
}: {
  item: MyWorldItem;
  pending: boolean;
  onToggleFavourite: (item: MyWorldItem) => void;
  onDelete: (item: MyWorldItem) => void;
}) {
  const preview = item.thumbnail_uri ?? item.photo_uri;
  const Icon = item.media_type === "photo" ? null : MEDIA_ICONS[item.media_type];
  const when = formatDate(item.memory_date);

  return (
    <li className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
      <div className="relative flex h-40 items-center justify-center bg-[var(--color-mist)]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- media lives on Cloudinary, not in /public
          <img
            src={preview}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : Icon ? (
          <Icon
            className="h-10 w-10 text-[var(--color-muted-foreground)]"
            aria-hidden
          />
        ) : null}

        {item.media_type !== "photo" && preview ? (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
            {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
            {item.media_type === "video" ? "Video" : "Voice note"}
          </span>
        ) : null}
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 font-medium text-[var(--color-ink)]">
            {item.name}
          </p>
          <div className="flex shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-pressed={item.is_favourite}
              aria-label={
                item.is_favourite
                  ? `Unpin ${item.name}`
                  : `Show ${item.name} first`
              }
              onClick={() => onToggleFavourite(item)}
            >
              <Star
                className={`h-4 w-4 ${
                  item.is_favourite
                    ? "fill-[var(--color-warning)] text-[var(--color-warning)]"
                    : "text-[var(--color-muted-foreground)]"
                }`}
                aria-hidden
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`Delete ${item.name}`}
              onClick={() => onDelete(item)}
            >
              <Trash2
                className="h-4 w-4 text-[var(--color-destructive)]"
                aria-hidden
              />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{CATEGORY_LABELS[item.category]}</Badge>
          {when ? (
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {when}
            </span>
          ) : null}
        </div>

        {item.story ? (
          <p className="line-clamp-3 text-sm text-[var(--color-muted-foreground)]">
            {item.story}
          </p>
        ) : null}

        <p className="text-xs text-[var(--color-muted-foreground)]">
          Viewed {item.times_shown}× · remembered {item.remembered_count}×
          {item.last_viewed_at
            ? ` · last ${formatDate(item.last_viewed_at) ?? ""}`
            : ""}
        </p>
      </div>
    </li>
  );
}

export function MemoryGallery({
  patientId,
  items,
}: {
  patientId: string;
  items: MyWorldItem[];
}) {
  const [pending, startTransition] = useTransition();

  function onToggleFavourite(item: MyWorldItem) {
    startTransition(async () => {
      await updateMemoryAction(patientId, item.id, {
        is_favourite: !item.is_favourite,
      });
    });
  }

  function onDelete(item: MyWorldItem) {
    startTransition(async () => {
      await deleteMemoryAction(patientId, item.id);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">My World</CardTitle>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {items.length} {items.length === 1 ? "memory" : "memories"} · synced to
          the patient&apos;s phone for offline use
        </span>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No memories yet. Add photos, videos, voice notes or written stories
            so they are there when the patient opens My World.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <MemoryCard
                key={item.id}
                item={item}
                pending={pending}
                onToggleFavourite={onToggleFavourite}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
