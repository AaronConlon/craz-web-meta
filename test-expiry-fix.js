#!/usr/bin/env node

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-key';

async function makeRequest(endpoint, data = null, method = 'POST') {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`${method} ${endpoint}:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.message);
    return null;
  }
}

async function testExpiryFix() {
  console.log('=== 测试过期校验修复 ===\n');

  const now = Math.floor(Date.now() / 1000);

  // 1. 尝试创建已过期的邀请码（应该失败）
  console.log('1. 尝试创建已过期的邀请码...');
  const expiredTime = now - 3600; // 1小时前
  await makeRequest('/api/invite', {
    team_id: 'test-team-expired',
    expire_at: expiredTime
  });
  console.log('');

  // 2. 创建有效的邀请码
  console.log('2. 创建有效的邀请码...');
  const validTime = now + 3600; // 1小时后
  const createResult = await makeRequest('/api/invite', {
    team_id: 'test-team-valid',
    expire_at: validTime
  });

  if (!createResult || !createResult.success) {
    console.error('创建有效邀请码失败');
    return;
  }

  const inviteCode = createResult.data.invite_code;
  console.log(`有效邀请码: ${inviteCode}\n`);

  // 3. 验证有效邀请码
  console.log('3. 验证有效邀请码...');
  await makeRequest('/api/invite/verify', {
    invite_code: inviteCode
  });
  console.log('');

  // 4. 使用有效邀请码
  console.log('4. 使用有效邀请码...');
  await makeRequest('/api/invite/use', {
    invite_code: inviteCode,
    user_id: 'test-user-valid'
  });
  console.log('');

  console.log('=== 测试完成 ===');
}

// 运行测试
testExpiryFix().catch(console.error); 