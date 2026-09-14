const assert = require('assert');

async function runTests() {
  const BASE = 'http://localhost:3000';
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Sami Prompts — Comprehensive Automated Verification    ');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Homepage & Static Routes
  console.log('1. Checking core HTML routes...');
  const routes = ['/', '/browse', '/community', '/portfolio', '/pricing', '/login', '/register', '/account', '/admin'];
  for (const r of routes) {
    const res = await fetch(BASE + r);
    assert.strictEqual(res.status, 200, `Route ${r} returned status ${res.status}`);
  }
  console.log('   ✓ All 9 core routes (including /portfolio) returned 200 OK.\n');

  // 2. Prompts Public API
  console.log('2. Checking Prompts Public API...');
  const pRes = await fetch(BASE + '/api/prompts?limit=5');
  const pData = await pRes.json();
  assert(pData.prompts.length > 0, 'Prompts should not be empty');
  assert(pData.total >= 16, 'Total prompts should be at least 16');
  console.log(`   ✓ Found ${pData.total} prompts in database.\n`);

  // 3. Free Prompt Gating (Prompt 270)
  console.log('3. Checking free prompt access (Prompt 270)...');
  const freeRes = await fetch(BASE + '/api/prompts/270');
  const freeData = await freeRes.json();
  assert.strictEqual(freeData.is_unlocked, true, 'Free prompt must be unlocked');
  assert(freeData.prompt_content && freeData.prompt_content.length > 1000, 'Free prompt content must be accessible');
  console.log('   ✓ Free prompt accessible to public guests without login.\n');

  // 4. Premium Prompt Gating (Prompt 282)
  console.log('4. Checking premium prompt gating for guests (Prompt 282)...');
  const premRes = await fetch(BASE + '/api/prompts/282');
  const premData = await premRes.json();
  assert.strictEqual(premData.is_unlocked, false, 'Premium prompt must be locked for guests');
  assert.strictEqual(premData.prompt_content, null, 'Premium prompt content must not be sent to guests');
  console.log('   ✓ Premium prompt properly locked for guests.\n');

  // 5. Security: Guest rejected from Admin endpoints
  console.log('5. Verifying security: Guest access to Admin API is forbidden...');
  const unauthorizedAdmin = await fetch(BASE + '/api/admin/stats');
  assert(unauthorizedAdmin.status === 401 || unauthorizedAdmin.status === 403, 'Guest should be rejected from admin stats');
  console.log(`   ✓ Guest rejected from Admin API with status ${unauthorizedAdmin.status}.\n`);

  // 6. User Login with Sami Credentials (abdusami660@gmail.com / Sami1234!)
  console.log('6. Logging in with Sami credentials (abdusami660@gmail.com / Sami1234!)...');
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'abdusami660@gmail.com', password: 'Sami1234!' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true, 'Login response success flag should be true');
  assert.strictEqual(loginData.user.email, 'abdusami660@gmail.com');
  assert.strictEqual(loginData.user.role, 'admin', 'Sami must have role === admin');
  assert.strictEqual(loginData.user.membership_status, 'premium', 'Sami must have active premium status');
  const cookie = loginRes.headers.get('set-cookie');
  console.log(`   ✓ Successfully logged in as ${loginData.user.name} (Role: ${loginData.user.role}, Tier: ${loginData.user.membership_status}).\n`);

  // 7. Unlocking Premium Prompt with Sami Session
  console.log('7. Accessing Premium Prompt with Sami authenticated session...');
  const authPremRes = await fetch(BASE + '/api/prompts/282', {
    headers: { 'Cookie': cookie }
  });
  const authPremData = await authPremRes.json();
  assert.strictEqual(authPremData.is_unlocked, true, 'Premium prompt should be unlocked for Sami');
  assert(authPremData.prompt_content && authPremData.prompt_content.length > 1000, 'Prompt content must be visible to Sami');
  console.log(`   ✓ Unlocked premium prompt (${authPremData.prompt_content.length} characters of master prompt).\n`);

  // 8. Admin Dashboard: Read Stats
  console.log('8. Testing Admin Dashboard: Fetch stats...');
  const statsRes = await fetch(BASE + '/api/admin/stats', {
    headers: { 'Cookie': cookie }
  });
  assert.strictEqual(statsRes.status, 200, 'Admin stats should return 200');
  const statsData = await statsRes.json();
  assert(statsData.totalPrompts > 0, 'Stats totalPrompts should be > 0');
  assert(statsData.totalCategories > 0, 'Stats totalCategories should be > 0');
  console.log(`   ✓ Admin stats verified: ${statsData.totalPrompts} prompts, ${statsData.totalCategories} categories, ${statsData.totalViews} views.\n`);

  // 9. Admin Dashboard: Create New Category
  console.log('9. Testing Admin Dashboard: Create new category...');
  const catRes = await fetch(BASE + '/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ name: 'Sami Custom AI Videos', slug: 'sami-custom-ai-videos' })
  });
  assert.strictEqual(catRes.status, 200, 'Category creation failed');
  const catData = await catRes.json();
  assert(catData.category && catData.category.id, 'Category ID should be returned');
  const newCatId = catData.category.id;
  console.log(`   ✓ Created category "${catData.category.name}" (ID: ${newCatId}).\n`);

  // 10. Admin Dashboard: Create New Custom Prompt
  console.log('10. Testing Admin Dashboard: Create new custom prompt under created category...');
  const newPromptPayload = {
    title: 'Sami Cyberpunk Time-Traveler Reel',
    category: 'Sami Custom AI Videos',
    type: 'premium',
    thumbnail: '/assets/img/hero-creator.png',
    teaser: 'An electrifying time-traveler enters a neon Tokyo subway in 2099.',
    prompt_content: `**Title: Sami Cyberpunk Time-Traveler Reel**
**Primary AI Engine:** Seedance 2.0 / Kling v1.5 / Runway Gen-3 Alpha
**Prompt Type:** VIP Viral Prompt

### MASTER PROMPT DIRECTIVE:
A cinematic 4K hyper-realistic hyper-detailed tracking shot following a hooded time-traveler walking out of a shimmering holographic portal directly into a rain-slicked neon Neo-Tokyo metro station. Steam rising from wet floor grates, reflections of purple and amber billboards on puddles, anamorphic lens flare, photorealistic skin textures, cinematic film grain, 60fps buttery smooth motion blur.

### NEGATIVE PROMPT:
cartoon, blurry, low resolution, bad hands, distorted faces, watermark, flickering, oversaturated.`
  };

  const createPromptRes = await fetch(BASE + '/api/admin/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify(newPromptPayload)
  });
  assert.strictEqual(createPromptRes.status, 200, 'Prompt creation failed');
  const createdPromptData = await createPromptRes.json();
  assert(createdPromptData.success && createdPromptData.prompt_id, 'Created prompt should have an ID');
  const createdPromptId = createdPromptData.prompt_id;
  console.log(`   ✓ Successfully created prompt: "${newPromptPayload.title}" (ID: ${createdPromptId}, Type: ${newPromptPayload.type}).\n`);

  // 11. Admin Dashboard: Toggle Prompt Free/Premium
  console.log('11. Testing Admin Dashboard: Toggle prompt between Free and Premium...');
  const toggleRes = await fetch(BASE + `/api/admin/prompts/${createdPromptId}/toggle-type`, {
    method: 'PATCH',
    headers: { 'Cookie': cookie }
  });
  assert.strictEqual(toggleRes.status, 200, 'Toggle prompt type failed');
  const toggleData = await toggleRes.json();
  assert.strictEqual(toggleData.new_type, 'free', 'Prompt type should have toggled to free');
  console.log(`   ✓ Prompt type successfully toggled to "${toggleData.new_type}".\n`);

  // 12. Admin Dashboard: Update Prompt Details
  console.log('12. Testing Admin Dashboard: Update prompt title and content...');
  const updateRes = await fetch(BASE + `/api/admin/prompts/${createdPromptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      ...newPromptPayload,
      title: 'Sami Cyberpunk Time-Traveler Reel (Updated Edition)',
      type: 'free'
    })
  });
  assert.strictEqual(updateRes.status, 200, 'Update prompt failed');
  const updateData = await updateRes.json();
  assert.strictEqual(updateData.success, true);
  console.log(`   ✓ Prompt ID ${createdPromptId} updated successfully.\n`);

  // 13. Admin Dashboard: Delete Test Prompt
  console.log('13. Testing Admin Dashboard: Clean up test prompt...');
  const deleteRes = await fetch(BASE + `/api/admin/prompts/${createdPromptId}`, {
    method: 'DELETE',
    headers: { 'Cookie': cookie }
  });
  assert.strictEqual(deleteRes.status, 200, 'Delete prompt failed');
  const deleteData = await deleteRes.json();
  assert.strictEqual(deleteData.success, true);
  console.log(`   ✓ Test prompt ID ${createdPromptId} deleted successfully.\n`);

  // 14. Community Interactions
  console.log('14. Testing Community Interactions...');
  const postRes = await fetch(BASE + '/api/community/posts');
  const postData = await postRes.json();
  assert(postData.posts.length > 0, 'Community posts must exist');
  console.log(`   ✓ Loaded ${postData.posts.length} community posts.\n`);

  // 15. Dark / Light Mode Theme System & Assets Integration
  console.log('15. Testing Dark / Light Mode Theme System & Assets Integration...');
  const cssRes = await fetch(BASE + '/assets/css/style.css');
  const cssContent = await cssRes.text();
  assert(cssContent.includes('html[data-theme="dark"]'), 'Dark theme selector missing in CSS');
  assert(cssContent.includes('html[data-theme="light"]'), 'Light theme selector missing in CSS');
  assert(cssContent.includes('--accent-gradient'), 'Accent gradient missing in CSS');
  assert(cssContent.includes('.theme-toggle-btn'), 'Theme toggle button styles missing in CSS');

  const jsRes = await fetch(BASE + '/assets/js/main.js');
  const jsContent = await jsRes.text();
  assert(jsContent.includes('initTheme'), 'initTheme missing in main.js');
  assert(jsContent.includes('toggleTheme'), 'toggleTheme missing in main.js');
  assert(jsContent.includes('setupThemeToggle'), 'setupThemeToggle missing in main.js');

  for (const r of routes) {
    const pageHtml = await (await fetch(BASE + r)).text();
    assert(pageHtml.includes('theme-toggle-btn'), `Page ${r} missing theme-toggle-btn`);
    assert(pageHtml.includes('sami_theme'), `Page ${r} missing anti-FOUC script`);
  }
  console.log('   ✓ Dark and Light themes verified across all CSS tokens, JS engines, and 9 HTML pages.\n');

  // 16. Social Media Portfolio & Analytics Full CRUD Verification
  console.log('16. Testing Social Media Portfolio & Analytics System...');
  // a. GET /api/portfolio
  const portRes = await fetch(BASE + '/api/portfolio');
  assert.strictEqual(portRes.status, 200, 'Portfolio API should return 200');
  const portData = await portRes.json();
  assert.strictEqual(portData.success, true);
  assert(portData.accounts && portData.accounts.length >= 5, 'Should have at least 5 seeded social accounts');
  assert(portData.metrics.total_followers > 500000, 'Metrics total_followers should be computed');
  assert(portData.metrics.total_views > 1000000, 'Metrics total_views should be computed');
  console.log(`   ✓ Loaded portfolio: ${portData.accounts.length} accounts, ${portData.metrics.total_followers.toLocaleString()} total followers, ${portData.metrics.total_views.toLocaleString()} total views.`);

  // b. GET /api/portfolio/analytics
  const analRes = await fetch(BASE + '/api/portfolio/analytics');
  assert.strictEqual(analRes.status, 200, 'Portfolio analytics API should return 200');
  const analData = await analRes.json();
  assert.strictEqual(analData.success, true);
  assert(analData.growthTimeline.datasets.length >= 5, 'Growth timeline datasets should exist');
  assert(analData.platformShare.length >= 5, 'Platform share items should exist');
  assert(analData.viewsBreakdown.length >= 5, 'Views breakdown items should exist');
  console.log(`   ✓ Verified Chart.js analytics endpoints: timeline, platform share, views breakdown.`);

  // c. POST /api/portfolio (Add Account)
  console.log('   Creating custom social account via API...');
  const newAccountPayload = {
    platform: 'threads',
    account_name: 'Sami AI Viral Threads',
    handle: '@samithreads',
    profile_url: 'https://threads.net/@samithreads',
    followers_count: 45000,
    following_count: 120,
    total_views: 620000,
    posts_count: 42,
    engagement_rate: 6.8,
    monthly_growth: '+14.2%',
    goal_target: 100000,
    category: 'AI & Tech',
    status: 'active',
    notes: 'Daily AI generation breakdown hooks'
  };
  const createAccRes = await fetch(BASE + '/api/portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newAccountPayload)
  });
  assert.strictEqual(createAccRes.status, 200, 'Create social account should return 200');
  const createdAccData = await createAccRes.json();
  assert.strictEqual(createdAccData.success, true);
  assert(createdAccData.account && createdAccData.account.id, 'Account ID should be created');
  const testAccId = createdAccData.account.id;
  console.log(`   ✓ Created test account "${newAccountPayload.account_name}" (ID: ${testAccId}).`);

  // d. PUT /api/portfolio/:id (Update Account)
  console.log(`   Updating account ${testAccId}...`);
  const updateAccRes = await fetch(BASE + `/api/portfolio/${testAccId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...newAccountPayload,
      followers_count: 52000,
      monthly_growth: '+18.5%'
    })
  });
  assert.strictEqual(updateAccRes.status, 200, 'Update account should return 200');
  const updatedAccData = await updateAccRes.json();
  assert.strictEqual(updatedAccData.success, true);
  assert.strictEqual(updatedAccData.account.followers_count, 52000);
  console.log(`   ✓ Updated account ID ${testAccId} followers to 52,000.`);

  // e. DELETE /api/portfolio/:id (Remove Account)
  console.log(`   Deleting test account ${testAccId}...`);
  const delAccRes = await fetch(BASE + `/api/portfolio/${testAccId}`, {
    method: 'DELETE'
  });
  assert.strictEqual(delAccRes.status, 200, 'Delete account should return 200');
  const delAccData = await delAccRes.json();
  assert.strictEqual(delAccData.success, true);
  console.log(`   ✓ Deleted test account ID ${testAccId} successfully.\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 ALL 16 TEST SUITE ASSERTIONS PASSED WITH FLYING COLORS! 🚀');
  console.log('═══════════════════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
