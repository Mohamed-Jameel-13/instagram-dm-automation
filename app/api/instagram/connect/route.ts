import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUserIdFromRequest } from "@/lib/firebase-auth-server"
import { ensureUserExists } from "@/lib/user-utils"

export async function POST(req: NextRequest) {
  try {
    // Parse the request body first
    const body = await req.json()
    const { accessToken, userId: requestUserId } = body
    
    console.log("🔗 Instagram connect request:", { hasAccessToken: !!accessToken, requestUserId })
    
    // Prioritize user ID from request body (from Firebase Auth on client)
    let userId = requestUserId
    if (!userId) {
      // Fallback to server-side extraction
      userId = await getUserIdFromRequest(req)
    }
    
    if (!userId) {
      console.error("❌ No userId found in request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!accessToken) {
      console.error("❌ Missing required accessToken")
      return NextResponse.json({ error: "Missing access token" }, { status: 400 })
    }

    console.log("✅ Basic validation passed, testing access token...")

    // Verify the access token: try Business API, then Basic Display API
    // First, determine if it's likely a Facebook token (EAF/EAAC) or Instagram token (IG/IGQVJ)
    const isLikelyFacebookToken = accessToken.includes('EAF') || accessToken.startsWith('EAAC');
    const isLikelyInstagramToken = accessToken.startsWith('IG') || accessToken.startsWith('IGQVJ');
    
    console.log(`🔍 Token appears to be: ${isLikelyFacebookToken ? 'Facebook/Business API' : isLikelyInstagramToken ? 'Instagram Basic Display API' : 'Unknown type'}`);
    console.log(`🔍 Token prefix: ${accessToken.substring(0, 10)}...`);
    
    // Try the most likely endpoint first based on token format
    let testResponse;
    let isBusiness = false;
    let allErrors = [];
    
    // Try Facebook Graph API first
    try {
      console.log('🔄 Testing with Facebook Graph API...');
      const fbResponse = await fetch(`https://graph.facebook.com/me?fields=id,username,account_type&access_token=${accessToken}`);
      
      if (fbResponse.ok) {
        console.log('✅ Facebook Graph API validation successful');
        testResponse = fbResponse;
        isBusiness = true;
      } else {
        const errorText = await fbResponse.text();
        console.error(`❌ Facebook Graph API validation failed: ${fbResponse.status}`, errorText);
        allErrors.push(`Facebook API (${fbResponse.status}): ${errorText}`);
      }
    } catch (error) {
      console.error('💥 Facebook Graph API exception:', error);
      allErrors.push(`Facebook API exception: ${error.message}`);
    }
    
    // If Facebook API failed, try Instagram Graph API
    if (!testResponse || !testResponse.ok) {
      try {
        console.log('🔄 Testing with Instagram Graph API...');
        const igResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
        
        if (igResponse.ok) {
          console.log('✅ Instagram Graph API validation successful');
          testResponse = igResponse;
        } else {
          const errorText = await igResponse.text();
          console.error(`❌ Instagram Graph API validation failed: ${igResponse.status}`, errorText);
          allErrors.push(`Instagram API (${igResponse.status}): ${errorText}`);
        }
      } catch (error) {
        console.error('💥 Instagram Graph API exception:', error);
        allErrors.push(`Instagram API exception: ${error.message}`);
      }
    }
    
    // If both failed, try debug token endpoint
    if (!testResponse || !testResponse.ok) {
      try {
        console.log('⚠️ Both API tests failed, trying debug endpoint...');
        const debugResponse = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`);
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log('🔍 Debug token info:', JSON.stringify(debugData, null, 2));
          
          // Try one more time with user token
          if (debugData?.data?.user_id) {
            console.log(`🔄 Trying with user_id ${debugData.data.user_id}...`);
            const userResponse = await fetch(`https://graph.facebook.com/${debugData.data.user_id}?fields=id,name&access_token=${accessToken}`);
            if (userResponse.ok) {
              console.log('✅ User endpoint validation successful');
              testResponse = userResponse;
              isBusiness = true;
            } else {
              const errorText = await userResponse.text();
              console.error(`❌ User endpoint validation failed: ${userResponse.status}`, errorText);
              allErrors.push(`User endpoint (${userResponse.status}): ${errorText}`);
            }
          }
        } else {
          const errorText = await debugResponse.text();
          console.error(`❌ Debug token validation failed: ${debugResponse.status}`, errorText);
          allErrors.push(`Debug token (${debugResponse.status}): ${errorText}`);
        }
      } catch (error) {
        console.error('💥 Debug token exception:', error);
        allErrors.push(`Debug token exception: ${error.message}`);
      }
    }
    
    // If all validation attempts failed, try one last approach using the debug token
    if (!testResponse || !testResponse.ok) {
      try {
        console.log('🔄 All direct API tests failed, trying debug_token as last resort...');
        const debugResponse = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`);
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log('🔍 Debug token info:', JSON.stringify(debugData, null, 2));
          
          // Check if this is a valid token with Instagram permissions
          if (debugData?.data?.is_valid && 
              debugData?.data?.scopes?.includes('instagram_basic') && 
              debugData?.data?.granular_scopes) {
            
            // Find the Instagram business account ID from granular scopes
            let instagramAccountId = null;
            for (const scope of debugData.data.granular_scopes) {
              if ((scope.scope === 'instagram_basic' || 
                   scope.scope === 'instagram_manage_comments' || 
                   scope.scope === 'instagram_manage_messages') && 
                  scope.target_ids && 
                  scope.target_ids.length > 0) {
                instagramAccountId = scope.target_ids[0];
                break;
              }
            }
            
            if (instagramAccountId) {
              console.log(`✅ Found Instagram account ID from debug token: ${instagramAccountId}`);
              
              // Try to get account details using the Instagram ID
              const igDetailsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=id,username,profile_picture_url&access_token=${accessToken}`
              );
              
              if (igDetailsResponse.ok) {
                testResponse = igDetailsResponse;
                console.log('✅ Successfully validated token using Instagram business ID');
              } else {
                const errorText = await igDetailsResponse.text();
                console.error(`❌ Instagram business ID validation failed: ${igDetailsResponse.status}`, errorText);
                allErrors.push(`Instagram business ID (${igDetailsResponse.status}): ${errorText}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('💥 Final validation attempt exception:', error);
        allErrors.push(`Final validation exception: ${error.message}`);
      }
    }
    
    // If all validation attempts failed, return detailed error
    if (!testResponse || !testResponse.ok) {
      console.error('❌ All validation attempts failed');
      console.error('📝 Collected errors:', allErrors);
      return NextResponse.json({ 
        error: "Invalid access token", 
        details: allErrors.join(' | ').substring(0, 500) 
      }, { status: 400 });
    }

    const meData = await testResponse.json()
    console.log("✅ Instagram API validation passed:", meData)

    // Resolve the business Instagram account ID and username if available
    let resolvedInstagramId = meData.id as string;
    let resolvedUsername = meData.username as string | undefined;
    let resolvedAccountType = isBusiness ? "BUSINESS" : "PERSONAL";
    let instagramIdFromDebugToken = null;
    
    // Try to get Instagram ID from debug token if we haven't already
    try {
      console.log('🔍 Checking debug token for Instagram ID...');
      const debugResponse = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`);
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        
        // Find the Instagram business account ID from granular scopes
        if (debugData?.data?.granular_scopes) {
          for (const scope of debugData.data.granular_scopes) {
            if ((scope.scope === 'instagram_basic' || 
                 scope.scope === 'instagram_manage_comments' || 
                 scope.scope === 'instagram_manage_messages') && 
                scope.target_ids && 
                scope.target_ids.length > 0) {
              instagramIdFromDebugToken = scope.target_ids[0];
              console.log(`✅ Found Instagram ID in debug token: ${instagramIdFromDebugToken}`);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('💥 Error getting Instagram ID from debug token:', error);
    }
    
    // If we found an Instagram ID in the debug token, use it
    if (instagramIdFromDebugToken) {
      resolvedInstagramId = instagramIdFromDebugToken;
      resolvedAccountType = "BUSINESS"; // If it's in granular scopes, it's a business account
      
      // Try to get the username using this ID
      try {
        const igDetailsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${resolvedInstagramId}?fields=username&access_token=${accessToken}`
        );
        
        if (igDetailsResponse.ok) {
          const igDetails = await igDetailsResponse.json();
          if (igDetails.username) {
            resolvedUsername = igDetails.username;
            console.log(`✅ Found username for Instagram ID: ${resolvedUsername}`);
          }
        }
      } catch (error) {
        console.error('💥 Error getting username for Instagram ID:', error);
      }
    }

    if (isBusiness) {
      try {
        const pagesResp = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`)
        if (pagesResp.ok) {
          const pages = await pagesResp.json()
          for (const page of pages.data || []) {
            const igResp = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
            if (igResp.ok) {
              const igData = await igResp.json()
              if (igData.instagram_business_account?.id) {
                resolvedInstagramId = igData.instagram_business_account.id
                const igDetails = await fetch(`https://graph.facebook.com/v18.0/${resolvedInstagramId}?fields=id,username,account_type&access_token=${page.access_token}`)
                if (igDetails.ok) {
                  const details = await igDetails.json()
                  resolvedUsername = details.username
                  resolvedAccountType = details.account_type || "BUSINESS"
                }
                break
              }
            }
          }
        }
      } catch (e) {
        console.warn("⚠️ Could not resolve business instagram account via pages traversal")
      }
    }

    console.log("🔄 Ensuring user exists in database...")
    // Ensure the user exists in our database first
    try {
      await ensureUserExists(userId, resolvedUsername)
      console.log("✅ User exists/created successfully")
    } catch (userError) {
      console.error("❌ Error ensuring user exists:", userError)
      return NextResponse.json({ 
        error: "Failed to create/verify user", 
        details: userError instanceof Error ? userError.message : String(userError)
      }, { status: 500 })
    }

    console.log("🔄 Saving Instagram account connection...")
    
    // Detect actual token capabilities by testing endpoints
    console.log("🔍 Testing token capabilities...")
    let detectedCapabilities = ["user_profile", "user_media"]
    
    try {
      // Test messaging capability
      const conversationTestResponse = await fetch(
        `https://graph.facebook.com/v18.0/${resolvedInstagramId}/conversations?access_token=${accessToken}`
      )
      
      if (conversationTestResponse.ok) {
        console.log("✅ Token can access conversations - has messaging capability")
        detectedCapabilities.push("instagram_manage_messages")
      } else {
        console.log("❌ Token cannot access conversations - no messaging capability")
      }
      
      // Test commenting capability (try to get media comments)
      const mediaTestResponse = await fetch(
        `https://graph.facebook.com/v18.0/${resolvedInstagramId}/media?fields=id&limit=1&access_token=${accessToken}`
      )
      
      if (mediaTestResponse.ok) {
        const mediaData = await mediaTestResponse.json()
        if (mediaData.data?.[0]?.id) {
          const commentsTestResponse = await fetch(
            `https://graph.facebook.com/v18.0/${mediaData.data[0].id}/comments?access_token=${accessToken}`
          )
          
          if (commentsTestResponse.ok) {
            console.log("✅ Token can access media comments - has commenting capability")
            detectedCapabilities.push("instagram_manage_comments")
          } else {
            console.log("❌ Token cannot access media comments - no commenting capability")
          }
        }
      }
      
      // Test business account verification
      const businessTestResponse = await fetch(
        `https://graph.facebook.com/v18.0/${resolvedInstagramId}?fields=id,username,account_type&access_token=${accessToken}`
      )
      
      if (businessTestResponse.ok) {
        const data = await businessTestResponse.json()
        if (data.account_type === "BUSINESS") {
          console.log("✅ Account is verified as Business type")
          // Business accounts might have additional capabilities
          if (!detectedCapabilities.includes("instagram_manage_messages")) {
            console.log("⚠️ Business account but no messaging detected - might be token limitation")
          }
        } else {
          console.log("ℹ️ Account type:", data.account_type || "PERSONAL")
        }
      }
      
    } catch (error) {
      console.log("⚠️ Error testing token capabilities:", error)
    }
    
    const detectedScope = detectedCapabilities.join(",")
    console.log("🔍 Final detected capabilities:", detectedScope)
    
    // Save or update the Instagram account connection
    try {
      const account = await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: "instagram",
            providerAccountId: resolvedInstagramId,
          },
        },
        update: {
          access_token: accessToken,
          refresh_token: null,
          expires_at: null,
          scope: detectedScope,
        },
        create: {
          userId: userId,
          type: "oauth",
          provider: "instagram",
          providerAccountId: resolvedInstagramId,
          access_token: accessToken,
          token_type: "bearer",
          scope: detectedScope,
        },
      })
      
      console.log("✅ Instagram account saved successfully:", { 
        accountId: account.id, 
        provider: account.provider,
        providerAccountId: account.providerAccountId 
      })

      return NextResponse.json({
        success: true,
        account: {
          id: resolvedInstagramId,
          username: resolvedUsername || meData.username,
          accountType: resolvedAccountType,
        },
      })
    } catch (accountError) {
      console.error("❌ Error saving Instagram account:", accountError)
      return NextResponse.json({ 
        error: "Failed to save Instagram account", 
        details: accountError instanceof Error ? accountError.message : String(accountError)
      }, { status: 500 })
    }
  } catch (error) {
    console.error("💥 Instagram connection error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Get user ID from request
    let userId = await getUserIdFromRequest(req)
    
    // Also check query parameters for user ID (from client)
    if (!userId) {
      const url = new URL(req.url)
      userId = url.searchParams.get('userId')
    }
    
    if (!userId) {
      console.error("❌ No userId found in disconnect request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔗 Instagram disconnect request for user:", userId)

    // Find and delete the Instagram account connection
    const deletedAccount = await prisma.account.deleteMany({
      where: {
        userId: userId,
        provider: "instagram",
      },
    })

    if (deletedAccount.count === 0) {
      console.log("❌ No Instagram account found to disconnect for user:", userId)
      return NextResponse.json({ error: "No Instagram account found" }, { status: 404 })
    }

    console.log("✅ Instagram account disconnected successfully for user:", userId)

    return NextResponse.json({
      success: true,
      message: "Instagram account disconnected successfully",
    })

  } catch (error) {
    console.error("💥 Instagram disconnect error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
