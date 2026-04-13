import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const survey = body?.survey as { useCases?: string[]; platform?: string } | undefined;
  const surveyHtml = survey
    ? `<hr/><p><strong>Use cases:</strong> ${(survey.useCases ?? []).join(", ") || "—"}</p><p><strong>Platform:</strong> ${survey.platform ?? "—"}</p>`
    : "";

  const { error } = await resend.emails.send({
    from: "Groupys Waitlist <noreply@groupys.app>",
    to: "support@groupys.app",
    subject: `New waitlist signup: ${email}`,
    html: `<p><strong>${email}</strong> just joined the Groupys waitlist.</p>${surveyHtml}`,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
