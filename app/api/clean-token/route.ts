import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }
    
    // Clean the token
    const cleanToken = token
      .trim()
      .replace(/\s+/g, '') // Remove all whitespace
      .replace(/[\r\n]+/g, '') // Remove line breaks
      .replace(/["'`]/g, ''); // Remove quotes
    
    // Analyze token
    const analysis = {
      originalLength: token.length,
      cleanedLength: cleanToken.length,
      prefix: cleanToken.substring(0, 10) + '...',
      containsLineBreaks: /[\r\n]+/.test(token),
      containsSpaces: /\s+/.test(token),
      containsQuotes: /["'`]/.test(token),
      startsWithEAF: cleanToken.includes('EAF'),
      startsWithEAAC: cleanToken.startsWith('EAAC'),
      startsWithIG: cleanToken.startsWith('IG'),
      startsWithIGQVJ: cleanToken.startsWith('IGQVJ'),
      isLikelyValid: cleanToken.length > 50 && (
        cleanToken.includes('EAF') || 
        cleanToken.startsWith('EAAC') || 
        cleanToken.startsWith('IG') || 
        cleanToken.startsWith('IGQVJ')
      )
    };
    
    return NextResponse.json({
      originalToken: token,
      cleanedToken: cleanToken,
      analysis
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error processing token',
      message: error.message
    }, { status: 500 });
  }
}
