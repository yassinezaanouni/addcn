/**
 * Transform CSS for iframe preview
 */
export function transformCss(rawCss: string): string {
  return rawCss
    // Remove @import statements
    .replace(/@import\s+["'][^"']+["'];?\s*/g, "")
    // Remove @custom-variant (handled by CDN config)
    .replace(/@custom-variant[^;]+;?\s*/g, "")
    // Remove @theme blocks (we'll define theme in iframe)
    .replace(/@theme\s+inline\s*\{[\s\S]*?\n\}/g, "");
}

/**
 * Extract component name from code
 */
export function getComponentName(code: string): string {
  // Look for export default function ComponentName
  const defaultFuncMatch = code.match(/export\s+default\s+function\s+(\w+)/);
  if (defaultFuncMatch) return defaultFuncMatch[1];

  // Look for function ComponentName followed by export default
  const funcMatch = code.match(/function\s+(\w+)\s*\(/);
  if (funcMatch) return funcMatch[1];

  // Look for const ComponentName =
  const constMatch = code.match(/(?:export\s+)?const\s+(\w+)\s*=/);
  if (constMatch) return constMatch[1];

  return "Component";
}

/**
 * Remove imports from code (handles single and multiline imports)
 */
export function removeImports(code: string): string {
  const lines = code.split("\n");
  const filteredLines: string[] = [];
  let inMultilineImport = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if we're starting a multiline import
    if (trimmed.startsWith("import ") && !trimmed.includes(" from ")) {
      inMultilineImport = true;
      continue;
    }

    // Check if we're ending a multiline import
    if (inMultilineImport) {
      if (trimmed.includes(" from ")) {
        inMultilineImport = false;
      }
      continue;
    }

    // Skip single-line imports
    if (trimmed.startsWith("import ")) {
      continue;
    }

    filteredLines.push(line);
  }

  return filteredLines.join("\n");
}

/**
 * Strip TypeScript syntax from code (Babel react preset doesn't handle TS)
 */
export function stripTypescript(code: string): string {
  let result = code;
  // Remove type annotations after colons (: Type)
  result = result.replace(/:\s*[A-Z][a-zA-Z0-9<>,\s\[\]|&]*(?=\s*[=,\)\}\]])/g, "");
  // Remove generic type parameters on function calls like useRef<Type>(
  result = result.replace(/(<[A-Z][a-zA-Z0-9<>,\s\[\]|&]*>)(\s*\()/g, "$2");
  // Remove type assertions (as Type)
  result = result.replace(/\s+as\s+[A-Z][a-zA-Z0-9<>,\s\[\]|&]*/g, "");
  // Remove interface and type declarations
  result = result.replace(
    /^(interface|type)\s+\w+[\s\S]*?(?=\n\n|\nexport|\nfunction|\nconst|\nclass)/gm,
    ""
  );
  // Remove generic type parameters on function declarations
  result = result.replace(/function\s+(\w+)\s*<[^>]+>/g, "function $1");
  // Remove React.FC and similar type annotations
  result = result.replace(/:\s*React\.\w+<[^>]*>/g, "");
  // Remove standalone type imports that might have been missed
  result = result.replace(/^type\s+\{[^}]+\}\s*=.*$/gm, "");
  return result;
}

/**
 * Transform a component file for preview (removes imports, exports, TS syntax)
 */
export function transformComponentCode(code: string): string {
  let transformed = code;

  // Remove "use client" directive
  transformed = transformed.replace(/["']use client["'];?/g, "");

  // Remove imports
  transformed = removeImports(transformed);

  // Remove export keywords
  transformed = transformed.replace(/export\s+default\s+/g, "");
  transformed = transformed.replace(/export\s+/g, "");

  // Strip TypeScript syntax
  transformed = stripTypescript(transformed);

  return transformed;
}
