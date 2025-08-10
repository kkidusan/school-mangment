import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Create a response that clears the session_token cookie
    const response = NextResponse.json({ message: "Logout successful" });

    // Clear the session_token cookie by setting it to an empty value and expiring it immediately
    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0, // Expire immediately
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error: any) {
    console.error("Logout error:", {
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Logout failed. Please try again." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";