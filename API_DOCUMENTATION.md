# Craz Web Meta API 文档

## 概述

Craz Web Meta API 是一个 RESTful Web 服务，提供网页元数据提取、缓存管理和团队邀请码功能。该 API 基于 HonoJS 框架构建，支持高性能的元数据解析和团队协作功能。

## 基础信息

- **基础 URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token
- **响应格式**: JSON
- **字符编码**: UTF-8

## 认证

所有 API 请求都需要在请求头中包含认证令牌：

```http
Authorization: Bearer YOUR_SECRET_TOKEN
```

## 统一响应格式

所有 API 响应都遵循统一的格式：

### 成功响应
```json
{
  "success": true,
  "data": {
    // 具体的响应数据
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息",
    "details": {
      // 可选的详细错误信息
    }
  }
}
```

## 元数据相关接口

### 1. 解析网页元数据

提取指定 URL 的 Open Graph 元数据信息。

**接口**: `POST /api/parse`

**请求体**:
```json
{
  "url": "https://example.com"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Domain",
    "description": "This domain is for use in illustrative examples",
    "image": "https://example.com/image.jpg",
    "favicon": "https://example.com/favicon.ico",
    "type": "website",
    "siteName": "Example",
    "locale": "en_US",
    "cachedAt": "2025-07-07T10:30:00.000Z"
  }
}
```

**错误代码**:
- `METADATA_INVALID_URL`: 无效的 URL
- `METADATA_PARSE_FAILED`: 解析元数据失败
- `METADATA_REQUEST_TIMEOUT`: 请求超时
- `METADATA_MISSING_REQUIRED_FIELDS`: 缺少必需的元数据字段

### 2. 更新元数据

手动更新指定 URL 的元数据缓存。

**接口**: `POST /api/update`

**请求体**:
```json
{
  "url": "https://example.com",
  "metadata": {
    "title": "Updated Title",
    "description": "Updated Description",
    "image": "https://example.com/new-image.jpg"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "updated": true
  }
}
```

## 邀请码相关接口

### 3. 创建邀请码

为指定团队创建新的邀请码。

**接口**: `POST /api/invite`

**请求体**:
```json
{
  "team_id": "team-123",
  "expire_at": 1751947314833
}
```

**参数说明**:
- `team_id`: 团队 ID，字符串类型，1-64 个字符
- `expire_at`: 过期时间，毫秒级时间戳

**响应示例**:
```json
{
  "success": true,
  "data": {
    "invite_code": "ABC12345",
    "team_id": "team-123",
    "expire_at": 1751947314833,
    "ttl": 86400,
    "debug": {
      "now": 1751860914833,
      "expire_at_formatted": "2025-07-08T04:01:54.833Z",
      "ttl_hours": 24
    }
  }
}
```

**错误代码**:
- `INVITE_CODE_TOO_MANY`: 邀请码数量已达到上限（50个）
- `INVITE_CODE_EXPIRE_TIME_PAST`: 过期时间不能是过去的时间
- `INVITE_CODE_CREATE_FAILED`: 创建邀请码失败

### 4. 验证邀请码

验证邀请码的有效性。

**接口**: `POST /api/invite/verify`

**请求体**:
```json
{
  "invite_code": "ABC12345"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "team_id": "team-123",
    "created_at": 1751860914,
    "expire_at": 1751947314833,
    "valid": true,
    "debug": {
      "now": 1751860915000,
      "time_remaining": 86399833
    }
  }
}
```

**错误代码**:
- `INVITE_CODE_INVALID`: 邀请码无效或已过期
- `INVITE_CODE_EXPIRED`: 邀请码已过期
- `INVITE_CODE_ALREADY_USED`: 邀请码已被使用
- `INVITE_CODE_VERIFY_FAILED`: 验证邀请码失败

### 5. 使用邀请码

使用邀请码将用户加入团队。

**接口**: `POST /api/invite/use`

**请求体**:
```json
{
  "invite_code": "ABC12345",
  "user_id": "user-456"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "team_id": "team-123",
    "user_id": "user-456",
    "joined_at": 1751860915
  }
}
```

**错误代码**:
- `INVITE_CODE_INVALID`: 邀请码无效或已过期
- `INVITE_CODE_EXPIRED`: 邀请码已过期
- `INVITE_CODE_ALREADY_USED`: 邀请码已被使用
- `INVITE_CODE_USE_FAILED`: 使用邀请码失败

## 团队相关接口

### 6. 获取团队邀请码列表

获取指定团队的所有邀请码信息。

**接口**: `GET /api/team/{team_id}/invites`

