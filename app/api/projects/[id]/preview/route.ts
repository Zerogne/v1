import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/lib/auth"

// Helper function to extract JSX return content and convert className to class
function extractJSXContent(tsxContent: string): string {
  if (!tsxContent) return ""
  
  // Remove 'use client' directive
  let content = tsxContent.replace(/^['"]use client['"];?\s*/m, "")
  
  // Remove import statements
  content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "")
  
  // Find the return statement
  const returnMatch = content.match(/return\s*\(([\s\S]*?)\)\s*;?\s*$/)
  if (returnMatch) {
    let jsx = returnMatch[1].trim()
    
    // Convert className to class
    jsx = jsx.replace(/className=/g, "class=")
    jsx = jsx.replace(/className:/g, "class:")
    
    // Remove template literals and expressions for now (simplified)
    jsx = jsx.replace(/\{[\s\S]*?\}/g, "")
    
    // Clean up extra whitespace
    jsx = jsx.replace(/\s+/g, " ").trim()
    
    return jsx
  }
  
  // Fallback: try to find JSX between return and closing brace
  const altMatch = content.match(/return\s*\(?([\s\S]*?)\)?\s*;?\s*}/)
  if (altMatch) {
    let jsx = altMatch[1].trim()
    jsx = jsx.replace(/className=/g, "class=")
    return jsx
  }
  
  return ""
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user email from query parameter (for iframe requests) or header
    const { searchParams } = new URL(request.url)
    const emailFromQuery = searchParams.get("email")
    const projectIdFromQuery = searchParams.get("projectId")
    
    // Create a new request with the email header if provided
    // Note: We can't modify headers directly, so we'll pass email to getUserId logic
    let userId: string
    if (emailFromQuery) {
      // Look up user by email directly
      const user = await prisma.user.findUnique({
        where: { email: emailFromQuery },
      })
      if (user) {
        userId = user.id
      } else {
        // Fallback to getUserId which will use headers or default user
        userId = await getUserId(request)
      }
    } else {
      userId = await getUserId(request)
    }
    const { id: projectId } = await params

    // Verify projectId from route matches query parameter (if provided)
    if (projectIdFromQuery && projectIdFromQuery !== projectId) {
      console.error(`[Preview] ProjectId mismatch! Route: ${projectId}, Query: ${projectIdFromQuery}`)
    }

    // Log for debugging
    console.log(`[Preview] Loading preview for projectId: ${projectId}, userId: ${userId}, queryProjectId: ${projectIdFromQuery}`)

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    })
    
    console.log(`[Preview] Project found: ${project ? project.name : 'NOT FOUND'}`)

    if (!project) {
      const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
  <div class="bg-white p-8 rounded-lg shadow-lg text-center">
    <h1 class="text-2xl font-bold text-red-600 mb-4">Preview Error</h1>
    <p class="text-gray-700">Project not found or access denied</p>
    <p class="text-sm text-gray-500 mt-2">Please make sure you're logged in and have access to this project.</p>
  </div>
</body>
</html>`
      return new NextResponse(errorHtml, {
        status: 404,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }

    // Get all project files
    const files = await prisma.projectFile.findMany({
      where: {
        projectId,
        isDeleted: false,
      },
      orderBy: { path: "asc" },
    })
    
    console.log(`[Preview] Found ${files.length} files for project ${projectId}`)
    console.log(`[Preview] File paths: ${files.map(f => f.path).join(", ")}`)

    // Find key files - use flexible matching
    const layoutFile = files.find((f) => 
      f.path === "app/layout.tsx" || 
      f.path === "app/layout.ts" ||
      f.path.endsWith("/layout.tsx") ||
      f.path.endsWith("/layout.ts")
    )
    
    // Look for page file with flexible matching - find ANY page.tsx file in the project
    // Priority order:
    // 1. app/page.tsx (root page)
    // 2. Any /page.tsx file (like app/dashboard/page.tsx)
    // 3. Any file with "page.tsx" in the name
    let pageFile = files.find((f) => 
      f.path === "app/page.tsx" || 
      f.path === "app/page.ts"
    )
    
    // If not found, try to find any file ending with /page.tsx or /page.ts (like app/dashboard/page.tsx)
    if (!pageFile) {
      pageFile = files.find((f) => 
        (f.path.endsWith("/page.tsx") || f.path.endsWith("/page.ts")) &&
        (f.path.includes("app/") || f.path.startsWith("app/"))
      )
    }
    
    // If still not found, try to find any file with "page" in the name in an app directory
    if (!pageFile) {
      pageFile = files.find((f) => 
        f.path.includes("app/") && f.path.includes("page") && (f.path.endsWith(".tsx") || f.path.endsWith(".ts"))
      )
    }
    
    // Last resort: find any file ending with page.tsx or page.ts anywhere
    if (!pageFile) {
      pageFile = files.find((f) => 
        f.path.endsWith("/page.tsx") || f.path.endsWith("/page.ts") || f.path === "page.tsx" || f.path === "page.ts"
      )
    }
    
    const globalsFile = files.find((f) => 
      f.path === "app/globals.css" ||
      f.path.endsWith("/globals.css") ||
      f.path === "globals.css"
    )
    
    console.log(`[Preview] Page file found: ${pageFile ? pageFile.path : "NOT FOUND"}`)
    console.log(`[Preview] Layout file found: ${layoutFile ? layoutFile.path : "NOT FOUND"}`)
    console.log(`[Preview] Globals file found: ${globalsFile ? globalsFile.path : "NOT FOUND"}`)

    // Get globals CSS
    const globalsCss = globalsFile?.content || ""

    // If no page file, show a message with debug info
    if (!pageFile) {
      const availableFiles = files.map(f => f.path).join(", ")
      const noPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${globalsCss}
  </style>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
  <div class="bg-white p-8 rounded-lg shadow-lg text-center max-w-2xl">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">No Preview Available</h1>
    <p class="text-gray-600 mb-4">This project doesn't have a page.tsx file yet.</p>
    <p class="text-sm text-gray-500 mt-2 mb-4">Project: ${project.name}</p>
    <div class="text-left bg-gray-50 p-4 rounded mt-4">
      <p class="text-xs font-semibold text-gray-700 mb-2">Available files (${files.length}):</p>
      <pre class="text-xs text-gray-600 overflow-auto">${availableFiles || "No files found"}</pre>
    </div>
    <p class="text-xs text-gray-500 mt-4">Tip: Create a file named "app/page.tsx" or "page.tsx" to enable preview.</p>
  </div>
</body>
</html>`
      return new NextResponse(noPageHtml, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      })
    }

    // Extract JSX content from page.tsx
    const pageContent = pageFile.content
    const extractedJSX = extractJSXContent(pageContent)
    
    console.log(`[Preview] Extracted JSX length: ${extractedJSX.length} chars`)
    console.log(`[Preview] Page file content preview: ${pageContent.substring(0, 200)}...`)

    // For now, we'll use a simple approach: try to render the actual content
    // This is a simplified version - in production you'd use proper React/TSX compilation
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${globalsCss}
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Store the page content
    const pageContent = ${JSON.stringify(pageContent)};
    const root = document.getElementById('root');
    
    // Simple JSX to HTML converter (very basic)
    function jsxToHtml(jsx) {
      if (!jsx || typeof jsx !== 'string') {
        return '<div class="p-8 text-center text-red-600"><p>Invalid JSX content</p></div>';
      }
      
      try {
        // Try to extract the main content
        // Look for the return statement's JSX (handle both return ( and return without parens)
        let returnMatch = jsx.match(/return\\s*\\(([\\s\\S]*?)\\)\\s*;?\\s*$/m);
        if (!returnMatch) {
          returnMatch = jsx.match(/return\\s+([\\s\\S]*?)\\s*;?\\s*$/m);
        }
        
        if (returnMatch) {
          let html = returnMatch[1];
          
          // Convert className to class
          html = html.replace(/className=["']([^"']*)["']/g, 'class="$1"');
          html = html.replace(/className=\\{([^}]*)\\}/g, 'class="$1"');
          
          // Remove JSX expressions for now (simplified) - but keep the structure
          html = html.replace(/\\{[^}]*\\}/g, '');
          
          // Clean up extra whitespace but preserve structure
          html = html.replace(/\\s+/g, ' ').trim();
          
          // Basic tag validation
          if (html.includes('<') && html.includes('>')) {
            return html;
          }
        }
        
        // Fallback: try to find any JSX-like content
        const jsxMatch = jsx.match(/<[^>]+>[\\s\\S]*<\\/[^>]+>/);
        if (jsxMatch) {
          return jsxMatch[0].replace(/className=/g, 'class=');
        }
        
        return '<div class="p-8 text-center"><p class="text-gray-600">Unable to parse JSX content. Make sure your page.tsx has a return statement with JSX.</p><pre class="text-xs text-left mt-4 p-4 bg-gray-100 rounded overflow-auto">' + 
               pageContent.substring(0, 500).replace(/</g, '&lt;').replace(/>/g, '&gt;') + 
               '</pre></div>';
      } catch (error) {
        console.error('JSX parsing error:', error);
        return '<div class="p-8 text-center text-red-600"><p>Error parsing JSX</p><p class="text-sm text-gray-500">' + error.message + '</p></div>';
      }
    }
    
    // Try to render the content
    try {
      const htmlContent = jsxToHtml(pageContent);
      if (htmlContent) {
        root.innerHTML = htmlContent;
      } else {
        root.innerHTML = '<div class="p-8 text-center text-red-600"><p>No content to render</p></div>';
      }
    } catch (error) {
      console.error('Error rendering preview:', error);
      root.innerHTML = '<div class="p-8 text-center text-red-600"><p>Error rendering preview</p><p class="text-sm text-gray-500">' + (error.message || 'Unknown error') + '</p></div>';
    }
  </script>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error) {
    console.error("Error generating preview:", error)
    const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
  <div class="bg-white p-8 rounded-lg shadow-lg text-center">
    <h1 class="text-2xl font-bold text-red-600 mb-4">Preview Error</h1>
    <p class="text-gray-700">Failed to generate preview</p>
    <p class="text-sm text-gray-500 mt-2">${error instanceof Error ? error.message : "Unknown error"}</p>
  </div>
</body>
</html>`
    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  }
}
