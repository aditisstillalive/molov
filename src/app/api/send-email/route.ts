import { NextResponse } from "next/server";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

function readEmails(filename: string): string[] {
  try {
    const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), filename);
    const content = fs.readFileSync(filePath, "utf-8");
    return content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.includes("@"));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { items, imageName, total } = await request.json();

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    // Recipients: env vars first, then fall back to file-based config
    const toEmail = process.env.TO_EMAIL;
    const ccEmail = process.env.CC_EMAIL;

    const to = toEmail
      ? [toEmail]
      : readEmails("recipient.txt");
    const cc = ccEmail
      ? [ccEmail]
      : readEmails("cc.txt");

    if (to.length === 0) {
      return NextResponse.json(
        { error: "No recipients configured. Set TO_EMAIL or create recipient.txt" },
        { status: 500 }
      );
    }

    const fromEmail =
      process.env.FROM_EMAIL || "Payment OCR <onboarding@resend.dev>";

    // Build email body
    const rows = items
      .map(
        (item: { tenant: string; amount: string }) =>
          `${item.tenant}: ${item.amount}`
      )
      .join("\n");

    const htmlRows = items
      .map(
        (item: { tenant: string; amount: string }) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${item.tenant}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${item.amount}</td></tr>`
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Payment Summary</h2>
        <p>Image: ${imageName || "N/A"}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f9fafb">
              <th style="text-align:left;padding:8px 12px">Tenant</th>
              <th style="text-align:right;padding:8px 12px">Amount</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
          <tfoot>
            <tr style="background:#f9fafb;font-weight:bold">
              <td style="padding:8px 12px">Total</td>
              <td style="padding:8px 12px;text-align:right;font-family:monospace">${total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const text = `Payment Summary\n\nImage: ${imageName || "N/A"}\n\n${rows}\n\nTotal: ${total.toLocaleString()}`;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      cc,
      subject: `Payment Summary - ${imageName || "Upload"}`,
      text,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("Send email error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
