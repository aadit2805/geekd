/** Strip HTML tags and limit length. */
export const sanitizeText = (text: string | null | undefined, maxLength = 1000): string | null => {
  if (!text) return null;
  return text.replace(/<[^>]*>/g, '').substring(0, maxLength);
};

/** Validate image URL — only allows data:image/* and http(s) URLs. */
export const sanitizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.substring(0, 2000);
  }
  return null;
};
