const assert = require('assert');

async function runTests() {
  const BASE = 'http://localhost:3000';
  console.log('Running NavPrompts Automated Verification Suite...\n');

  // 1. Homepage & Static Routes
  console.log('1. Checking core routes...');
  const routes = ['/', '/browse', '/community', '/pricing', '/login', '/register', '/account', '/admin'];
  for (const r of routes) {
    const res = await fetch(BASE + r);
    assert.strictEqual(res.status, 200, `Route ${r} returned status ${res.status}`);
  }
  console.log('   All core routes returned 200 OK.');

  // 2. Prompts API
  console.log('2. Checking Prompts API...');
  const pRes = await fetch(BASE + '/api/prompts?limit=5');
  const pData = await pRes.json();
  assert(pData.prompts.length > 0, 'Prompts should not be empty');
  assert(pData.total >= 16, 'Total prompts should be at least 16');
  console.log(`   Found ${pData.total} prompts in database.`);

  // 3. Free Prompt Gating
  console.log('3. Checking free prompt access (Prompt 270)...');
  const freeRes = await fetch(BASE + '/api/prompts/270');
  const freeData = await freeRes.json();
  assert.strictEqual(freeData.is_unlocked, true, 'Free prompt must be unlocked');
  assert(freeData.prompt_content && freeData.prompt_content.length > 1000, 'Free prompt content must be accessible');
  console.log('   Free prompt accessible to guests without login.');

  // 4. Premium Prompt Gating
  console.log('4. Checking premium prompt gating (Prompt 282)...');
  const premRes = await fetch(BASE + '/api/prompts/282');
  const premData = await premRes.json();
  assert.strictEqual(premData.is_unlocked, false, 'Premium prompt must be locked for guests');
  assert.strictEqual(premData.prompt_content, null, 'Premium prompt content must not be sent to guests');
  console.log('   Premium prompt locked for guests.');

  // 5. User Login with Configured Credentials
  console.log('5. Logging in with user credentials (abdusami660@gmail.com / Sami1234!)...');
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'abdusami660@gmail.com', password: 'Sami1234!' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true, 'Login response success flag should be true');
  assert.strictEqual(loginData.user.email, 'abdusami660@gmail.com');
  assert.strictEqual(loginData.user.membership_status, 'premium');
  const cookie = loginRes.headers.get('set-cookie');
  console.log(`   Logged in as ${loginData.user.name} (${loginData.user.membership_status}).`);

  // 6. Accessing Premium Prompt with Active Session
  console.log('6. Accessing Premium Prompt with active premium session...');
  const authPremRes = await fetch(BASE + '/api/prompts/282', {
    headers: { 'Cookie': cookie }
  });
  const authPremData = await authPremRes.json();
  assert.strictEqual(authPremData.is_unlocked, true, 'Premium prompt should be unlocked for premium member');
  assert(authPremData.prompt_content && authPremData.prompt_content.length > 1000, 'Prompt content must be visible to premium member');
  console.log(`   Unlocked premium prompt (${authPremData.prompt_content.length} characters of master prompt).`);

  // 7. Community Post & Comments
  console.log('7. Testing community interactions...');
  const postRes = await fetch(BASE + '/api/community/posts');
  const postData = await postRes.json();
  assert(postData.posts.length > 0, 'Community posts must exist');
  console.log(`   Loaded ${postData.posts.length} community posts.`);

  console.log('\n=======================================');
  console.log('✅ ALL TEST SUITE ASSERTIONS PASSED! 🚀');
  console.log('=======================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
