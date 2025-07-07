import { vi } from "vitest";
import * as metadata from "../src/utils/metadata";

// 模拟 metadata 提取函数
const mockMetadata = {
  title: "Test Title",
  description: "Test Description",
  image: "https://example.com/image.jpg",
  favicon: "https://example.com/favicon.ico",
  type: "website",
  siteName: "Test Site",
  locale: "en_US",
};

export const mockExtractMetadata = vi
  .fn()
  .mockImplementation(async () => mockMetadata);

// 使用 spyOn 替代 mock
vi.spyOn(metadata, "extractMetadata").mockImplementation(mockExtractMetadata);
vi.spyOn(metadata, "validateUrl").mockImplementation((url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
});

