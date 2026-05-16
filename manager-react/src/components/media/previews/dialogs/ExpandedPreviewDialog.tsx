"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { ScrollArea } from "../../../ui/scroll-area";
import { Skeleton } from "../../../ui/skeleton";
import {
  FileTypeIcon,
  formatFileSize,
  formatPercent,
  isImage,
  isVideo,
} from "../utils/mediaPreview";

import type { MediaRecord } from "@/lib/media";

type ExpandedPreviewDialogProps = {
  preview: MediaRecord | null;
  previewUrl: string;
  isSaving?: boolean;
  onClose: () => void;
  onSaveDetails: (input: {
    name: string;
    title: string;
    alt: string;
  }) => Promise<void>;
};

export default function ExpandedPreviewDialog({
  preview,
  previewUrl,
  isSaving = false,
  onClose,
  onSaveDetails,
}: ExpandedPreviewDialogProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");

  useEffect(() => {
    setName(preview?.name || "");
    setTitle(preview?.title || "");
    setAlt(preview?.alt || "");
  }, [preview?._id, preview?.title, preview?.name, preview?.alt]);

  const hasChanges =
    !!preview &&
    (name.trim() !== (preview.name || "") ||
      title.trim() !== (preview.title || "") ||
      alt.trim() !== (preview.alt || ""));

  return (
    <Dialog
      open={!!preview}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[95vw] p-4 sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="truncate">
            {preview?.name || preview?.title || "Preview"}
          </DialogTitle>
          <DialogDescription className="truncate">
            {preview ? `${preview.mime} • ${formatFileSize(preview.size)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[85vh] min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-h-[55vh] items-center justify-center overflow-hidden rounded-md border bg-muted/30 lg:min-h-[70vh]">
            {!preview || !previewUrl ? (
              <Skeleton className="h-full w-full" />
            ) : isImage(preview.mime) ? (
              <img
                src={previewUrl}
                alt={preview.alt || preview.title || preview.name}
                className="h-full w-full object-contain"
              />
            ) : isVideo(preview.mime) ? (
              <video
                src={previewUrl}
                controls
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="rounded-full border p-3 text-muted-foreground">
                  <FileTypeIcon mime={preview.mime} />
                </div>
                <p className="text-muted-foreground text-sm">
                  This file type does not have inline preview.
                </p>
                <Button asChild variant="outline">
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                    Open file
                  </a>
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="min-h-0 rounded-md border">
            {preview ? (
              <div className="space-y-4 p-3 text-sm">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="media-name">Name</Label>
                    <Input
                      id="media-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="media-title">Title</Label>
                    <Input
                      id="media-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="media-alt">Alt</Label>
                    <Input
                      id="media-alt"
                      value={alt}
                      onChange={(event) => setAlt(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!hasChanges || isSaving}
                    onClick={() => {
                      void onSaveDetails({
                        name: name.trim(),
                        title: title.trim(),
                        alt: alt.trim(),
                      });
                    }}
                  >
                    Save
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs">MIME</p>
                    <p className="font-medium break-all">{preview.mime}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Size</p>
                    <p className="font-medium">
                      {formatFileSize(preview.size)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Original Size
                    </p>
                    <p className="font-medium">
                      {preview.originalSize != null
                        ? formatFileSize(preview.originalSize)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Dimensions</p>
                    <p className="font-medium">
                      {preview.width && preview.height
                        ? `${preview.width}x${preview.height}`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Orientation</p>
                    <p className="font-medium">
                      {preview.orientation || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Optimization
                    </p>
                    <p className="font-medium">
                      {preview.optimized
                        ? `Yes${preview.optimizedFormat ? ` (${preview.optimizedFormat})` : ""}`
                        : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Quality</p>
                    <p className="font-medium">
                      {preview.optimizationQuality != null
                        ? preview.optimizationQuality
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Preview Variant
                    </p>
                    <p className="font-medium">
                      {preview.previewUrl || preview.previewKey
                        ? "Available"
                        : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Saved</p>
                    <p className="font-medium">
                      {preview.originalSize &&
                      preview.originalSize > preview.size
                        ? `${formatFileSize(preview.originalSize - preview.size)} (${formatPercent(((preview.originalSize - preview.size) / preview.originalSize) * 100)})`
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">Responsive sizes</p>
                  {preview.sizes?.length ? (
                    <div className="space-y-2">
                      {preview.sizes.map((size) => (
                        <div
                          key={size.key}
                          className="rounded-md border p-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{size.width}w</span>
                            <span className="text-muted-foreground">
                              {formatFileSize(size.size)}
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            {size.width}x{size.height}
                          </p>
                          <p className="truncate text-muted-foreground">
                            {size.mime}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">N/A</p>
                  )}
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
