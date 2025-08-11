// DEBUG SCRIPT: Find root cause of duplicate processing
// This script will help identify why two private replies are being sent

const crypto = require('crypto');

// Mock webhook data to test our processing logic
const sampleWebhook = {
  "object": "instagram",
  "entry": [
    {
      "id": "17841463938674346",
      "time": 1733246000,
      "changes": [
        {
          "value": {
            "from": {
              "id": "test_user_123",
              "username": "testuser"
            },
            "media": {
              "id": "18034567890123456",
              "media_product_type": "FEED"
            },
            "text": "no",
            "comment_id": "17842567890123456_456789",
            "id": "17842567890123456_456789"
          },
          "field": "comments"
        }
      ]
    }
  ]
};

// Simulate our current event ID generation logic
function generateEventId(parsedBody, requestId) {
  const bodyString = JSON.stringify(parsedBody);
  let eventId = `${requestId}_${Buffer.from(bodyString).toString('base64').slice(0, 20)}`;
  
  // Create more specific event ID for comments
  if (parsedBody.entry?.[0]?.changes?.[0]?.value?.comment_id) {
    const comment = parsedBody.entry[0].changes[0].value;
    eventId = `comment_${comment.comment_id}_${comment.from?.id || 'unknown'}`;
  }
  
  return eventId;
}

console.log('=== DEBUGGING WEBHOOK EVENT ID GENERATION ===\n');

// Test 1: Same webhook content with different request IDs
console.log('Test 1: Same webhook content, different request IDs');
const req1 = 'req_1733246001_abc123';
const req2 = 'req_1733246002_def456';
const eventId1 = generateEventId(sampleWebhook, req1);
const eventId2 = generateEventId(sampleWebhook, req2);

console.log(`Request 1: ${req1} -> Event ID: ${eventId1}`);
console.log(`Request 2: ${req2} -> Event ID: ${eventId2}`);
console.log(`Same Event ID? ${eventId1 === eventId2 ? 'YES ✅' : 'NO ❌'}`);
console.log('---');

// Test 2: Slightly different webhook timing
console.log('Test 2: Same comment, different timestamps');
const webhook2 = {
  ...sampleWebhook,
  entry: [{
    ...sampleWebhook.entry[0],
    time: 1733246001  // Different timestamp
  }]
};

const eventId3 = generateEventId(webhook2, 'req_1733246003_ghi789');
console.log(`Original webhook -> Event ID: ${eventId1}`);
console.log(`Different timestamp -> Event ID: ${eventId3}`);
console.log(`Same Event ID? ${eventId1 === eventId3 ? 'YES ✅' : 'NO ❌'}`);
console.log('---');

// Test 3: Check if Instagram might send multiple webhook formats
console.log('Test 3: Different webhook structures for same comment');

// Possible Instagram sends both immediate and batched webhooks
const immediateWebhook = sampleWebhook;
const batchedWebhook = {
  "object": "instagram",
  "entry": [
    {
      "id": "17841463938674346",
      "time": 1733246000,
      "changes": [
        {
          "value": {
            "from": {
              "id": "test_user_123",
              "username": "testuser"
            },
            "media": {
              "id": "18034567890123456"
            },
            "text": "no",
            "comment_id": "17842567890123456_456789",
            "id": "17842567890123456_456789",
            "created_time": "2024-12-03T15:00:00+0000"  // Additional field
          },
          "field": "comments"
        }
      ]
    }
  ]
};

const immediateEventId = generateEventId(immediateWebhook, 'req_immediate');
const batchedEventId = generateEventId(batchedWebhook, 'req_batched');

console.log(`Immediate webhook -> Event ID: ${immediateEventId}`);
console.log(`Batched webhook -> Event ID: ${batchedEventId}`);
console.log(`Same Event ID? ${immediateEventId === batchedEventId ? 'YES ✅' : 'NO ❌'}`);
console.log('---');

// Test 4: Check processing logic flow
console.log('Test 4: Processing flow analysis');
console.log('Current flow:');
console.log('1. Webhook receives request');
console.log('2. Generate event ID based on comment_id + user_id');
console.log('3. Check if event ID already processed');
console.log('4. If not cached, process inline');
console.log('5. Cache result to prevent duplicates');
console.log('');

console.log('POTENTIAL ISSUES:');
console.log('❌ Issue 1: Instagram might send webhooks to multiple endpoints');
console.log('❌ Issue 2: Race condition if two webhooks arrive simultaneously');
console.log('❌ Issue 3: Event ID might not be unique enough');
console.log('❌ Issue 4: In-memory cache doesn\'t persist between server restarts');
console.log('❌ Issue 5: Multiple Instagram apps might send webhooks for same account');
console.log('');

console.log('RECOMMENDED FIXES:');
console.log('✅ Fix 1: Add millisecond timestamp to event ID for uniqueness');
console.log('✅ Fix 2: Use database-based deduplication instead of in-memory');
console.log('✅ Fix 3: Add request fingerprinting beyond just comment content');
console.log('✅ Fix 4: Log full webhook body to identify differences');
console.log('✅ Fix 5: Add processing mutex locks at database level');
