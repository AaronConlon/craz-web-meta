# craz-web-meta

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-blue)](https://spec.openapis.org/oas/v3.0.0)
[![SQLite](https://img.shields.io/badge/SQLite-3.0-green)](https://www.sqlite.org/)
[![Hono](https://img.shields.io/badge/Hono-4.7.11-blue)](https://hono.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-4.0-orange)](https://www.prisma.io/)

A web metadata extraction service that parses URLs and extracts Open Graph (OG) and favicon information. This service provides a RESTful API to extract metadata from web pages and store it in a SQLite database using Prisma ORM.

## Features

- 📝 Open Graph (OG) metadata extraction
- 📌 Favicon extraction
- 📄 SQLite database storage with Prisma ORM
- 🔐 Basic authentication via secret token
- 📚 OpenAPI documentation
- 🧪 Comprehensive testing with Vitest
- 🎯 TypeScript type safety
- ⚡️ Built with Hono.js

## Prerequisites

- Node.js 18+
- Bun (Recommended)
- SQLite

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/craz-web-meta.git
cd craz-web-meta

# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Generate Prisma client
bunx prisma generate

# Run database migrations
bunx prisma migrate dev
```

## Environment Variables

Create a `.env` file with the following content:

```env
SECRET_TOKEN=your-secret-token-here
DATABASE_URL="file:./dev.db"
```

## Usage

### Development

```bash
# Start development server with hot reload
bun run --hot src/index.ts
```

### API Endpoints

- `POST /api/extract` - Extract metadata from URL
- `GET /api/metadata/:id` - Get stored metadata
- `GET /api/docs` - OpenAPI documentation

### Example Request

```bash
curl -X POST \
  http://localhost:3000/api/extract \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Testing

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage
```

## API Documentation

The service provides OpenAPI documentation that can be accessed at `/api/docs` when running the development server.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

open http://localhost:3000