**路径参数**:
- `team_id`: 团队 ID

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "code": "ABC12345",
      "team_id": "team-123",
      "created_at": 1751860914,
      "expire_at": 1751947314833,
      "used": false,
      "used_by": null,
      "used_at": null
    },
    {
      "code": "XYZ98765",
      "team_id": "team-123",
      "created_at": 1751860800,
      "expire_at": 1751947200000,
      "used": true,
      "used_by": "user-789",
      "used_at": 1751860900
    }
  ]
}
```

**错误代码**:
- `TEAM_INVITES_FETCH_FAILED`: 获取团队邀请码失败

## 文档接口

### 7. 获取 API 文档

获取 OpenAPI 格式的 API 文档。

**接口**: `GET /api/docs`

**响应**: OpenAPI 3.0 格式的 JSON 文档

## 错误代码参考

### 通用错误
- `INTERNAL_SERVER_ERROR`: 服务器内部错误
- `INVALID_REQUEST`: 请求参数无效
- `UNAUTHORIZED`: 未授权访问

### 元数据相关错误
- `METADATA_INVALID_URL`: 无效的URL
- `METADATA_PARSE_FAILED`: 解析元数据失败
- `METADATA_REQUEST_TIMEOUT`: 请求超时
- `METADATA_CACHE_UNAVAILABLE`: 缓存服务不可用
- `METADATA_MISSING_REQUIRED_FIELDS`: 缺少必需的元数据字段
- `METADATA_INVALID_DATA`: 元数据无效

### 邀请码相关错误
- `INVITE_CODE_EXPIRED`: 邀请码已过期
- `INVITE_CODE_INVALID`: 邀请码无效或已过期
- `INVITE_CODE_ALREADY_USED`: 邀请码已被使用
- `INVITE_CODE_EXPIRE_TIME_PAST`: 邀请码过期时间不能是过去的时间
- `INVITE_CODE_TOO_MANY`: 邀请码数量已达到上限
- `INVITE_CODE_CREATE_FAILED`: 创建邀请码失败
- `INVITE_CODE_VERIFY_FAILED`: 验证邀请码失败
- `INVITE_CODE_USE_FAILED`: 使用邀请码失败

### 团队相关错误
- `TEAM_INVITES_FETCH_FAILED`: 获取团队邀请码失败

## 使用示例

### JavaScript/Node.js

```javascript
const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your-secret-token';

// 解析网页元数据
async function parseMetadata(url) {
  const response = await fetch(`${API_BASE_URL}/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify({ url })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('元数据:', result.data);
  } else {
    console.error('错误:', result.error);
  }
}

// 创建邀请码
async function createInviteCode(teamId, expireAt) {
  const response = await fetch(`${API_BASE_URL}/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify({
      team_id: teamId,
      expire_at: expireAt
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('邀请码:', result.data.invite_code);
  } else {
    console.error('错误:', result.error);
  }
}

// 使用示例
parseMetadata('https://example.com');
createInviteCode('team-123', Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期
```

### cURL

```bash
# 解析网页元数据
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"url": "https://example.com"}'

# 创建邀请码
curl -X POST http://localhost:3000/api/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{
    "team_id": "team-123",
    "expire_at": 1751947314833
  }'

# 验证邀请码
curl -X POST http://localhost:3000/api/invite/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"invite_code": "ABC12345"}'

# 获取团队邀请码列表
curl -X GET http://localhost:3000/api/team/team-123/invites \
  -H "Authorization: Bearer your-secret-token"
```

### Python

```python
import requests
import json
from datetime import datetime, timedelta

API_BASE_URL = 'http://localhost:3000/api'
AUTH_TOKEN = 'your-secret-token'

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {AUTH_TOKEN}'
}

# 解析网页元数据
def parse_metadata(url):
    response = requests.post(
        f'{API_BASE_URL}/parse',
        headers=headers,
        json={'url': url}
    )
    result = response.json()
    
    if result['success']:
        print('元数据:', result['data'])
    else:
        print('错误:', result['error'])

# 创建邀请码
def create_invite_code(team_id, expire_hours=24):
    expire_at = int((datetime.now() + timedelta(hours=expire_hours)).timestamp() * 1000)
    
    response = requests.post(
        f'{API_BASE_URL}/invite',
        headers=headers,
        json={
            'team_id': team_id,
            'expire_at': expire_at
        }
    )
    result = response.json()
    
    if result['success']:
        print('邀请码:', result['data']['invite_code'])
    else:
        print('错误:', result['error'])

# 使用示例
parse_metadata('https://example.com')
create_invite_code('team-123', 24)
```

## 限制和注意事项

1. **邀请码限制**: 每个团队最多可创建 50 个有效邀请码
2. **时间戳格式**: 所有时间戳均为毫秒级 Unix 时间戳
3. **缓存机制**: 元数据会缓存 3 天，可通过更新接口手动刷新
4. **请求频率**: 建议控制请求频率，避免对目标网站造成压力
5. **URL 验证**: 仅支持 HTTP 和 HTTPS 协议的 URL

## 联系支持

如有问题或需要技术支持，请通过以下方式联系：

- GitHub Issues: [https://github.com/your-org/craz-web-meta/issues](https://github.com/your-org/craz-web-meta/issues)
- 邮箱: support@your-domain.com

## 更新日志

### v1.0.0 (2025-07-07)
- 初始版本发布
- 支持网页元数据提取和缓存
- 支持团队邀请码功能
- 统一的 API 响应格式
- 完整的错误处理机制