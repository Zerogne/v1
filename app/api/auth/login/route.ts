import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
      console.error("User not found for email:", normalizedEmail)
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // For now, compare passwords directly (NOT SECURE - should use bcrypt in production)
    // TODO: Implement proper password verification with bcrypt
    // Trim both passwords to handle whitespace issues
    const storedPassword = (user.password || "").trim()
    const providedPassword = (password || "").trim()
    
    if (storedPassword !== providedPassword) {
      console.error("Password mismatch for user:", user.email, "Stored length:", storedPassword.length, "Provided length:", providedPassword.length)
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

    // Set cookie that server components can read
    response.cookies.set("userEmail", user.email, {
      httpOnly: false, // Allow client-side access too
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
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

