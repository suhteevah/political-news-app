import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "suhteevah@gmail.com",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}) {
  return transporter.sendMail({
    from: `"The Right Wire" <${process.env.SMTP_USER || "suhteevah@gmail.com"}>`,
    to,
    subject,
    html,
    attachments,
  });
}

export function buildDigestHtml(posts: Array<{
  content: string;
  x_author_name: string;
  x_author_handle: string;
  category: string;
  created_at: string;
  external_url?: string;
  source?: string;
}>) {
  const postRows = posts.map((p) => {
    const link = p.external_url
      ? `<a href="${p.external_url}" style="color:#dc2626;text-decoration:none;">Read more →</a>`
      : "";
    const snippet = p.content.length > 200
      ? p.content.slice(0, 200) + "..."
      : p.content;

    return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #333;">
          <div style="color:#999;font-size:12px;margin-bottom:4px;">
            ${p.x_author_name} (@${p.x_author_handle}) · ${p.category || "General"}
          </div>
          <div style="color:#e5e5e5;font-size:14px;line-height:1.5;">
            ${snippet}
          </div>
          ${link ? `<div style="margin-top:8px;">${link}</div>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111;">
    <tr>
      <td style="padding:24px;text-align:center;border-bottom:2px solid #dc2626;">
        <h1 style="margin:0;color:white;font-size:24px;">
          🇺🇸 The Right Wire — Daily Digest
        </h1>
        <p style="margin:8px 0 0;color:#999;font-size:13px;">
          ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h2 style="color:#dc2626;font-size:16px;margin:0 0 16px;">Top Stories</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${postRows}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;text-align:center;border-top:1px solid #333;">
        <a href="https://the-right-wire.com" style="color:#dc2626;text-decoration:none;font-weight:bold;">
          Visit The Right Wire →
        </a>
        <p style="color:#666;font-size:11px;margin-top:16px;">
          You're receiving this because you subscribed to Wire Pro.
          <a href="https://the-right-wire.com/profile" style="color:#999;">Manage preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildBreakingAlertHtml(post: {
  id: string;
  content: string;
  x_author_name: string;
  x_author_handle: string;
  category: string;
  created_at: string;
  external_url?: string;
  source?: string;
}) {
  const snippet = post.content.length > 300
    ? post.content.slice(0, 300) + "..."
    : post.content;

  const link = post.external_url
    ? `<a href="${post.external_url}" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:bold;font-size:14px;">Read Full Story →</a>`
    : `<a href="https://the-right-wire.com/post/${post.id}" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:bold;font-size:14px;">Read on The Right Wire →</a>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111;">
    <tr>
      <td style="padding:20px 24px;text-align:center;background:#7f1d1d;border-bottom:3px solid #dc2626;">
        <h1 style="margin:0;color:white;font-size:20px;letter-spacing:1px;">
          🚨 BREAKING NEWS ALERT
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <div style="color:#999;font-size:12px;margin-bottom:8px;">
          ${post.x_author_name} (@${post.x_author_handle}) · ${post.category || "Breaking"}
        </div>
        <div style="color:#e5e5e5;font-size:15px;line-height:1.6;">
          ${snippet}
        </div>
        <div style="margin-top:20px;text-align:center;">
          ${link}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;text-align:center;border-top:1px solid #333;">
        <a href="https://the-right-wire.com" style="color:#dc2626;text-decoration:none;font-weight:bold;font-size:13px;">
          The Right Wire
        </a>
        <p style="color:#666;font-size:11px;margin-top:12px;">
          You're receiving this because you have breaking alerts enabled.
          <a href="https://the-right-wire.com/profile" style="color:#999;">Manage alert preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildWeeklyDigestHtml(posts: Array<{
  content: string;
  x_author_name: string;
  x_author_handle: string;
  category: string;
  created_at: string;
  external_url?: string;
  source?: string;
}>) {
  const postRows = posts.map((p) => {
    const link = p.external_url
      ? `<a href="${p.external_url}" style="color:#dc2626;text-decoration:none;">Read more →</a>`
      : "";
    const snippet = p.content.length > 150
      ? p.content.slice(0, 150) + "..."
      : p.content;

    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #333;">
          <div style="color:#999;font-size:11px;margin-bottom:4px;">
            ${p.x_author_name} · ${p.category || "General"}
          </div>
          <div style="color:#e5e5e5;font-size:13px;line-height:1.4;">
            ${snippet}
          </div>
          ${link ? `<div style="margin-top:6px;">${link}</div>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111;">
    <tr>
      <td style="padding:24px;text-align:center;border-bottom:2px solid #dc2626;">
        <h1 style="margin:0;color:white;font-size:22px;">
          🇺🇸 The Wire Report — Weekly Digest
        </h1>
        <p style="margin:8px 0 0;color:#999;font-size:13px;">
          Your free weekly roundup of the stories that matter
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h2 style="color:#dc2626;font-size:16px;margin:0 0 16px;">This Week's Top Stories</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${postRows}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;text-align:center;background:#0d0d0d;border-top:1px solid #333;">
        <p style="color:#e5e5e5;font-size:14px;margin:0 0 12px;">Want daily digests + breaking alerts?</p>
        <a href="https://the-right-wire.com/pricing" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:bold;font-size:14px;">
          Upgrade to Wire Pro — $6.99/mo
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;text-align:center;">
        <a href="https://the-right-wire.com" style="color:#dc2626;text-decoration:none;font-weight:bold;">
          Visit The Right Wire →
        </a>
        <p style="color:#666;font-size:11px;margin-top:12px;">
          You're receiving this because you signed up for The Wire Report.
          <a href="https://the-right-wire.com/api/newsletter?unsubscribe=true" style="color:#999;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
