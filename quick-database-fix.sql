-- WARNING: Only use this if you're confident the token is valid for account 17841473518392752
-- Replace 'YOUR_NEW_ACCESS_TOKEN' with the actual token

-- First, check current account data
SELECT id, userId, provider, providerAccountId, access_token, scope 
FROM account 
WHERE provider = 'instagram';

-- Update the account ID to match webhook (if you have the correct token)
-- UPDATE account 
-- SET providerAccountId = '17841473518392752',
--     access_token = 'YOUR_NEW_ACCESS_TOKEN'
-- WHERE provider = 'instagram' 
-- AND userId = 'YOUR_USER_ID';

-- Verify the update
-- SELECT id, userId, provider, providerAccountId, LEFT(access_token, 20) as token_preview
-- FROM account 
-- WHERE provider = 'instagram';
