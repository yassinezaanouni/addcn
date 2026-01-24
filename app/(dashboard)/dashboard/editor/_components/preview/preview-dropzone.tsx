"use client";

import { useDropzone } from "react-dropzone";
import { IconUpload } from "@tabler/icons-react";

const ACCEPTED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

const SUPPORTED_FORMATS = ["JPG", "PNG", "WebP", "MP4", "WebM"];

interface PreviewDropzoneProps {
  onFileAccepted: (file: File) => void;
}

export function PreviewDropzone({ onFileAccepted }: PreviewDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) onFileAccepted(file);
    },
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        flex w-full max-w-sm cursor-pointer flex-col items-center justify-center
        rounded-2xl border-2 border-dashed p-8 transition-all hover:scale-[1.01] active:scale-[0.99]
        ${
          isDragActive
            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
        }
      `}
    >
      <input {...getInputProps()} />
      <div
        className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-colors ${
          isDragActive ? "bg-primary/10" : "bg-muted"
        }`}
      >
        <IconUpload
          className={`size-6 transition-colors ${
            isDragActive ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </div>
      <p className="text-base font-medium text-foreground">
        {isDragActive ? "Drop to upload" : "Upload Static Preview"}
      </p>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">
        Add an image or video preview
      </p>
      <div className="mt-4 flex gap-2">
        {SUPPORTED_FORMATS.map((fmt) => (
          <span
            key={fmt}
            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
}
