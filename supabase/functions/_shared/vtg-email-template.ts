// Branded HTML for every VTG e-mail. Table layout + inline styles so it renders in Gmail, Outlook, Apple Mail
// and phone apps. Pure function (no network) so it can be unit tested and previewed.
export type RichContent = {
  greeting?: string;
  intro?: string;
  details?: Array<[string, string]>;
  detailsTitle?: string;
  stepsTitle?: string;
  steps?: string[];
  note?: string;
};

export type TemplateInput = {
  heading: string;
  body: string;                 // plain-text body (also used for the text version)
  rich?: RichContent;           // optional structured layout used instead of the plain body
  highlight?: { label: string; value: string };
  ctaLabel?: string;
  ctaUrl?: string;
  preheader?: string;
  appUrl: string;               // e.g. https://vtg.example.com (no trailing slash)
};

const RED = "#B51A18", DEEP = "#8E1412", INK = "#17191B", MUTED = "#5B6472", LINE = "#E8E2D8", PAPER = "#F4F1EA";
const SERIF = "Georgia,'Times New Roman',serif", SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const paragraphs = (text: string) => esc(text).split(/\n{2,}/).map((p) =>
  `<p style="margin:0 0 16px;font:400 15px/1.7 ${SANS};color:#3A3F47">${p.replace(/\n/g, "<br>")}</p>`).join("");

function detailsTable(title: string | undefined, rows: Array<[string, string]>) {
  const body = rows.map(([k, v], i) => `<tr><td style="padding:11px 16px;font:600 12px/1.4 ${SANS};letter-spacing:.04em;text-transform:uppercase;color:${MUTED};border-top:${i ? "1px solid " + LINE : "0"};width:42%">${esc(k)}</td><td style="padding:11px 16px;font:600 14px/1.4 ${SANS};color:${INK};border-top:${i ? "1px solid " + LINE : "0"};word-break:break-word">${esc(v)}</td></tr>`).join("");
  return `${title ? `<p style="margin:26px 0 10px;font:700 12px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${RED}">${esc(title)}</p>` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBFAF7;border:1px solid ${LINE};border-radius:10px;border-collapse:separate;overflow:hidden">${body}</table>`;
}

function stepsList(title: string | undefined, steps: string[]) {
  const rows = steps.map((s, i) => `<tr><td valign="top" style="padding:0 14px 14px 0;width:34px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="28" height="28" style="width:28px;height:28px;border-radius:14px;background:${RED};color:#ffffff;font:700 13px/28px ${SANS}">${i + 1}</td></tr></table></td><td valign="top" style="padding:3px 0 14px;font:400 14.5px/1.6 ${SANS};color:#3A3F47">${esc(s)}</td></tr>`).join("");
  return `${title ? `<p style="margin:30px 0 14px;font:700 12px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${RED}">${esc(title)}</p>` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

export function renderVtgEmail(input: TemplateInput): string {
  const app = input.appUrl.replace(/\/$/, "");
  const logo = app + "/assets/email/vtg-logo-email.png";
  const logoLight = app + "/assets/email/vtg-logo-email-light.png";
  const r = input.rich;
  const pre = input.preheader || (input.highlight ? `${input.highlight.label}: ${input.highlight.value}` : input.body.replace(/\s+/g, " ").slice(0, 110));

  const idCard = input.highlight?.value
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr><td style="background:linear-gradient(135deg,${DEEP},${RED});background-color:${RED};border-radius:12px;padding:22px 24px" align="center"><div style="font:700 11px/1 ${SANS};letter-spacing:.22em;color:#F6D9D6;text-transform:uppercase">${esc(input.highlight.label)}</div><div style="margin-top:12px;font:700 32px/1.1 ${SERIF};letter-spacing:.12em;color:#ffffff">${esc(input.highlight.value)}</div><div style="margin-top:12px;font:400 12.5px/1.5 ${SANS};color:#F6D9D6">Keep this ID safe. It is shown in your dashboard, and you should quote it when you contact VTG support.</div></td></tr></table>`
    : "";

  const content = r
    ? `${r.greeting ? `<p style="margin:0 0 14px;font:700 16px/1.5 ${SANS};color:${INK}">${esc(r.greeting)}</p>` : ""}${r.intro ? paragraphs(r.intro) : ""}${idCard}${r.details?.length ? detailsTable(r.detailsTitle, r.details) : ""}${r.steps?.length ? stepsList(r.stepsTitle, r.steps) : ""}${r.note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td style="background:#FFF7E0;border-left:4px solid #FFB81C;border-radius:6px;padding:14px 16px;font:400 13px/1.6 ${SANS};color:#5A4A12">${esc(r.note)}</td></tr></table>` : ""}`
    : `${paragraphs(input.body)}${idCard}`;

  const cta = input.ctaUrl && input.ctaLabel && input.ctaUrl.startsWith(app + "/")
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px auto 4px"><tr><td align="center" bgcolor="${RED}" style="border-radius:8px"><a href="${esc(input.ctaUrl)}" style="display:inline-block;padding:15px 34px;font:700 15px/1 ${SANS};color:#ffffff;text-decoration:none;border-radius:8px;background:${RED}">${esc(input.ctaLabel)}</a></td></tr></table>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(input.heading)}</title><style>@media only screen and (max-width:620px){.vtg-wrap{width:100%!important}.vtg-pad{padding-left:22px!important;padding-right:22px!important}.vtg-h1{font-size:25px!important}}</style></head><body style="margin:0;padding:0;background:${PAPER}"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER};font-size:1px;line-height:1px">${esc(pre)}${"&nbsp;&zwnj;".repeat(40)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:28px 12px"><table role="presentation" class="vtg-wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%"><tr><td style="height:5px;background:${RED};border-radius:12px 12px 0 0;font-size:0;line-height:0">&nbsp;</td></tr><tr><td class="vtg-pad" align="center" bgcolor="#ffffff" style="background:#ffffff;padding:30px 40px 6px"><a href="${esc(app)}/" style="text-decoration:none"><img src="${esc(logo)}" width="260" alt="Vintage Trade Global" style="display:block;width:260px;max-width:100%;height:auto;border:0"></a></td></tr><tr><td class="vtg-pad" bgcolor="#ffffff" style="background:#ffffff;padding:18px 40px 8px"><h1 class="vtg-h1" style="margin:0 0 22px;padding-top:22px;border-top:1px solid ${LINE};text-align:center;font:700 29px/1.25 ${SERIF};color:${INK}">${esc(input.heading)}</h1>${content}${cta}</td></tr><tr><td class="vtg-pad" bgcolor="#ffffff" style="background:#ffffff;padding:26px 40px 34px"><p style="margin:0;border-top:1px solid ${LINE};padding-top:18px;font:400 11.5px/1.6 ${SANS};color:#7A818C;text-align:center">This is an automated VTG account message. For account details, sign in to your VTG workspace. VTG will never ask for passwords, one-time codes or payment credentials by email.</p></td></tr><tr><td align="center" style="background:#1B1D20;border-radius:0 0 12px 12px;padding:24px 20px"><a href="${esc(app)}/" style="text-decoration:none"><img src="${esc(logoLight)}" width="150" alt="Vintage Trade Global" style="display:block;width:150px;height:auto;border:0;margin:0 auto"></a><p style="margin:12px 0 0;font:400 11.5px/1.6 ${SANS};color:#A8AEB8">Trade finance and logistics between Africa, China and South Korea</p><p style="margin:6px 0 0;font:400 11px/1.6 ${SANS};color:#7F8693">&copy; ${new Date().getUTCFullYear()} Vintage Trade Global. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;
}
