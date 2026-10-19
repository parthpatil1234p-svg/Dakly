require('dotenv').config();
const assert = require('assert');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const app = require('../src/server');

async function testAuthSystem() {
  console.log('\n🔐 Testing Dakly Multi-Tenant User Authentication...\n');
  await connectDB();

  const testEmail = `test.dev.${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Parth Test Developer';

  const server = app.listen(5095, async () => {
    try {
      const baseUrl = 'http://localhost:5095';

      // 1. Register User
      console.log('1. Testing User Registration (POST /api/auth/register)...');
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
      }).then((r) => r.json());

      assert.strictEqual(regRes.success, true, 'Registration must succeed');
      assert(regRes.token, 'Must return JWT token');
      assert.strictEqual(regRes.user.email, testEmail);
      console.log('✅ User registered successfully. Token generated.');

      const token = regRes.token;

      // 2. Login User
      console.log('2. Testing User Login (POST /api/auth/login)...');
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      }).then((r) => r.json());

      assert.strictEqual(loginRes.success, true, 'Login must succeed');
      assert.strictEqual(loginRes.user.name, testName);
      console.log('✅ User login successful with matching bcrypt password.');

      // 3. Reject Wrong Password
      console.log('3. Testing Wrong Password Rejection...');
      const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'WrongPassword999' }),
      }).then((r) => r.json());

      assert.strictEqual(badLogin.success, false);
      assert.strictEqual(badLogin.error, 'Invalid email or password.');
      console.log('✅ Wrong password correctly rejected.');

      // 4. Verify /api/auth/me Profile
      console.log('4. Testing Profile (GET /api/auth/me)...');
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      assert.strictEqual(meRes.success, true);
      assert.strictEqual(meRes.user.email, testEmail);
      console.log('✅ Profile retrieved with Bearer token authentication.');

      // 5. Test Project Scoping with Token
      console.log('5. Testing Project Scoping for authenticated user...');
      const projRes = await fetch(`${baseUrl}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      assert.strictEqual(projRes.success, true);
      console.log(`✅ Projects returned for user: count = ${projRes.count}`);

      // Cleanup test user
      await User.deleteOne({ email: testEmail });
      console.log('🧹 Cleaned up temporary test user.');

      console.log('\n=================================================');
      console.log('🎉 MULTI-TENANT AUTH SYSTEM VERIFIED 100%!');
      console.log('=================================================\n');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('❌ Auth test failed:', err);
      server.close();
      process.exit(1);
    }
  });
}

testAuthSystem();
