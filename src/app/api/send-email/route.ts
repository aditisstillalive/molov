import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

function readEmails(filename: string): string[] {
  try {
    const filePath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      filename
    );
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

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "SMTP_USER or SMTP_PASS not configured" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    // Recipients
    const toEmail = process.env.TO_EMAIL;
    const ccEmail = process.env.CC_EMAIL;
    const to = toEmail ? toEmail : readEmails("recipient.txt").join(", ");
    const cc = ccEmail ? ccEmail : readEmails("cc.txt").join(", ");

    if (!to) {
      return NextResponse.json(
        {
          error:
            "No recipients configured. Set TO_EMAIL or create recipient.txt",
        },
        { status: 500 }
      );
    }

    // Build email
    const rows = items
      .map(
        (item: { tenant: string; amount: string }) =>
          `${item.tenant}: Rp ${item.amount}`
      )
      .join("\n");

    const htmlRows = items
      .map(
        (item: { tenant: string; amount: string }) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${item.tenant}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">Rp ${item.amount}</td></tr>`
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
              <td style="padding:8px 12px;text-align:right;font-family:monospace">Rp ${total.toLocaleString("id-ID")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const text = `Payment Summary\n\nImage: ${imageName || "N/A"}\n\n${rows}\n\nTotal: Rp ${total.toLocaleString("id-ID")}`;

    await transporter.sendMail({
      from: smtpUser,
      to,
      cc: cc || undefined,
      subject: `Payment Summary - ${imageName || "Upload"}`,
      text,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send email error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
