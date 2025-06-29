import * as cheerio from "cheerio";

// 设置超时时间（毫秒）
const FETCH_TIMEOUT = 5000; // 5 秒

export interface Metadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  type?: string;
  siteName?: string;
  locale?: string;
}

export const validateUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    // 只允许 http 和 https 协议
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

// 处理相对路径，转换为绝对路径
function resolveUrl(baseUrl: string, relativePath: string | undefined): string | undefined {
  if (!relativePath) return undefined;
  try {
    // 如果已经是完整的 URL，直接返回
    new URL(relativePath);
    return relativePath;
  } catch {
    // 如果是相对路径，则与基础 URL 组合
    try {
      const base = new URL(baseUrl);
      // 处理 // 开头的协议相对路径
      if (relativePath.startsWith('//')) {
        return `${base.protocol}${relativePath}`;
      }
      // 处理 / 开头的绝对路径
      if (relativePath.startsWith('/')) {
        return `${base.protocol}//${base.host}${relativePath}`;
      }
      // 处理相对路径
      return new URL(relativePath, base).toString();
    } catch {
      return undefined;
    }
  }
}

export const extractMetadata = async (url: string): Promise<Metadata> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const rawImage = $('meta[property="og:image"]').attr("content");
    const rawFavicon =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href");

    const metadata: Metadata = {
      title:
        $('meta[property="og:title"]').attr("content") || $("title").text(),
      description:
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content"),
      image: resolveUrl(url, rawImage),
      favicon: resolveUrl(url, rawFavicon),
      type: $('meta[property="og:type"]').attr("content"),
      siteName: $('meta[property="og:site_name"]').attr("content"),
      locale: $('meta[property="og:locale"]').attr("content"),
    };

    return metadata;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
};
