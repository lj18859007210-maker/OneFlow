const http = require('http');
const crypto = require('crypto');

// RSA 加密
function encryptPassword(password, publicKey) {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(password)
  );
  return encrypted.toString('base64');
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8887,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('=== 1. 获取公钥 ===');
  const pubKeyRes = await request('GET', '/api/auth/public-key');
  const publicKey = pubKeyRes.data.data;
  console.log('公钥获取成功');

  console.log('\n=== 2. 登录获取 Token ===');
  const encryptedPwd = encryptPassword('admin', publicKey);
  const loginRes = await request('POST', '/api/auth/login', { username: 'admin', encryptedPassword: encryptedPwd });
  if (loginRes.status !== 200 || loginRes.data.code !== 0) {
    console.error('登录失败:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.data.token;
  console.log('Token 获取成功:', token.substring(0, 20) + '...');

  const authHeaders = { Authorization: `Bearer ${token}` };

  function authRequest(method, path, body) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost', port: 8887, path, method,
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      };
      if (body) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, data }); }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  console.log('\n=== 3. 测试通知接口 ===');
  const notifCount = await authRequest('GET', '/api/notifications/unread-count');
  console.log(`  未读数量: ${notifCount.status} - ${JSON.stringify(notifCount.data)}`);
  
  const notifList = await authRequest('GET', '/api/notifications?page=1&pageSize=5');
  console.log(`  通知列表: ${notifList.status} - 返回 ${notifList.data.data?.length || 0} 条`);

  console.log('\n=== 4. 测试审计日志接口 ===');
  const auditList = await authRequest('GET', '/api/audit-logs?page=1&pageSize=5');
  console.log(`  审计列表: ${auditList.status} - 返回 ${auditList.data.data?.length || 0} 条`);
  
  const auditActions = await authRequest('GET', '/api/audit-logs/actions');
  console.log(`  操作类型: ${auditActions.status} - ${JSON.stringify(auditActions.data.data)}`);

  console.log('\n=== 5. 测试开发人员接口 ===');
  const devList = await authRequest('GET', '/api/developers');
  console.log(`  开发人员: ${devList.status} - 返回 ${devList.data.data?.length || 0} 人`);
  
  const devStats = await authRequest('GET', '/api/developers/load-stats');
  console.log(`  负载统计: ${devStats.status} - ${devStats.data.success ? '成功' : '失败'}`);
  
  const devDepts = await authRequest('GET', '/api/developers/departments');
  console.log(`  部门列表: ${devDepts.status} - ${JSON.stringify(devDepts.data.data)}`);

  console.log('\n=== 6. 测试权限接口 ===');
  const permList = await authRequest('GET', '/api/permissions');
  console.log(`  权限列表: ${permList.status} - 返回 ${permList.data.data?.length || 0} 条`);
  
  const permModules = await authRequest('GET', '/api/permissions/modules');
  console.log(`  模块列表: ${permModules.status} - ${JSON.stringify(permModules.data.data)}`);
  
  const permByRole = await authRequest('GET', '/api/permissions/role/role-admin');
  console.log(`  admin权限: ${permByRole.status} - 返回 ${permByRole.data.data?.length || 0} 条`);

  console.log('\n=== 7. 测试需求接口（验证缓存） ===');
  const reqList = await authRequest('GET', '/api/requirements?page=1&pageSize=5');
  console.log(`  需求列表: ${reqList.status} - 返回 ${reqList.data.data?.length || 0} 条`);

  console.log('\n=== 所有接口测试完成 ===');
}

test().catch(e => { console.error('测试失败:', e.message); process.exit(1); });
