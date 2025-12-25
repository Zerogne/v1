import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword, isBcryptHash } from "@/lib/password"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase()

    // Find user by email (case-insensitive)
    // Try normalized email first, then try original email (for backward compatibility)
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // If not found with normalized email, try original email (for existing users)
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: email.trim() },
      })
    }

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password - handle both bcrypt hashes and plaintext (for migration)
    let passwordValid = false
    if (isBcryptHash(user.password)) {
      // Password is hashed, use bcrypt comparison
      passwordValid = await verifyPassword(password, user.password)
    } else {
      // Legacy plaintext password (for migration) - compare directly but log warning
      console.warn(`User ${user.email} has plaintext password - should be migrated to bcrypt`)
      const storedPassword = (user.password || "").trim()
      const providedPassword = (password || "").trim()
      passwordValid = storedPassword === providedPassword
    }
    
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Set cookie for server-side access
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      message: "Logged in successfully",
    })

    // Set secure cookie that server components can read
    response.cookies.set("userEmail", user.email, {
      httpOnly: true, // Prevent XSS attacks - cookies not accessible via JavaScript
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/", // Available site-wide
    })

    return response
  } catch (error) {
    console.error("Error logging in:", error)
    return NextResponse.json(
      { error: "Failed to log in" },
      { status: 500 }
    )
  }
}

