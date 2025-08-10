import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET() {
  try {
    // Validate JWT_SECRET
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get session token from cookies
    const cookieStore = await cookies(); // Add await here
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "No session token found" },
        { status: 401 }
      );
    }

    // Verify JWT token
    const decoded = jwt.verify(sessionToken, JWT_SECRET as string) as {
      userId: string;
      email: string;
      role: string;
    };

    // Check if user is admin
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied: Admin role required" },
        { status: 403 }
      );
    }

    // Return success with user data
    return NextResponse.json(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Session validation error:", {
      message: error.message,
      stack: error.stack,
    });

    if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        { error: "Invalid session token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to validate session" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";