import type { VercelRequest, VercelResponse } from "@vercel/node";

const titlePattern = /<title[^>]*>([^<]+)<\/title>/i;
const descriptionPattern = /<meta\s+(?:name=["']description["']\s+content|content)=["']([^"']+)["'][^>]*>/i;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const url = String(request.body?.url ?? "");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    response.status(400).json({ error: "invalid_url" });
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    response.status(400).json({ error: "unsupported_protocol" });
    return;
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Shelfmark metadata bot" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await upstream.text();
    const domain = parsed.hostname.replace(/^www\./, "");
    response.json({
      domain,
      title: decodeHtml(titlePattern.exec(html)?.[1]?.trim() || domain),
      description: decodeHtml(descriptionPattern.exec(html)?.[1]?.trim() || ""),
      faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    });
  } catch {
    const domain = parsed.hostname.replace(/^www\./, "");
    response.json({
      domain,
      title: domain,
      description: "",
      faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    });
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
