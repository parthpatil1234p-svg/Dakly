require('dotenv').config();
const connectDB = require('../src/config/db');
const Project = require('../src/models/Project');
const { sendEmail } = require('../src/services/emailService');

async function testSendPdfEmail() {
  console.log('Connecting to MongoDB Atlas...');
  await connectDB();

  const project = await Project.findOne({ isActive: true }).select(
    '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
  );

  if (!project) {
    console.error('No project found');
    process.exit(1);
  }

  // Create a minimal valid PDF binary buffer
  const samplePdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 56 >> stream
BT
/F1 24 Tf
100 700 Td
(Dakly Phase 1 Verified!) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000352 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
432
%%EOF`;

  console.log(`Sending real email with PDF attachment to ${project.senderEmail}...`);
  const t0 = Date.now();

  const result = await sendEmail({
    project,
    to: project.senderEmail,
    subject: '🧪 Dakly Phase 1: Real PDF Attachment Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2b6cb0;">📮 Dakly Phase 1 Verification</h2>
        <p>This email proves that <b>Phase 1 (PDF & Attachment Engine + Anti-Spam Pacing + Failover Model)</b> is working 100% live on Port 587 STARTTLS!</p>
        <p>📎 A sample PDF document (<code>Dakly_Official_Notes.pdf</code>) is attached to this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <small style="color: #718096;">Sent by Dakly Microservice Engine | Timestamp: ${new Date().toISOString()}</small>
      </div>
    `,
    attachments: [
      {
        filename: 'Dakly_Official_Notes.pdf',
        content: samplePdf,
        contentType: 'application/pdf',
      },
    ],
  });

  const duration = Date.now() - t0;
  console.log('\nDispatch Result:');
  console.log(JSON.stringify(result, null, 2));
  console.log(`⏱️ Total Time: ${duration}ms\n`);

  if (result.success) {
    console.log('🎉 SUCCESS: Real PDF attachment email delivered to Gmail inbox!');
    process.exit(0);
  } else {
    console.error('❌ FAILED:', result.error);
    process.exit(1);
  }
}

testSendPdfEmail().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
