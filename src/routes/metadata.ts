import { Hono } from "hono";
import { CACHE_TTL, generateCacheKey, redis } from "../db";
import { metadataSchema } from "../types";
import { extractMetadata, validateUrl } from "../utils/metadata";
import { ERROR_CODES } from "../constants/error-codes";
import { sendSuccess, sendError, getErrorMessage } from "../utils/response";

export const metadataRouter = new Hono();

// 验证必要的元数据字段
function validateMetadata(metadata: any) {
  console.log("metadata", metadata);
  const requiredFields = ["title", "image"];
  const missingFields = requiredFields.filter((field) => !metadata[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required metadata: ${missingFields.join(", ")}`);
  }

  return true;
}

// URL metadata parse endpoint
metadataRouter.post("/parse", async (c) => {
  try {
    const { url } = await c.req.json();

    console.log("url", url);

    // 验证 URL 格式
    try {
      await metadataSchema.parseAsync({ url });
    } catch (error) {
      return sendError(
        c,
        ERROR_CODES.METADATA_INVALID_URL,
        getErrorMessage(ERROR_CODES.METADATA_INVALID_URL)
      );
    }

    if (!validateUrl(url)) {
      return sendError(
        c,
        ERROR_CODES.METADATA_INVALID_URL,
        getErrorMessage(ERROR_CODES.METADATA_INVALID_URL)
      );
    }

    const cacheKey = generateCacheKey(url);

    try {
      // 尝试从缓存获取数据
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // 验证缓存的数据是否包含所有必要字段
        validateMetadata(parsedData);
        return sendSuccess(c, parsedData);
      }

      // 如果缓存中没有，则解析元数据
      const metadata = await extractMetadata(url);

      // 验证获取的元数据是否包含所有必要字段
      validateMetadata(metadata);

      const resultData = {
        url,
        ...metadata,
        cachedAt: new Date().toISOString(),
      };

      // 保存到 Redis 并设置过期时间
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(resultData));

      return sendSuccess(c, resultData);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Request timeout") {
          return sendError(
            c,
            ERROR_CODES.METADATA_REQUEST_TIMEOUT,
            getErrorMessage(ERROR_CODES.METADATA_REQUEST_TIMEOUT)
          );
        }
        if (error.message.includes("Redis")) {
          return sendError(
            c,
            ERROR_CODES.METADATA_CACHE_UNAVAILABLE,
            getErrorMessage(ERROR_CODES.METADATA_CACHE_UNAVAILABLE)
          );
        }
        if (error.message.includes("Missing required metadata")) {
          return sendError(
            c,
            ERROR_CODES.METADATA_MISSING_REQUIRED_FIELDS,
            error.message
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error parsing metadata:", error);
    return sendError(
      c,
      ERROR_CODES.METADATA_PARSE_FAILED,
      getErrorMessage(ERROR_CODES.METADATA_PARSE_FAILED)
    );
  }
});

// Add a route to update metadata
metadataRouter.post("/update", async (c) => {
  try {
    const { url, metadata } = await c.req.json();

    const isValidMeta = validateMetadata(metadata);

    if (!metadata.description) {
      metadata.description = "No description";
    }

    if (!isValidMeta) {
      return sendError(
        c,
        ERROR_CODES.METADATA_INVALID_DATA,
        getErrorMessage(ERROR_CODES.METADATA_INVALID_DATA)
      );
    }
    const cacheKey = generateCacheKey(url);
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(metadata));
    return sendSuccess(c, { updated: true });
  } catch (error) {
    console.error("Error updating metadata:", error);
    return sendError(
      c,
      ERROR_CODES.METADATA_PARSE_FAILED,
      getErrorMessage(ERROR_CODES.METADATA_PARSE_FAILED)
    );
  }
});