// Browser-only: shrink an image file to a JPEG data URL under ~600 KB.
export async function fileToCompressedDataUrl(file: File, maxBytes = 600_000): Promise<string> {
  const bmp = await createImageBitmap(file);
  let scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  let q = 0.85;
  for (let i = 0; i < 8; i++) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", q);
    if (Math.floor((url.length - 23) * 0.75) <= maxBytes) return url;
    q -= 0.1; scale *= 0.85;
  }
  throw new Error("Image too large");
}
