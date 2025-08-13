import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }
    
    console.log('Testing token:', token.substring(0, 10) + '...');
    
    const results = {
      token_prefix: token.substring(0, 10) + '...',
      tests: [] as any[],
    };
    
    // Test 1: Facebook Graph API /me
    try {
      console.log('Test 1: Facebook Graph API /me');
      const fbResponse = await fetch(`https://graph.facebook.com/me?fields=id,username,account_type&access_token=${token}`);
      const fbStatus = fbResponse.status;
      const fbData = await fbResponse.text();
      
      results.tests.push({
        name: 'Facebook Graph API /me',
        success: fbResponse.ok,
        status: fbStatus,
        data: fbData,
      });
    } catch (error: any) {
      results.tests.push({
        name: 'Facebook Graph API /me',
        success: false,
        error: error.message,
      });
    }
    
    // Test 2: Instagram Graph API /me
    try {
      console.log('Test 2: Instagram Graph API /me');
      const igResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
      const igStatus = igResponse.status;
      const igData = await igResponse.text();
      
      results.tests.push({
        name: 'Instagram Graph API /me',
        success: igResponse.ok,
        status: igStatus,
        data: igData,
      });
    } catch (error: any) {
      results.tests.push({
        name: 'Instagram Graph API /me',
        success: false,
        error: error.message,
      });
    }
    
    // Test 3: Debug Token
    try {
      console.log('Test 3: Debug Token');
      const debugResponse = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
      const debugStatus = debugResponse.status;
      const debugData = await debugResponse.text();
      
      results.tests.push({
        name: 'Debug Token',
        success: debugResponse.ok,
        status: debugStatus,
        data: debugData,
      });
    } catch (error: any) {
      results.tests.push({
        name: 'Debug Token',
        success: false,
        error: error.message,
      });
    }
    
    // Check if any test was successful
    const anySuccess = results.tests.some(test => test.success);
    
    return NextResponse.json({
      token_valid: anySuccess,
      results,
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error testing token',
      message: error.message
    }, { status: 500 });
  }
}