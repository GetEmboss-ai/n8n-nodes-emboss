export interface ContextFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}
export interface ContextPart {
  value: Buffer;
  filename: string;
  contentType: string;
}

// Build the `context` multipart file parts. The Emboss endpoints take `context` as a FILE list (a
// bare text form field 422s), so typed text is wrapped as a context.txt part, and an optional context
// file carries its real filename + mime so the backend's _resolve_kind accepts it. Both may be present.
export function contextParts(contextText?: string, contextFile?: ContextFile): ContextPart[] {
  const parts: ContextPart[] = [];
  if (contextText) {
    parts.push({ value: Buffer.from(contextText, 'utf8'), filename: 'context.txt', contentType: 'text/plain' });
  }
  if (contextFile && contextFile.buffer) {
    parts.push({ value: contextFile.buffer, filename: contextFile.filename || 'context', contentType: contextFile.mimeType || 'application/octet-stream' });
  }
  return parts;
}
