/**
 * Shared file validation utilities for consistent client & server behavior.
 */

/** Allowed MIME types for uploads */
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set<string>([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/csv', // .csv
  'text/markdown', // .md
  'text/tab-separated-values', // .tsv
  // YAML: different clients/browsers/backends emit different YAML MIME variants.
  // Keep support for all three to avoid accidental breakage in uploads coming from
  // various sources (e.g., browser drag-and-drop, server-side parsers, CLI tools).
  'application/x-yaml', // common/non-standard variant seen in many libs
  'text/yaml', // some browsers/HTTP libs label YAML as text/yaml
  'application/yaml', // alternative emitted by certain backends
  'application/json', // .json
  // XML: both application/xml and text/xml appear in the wild, with text/xml used
  // by older/legacy UAs and some libraries. Support both for compatibility.
  'application/xml', // preferred modern XML type
  'text/xml', // legacy/alternative XML type
]);

/** Lookup table from file extension to MIME type. Extensions must be lowercase. */
const EXT_TO_MIME: Readonly<Record<string, string>> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.tsv': 'text/tab-separated-values',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.log': 'text/plain',
} as const;

/** Infer a MIME type from a filename's extension */
export function inferMimeFromFilename(filename: string): string | null {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  return EXT_TO_MIME[ext] ?? null;
}

/** Check if a MIME type is explicitly allowed */
export function isAllowedMime(mime: string | null | undefined): boolean {
  return Boolean(mime && ALLOWED_MIME_TYPES.has(mime));
}
