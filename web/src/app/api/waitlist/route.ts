import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes user input to prevent XSS attacks.
 */
function sanitizeInput(input: string | string[] | undefined): string {
  if (input === undefined || input === null) {
    return "—";
  }

  if (Array.isArray(input)) {
    return input.map((item) => DOMPurify.sanitize(String(item))).join(", ") || "—";
  }

  return DOMPurify.sanitize(String(input));
}

/**
 * Validates email format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  let body: { email?: string; survey?: { useCases?: string[]; platform?: string } } | null = null;
  try {
    body = await request.json();
  } catch {
    // Invalid JSON body
  }

  const rawEmail = body?.email?.trim().toLowerCase() ?? "";

  if (!rawEmail || !isValidEmail(rawEmail)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  // Validate email length
  if (rawEmail.length > 254) {
    return NextResponse.json({ error: "Email address too long." }, { status: 400 });
  }

  const survey = body?.survey;

  // Sanitize survey input to prevent XSS
  const sanitizedUseCases = sanitizeInput(survey?.useCases);
  const sanitizedPlatform = sanitizeInput(survey?.platform);

  const surveyHtml = survey
    ? `<hr/><p><strong>Use cases:</strong> ${sanitizedUseCases}</p><p><strong>Platform:</strong> ${sanitizedPlatform}</p>`
    : "";

  const { error } = await resend.emails.send({
    from: "Groupys Waitlist <noreply@groupys.app>",
    to: "support@groupys.app",
    subject: `New waitlist signup: ${rawEmail}`,
    html: `<p><strong>${rawEmail}</strong> just joined the Groupys waitlist.</p>${surveyHtml}`,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
