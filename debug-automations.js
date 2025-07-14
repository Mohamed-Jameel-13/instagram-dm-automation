#!/usr/bin/env node

/**
 * Comprehensive Automation Debug Script
 * 
 * This script tests every component of your Instagram automation system
 * to identify exactly where the issue is occurring.
 */

const BASE_URL = process.env.VERCEL_URL || 'https://instagram-dm-automation-6qtpnth0e-jameels-projects-13.vercel.app';

console.log('🔍 Instagram DM Automation Debug Script');
console.log('======================================\n');

async function debugAutomations() {
  const results = {
    steps: {},
    issues: [],
    recommendations: []
  };

  // Step 1: Check Queue Status
  console.log('📊 Step 1: Checking Queue Status...');
  try {
    const queueResponse = await fetch(`${BASE_URL}/api/process-queue`);
    const queueData = await queueResponse.json();
    
    results.steps.queue = {
      status: queueResponse.ok ? 'success' : 'failed',
      data: queueData
    };
    
    console.log(`   ✅ Queue Length: ${queueData.queueLength}`);
    console.log(`   ✅ Failed Queue: ${queueData.failedQueueLength}`);
    console.log(`   ✅ Status: ${queueData.status}`);
    
    if (queueData.queueLength > 0) {
      console.log(`   ⚠️  ${queueData.queueLength} events pending processing`);
      results.issues.push(`${queueData.queueLength} events stuck in queue`);
    }
    
    if (queueData.failedQueueLength > 0) {
      console.log(`   ❌ ${queueData.failedQueueLength} failed events`);
      results.issues.push(`${queueData.failedQueueLength} failed events in queue`);
    }
    
  } catch (error) {
    console.log(`   ❌ Queue check failed: ${error.message}`);
    results.steps.queue = { status: 'failed', error: error.message };
    results.issues.push('Queue processor not accessible');
  }
  
  console.log('');

  // Step 2: Check Active Automations
  console.log('🤖 Step 2: Checking Active Automations...');
  try {
    const automationsResponse = await fetch(`${BASE_URL}/api/automations`);
    const automationsData = await automationsResponse.json();
    
    results.steps.automations = {
      status: automationsResponse.ok ? 'success' : 'failed',
      data: automationsData
    };
    
    const activeAutomations = automationsData.automations?.filter(a => a.active) || [];
    console.log(`   ✅ Total automations: ${automationsData.automations?.length || 0}`);
    console.log(`   ✅ Active automations: ${activeAutomations.length}`);
    
    if (activeAutomations.length === 0) {
      console.log(`   ❌ No active automations found!`);
      results.issues.push('No active automations configured');
      results.recommendations.push('Create and activate at least one automation');
    } else {
      activeAutomations.forEach((automation, index) => {
        console.log(`   ${index + 1}. "${automation.name}" (${automation.triggerType} → ${automation.actionType})`);
        console.log(`      Keywords: [${automation.keywords?.join(', ') || 'none'}]`);
        
        if (!automation.keywords || automation.keywords.length === 0) {
          results.issues.push(`Automation "${automation.name}" has no keywords`);
        }
        
        if (!automation.message && !automation.commentReply && !automation.aiPrompt) {
          results.issues.push(`Automation "${automation.name}" has no response message`);
        }
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Automations check failed: ${error.message}`);
    results.steps.automations = { status: 'failed', error: error.message };
    results.issues.push('Cannot fetch automations');
  }
  
  console.log('');

  // Step 3: Test Queue Processing
  console.log('⚡ Step 3: Testing Queue Processing...');
  try {
    const processResponse = await fetch(`${BASE_URL}/api/process-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: 5 })
    });
    const processData = await processResponse.json();
    
    results.steps.processing = {
      status: processResponse.ok ? 'success' : 'failed',
      data: processData
    };
    
    console.log(`   ✅ Processed: ${processData.processedCount || 0} events`);
    console.log(`   ✅ Failed: ${processData.failedCount || 0} events`);
    console.log(`   ✅ Processing time: ${processData.totalTime || 0}ms`);
    
    if (processData.queueLength > 0) {
      console.log(`   ⚠️  ${processData.queueLength} events still in queue`);
    }
    
  } catch (error) {
    console.log(`   ❌ Queue processing test failed: ${error.message}`);
    results.steps.processing = { status: 'failed', error: error.message };
    results.issues.push('Queue processing not working');
  }
  
  console.log('');

  // Step 4: Test Webhook Endpoint
  console.log('🪝 Step 4: Testing Webhook Endpoint...');
  try {
    const webhookResponse = await fetch(`${BASE_URL}/api/webhooks/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'automation-debug' })
    });
    const webhookData = await webhookResponse.json();
    
    results.steps.webhook = {
      status: webhookResponse.ok ? 'success' : 'failed',
      data: webhookData
    };
    
    console.log(`   ✅ Webhook endpoint accessible`);
    console.log(`   ✅ Response time: ${webhookData.timestamp}`);
    
  } catch (error) {
    console.log(`   ❌ Webhook test failed: ${error.message}`);
    results.steps.webhook = { status: 'failed', error: error.message };
    results.issues.push('Webhook endpoint not accessible');
  }
  
  console.log('');

  // Step 5: Check Environment Variables (basic)
  console.log('🔧 Step 5: Checking Environment Configuration...');
  const envChecks = [
    'REDIS_URL',
    'REDIS_TOKEN', 
    'INSTAGRAM_CLIENT_SECRET',
    'INSTAGRAM_WEBHOOK_VERIFY_TOKEN'
  ];
  
  envChecks.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: configured`);
    } else {
      console.log(`   ❌ ${envVar}: missing`);
      results.issues.push(`Missing environment variable: ${envVar}`);
    }
  });
  
  console.log('');

  // Step 6: Test Instagram Comment Simulation
  console.log('📝 Step 6: Testing Comment Processing Simulation...');
  try {
    const testCommentResponse = await fetch(`${BASE_URL}/api/test/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commentText: 'hello test info',
        postId: 'test_post_123',
        commenterId: 'test_user_456'
      })
    });
    const testCommentData = await testCommentResponse.json();
    
    results.steps.commentTest = {
      status: testCommentResponse.ok ? 'success' : 'failed',
      data: testCommentData
    };
    
    if (testCommentResponse.ok) {
      console.log(`   ✅ Comment processing simulation successful`);
    } else {
      console.log(`   ❌ Comment processing failed: ${testCommentData.error}`);
      results.issues.push('Comment processing not working');
    }
    
  } catch (error) {
    console.log(`   ❌ Comment test failed: ${error.message}`);
    results.steps.commentTest = { status: 'failed', error: error.message };
    results.issues.push('Comment test endpoint not working');
  }

  console.log('');

  // Summary
  console.log('📋 SUMMARY');
  console.log('==========');
  
  if (results.issues.length === 0) {
    console.log('✅ All systems operational! Your automations should be working.');
  } else {
    console.log(`❌ Found ${results.issues.length} issue(s):`);
    results.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  console.log('\n🚀 Next Steps:');
  
  if (results.steps.queue?.data?.queueLength > 0) {
    console.log('   1. Clear stuck events in queue by calling POST /api/process-queue');
  }
  
  if (results.issues.includes('No active automations configured')) {
    console.log('   2. Create and activate automations in your dashboard');
  }
  
  if (results.issues.some(i => i.includes('environment'))) {
    console.log('   3. Check your Vercel environment variables');
  }
  
  console.log('   4. Test with a real Instagram comment using your trigger keywords');
  console.log('   5. Monitor your Cloudflare Worker logs for processing activity');
  
  // Write detailed results to file
  require('fs').writeFileSync('debug-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed results saved to debug-results.json');
}

// Run the debug script
debugAutomations().catch(console.error); 