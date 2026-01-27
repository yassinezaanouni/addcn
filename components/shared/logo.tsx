import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        className="logo-mark"
        src="/logo.png"
        alt="Logo"
        width={32}
        height={32}
      />
      <span className="word-mark text-lg font-semibold tracking-tight">
        Addcn
      </span>
    </div>
  );
}
