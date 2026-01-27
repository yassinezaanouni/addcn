# shadcn/ui Registry Examples Documentation

## Overview

This documentation covers examples of registry items for shadcn/ui, including styles, components, CSS variables, and more.

## Registry Item Types

### registry:style

**Custom style extending shadcn/ui:**

A style registry item can install dependencies, add blocks and components, reference remote registries, set font variables, and install brand colors for light and dark modes.

Example configuration installs `@tabler/icons-react`, adds the `login-01` block and `calendar` component, includes an `editor` from a remote registry, sets `font-sans` to `Inter, sans-serif`, and defines a `brand` color.

**Custom style from scratch:**

Create new styles using `"extends": "none"` to build independently from shadcn/ui defaults. This allows installing custom dependencies, adding specific components, and defining new CSS variables for `main`, `bg`, `border`, `text`, and `ring`.

### registry:theme

Define custom themes using oklch color space or other formats. Configure colors for both light and dark modes, including `background`, `foreground`, `primary`, `primary-foreground`, `ring`, `sidebar-primary`, and `sidebar-primary-foreground`.

**Custom colors:**

Add brand colors to the default shadcn/ui theme without full customization.

### registry:block

**Basic blocks:**

Blocks contain files with specific types and targets. A block can have registry dependencies on other components and specify files with paths and content.

**Override primitives:**

Install blocks from the shadcn/ui registry while replacing primitives with custom versions from remote registries.

## CSS Variables & Theming

### Custom Theme Variables

Add custom variables to the `theme` object for `font-heading`, `shadow-card`, spacing, and breakpoints (`breakpoint-sm`, `breakpoint-md`, `breakpoint-lg`, `breakpoint-xl`, `breakpoint-2xl`).

### Override Tailwind CSS Variables

Modify Tailwind spacing and breakpoint values within the theme configuration.

## Custom CSS

### Base Styles

Define styles for headings and other base elements using `@layer base` with CSS variable references.

### Components

Create component-level styles in the `@layer components` section for reusable styling patterns.

### Utilities

Simple utilities define single properties, while complex utilities support nested selectors. Functional utilities use wildcard syntax like `tab-*`.

## CSS Imports & Plugins

### CSS Imports

Add imports at the top of CSS files using `@import` syntax, including:

- Basic imports: `"@import \"tailwindcss\""`
- URL imports: `"@import url(\"https://fonts.googleapis.com/css2?family=Inter\")"`
- Media queries: `"@import \"print-styles.css\" print"`

### Tailwind Plugins

Use `@plugin` to add plugins. Include npm packages in the `dependencies` array. Plugins are automatically grouped, deduplicated, and ordered after imports.

Examples: `@tailwindcss/typography`, `@tailwindcss/forms`, scoped plugins, and file-based plugins.

## Custom Animations

Define animations by specifying both `@keyframes` in CSS and theme variables for `animate` values.

## Environment Variables

Use the `envVars` field to add development or example variables. Variables won't overwrite existing entries and should never contain production secrets.

## Universal Items

Framework-agnostic items require explicit targets for all files. Examples include custom Cursor rules, ESLint configs, or multi-file starter templates using `~/.target/path` syntax.
