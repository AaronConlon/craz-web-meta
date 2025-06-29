import { OpenAPI } from 'hono-openapi';

export const openapi = new OpenAPI({
  info: {
    title: 'Web Metadata API',
    version: '1.0.0',
    description: 'API for extracting web metadata from URLs',
  },
  servers: [{
    url: 'http://localhost:3000',
    description: 'Development server',
  }],
  tags: [
    {
      name: 'metadata',
      description: 'Operations for extracting and managing web metadata',
    },
  ],
  components: {
    schemas: {
      MetadataRequest: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'The URL to extract metadata from',
          },
        },
      },
      MetadataResponse: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the metadata',
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'The URL that was processed',
          },
          title: {
            type: 'string',
            description: 'Page title',
          },
          description: {
            type: 'string',
            description: 'Page description',
          },
          image: {
            type: 'string',
            format: 'uri',
            description: 'OG image URL',
          },
          favicon: {
            type: 'string',
            format: 'uri',
            description: 'Favicon URL',
          },
          type: {
            type: 'string',
            description: 'OG type',
          },
          siteName: {
            type: 'string',
            description: 'OG site name',
          },
          locale: {
            type: 'string',
            description: 'OG locale',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'When the metadata was created',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'When the metadata was last updated',
          },
        },
      },
    },
  },
});
