/** Client + server: which dropped/selected files to send to upload APIs */
export function acceptImageFile(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (!t) return true;
  return (
    t.startsWith('image/') ||
    t === 'application/octet-stream' ||
    t === 'image/heic' ||
    t === 'image/heif' ||
    t === 'image/tiff' ||
    t === 'image/x-adobe-dng'
  );
}
