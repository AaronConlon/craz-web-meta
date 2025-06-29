import { z } from "zod";

export const metadataSchema = z.object({
  url: z.string().url(),
});

export type MetadataRequest = z.infer<typeof metadataSchema>;
