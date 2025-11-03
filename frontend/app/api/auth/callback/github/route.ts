import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error)
    // If opened in popup, close it and notify parent
    // Otherwise redirect to dashboard
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Authorization Failed</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'github_error', error: '${error}' }, '*');
              window.close();
            } else {
              window.location.href = '/dashboard?error=${encodeURIComponent(error)}';
            }
          </script>
        </body>
      </html>
    `
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // Validate code exists
  if (!code) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Authorization Failed</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'github_error', error: 'no_code' }, '*');
              window.close();
            } else {
              window.location.href = '/dashboard?error=no_code';
            }
          </script>
        </body>
      </html>
    `
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // Send code to parent window and close popup
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>GitHub Authorization Success</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'github_code', code: '${code}' }, '*');
            window.close();
          } else {
            window.location.href = '/dashboard?github_code=${code}';
          }
        </script>
      </body>
    </html>
  `
  
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
