"use client";

import { useEffect } from "react";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === "dark" || (theme === "system" && systemDark)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        const root = document.documentElement;
        if (mediaQuery.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme}>
      {theme === "light" && <IconSun className="size-4" />}
      {theme === "dark" && <IconMoon className="size-4" />}
      {theme === "system" && <IconDeviceDesktop className="size-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
