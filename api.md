# Web Metadata API 文档

## 基础信息

- **基础URL**: `http://localhost:3000`
- **认证方式**: Bearer Token
- **内容类型**: `application/json`

## 认证

所有 API 路由都需要在请求头中包含有效的 Bearer Token：

```
Authorization: Bearer your-token
```

## 路由列表

### 1. 解析网页元数据

#### `POST /api/parse`

解析指定 URL 的 Open Graph 元数据。

**请求体**:

```json
{
  "url": "https://example.com"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Domain",
    "description": "This domain is for use in illustrative examples...",
    "image": "https://example.com/image.jpg",
    "favicon": "https://example.com/favicon.ico",
    "type": "website",
    "siteName": "Example",
    "locale": "en_US",
    "cachedAt": "2024-03-21T12:34:56.789Z"
  }
}
```

**错误响应**:

- `400 Bad Request`: URL 格式无效或缺少必要元数据
- `401 Unauthorized`: 认证失败
- `500 Internal Server Error`: 服务器内部错误
- `503 Service Unavailable`: 缓存服务不可用
- `504 Gateway Timeout`: 请求超时

**特性**:

- 支持缓存，相同 URL 的重复请求会直接从缓存返回
- 缓存有效期：3天
- 自动处理相对路径，确保 image 和 favicon 为完整 URL
- 必须包含 title 和 image 字段，否则返回错误

### 2. 更新元数据

#### `POST /api/update`

手动更新指定 URL 的元数据。

**请求体**:

```json
{
  "url": "https://example.com",
  "metadata": {
    "title": "Updated Title",
    "description": "Updated description",
    "image": "https://example.com/updated-image.jpg",
    "favicon": "https://example.com/favicon.ico",
    "type": "website",
    "siteName": "Example",
    "locale": "en_US"
  }
}
```

**响应**:

```json
{
  "success": true
}
```

**错误响应**:

- `400 Bad Request`: 元数据格式无效
- `401 Unauthorized`: 认证失败

### 3. 团队邀请码系统

#### `POST /api/invite`

创建团队邀请码。

**请求体**:

```json
{
  "team_id": "team_123",
  "expire_at": 1641081600
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "invite_code": "ABC12345",
    "team_id": "team_123",
    "expire_at": 1641081600,
    "ttl": 86400
  }
}
```

**限制**:

- 每个团队最多 50 个邀请码
- 默认过期时间：1天
- 邀请码格式：8位大写字母和数字

#### `POST /api/invite/verify`

验证邀请码有效性。

**请求体**:

```json
{
  "invite_code": "ABC12345"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "team_id": "team_123",
    "created_at": 1640995200,
    "expire_at": 1641081600,
    "valid": true
  }
}
```

**错误响应**:

- `400 Bad Request`: 邀请码无效、已过期或已被使用

#### `POST /api/invite/use`

使用邀请码加入团队。

**请求体**:

```json
{
  "invite_code": "ABC12345",
  "user_id": "user_456"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "team_id": "team_123",
    "user_id": "user_456",
    "joined_at": 1640995200
  }
}
```

**特性**:

- 邀请码只能使用一次
- 使用后自动将用户添加到团队成员列表
- 记录使用者和使用时间

#### `GET /api/team/:team_id/invites`

获取团队的邀请码列表。

**路径参数**:

- `team_id`: 团队 ID

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "code": "ABC12345",
      "team_id": "team_123",
      "created_at": 1640995200,
      "expire_at": 1641081600,
      "used": false,
      "used_by": null,
      "used_at": null
    }
  ]
}
```

### 4. API 文档

#### `GET /api/docs`

获取 OpenAPI 格式的 API 文档。

**响应**: OpenAPI 3.0 格式的 JSON 文档

## 错误处理

所有 API 都遵循统一的错误响应格式：

```json
{
  "error": "错误描述信息"
}
```

常见错误状态码：

- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 认证失败
- `500 Internal Server Error`: 服务器内部错误
- `503 Service Unavailable`: 服务不可用
- `504 Gateway Timeout`: 请求超时

## 数据缓存

系统使用 Redis 进行数据缓存：

- **元数据缓存**: 3天过期时间
- **邀请码缓存**: 根据设置的过期时间自动过期
- **团队数据**: 永久存储（除非手动删除）

## 使用示例

### 解析网页元数据

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"url": "https://example.com"}'
```

### 创建邀请码

```bash
curl -X POST http://localhost:3000/api/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "team_id": "team_123",
    "expire_at": 1641081600
  }'
```

### 验证邀请码

```bash
curl -X POST http://localhost:3000/api/invite/verify \
  -H "Content-Type: application/json" \
  -d '{"invite_code": "ABC12345"}'
```

### 使用邀请码

```bash
curl -X POST http://localhost:3000/api/invite/use \
  -H "Content-Type: application/json" \
  -d '{
    "invite_code": "ABC12345",
    "user_id": "user_456"
  }'
```
