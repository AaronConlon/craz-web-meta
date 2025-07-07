# 邀请码接口重构文档

## 概述

本文档记录了对 HonoJS 邀请码接口的全面重构工作，实现了统一的响应格式、错误代码常量系统以及完整的集成测试覆盖。

## 重构目标

- ✅ 统一所有 API 的响应格式
- ✅ 非服务器错误统一返回 200 状态码
- ✅ 实现结构化的错误代码系统
- ✅ 使用 Vitest 建立完整的集成测试
- ✅ 提升代码可维护性和一致性

## 核心改进

### 1. 统一响应格式

#### 新的响应结构
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
}
```

#### 成功响应示例
```json
{
  "success": true,
  "data": {
    "invite_code": "ABC12345",
    "team_id": "team-123",
    "expire_at": 1751947314833
  }
}
```

#### 错误响应示例
```json
{
  "success": false,
  "error": {
    "code": "INVITE_CODE_EXPIRED",
    "message": "邀请码已过期",
    "details": {
      "now": 1751861045,
      "expire_at": 1751860000,
      "time_diff": 1045
    }
  }
}
```

### 2. 错误代码常量系统

#### 错误代码分类

**通用错误**
- `INTERNAL_SERVER_ERROR` - 服务器内部错误
- `INVALID_REQUEST` - 请求参数无效
- `UNAUTHORIZED` - 未授权访问

**邀请码相关错误**
- `INVITE_CODE_EXPIRED` - 邀请码已过期
- `INVITE_CODE_INVALID` - 邀请码无效或已过期
- `INVITE_CODE_ALREADY_USED` - 邀请码已被使用
- `INVITE_CODE_EXPIRE_TIME_PAST` - 邀请码过期时间不能是过去的时间
- `INVITE_CODE_TOO_MANY` - 邀请码数量已达到上限
- `INVITE_CODE_CREATE_FAILED` - 创建邀请码失败
- `INVITE_CODE_VERIFY_FAILED` - 验证邀请码失败
- `INVITE_CODE_USE_FAILED` - 使用邀请码失败

**团队相关错误**
- `TEAM_INVITES_FETCH_FAILED` - 获取团队邀请码失败

**元数据相关错误**
- `METADATA_INVALID_URL` - 无效的URL
- `METADATA_PARSE_FAILED` - 解析元数据失败
- `METADATA_REQUEST_TIMEOUT` - 请求超时
- `METADATA_CACHE_UNAVAILABLE` - 缓存服务不可用
- `METADATA_MISSING_REQUIRED_FIELDS` - 缺少必需的元数据字段
- `METADATA_INVALID_DATA` - 元数据无效

### 3. 重构的接口

#### 邀请码相关接口

**POST /api/invite** - 创建邀请码
```typescript
// 请求体
{
  "team_id": "string",
  "expire_at": "number" // 毫秒级时间戳
}

// 响应
{
  "success": true,
  "data": {
    "invite_code": "string",
    "team_id": "string",
    "expire_at": "number",
    "ttl": "number"
  }
}
```

**POST /api/invite/verify** - 验证邀请码
```typescript
// 请求体
{
  "invite_code": "string"
}

// 响应
{
  "success": true,
  "data": {
    "team_id": "string",
    "created_at": "number",
    "expire_at": "number",
    "valid": true
  }
}
```

**POST /api/invite/use** - 使用邀请码
```typescript
// 请求体
{
  "invite_code": "string",
  "user_id": "string"
}

