"use client";

import { useRef, useState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@coco/ui";
import { Plus, Upload } from "lucide-react";

import type {
  MediaType,
  MyWorldCategory,
  UploadResourceType,
} from "@coco/shared-types";

import { createMemoryAction, getUploadSignatureAction } from "@/server/actions";

const CATEGORY_LABELS: Record<MyWorldCategory, string> = {
  person: "Person",
  place: "Place",
  object: "Object",
  event: "Event",
  moment: "Moment",
};

const MEDIA_LABELS: Record<MediaType, string> = {
  photo: "Photo",
  video: "Video",
  audio: "Voice note",
  note: "Written note",
};

const RESOURCE_TYPE: Record<MediaType, UploadResourceType> = {
  photo: "image",
  video: "video",
  audio: "video", // Cloudinary serves audio through its video pipeline
  note: "raw",
};

const ACCEPT: Record<MediaType, string> = {
  photo: "image/*",
  video: "video/*",
  audio: "audio/*",
  note: "",
};

type CloudinaryResult = {
  secure_url: string;
  bytes?: number;
};

/** Cloudinary can derive a poster frame from a video by URL alone. */
function posterFrame(secureUrl: string): string | null {
  if (!secureUrl.includes("/video/upload/")) return null;
  return secureUrl
    .replace("/video/upload/", "/video/upload/so_0,w_600,c_fill/")
    .replace(/\.[^./]+$/, ".jpg");
}

function uploadToCloudinary(
  file: File,
  signature: NonNullable<Awaited<ReturnType<typeof getUploadSignatureAction>>>,
  onProgress: (percent: number) => void
): Promise<CloudinaryResult> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signature.api_key);
    body.append("timestamp", String(signature.timestamp));
    body.append("signature", signature.signature);
    body.append("folder", signature.folder);
    body.append("public_id", signature.public_id);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", signature.upload_url);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryResult);
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    });
    xhr.addEventListener("error", () =>
      reject(new Error("Upload failed. Check your connection."))
    );
    xhr.send(body);
  });
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function AddMemoryForm({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MyWorldCategory>("event");
  const [mediaType, setMediaType] = useState<MediaType>("photo");
  const [story, setStory] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [people, setPeople] = useState("");
  const [tags, setTags] = useState("");
  const [isFavourite, setIsFavourite] = useState(false);
  const [pastedUrl, setPastedUrl] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const needsMedia = mediaType !== "note";

  function reset() {
    setName("");
    setCategory("event");
    setMediaType("photo");
    setStory("");
    setMemoryDate("");
    setPeople("");
    setTags("");
    setIsFavourite(false);
    setPastedUrl("");
    setProgress(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileRef.current?.files?.[0] ?? null;
    if (needsMedia && !file && !pastedUrl.trim()) {
      setError("Choose a file to upload, or paste a media URL.");
      return;
    }

    startTransition(async () => {
      try {
        let mediaUrl = pastedUrl.trim() || null;
        let thumbnail: string | null = null;
        let bytes: number | null = null;

        if (file) {
          setProgress(0);
          const signature = await getUploadSignatureAction(
            patientId,
            RESOURCE_TYPE[mediaType],
            file.name
          );

          if (!signature) {
            setProgress(null);
            setError(
              "Media uploads are not configured on the server. Paste a media URL instead."
            );
            return;
          }

          const uploaded = await uploadToCloudinary(file, signature, setProgress);
          mediaUrl = uploaded.secure_url;
          bytes = uploaded.bytes ?? null;
          setProgress(100);
        }

        if (mediaType === "video" && mediaUrl) {
          thumbnail = posterFrame(mediaUrl);
        }

        const isImage = mediaType === "photo";

        await createMemoryAction(patientId, {
          category,
          name: name.trim(),
          story: story.trim() || null,
          media_type: mediaType,
          photo_uri: isImage ? mediaUrl : thumbnail,
          media_uri: isImage ? null : mediaUrl,
          thumbnail_uri: isImage ? mediaUrl : thumbnail,
          media_bytes: bytes,
          memory_date: memoryDate || null,
          people: splitList(people),
          tags: splitList(tags),
          is_favourite: isFavourite,
        });

        reset();
      } catch (err) {
        setProgress(null);
        setError(err instanceof Error ? err.message : "Could not save memory");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Add a memory</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {open ? "Cancel" : "Add"}
        </Button>
      </CardHeader>

      {open ? (
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memory-name">Title</Label>
              <Input
                id="memory-name"
                required
                placeholder="Bihu at the village"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="memory-category">Category</Label>
                <select
                  id="memory-category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as MyWorldCategory)
                  }
                  className="flex h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  {(Object.keys(CATEGORY_LABELS) as MyWorldCategory[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {CATEGORY_LABELS[key]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="memory-media-type">Kind</Label>
                <select
                  id="memory-media-type"
                  value={mediaType}
                  onChange={(e) => {
                    setMediaType(e.target.value as MediaType);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="flex h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  {(Object.keys(MEDIA_LABELS) as MediaType[]).map((key) => (
                    <option key={key} value={key}>
                      {MEDIA_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="memory-date">When (optional)</Label>
                <Input
                  id="memory-date"
                  type="date"
                  value={memoryDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                />
              </div>
            </div>

            {needsMedia ? (
              <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-mist)] p-4">
                <div className="space-y-2">
                  <Label htmlFor="memory-file">
                    <span className="inline-flex items-center gap-2">
                      <Upload className="h-4 w-4" aria-hidden />
                      Upload {MEDIA_LABELS[mediaType].toLowerCase()}
                    </span>
                  </Label>
                  <input
                    id="memory-file"
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT[mediaType]}
                    className="block w-full text-sm text-[var(--color-muted-foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memory-url">…or paste a media URL</Label>
                  <Input
                    id="memory-url"
                    type="url"
                    placeholder="https://…"
                    value={pastedUrl}
                    onChange={(e) => setPastedUrl(e.target.value)}
                  />
                </div>

                {progress !== null ? (
                  <div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Upload progress"
                    >
                      <div
                        className="h-full bg-[var(--color-primary)] transition-[width]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Uploading… {progress}%
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="memory-story">
                The story (read aloud to the patient)
              </Label>
              <textarea
                id="memory-story"
                rows={4}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Every spring the courtyard filled up for Bihu…"
                className="flex w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="memory-people">People (comma separated)</Label>
                <Input
                  id="memory-people"
                  placeholder="Priya, Rohan"
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memory-tags">Tags (comma separated)</Label>
                <Input
                  id="memory-tags"
                  placeholder="festival, village"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
              <input
                type="checkbox"
                checked={isFavourite}
                onChange={(e) => setIsFavourite(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--color-border)]"
              />
              Show this first in My World
            </label>

            {error ? (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Saving…" : "Save memory"}
            </Button>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}
