# 邀请码过期校验问题分析与解决方案

## 问题发现

外部人员测试您的VPS部署的API时，发现邀请码过期校验存在问题：

- 过期的邀请码仍然可以被正常使用
- 验证接口返回错误信息不准确

## 根本原因分析

### 1. 创建邀请码时的逻辑问题

**原始代码问题：**

```typescript
const ttl = expire_at > now ? expire_at - now : 3600 * 24; // 默认1天
```

**问题描述：**

- 当传入的 `expire_at` 是过去时间时，代码会设置默认TTL为1天
- 这导致过期的邀请码在Redis中存在1天，而不是立即失效
- 虽然验证和使用时会检查过期时间，但数据仍然存在于Redis中

### 2. 时间戳格式问题

**可能的问题：**

- 外部人员可能传入毫秒级时间戳而不是秒级时间戳
- 服务器时区与客户端时区不一致

## 解决方案

### 1. 修复创建邀请码逻辑

**修改后的代码：**

```typescript
// 如果传入的过期时间已经过期，直接返回错误
if (expire_at <= now) {
  return c.json({ 
    error: "Expire time must be in the future",
    debug: {
      now,
      expire_at,
      time_diff: now - expire_at,
      expire_at_formatted: new Date(expire_at * 1000).toISOString(),
      now_formatted: new Date(now * 1000).toISOString(),
    }
  }, 400);
}

const ttl = expire_at - now;
```

**改进点：**

- 在创建时就验证过期时间，不允许创建已过期的邀请码
- 提供详细的调试信息，帮助诊断时间戳问题

### 2. 增强使用邀请码的调试信息

**修改后的代码：**

```typescript
// 添加调试信息
console.log("Using invite code debug:", {
  invite_code,
  now,
  expire_at: invite.expire_at,
  time_diff: now - invite.expire_at,
  is_expired: now > invite.expire_at,
  invite_data: invite,
});

if (now > invite.expire_at) {
  // 删除过期的邀请码
  await redis.del(`invite:${invite_code}`);
  await redis.srem(`team:${invite.team_id}:invites`, invite_code);
  return c.json({ 
    error: "Invite code has expired",
    debug: {
      now,
      expire_at: invite.expire_at,
      time_diff: now - invite.expire_at,
    }
  }, 400);
}
```

**改进点：**

- 添加详细的调试日志
- 在错误响应中包含调试信息

## 测试验证

### 运行测试脚本

```bash
# 启动服务
npm run dev

# 运行测试
node test-expiry-fix.js
```

### 预期测试结果

1. **创建过期邀请码**: ❌ 返回错误 "Expire time must be in the future"
2. **创建有效邀请码**: ✅ 成功
3. **验证有效邀请码**: ✅ 成功
4. **使用有效邀请码**: ✅ 成功

## 部署建议

### 1. 立即部署修复

```bash
# 重新部署到VPS
git add .
git commit -m "fix: 修复邀请码过期校验逻辑"
git push

# 在VPS上重启服务
pm2 restart all
```

### 2. 监控日志

```bash
# 查看服务日志
pm2 logs

# 查看特定应用日志
pm2 logs <app-name>
```

### 3. 验证修复

使用外部人员提供的测试用例重新验证：

```bash
# 创建过期邀请码（应该失败）
curl -X POST "http://your-vps-domain/api/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_KEY>" \
  -d '{"team_id": "test-team", "expire_at": 1700000000}'
```

## 预防措施

### 1. 添加时间戳验证

在API文档中明确说明时间戳格式要求：

- 使用Unix秒级时间戳
- 必须是未来时间

### 2. 增加单元测试

为邀请码功能添加完整的单元测试，包括过期场景。

### 3. 监控和告警

设置监控，当出现异常时及时告警。

## 总结

通过这次修复，我们：

1. ✅ 修复了创建过期邀请码的问题
2. ✅ 增强了调试信息
3. ✅ 确保了过期校验的严格性
4. ✅ 提供了详细的错误信息

现在您的API应该能够正确处理邀请码过期校验了。
