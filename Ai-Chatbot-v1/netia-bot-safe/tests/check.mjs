import { execSync } from 'child_process';

const [,, testType] = process.argv;

const BASE_URL = 'http://localhost:3000';

async function testHealth() {
  try {
    console.log('Testing health endpoint...');
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (response.ok && data && data.status === 'ok') {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed:', response.status, data);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testWebhook() {
  try {
    console.log('Testing webhook endpoint...');
    
    const testPayload = {
      conversation_id: 'test-conv-123',
      message: 'I want to book an appointment'
    };

    const response = await fetch(`${BASE_URL}/crisp/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const data = await response.json();
    
    if (response.ok && data.ok && data.intent === 'booking') {
      console.log('✅ Webhook test passed');
      console.log('   Intent:', data.intent);
      console.log('   Response:', data.response);
      return true;
    } else {
      console.log('❌ Webhook test failed:', response.status, data);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`🧪 Running ${testType} test...\n`);
  
  let success = false;
  
  switch (testType) {
    case 'health':
      success = await testHealth();
      break;
    case 'webhook':
      success = await testWebhook();
      break;
    default:
      console.log('❌ Unknown test type. Use "health" or "webhook"');
      process.exit(1);
  }
  
  console.log(`\n${success ? '✅' : '❌'} Test ${testType} ${success ? 'passed' : 'failed'}`);
  process.exit(success ? 0 : 1);
}

runTests();
