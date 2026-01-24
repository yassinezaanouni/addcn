/**
 * Import analyzer for preview panel.
 * Detects which imports are supported by the live preview and which aren't.
 */

/**
 * List of supported import sources in the live preview.
 * These are either built into the preview iframe or stubbed.
 */
const SUPPORTED_IMPORTS = new Set([
  // React core
  "react",
  "react-dom",
  "react-dom/client",

  // Animation
  "motion/react",
  "framer-motion",

  // Styling utilities (implemented in preview)
  "clsx",
  "class-variance-authority",
  "tailwind-merge",

  // Base UI primitives (stubbed in preview)
  "@base-ui-components/react",
  "@base-ui-components/react/button",
  "@base-ui-components/react/input",
  "@base-ui-components/react/separator",
  "@base-ui-components/react/tabs",
  "@base-ui-components/react/dialog",
  "@base-ui-components/react/tooltip",
  "@base-ui-components/react/select",
  "@base-ui-components/react/menu",
  "@base-ui-components/react/scroll-area",
  "@base-ui-components/react/avatar",
]);

/**
 * Patterns for imports that are always supported (relative, alias, etc.)
 */
const SUPPORTED_PATTERNS = [
  /^\.\.?\//,        // Relative imports (./foo, ../bar)
  /^@\//,            // Alias imports (@/components)
];

/**
 * Parse imports from source code.
 */
function parseImports(code: string): string[] {
  const imports: string[] = [];
  const lines = code.split("\n");

  let inMultilineImport = false;
  let currentImport = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle multiline imports
    if (inMultilineImport) {
      currentImport += " " + trimmed;
      if (trimmed.includes(" from ")) {
        const match = currentImport.match(/from\s+["']([^"']+)["']/);
        if (match) {
          imports.push(match[1]);
        }
        inMultilineImport = false;
        currentImport = "";
      }
      continue;
    }

    // Check for import statement
    if (!trimmed.startsWith("import ")) continue;

    // Check if it's a multiline import (no "from" on same line)
    if (!trimmed.includes(" from ")) {
      inMultilineImport = true;
      currentImport = trimmed;
      continue;
    }

    // Single-line import
    const match = trimmed.match(/from\s+["']([^"']+)["']/);
    if (match) {
      imports.push(match[1]);
    }
  }

  return imports;
}

/**
 * Check if an import source is supported in the preview.
 */
function isImportSupported(importPath: string): boolean {
  // Check exact matches
  if (SUPPORTED_IMPORTS.has(importPath)) {
    return true;
  }

  // Check patterns (relative imports, aliases)
  for (const pattern of SUPPORTED_PATTERNS) {
    if (pattern.test(importPath)) {
      return true;
    }
  }

  // Check if it's a subpath of a supported import
  for (const supported of SUPPORTED_IMPORTS) {
    if (importPath.startsWith(supported + "/")) {
      return true;
    }
  }

  return false;
}

export interface ImportAnalysisResult {
  supported: string[];
  unsupported: string[];
  hasUnsupported: boolean;
}

/**
 * Analyze imports in source code and categorize them as supported or unsupported.
 */
export function analyzeImports(code: string): ImportAnalysisResult {
  const allImports = parseImports(code);
  const supported: string[] = [];
  const unsupported: string[] = [];

  for (const importPath of allImports) {
    if (isImportSupported(importPath)) {
      supported.push(importPath);
    } else {
      unsupported.push(importPath);
    }
  }

  // Remove duplicates
  const uniqueUnsupported = [...new Set(unsupported)];
  const uniqueSupported = [...new Set(supported)];

  return {
    supported: uniqueSupported,
    unsupported: uniqueUnsupported,
    hasUnsupported: uniqueUnsupported.length > 0,
  };
}

/**
 * Analyze imports across multiple files.
 */
export function analyzeMultipleFiles(
  files: Array<{ path: string; content: string }>
): ImportAnalysisResult {
  const allSupported: string[] = [];
  const allUnsupported: string[] = [];

  for (const file of files) {
    // Only analyze TypeScript/JavaScript files
    if (!file.path.match(/\.(tsx?|jsx?)$/)) continue;

    const result = analyzeImports(file.content);
    allSupported.push(...result.supported);
    allUnsupported.push(...result.unsupported);
  }

  // Remove duplicates
  const uniqueUnsupported = [...new Set(allUnsupported)];
  const uniqueSupported = [...new Set(allSupported)];

  return {
    supported: uniqueSupported,
    unsupported: uniqueUnsupported,
    hasUnsupported: uniqueUnsupported.length > 0,
  };
}
