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
        flex w-full cursor-pointer flex-col items-center justify-center gap-2
        rounded-lg border-2 border-dashed px-3 py-5 text-center transition-all
        ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
        }
      `}
    >
      <input {...getInputProps()} />
      <div
        className={`flex size-9 items-center justify-center rounded-md transition-colors ${
          isDragActive ? "bg-primary/10" : "bg-muted"
        }`}
      >
        <IconUpload
          className={`size-4 transition-colors ${
            isDragActive ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </div>
      <p className="text-xs font-medium text-foreground">
        {isDragActive ? "Drop to upload" : "Upload image or video"}
      </p>
      <p className="text-[10px] text-muted-foreground">
        JPG · PNG · WebP · MP4 · WebM
      </p>
    </div>
  );
}
