import { NextResponse } from 'next/server';
import { auth } from './firebase';
import { getAuth } from 'firebase/auth';

export async function middleware(request) {
  const user = auth.currentUser;
  
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};