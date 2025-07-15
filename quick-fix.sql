-- Remove post restrictions from all comment automations for user 6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2
UPDATE "Automation" 
SET posts = '[]' 
WHERE "userId" = '6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2' 
  AND "triggerType" = 'comment' 
  AND active = true;

-- Verify the update
SELECT id, name, "triggerType", keywords, posts, active 
FROM "Automation" 
WHERE "userId" = '6Yyvo5r3ZsVFTeAMWoNyKdh6QWT2' 
  AND "triggerType" = 'comment' 
  AND active = true; 