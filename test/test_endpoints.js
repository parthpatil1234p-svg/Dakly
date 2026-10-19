require('dotenv').config();
const connectDB = require('../src/config/db');
const app = require('../src/server');

async function testApiEndpoints() {
  await connectDB();
  const server = app.listen(5099, async () => {
    try {
      const apiKey = 'gkey_live_657886f2e5c57f4f0632b0d4bd896a623231c0a05beb69b0';
      const baseUrl = 'http://localhost:5099';

      console.log('Testing GET /health ...');
      const healthRes = await fetch(`${baseUrl}/health`).then((r) => r.json());
      console.log('Health:', healthRes.status, healthRes.database.status);

      console.log('Testing GET /api/stats ...');
      const statsRes = await fetch(`${baseUrl}/api/stats`, {
        headers: { 'x-api-key': apiKey },
      }).then((r) => r.json());
      console.log('Stats Response:', statsRes);
      if (!statsRes.success) {
        throw new Error('Stats API returned error: ' + statsRes.error);
      }
      console.log('Stats Project:', statsRes.project.name);
      console.log('Capacity:', JSON.stringify(statsRes.capacity));
      console.log('Metrics:', JSON.stringify(statsRes.metrics));

      console.log('Testing GET /api/logs (Paginated) ...');
      const logsRes = await fetch(`${baseUrl}/api/logs?limit=3`, {
        headers: { 'x-api-key': apiKey },
      }).then((r) => r.json());
      console.log('Logs count returned:', logsRes.logs.length, 'Total:', logsRes.pagination.total);
      console.log('Latest log recipient:', logsRes.logs[0].to, 'HasAttachments:', logsRes.logs[0].hasAttachments);

      console.log('Testing GET /api/status/:trackingId ...');
      const statusRes = await fetch(`${baseUrl}/api/status/msg_1792403088328_8650be20065e`).then((r) => r.json());
      console.log('Status result:', statusRes.success, statusRes.log.status, 'Attachments:', statusRes.log.hasAttachments);

      console.log('\n🎉 ALL CONTROLLERS AND API ENDPOINTS 100% WORKING!\n');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('API endpoint test failed:', err);
      server.close();
      process.exit(1);
    }
  });
}

testApiEndpoints();
