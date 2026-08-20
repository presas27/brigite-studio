import { NextResponse, type NextRequest } from "next/server";
import { consumeSignInToken, startSession } from "@/lib/studio/auth";
import { seedStudio } from "@/lib/studio/seed";

/**
 * Landing point for the emailed sign-in link.
 *
 * A GET that mutates state is normally wrong, but this is the one case where it
 * is unavoidable: the click comes from a mail client. The token is single-use
 * and expires in 20 minutes, which is what makes it safe. Every failure mode
 * — missing, unknown, expired, reused — funnels to the same message so the URL
 * cannot be probed for valid tokens.
 */
export async function GET(request: NextRequest) {
  seedStudio();

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/app/entrar?erro=link", request.url));
  }

  const user = consumeSignInToken(token);
  if (!user) {
    return NextResponse.redirect(new URL("/app/entrar?erro=link", request.url));
  }

  await startSession(user.id);
  return NextResponse.redirect(
    new URL(user.role === "coach" ? "/app/coach" : "/app/aluno", request.url),
  );
}
