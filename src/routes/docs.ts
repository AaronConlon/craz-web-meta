import { Hono } from "hono";

export const docsRouter = new Hono();

// OpenAPI documentation endpoint
docsRouter.get("/", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "Web Metadata API",
      version: "1.0.0",
      description: "API for extracting and managing web metadata",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "metadata",
        description: "Web metadata operations",
      },
    ],
    paths: {
      "/api/parse": {
        post: {
          tags: ["metadata"],
          summary: "Extract metadata from URL",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MetadataRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successfully extracted metadata",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/MetadataResponse",
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
            },
            "401": {
              description: "Unauthorized",
            },
            "500": {
              description: "Internal server error",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        MetadataRequest: {
          type: "object",
          properties: {
            url: {
              type: "string",
              format: "uri",
            },
          },
          required: ["url"],
        },
        MetadataResponse: {
          type: "object",
          properties: {
            url: {
              type: "string",
              format: "uri",
            },
            title: {
              type: "string",
            },
            description: {
              type: "string",
            },
            image: {
              type: "string",
              format: "uri",
            },
            favicon: {
              type: "string",
              format: "uri",
            },
            type: {
              type: "string",
            },
            siteName: {
              type: "string",
            },
            locale: {
              type: "string",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
          required: ["id", "url", "createdAt", "updatedAt"],
        },
      },
    },
  });
});