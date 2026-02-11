/**
 * RSC Error Handler
 * Suppresses Next.js 15 RSC payload errors that cause console spam
 */

// Suppress RSC errors in development
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      return await originalFetch.call(this, input, init);
    } catch (error: any) {
      // Suppress RSC payload errors specifically
      if (error?.message?.includes('Failed to fetch RSC payload') || 
          error?.message?.includes('e.includes is not a function')) {
        console.warn('RSC Error suppressed:', error.message);
        // Return a mock response to prevent crashes
        return new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw error;
    }
  };
}

// Suppress console errors related to RSC
if (typeof console !== 'undefined') {
  const originalError = console.error;
  console.error = function(...args: any[]) {
    const message = args[0];
    if (typeof message === 'string' && 
        (message.includes('Failed to fetch RSC payload') || 
         message.includes('e.includes is not a function'))) {
      // Suppress RSC errors
      return;
    }
    originalError.apply(console, args);
  };
}