// 响应
{
  "success": true,
  "data": {
    "team_id": "string",
    "user_id": "string",
    "joined_at": "number"
  }
}
```

**GET /api/team/:team_id/invites** - 获取团队邀请码列表
```typescript
// 响应
{
  "success": true,
  "data": [
    {
      "code": "string",
      "team_id": "string",
      "created_at": "number",
      "expire_at": "number",
      "used": "boolean",
      "used_by": "string | null",
      "used_at": "number | null"
    }
  ]
}
```

#### 元数据相关接口

**POST /api/parse** - 解析网页元数据
**POST /api/update** - 更新元数据

所有接口均采用统一的响应格式。

### 4. 测试基础设施

#### MockRedis 实现
为测试环境提供了完整的 Redis 模拟实现，支持：
- 基本的 get/set 操作
- TTL 管理
- Set 操作（sadd, srem, smembers, sismember）
- 过期键自动清理
- 内存数据管理

#### 集成测试覆盖

**邀请码功能测试** (`tests/invite.test.ts`)
1. ✅ 创建邀请码 - 成功场景
2. ✅ 创建邀请码 - 过期时间已过
3. ✅ 验证邀请码 - 有效邀请码
4. ✅ 使用邀请码 - 成功场景
5. ✅ 使用邀请码 - 重复使用
6. ✅ 获取团队邀请码列表
7. ✅ 创建邀请码 - 超过限制

**API 功能测试** (`tests/api.test.ts`)
1. ✅ 元数据解析和缓存
2. ✅ 缓存数据返回
3. ✅ 无效 URL 错误处理

**认证测试** (`tests/auth.test.ts`)
1. ✅ 有效令牌访问
2. ✅ 无效令牌拒绝
3. ✅ 缺失令牌拒绝

## 技术实现

### 新增文件

#### `src/constants/error-codes.ts`
```typescript
export const ERROR_CODES = {
  // 通用错误
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // 邀请码相关错误
  INVITE_CODE_EXPIRED: 'INVITE_CODE_EXPIRED',
  INVITE_CODE_INVALID: 'INVITE_CODE_INVALID',
  // ... 更多错误代码
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

#### `src/utils/response.ts`
```typescript
export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function errorResponse(code: ErrorCode, message: string, details?: any): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

export function sendSuccess<T>(c: Context, data: T, status = 200) {
  return c.json(successResponse(data), status);
}

export function sendError(c: Context, code: ErrorCode, message: string, details?: any, status = 200) {
  return c.json(errorResponse(code, message, details), status);
}
```

### 修改的文件

#### `src/index.ts`
- 导入新的响应工具函数和错误代码
- 重构所有邀请码接口使用新的响应格式
- 更新元数据接口使用统一响应格式
- 改进错误处理中间件

#### `src/db.ts`
- 集成 MockRedis 类用于测试环境
- 根据环境变量自动选择真实 Redis 或 Mock
- 支持所有测试需要的 Redis 操作

#### `package.json`
添加了针对性的测试脚本：
```json
{
  "test:integration": "vitest run tests/",
  "test:invite": "vitest run tests/invite.test.ts",
  "test:unit": "vitest run tests/unit/"
}
```

#### `vitest.config.ts`
配置测试环境变量：
```typescript
env: {
  NODE_ENV: "test",
  VITEST: "true",
  SECRET_TOKEN: "test-token",
  REDIS_HOST: "localhost",
  REDIS_PORT: "6379",
}
```

## 测试结果

### 最终测试状态
```
✓ tests/auth.test.ts (3 tests) 16ms
✓ tests/api.test.ts (3 tests) 18ms  
✓ tests/invite.test.ts (7 tests) 34ms

Test Files  3 passed (3)
Tests  13 passed (13)
Duration  493ms
```

### 测试覆盖范围
- **邀请码核心功能**：创建、验证、使用、列表获取
- **边界情况处理**：过期、重复使用、数量限制
- **错误处理**：各种错误场景的正确响应
- **缓存机制**：Redis 模拟和数据持久化
- **认证机制**：Token 验证和权限控制

## 运行测试

### 单独测试邀请码功能
```bash
bun run test:invite
```

### 运行完整集成测试
```bash
bun run test:integration
```

### 运行所有测试
```bash
bun run test
```

## 向后兼容性

### API 响应格式变更
⚠️ **重要提醒**：此次重构改变了 API 响应格式，从旧的格式：
```json
{
  "data": {...},
  "error": "错误信息"
}
```

变更为新的统一格式：
```json
{
  "success": boolean,
  "data": {...},
  "error": {
    "code": "ERROR_CODE",
    "message": "错误信息",
    "details": {...}
  }
}
```

### HTTP 状态码变更
- **之前**：错误情况返回 4xx/5xx 状态码
- **现在**：非服务器错误统一返回 200 状态码，通过 `success` 字段判断操作结果

客户端需要相应更新以适应新的响应格式。

## 未来改进建议

1. **API 版本控制**：考虑实现 API 版本控制以支持渐进式迁移
2. **错误码国际化**：支持多语言错误消息
3. **监控和日志**：增加结构化日志和监控指标
4. **性能优化**：考虑实现邀请码批量操作接口
5. **安全增强**：添加邀请码使用频率限制和异常检测

## 总结

此次重构成功实现了以下目标：
- ✅ 统一了 API 响应格式，提升了接口一致性
- ✅ 建立了结构化的错误处理机制
- ✅ 实现了完整的测试覆盖，确保功能稳定性
- ✅ 提升了代码可维护性和扩展性
- ✅ 为后续功能开发建立了良好的基础

重构后的邀请码系统更加健壮、易用和可维护，为项目的长期发展奠定了坚实的基础。