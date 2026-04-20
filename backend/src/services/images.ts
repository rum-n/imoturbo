const maxImageBytes = 4 * 1024 * 1024;
const allowedTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export type OpenAIImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail: "low";
  };
};

function directImageUrl(rawUrl: string): boolean {
  try {
    return /\.(png|jpe?g|gif|webp)$/i.test(new URL(rawUrl).pathname);
  } catch {
    return false;
  }
}

async function fetchAsDataUrl(rawUrl: string): Promise<string | undefined> {
  const response = await fetch(rawUrl);
  if (!response.ok) return undefined;

  const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase();
  if (!contentType || !allowedTypes.has(contentType)) return undefined;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > maxImageBytes) return undefined;

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function buildImageContent(urls: string[] = []): Promise<OpenAIImageContent[]> {
  const uniqueUrls = Array.from(new Set(urls)).slice(0, 5);
  const images: OpenAIImageContent[] = [];

  for (const url of uniqueUrls) {
    if (directImageUrl(url)) {
      images.push({ type: "image_url", image_url: { url, detail: "low" } });
      continue;
    }

    try {
      const dataUrl = await fetchAsDataUrl(url);
      if (dataUrl) images.push({ type: "image_url", image_url: { url: dataUrl, detail: "low" } });
    } catch {
      // Some listing sites block direct image fetches. Text analysis should still continue.
    }
  }

  return images;
}
