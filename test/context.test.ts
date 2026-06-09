import { contextParts } from '../nodes/Emboss/context';

describe('contextParts', () => {
  it('wraps text into a context.txt part', () => {
    const parts = contextParts('hello', undefined);
    expect(parts).toEqual([
      { value: Buffer.from('hello', 'utf8'), filename: 'context.txt', contentType: 'text/plain' },
    ]);
  });
  it('adds a context file part with its real filename + mime', () => {
    const buf = Buffer.from('PDFBYTES');
    const parts = contextParts(undefined, { buffer: buf, filename: 'w9.pdf', mimeType: 'application/pdf' });
    expect(parts).toEqual([{ value: buf, filename: 'w9.pdf', contentType: 'application/pdf' }]);
  });
  it('includes both when text + file are given', () => {
    const parts = contextParts('t', { buffer: Buffer.from('x'), filename: 'a.csv', mimeType: 'text/csv' });
    expect(parts.length).toBe(2);
  });
  it('returns [] when neither is given', () => {
    expect(contextParts(undefined, undefined)).toEqual([]);
    expect(contextParts('', undefined)).toEqual([]);
  });
});
