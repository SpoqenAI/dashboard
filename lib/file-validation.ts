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
  'application/x-yaml', // .yaml/.yml (common)
  'text/yaml', // alternative yaml
  'application/yaml', // alternative yaml
  'application/json', // .json
  'application/xml', // .xml
  'text/xml', // alternative xml
]);

/** Infer a MIME type from a filename's extension */
export function inferMimeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.tsv')) return 'text/tab-separated-values';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml'))
    return 'application/x-yaml';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.xml')) return 'application/xml';
  if (lower.endsWith('.log')) return 'text/plain';
  return null;
}

/** Check if a MIME type is explicitly allowed */
export function isAllowedMime(mime: string | null | undefined): boolean {
  return Boolean(mime && ALLOWED_MIME_TYPES.has(mime));
}
