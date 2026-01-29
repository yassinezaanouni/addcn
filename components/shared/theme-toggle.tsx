"use client";

import { motion } from "motion/react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const sunPath =
  "M70 49.5C70 60.8218 60.8218 70 49.5 70C38.1782 70 29 60.8218 29 49.5C29 38.1782 38.1782 29 49.5 29C60 29 69.5 38 70 49.5Z";
const moonPath =
  "M70 49.5C70 60.8218 60.8218 70 49.5 70C38.1782 70 29 60.8218 29 49.5C29 38.1782 38.1782 29 49.5 29C39 45 49.5 59.5 70 49.5Z";

const shineVariant = {
  hidden: {
    opacity: 0,
    scale: 2,
    strokeDasharray: "20, 1000",
    strokeDashoffset: 0,
    filter: "blur(0px)",
  },
  visible: {
    opacity: [0, 1, 0],
    strokeDashoffset: [0, -50, -100],
    filter: ["blur(2px)", "blur(2px)", "blur(0px)"],
    transition: {
      duration: 0.75,
    },
  },
};

const raysVariants = {
  hidden: {
    strokeOpacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
  visible: {
    strokeOpacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const rayVariant = {
  hidden: { pathLength: 0, opacity: 0, scale: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      pathLength: { duration: 0.3 },
      opacity: { duration: 0.2 },
      scale: { duration: 0.3 },
    },
  },
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const toggleTheme = async () => {
    const newTheme = isDark ? "light" : "dark";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!("startViewTransition" in document) || prefersReducedMotion) {
      setTheme(newTheme);
      return;
    }

    document.documentElement.classList.add("theme-transition");

    const transition = (
      document as Document & {
        startViewTransition: (callback: () => void) => {
          finished: Promise<void>;
        };
      }
    ).startViewTransition(() => {
      setTheme(newTheme);
    });

    try {
      await transition.finished;
    } finally {
      document.documentElement.classList.remove("theme-transition");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <motion.svg
        strokeWidth="4"
        strokeLinecap="round"
        width={100}
        height={100}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative size-5"
      >
        <motion.path
          variants={shineVariant}
          d={moonPath}
          className="absolute top-0 left-0 stroke-blue-100"
          initial="hidden"
          animate={isDark ? "visible" : "hidden"}
        />

        <motion.g
          variants={raysVariants}
          initial="hidden"
          animate={isDark ? "hidden" : "visible"}
          className="stroke-yellow-500"
          style={{ strokeLinecap: "round", strokeWidth: 6 }}
        >
          <motion.path
            className="origin-center"
            variants={rayVariant}
            d="M50 2V11"
          />
          <motion.path variants={rayVariant} d="M85 15L78 22" />
          <motion.path variants={rayVariant} d="M98 50H89" />
          <motion.path variants={rayVariant} d="M85 85L78 78" />
          <motion.path variants={rayVariant} d="M50 98V89" />
          <motion.path variants={rayVariant} d="M23 78L16 84" />
          <motion.path variants={rayVariant} d="M11 50H2" />
          <motion.path variants={rayVariant} d="M23 23L16 16" />
        </motion.g>

        <motion.path
          d={sunPath}
          fill="transparent"
          transition={{ duration: 1, type: "spring" }}
          initial={{ fillOpacity: 0, strokeOpacity: 0, d: sunPath }}
          animate={{
            d: isDark ? moonPath : sunPath,
            rotate: isDark ? -360 : 0,
            scale: isDark ? 2 : 1,
            stroke: isDark
              ? "var(--color-blue-400)"
              : "var(--color-yellow-500)",
            fill: isDark ? "var(--color-blue-400)" : "var(--color-yellow-500)",
            fillOpacity: 0.35,
            strokeOpacity: 1,
            transition: { delay: 0.1 },
          }}
        />
      </motion.svg>
    </Button>
  );
}
