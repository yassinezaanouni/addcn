'use client';

import { motion as m } from 'motion/react';
import { useTheme } from 'next-themes';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!document.startViewTransition || prefersReducedMotion) {
      setTheme(newTheme);
      return;
    }

    const transitionClass = 'vertical-wipe-transition';
    document.documentElement.classList.add(transitionClass);

    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
    });

    try {
      await transition.finished;
    } finally {
      document.documentElement.classList.remove(transitionClass);
    }
  };

  const shineVariant = {
    hidden: {
      opacity: 0,
      scale: 2,
      strokeDasharray: '20, 1000',
      strokeDashoffset: 0,
      filter: 'blur(0px)',
    },
    visible: {
      opacity: [0, 1, 0],
      strokeDashoffset: [0, -50, -100],
      filter: ['blur(2px)', 'blur(2px)', 'blur(0px)'],
      transition: {
        duration: 0.75,
      },
    },
  };

  const raysVariants = {
    hidden: {
      strokeOpacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
    visible: {
      strokeOpacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const rayVariant = {
    hidden: {
      pathLength: 0,
      opacity: 0,
      scale: 0,
    },
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

  const sunPath =
    'M70 49.5C70 60.8218 60.8218 70 49.5 70C38.1782 70 29 60.8218 29 49.5C29 38.1782 38.1782 29 49.5 29C60 29 69.5 38 70 49.5Z';
  const moonPath =
    'M70 49.5C70 60.8218 60.8218 70 49.5 70C38.1782 70 29 60.8218 29 49.5C29 38.1782 38.1782 29 49.5 29C39 45 49.5 59.5 70 49.5Z';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-theme-toggle
      ref={buttonRef}
    >
      <m.svg
        strokeWidth="4"
        strokeLinecap="round"
        width={100}
        height={100}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative size-5"
      >
        {/* Moon shine effect */}
        <m.path
          variants={shineVariant}
          d={moonPath}
          className="absolute top-0 left-0 stroke-blue-400"
          initial="hidden"
          animate={theme === 'dark' ? 'visible' : 'hidden'}
        />

        {/* Sun rays */}
        <m.g
          variants={raysVariants}
          initial="hidden"
          animate={theme === 'light' ? 'visible' : 'hidden'}
          className="stroke-yellow-500"
          style={{ strokeLinecap: 'round', strokeWidth: 6 }}
        >
          <m.path className="origin-center" variants={rayVariant} d="M50 2V11" />
          <m.path variants={rayVariant} d="M85 15L78 22" />
          <m.path variants={rayVariant} d="M98 50H89" />
          <m.path variants={rayVariant} d="M85 85L78 78" />
          <m.path variants={rayVariant} d="M50 98V89" />
          <m.path variants={rayVariant} d="M23 78L16 84" />
          <m.path variants={rayVariant} d="M11 50H2" />
          <m.path variants={rayVariant} d="M23 23L16 16" />
        </m.g>

        {/* Sun/Moon body */}
        <m.path
          d={sunPath}
          fill="transparent"
          transition={{ duration: 1, type: 'spring' }}
          initial={{ fillOpacity: 0, strokeOpacity: 0, d: sunPath }}
          animate={{
            d: theme === 'dark' ? moonPath : sunPath,
            rotate: theme === 'dark' ? -360 : 0,
            scale: theme === 'dark' ? 2 : 1,
            stroke: theme === 'dark' ? '#60a5fa' : '#eab308', // blue-400, yellow-500
            fill: theme === 'dark' ? '#60a5fa' : '#eab308',
            fillOpacity: 0.35,
            strokeOpacity: 1,
            transition: { delay: 0.1 },
          }}
        />
      </m.svg>
    </Button>
  );
}
