require('dotenv').config();
const connectDB = require('../src/config/db');
const Project = require('../src/models/Project');
const EmailLog = require('../src/models/EmailLog');

async function testLiveDB() {
  console.log('Connecting to MongoDB Atlas...');
  await connectDB();

  console.log('Fetching live project...');
  const project = await Project.findOne({ isActive: true }).select(
    '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
  );

  if (!project) {
    console.error('No active project found in DB');
    process.exit(1);
  }

  console.log('Project Name:', project.name);
  console.log('Sender Email:', project.senderEmail);

  // Test capacity summary
  const capacity = project.getCapacitySummary();
  console.log('Capacity Summary:', JSON.stringify(capacity, null, 2));

  // Test active sender resolution
  const activeSender = project.getActiveSender();
  console.log('Active Sender resolved:', activeSender ? activeSender.email : 'None');

  // Test Decrypt Password for active sender
  const decryptedPass = project.getDecryptedPassword(activeSender);
  console.log('Decrypted Password length:', decryptedPass ? decryptedPass.length : 0);
  console.log('Decrypted Password format check:', /^[a-z]{16}$/.test(decryptedPass) ? '✅ Valid Google App Password (16 lowercase chars)' : '⚠️ Format variation');

  // Test logs count
  const count = await EmailLog.countDocuments({ projectId: project._id });
  console.log('Total EmailLogs in DB for this project:', count);

  console.log('\n✅ Live MongoDB Atlas data verified cleanly with Phase 1 models!\n');
  process.exit(0);
}

testLiveDB().catch((err) => {
  console.error('Live DB test error:', err);
  process.exit(1);
});
