/**
 * Plain text from a Reddit post body: drops the `![img](mediaId)` markers
 * rich-text posts use for embedded media, decodes common HTML entities and
 * tidies leftover blank lines.
 */
export const cleanPostBody = (body: string): string =>
  body
    .replace(/!\[(?:img|gif|video)\]\([^)]*\)/gi, '')
    .replace(/&#x200B;/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
