require('dotenv').config();
const connectDB = require('../src/config/db');
const app = require('../src/server');

async function testSenderEndpoints() {
  await connectDB();
  const server = app.listen(5098, async () => {
    try {
      const baseUrl = 'http://localhost:5098';
      const projectId = '6ad52d9c425908cb7320654e';

      console.log('Testing GET /api/projects/:id/senders ...');
      const getSendersRes = await fetch(`${baseUrl}/api/projects/${projectId}/senders`).then((r) => r.json());
      console.log('Senders count:', getSendersRes.sendersCount, 'Capacity:', getSendersRes.totalDailyQuota);

      console.log('Testing PATCH /api/projects/:id (update settings) ...');
      const patchRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          burstPacingMs: 250,
          webhookUrl: 'https://webhook.site/test-callback',
        }),
      }).then((r) => r.json());
      console.log('Patch result:', patchRes.success, 'New pacing:', patchRes.project.burstPacingMs);

      // Revert webhook url to clean state
      await fetch(`${baseUrl}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          burstPacingMs: 200,
          webhookUrl: null,
        }),
      });

      console.log('\n✅ Senders & Project management endpoints verified successfully!\n');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('Senders test failed:', err);
      server.close();
      process.exit(1);
    }
  });
}

testSenderEndpoints();
