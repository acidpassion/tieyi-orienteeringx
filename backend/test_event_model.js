const mongoose = require('mongoose');
const Event = require('./models/Event');

// 测试Event模型是否能正确读取statics.json中的orgs
console.log('Testing Event model organization enum...');

// 获取Event模型的schema
const eventSchema = Event.schema;
const organizationField = eventSchema.paths.organization;

console.log('Organization enum values:', organizationField.enumValues);

// 验证是否包含statics.json中的所有组织
const expectedOrgs = ['国家体育总局', '广州市教育局', '小马越野', '香山定向', '华瑞健', '巨浪'];
const actualOrgs = organizationField.enumValues;

console.log('Expected orgs:', expectedOrgs);
console.log('Actual orgs:', actualOrgs);

const isValid = expectedOrgs.every(org => actualOrgs.includes(org)) && 
                actualOrgs.every(org => expectedOrgs.includes(org));

console.log('Enum validation result:', isValid ? 'PASS' : 'FAIL');

if (isValid) {
  console.log('✅ Event model successfully loads organization enum from statics.json');
} else {
  console.log('❌ Event model failed to load correct organization enum');
}

process.exit(0);