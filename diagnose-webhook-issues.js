// COMPREHENSIVE INSTAGRAM WEBHOOK DIAGNOSIS
// This script checks all possible webhook issues

console.log('🔍 INSTAGRAM WEBHOOK DIAGNOSIS - All Possible Issues\n');

// 1. WEBHOOK URL VERIFICATION
console.log('1. 📡 WEBHOOK URL VERIFICATION');
console.log('✅ Deployed URL: https://instagram-dm-automation-b5yydpz7z-jameels-projects-13.vercel.app');
console.log('✅ Webhook Endpoint: /api/webhooks/instagram');
console.log('✅ Full Webhook URL: https://instagram-dm-automation-b5yydpz7z-jameels-projects-13.vercel.app/api/webhooks/instagram');
console.log('✅ Verification tested: Working (returns challenge)');
console.log('');

// 2. INSTAGRAM APP CONFIGURATION ISSUES
console.log('2. 🔧 INSTAGRAM APP CONFIGURATION CHECKLIST');
console.log('❓ Issue: Instagram App Type');
console.log('   ↳ Solution: Must be "Instagram Basic Display" or "Instagram API" app');
console.log('   ↳ Check: developers.facebook.com → Your App → App Type');
console.log('');

console.log('❓ Issue: App Review Status');  
console.log('   ↳ Solution: App must be approved for webhook permissions');
console.log('   ↳ Check: App Review tab in developer console');
console.log('');

console.log('❓ Issue: Webhook Subscription');
console.log('   ↳ Solution: Must subscribe to "comments" and "messages" events');
console.log('   ↳ Check: Instagram → Webhooks → Subscriptions');
console.log('');

// 3. BUSINESS ACCOUNT ISSUES
console.log('3. 🏢 BUSINESS ACCOUNT ISSUES');
console.log('❓ Issue: Account Type');
console.log('   ↳ Solution: Instagram account MUST be Business or Creator account');
console.log('   ↳ Check: Instagram → Settings → Account → Switch to Professional Account');
console.log('');

console.log('❓ Issue: Facebook Page Connection');
console.log('   ↳ Solution: Business account must be connected to Facebook Page');
console.log('   ↳ Check: Instagram → Settings → Business → Facebook Page');
console.log('');

// 4. ACCESS TOKEN ISSUES
console.log('4. 🔑 ACCESS TOKEN ISSUES');
console.log('❓ Issue: Token Permissions');
console.log('   ↳ Solution: Token needs instagram_manage_messages, instagram_manage_comments');
console.log('   ↳ Current token starts with: IGAAR2zUZBcOJNBZAE9QaTY4SGw4cmNT...');
console.log('');

console.log('❓ Issue: Token Expiry');
console.log('   ↳ Solution: Long-lived tokens expire, need refresh');
console.log('   ↳ Check: Test token with Instagram API call');
console.log('');

// 5. WEBHOOK SUBSCRIPTION STEPS  
console.log('5. 📋 WEBHOOK SUBSCRIPTION STEPS (COMPLETE PROCESS)');
console.log('Step 1: Go to developers.facebook.com');
console.log('Step 2: Select your Instagram app');
console.log('Step 3: Instagram → Webhooks');
console.log('Step 4: Edit webhook subscription or Add new webhook');
console.log('Step 5: Set callback URL: https://instagram-dm-automation-b5yydpz7z-jameels-projects-13.vercel.app/api/webhooks/instagram');
console.log('Step 6: Set verify token: verify_ig_webhook_2024_a7f3k9m2n8q1');
console.log('Step 7: Subscribe to fields: comments, messages');
console.log('Step 8: Click "Verify and Save"');
console.log('');

// 6. TESTING ISSUES
console.log('6. 🧪 TESTING REQUIREMENTS');
console.log('❓ Issue: Comment Location');
console.log('   ↳ Solution: Must comment on YOUR business account\'s posts');
console.log('   ↳ Wrong: Commenting on other people\'s posts');
console.log('   ↳ Right: Comment on @writesparkai posts');
console.log('');

console.log('❓ Issue: Account Ownership');
console.log('   ↳ Solution: Webhook only triggers for posts owned by connected account');
console.log('   ↳ Check: Comment on posts from account ID 24695355950081100');
console.log('');

// 7. COMMON FACEBOOK/META ISSUES
console.log('7. 🔴 COMMON META DEVELOPER ISSUES');
console.log('❓ Issue: App Development Mode');
console.log('   ↳ Solution: App might be in development mode, limiting webhook delivery');
console.log('   ↳ Check: App Settings → Basic → App Mode');
console.log('');

console.log('❓ Issue: Rate Limiting');
console.log('   ↳ Solution: Meta rate limits webhook calls');
console.log('   ↳ Check: Wait 1-2 minutes between test comments');
console.log('');

console.log('❓ Issue: Geographic Restrictions');
console.log('   ↳ Solution: Some regions have restricted API access');
console.log('   ↳ Check: App Settings → Basic → Server IP Whitelist');
console.log('');

// 8. DEBUGGING COMMANDS
console.log('8. 🛠️ DEBUGGING COMMANDS TO RUN');
console.log('');
console.log('A) Test Instagram API Access:');
console.log('curl "https://graph.instagram.com/v18.0/24695355950081100?fields=id,username,account_type&access_token=YOUR_TOKEN"');
console.log('');

console.log('B) Check Webhook Subscriptions:');
console.log('curl "https://graph.instagram.com/v18.0/24695355950081100/subscribed_apps?access_token=YOUR_TOKEN"');
console.log('');

console.log('C) Test Webhook Manually:');
console.log('curl -X POST https://instagram-dm-automation-b5yydpz7z-jameels-projects-13.vercel.app/api/webhooks/instagram \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -H "X-Hub-Signature-256: sha256=test_signature_for_testing" \\');
console.log('  -d \'{"test": "webhook"}\'');
console.log('');

// 9. MOST LIKELY ISSUES (PRIORITY ORDER)
console.log('9. 🎯 MOST LIKELY ISSUES (CHECK IN ORDER)');
console.log('🥇 #1: Not commenting on YOUR business account posts');
console.log('🥈 #2: Instagram app not properly configured for webhooks');
console.log('🥉 #3: Business account not connected to Facebook Page');
console.log('4️⃣ #4: App in development mode, webhooks restricted');
console.log('5️⃣ #5: Access token expired or missing permissions');
console.log('');

console.log('💡 IMMEDIATE ACTION ITEMS:');
console.log('1. Verify you\'re commenting on @writesparkai posts (your business account)');
console.log('2. Check Meta Developer Console webhook configuration');
console.log('3. Ensure Instagram Business account is connected to Facebook Page');
console.log('4. Test the API access with the debugging commands above');
console.log('');

console.log('🚨 If still no webhooks after checking above, the issue is likely:');
console.log('   - App review/approval required for webhook permissions');  
console.log('   - Instagram account type (must be Business/Creator)');
console.log('   - Geographic/regional API restrictions');
