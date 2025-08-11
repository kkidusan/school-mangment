import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { auth, db, signInWithEmailAndPassword, collection, query, where, getDocs } from "../../firebase";

const JWT_SECRET = process.env.JWT_SECRET;

// Validate environment variables at runtime
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in environment variables");
}

export async function POST(request: Request) {
  try {
    // Validate Firebase initialization
    if (!auth || !db) {
      console.error("Firebase initialization failed: auth or db is undefined");
      return NextResponse.json(
        { error: "Firebase not initialized. Please check configuration." },
        { status: 500 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Attempt to sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check admin collection
    const adminRef = collection(db, "admin");
    const adminQuery = query(adminRef, where("email", "==", user.email));
    const adminSnapshot = await getDocs(adminQuery);

    // Check teachers collection
    const teacherRef = collection(db, "teachers");
    const teacherQuery = query(teacherRef, where("email", "==", user.email));
    const teacherSnapshot = await getDocs(teacherQuery);

    let role = null;
    let token = null;

    if (!adminSnapshot.empty) {
      role = "admin";
      token = jwt.sign(
        { userId: user.uid, email: user.email, role },
        JWT_SECRET as string,
        { expiresIn: "1h" }
      );
    } else if (!teacherSnapshot.empty) {
      role = "teacher"; // Set single teacher role
      token = jwt.sign(
        { userId: user.uid, email: user.email, role },
        JWT_SECRET as string,
        { expiresIn: "1h" }
      );
    } else {
      return NextResponse.json({ error: "User not found in Firestore." }, { status: 403 });
    }

    // Set session cookie
    const response = NextResponse.json({ message: "Login successful", role, email: user.email });
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600, // 1 hour
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });

    let errorMessage = "Login failed. Please check your credentials.";
    let status = 401;

    switch (error.code) {
      case "auth/invalid-api-key":
        errorMessage = "Invalid Firebase API key. Please contact support.";
        status = 500;
        break;
      case "auth/user-not-found":
        errorMessage = "No user found with this email.";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password.";
        break;
      case "auth/invalid-email":
        errorMessage = "Invalid email address.";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      default:
        errorMessage = `Login failed: ${error.message || "Unknown error"}`;
    }

    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export const dynamic = "force-dynamic";