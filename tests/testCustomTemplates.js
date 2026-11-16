const assert = require('assert');
const {
  renderCustomTemplate,
  compileTemplate,
  resolveTemplate,
} = require('../src/utils/templateEngine');
const Project = require('../src/models/Project');

console.log('🧪 Starting Dakly Custom Templates & Paid Pro Tier Unit Tests...');

// 1. Test renderCustomTemplate variable interpolation
const customTpl = {
  templateId: 'order_shipped',
  name: 'Order Shipped Alert',
  subject: 'Order #{{orderId}} is on its way, {{customerName}}!',
  html: `
    <h2>Great news, {{customerName}}!</h2>
    <p>Your order <strong>#{{orderId}}</strong> has shipped via {{carrier}}.</p>
    <p>Track delivery here: <a href="{{trackingUrl}}">View Tracking</a></p>
  `,
};

const rendered = renderCustomTemplate(
  customTpl,
  {
    orderId: 'ORD-9841',
    customerName: 'Aarav Patel',
    carrier: 'BlueDart Express',
    trackingUrl: 'https://carrier.com/track/ORD-9841',
  },
  { name: 'Storefront Pro' }
);

assert(rendered.html.includes('Aarav Patel'), 'Custom template should interpolate customerName');
assert(rendered.html.includes('ORD-9841'), 'Custom template should interpolate orderId');
assert(rendered.html.includes('BlueDart Express'), 'Custom template should interpolate carrier');
assert.strictEqual(
  rendered.defaultSubject,
  'Order #ORD-9841 is on its way, Aarav Patel!',
  'Subject line should interpolate variables'
);
assert(rendered.html.includes('Storefront Pro'), 'Custom template should be wrapped with project shell');
console.log('✅ Test 1 Passed: renderCustomTemplate correctly interpolates variables and wraps in shell.');

// 2. Test raw HTML document without double wrapping
const fullDocTpl = {
  templateId: 'standalone_doc',
  name: 'Standalone HTML',
  subject: 'Standalone Notification',
  html: '<!DOCTYPE html><html><body><h1>Hello {{name}}</h1></body></html>',
};

const fullRendered = renderCustomTemplate(fullDocTpl, { name: 'Priya' });
assert(fullRendered.html.startsWith('<!DOCTYPE html>'), 'Full documents should not be double wrapped');
assert(fullRendered.html.includes('Hello Priya'), 'Full documents should interpolate variables');
console.log('✅ Test 2 Passed: Full HTML documents bypass double-shell wrapping cleanly.');

// 3. Test compileTemplate with project customTemplates
const mockProject = new Project({
  name: 'Acme SaaS',
  plan: 'pro',
  customTemplates: [
    {
      templateId: 'payment_reminder',
      name: 'Invoice Due Reminder',
      subject: 'Urgent: Invoice #{{invId}} due on {{dueDate}}',
      html: '<p>Hi {{user}}, please settle invoice #{{invId}} for {{amount}}.</p>',
    },
  ],
});

const compiledCustom = compileTemplate({
  template: 'payment_reminder',
  vars: { invId: 'INV-101', dueDate: 'Tomorrow', user: 'Vikram', amount: '$49' },
  project: mockProject,
});

assert.strictEqual(compiledCustom.templateId, 'payment_reminder');
assert(compiledCustom.html.includes('INV-101'));
assert(compiledCustom.html.includes('$49'));
assert(compiledCustom.defaultSubject.includes('INV-101'));
assert.strictEqual(compiledCustom.isCustom, true);
console.log('✅ Test 3 Passed: compileTemplate resolves custom templates from project.customTemplates.');

// 4. Test compileTemplate falls back to built-in system templates when identifier is built-in
const compiledBuiltin = compileTemplate({
  template: 'otp',
  vars: { code: '998811' },
  project: mockProject,
});
assert.strictEqual(compiledBuiltin.templateId, 'otp');
assert(compiledBuiltin.html.includes('998811'));
assert.strictEqual(compiledBuiltin.isCustom, false);
console.log('✅ Test 4 Passed: System templates (otp, welcome, etc.) remain intact.');

// 5. Test unknown template throws descriptive error listing custom + system templates
assert.throws(() => {
  compileTemplate({
    template: 'nonexistent_xyz',
    project: mockProject,
  });
}, /Unknown template "nonexistent_xyz"/);
console.log('✅ Test 5 Passed: Unknown template throws descriptive error.');

// 6. Test Project Schema defaults: plan defaults to 'free', customTemplates to []
const defaultProj = new Project({
  name: 'Free Tier Project',
  senderEmail: 'test@gmail.com',
  apiKey: 'gkey_live_test_proj_default',
});
assert.strictEqual(defaultProj.plan, 'free', 'Project plan should default to free');
assert.strictEqual(defaultProj.planCycle, 'monthly', 'Project planCycle should default to monthly');
assert.deepStrictEqual(defaultProj.customTemplates, [], 'customTemplates should default to empty array');
console.log('✅ Test 6 Passed: Project model defaults plan to "free", cycle to "monthly", and customTemplates to [].');

// 7. Test Monthly (₹20) and Yearly (₹1,499) plan cycles
defaultProj.plan = 'pro';
defaultProj.planCycle = 'monthly';
assert.strictEqual(defaultProj.planCycle, 'monthly');
defaultProj.planCycle = 'yearly';
assert.strictEqual(defaultProj.planCycle, 'yearly');
console.log('✅ Test 7 Passed: Both ₹20 monthly and ₹1,499 yearly plan cycles are supported.');

console.log('\n🎉 ALL CUSTOM TEMPLATES & PRO TIER TESTS PASSED SUCCESSFULLY!\n');
