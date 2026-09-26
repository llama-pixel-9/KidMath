// Branded HTML for the consent emails — larkit design language, email-safe.
//
// Email HTML is its own universe: no external CSS, no webfonts guaranteed,
// table-friendly layout, every style inline. Palette from src/index.css:
// cream #fffbeb · teal #0b7a6a · deep-teal #064a41 · ink #14231f ·
// seafoam #a7ded3 · ember #c4471b. Fredoka with system fallbacks (Gmail
// strips font links; the fallback stack must look fine on its own).
//
// The plain-text part remains the legally load-bearing copy (the spec
// asserts on it); HTML is presentation of the SAME content — keep them in
// step when editing.

const INK = "#14231f";
const TEAL = "#0b7a6a";
const DEEP_TEAL = "#064a41";
const CREAM = "#fffbeb";
const SEAFOAM = "#a7ded3";
const BODY_FONT = "'Segoe UI', system-ui, -apple-system, sans-serif";
const DISPLAY_FONT = `'Fredoka', 'Trebuchet MS', ${BODY_FONT}`;
const MUTED = "rgba(20,35,31,0.62)";
const HAIRLINE = "rgba(20,35,31,0.12)";
// Served from public/ by the web deploy; www is the canonical host (the apex
// 308s, and email clients don't reliably follow image redirects).
const LOGO_URL = "https://www.larkit.io/icon-192.png";
// Keep in sync with src/legal/entity.js — edge functions bundle only files
// under supabase/functions/, so the constant can't be imported from there.
const ENTITY_FOOTER =
  "Larkit Labs LLC \u00b7 502 W 7th St, Ste 100, Erie, PA 16502 \u00b7 (814) 273-8760";

/**
 * Remove blockquote blocks that are internal drafting notes ("remove before
 * publication"). The client sends the doc's raw markdown; whatever it sends,
 * a parent must never see our margin notes — enforced here, server-side.
 */
export function stripDraftingNotes(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(">")) {
      const block: string[] = [];
      while (i < lines.length && (lines[i].startsWith(">") || lines[i].trim() === "")) {
        if (lines[i].trim() === "" && !(lines[i + 1] ?? "").startsWith(">")) break;
        block.push(lines[i]);
        i++;
      }
      i--;
      if (!/drafting note/i.test(block.join("\n"))) out.push(...block);
      // a dropped note also drops its trailing blank line via the loop above
    } else {
      out.push(lines[i]);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Display-capitalize a kid's name ("baba" -> "Baba"); stored value untouched. */
function displayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Inline markdown: bold, links, inline code (rendered plain). Input is escaped. */
function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "$1")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      `<a href="$2" style="color:${TEAL};text-decoration:underline;">$1</a>`,
    );
}

const P_STYLE = `margin:0 0 12px;font-size:15px;line-height:1.65;color:${INK};`;

/**
 * Render the markdown subset the legal docs actually use — h1–h3, bold,
 * links, ---, bullet/numbered lists, tables, blockquotes — to inline-styled
 * HTML. Not a general markdown engine; anything unrecognized becomes a
 * paragraph, which fails soft.
 */
export function mdToEmailHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length) {
      html.push(`<p style="${P_STYLE}">${inline(escapeHtml(buf.join(" ")))}</p>`);
      buf.length = 0;
    }
  };

  const para: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === "") {
      flushParagraph(para);
      i++;
      continue;
    }
    if (/^---+$/.test(t)) {
      flushParagraph(para);
      html.push(`<hr style="border:none;border-top:1px solid ${HAIRLINE};margin:24px 0;">`);
      i++;
      continue;
    }
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushParagraph(para);
      const level = h[1].length;
      const size = level === 1 ? 22 : level === 2 ? 17 : 15;
      const margin = level === 1 ? "0 0 12px" : "26px 0 10px";
      html.push(
        `<h${level} style="margin:${margin};font-family:${DISPLAY_FONT};font-weight:600;font-size:${size}px;line-height:1.3;color:${INK};">${inline(escapeHtml(h[2]))}</h${level}>`,
      );
      i++;
      continue;
    }
    if (t.startsWith(">")) {
      flushParagraph(para);
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      html.push(
        `<div style="border-left:3px solid ${SEAFOAM};padding:2px 0 2px 14px;margin:0 0 12px;">` +
          `<p style="${P_STYLE}margin-bottom:0;color:${MUTED};">${inline(escapeHtml(quote.filter(Boolean).join(" ")))}</p></div>`,
      );
      continue;
    }
    if (/^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t)) {
      flushParagraph(para);
      const ordered = /^\d+\.\s+/.test(t);
      const items: string[] = [];
      while (i < lines.length && (/^[-*]\s+/.test(lines[i].trim()) || /^\d+\.\s+/.test(lines[i].trim()))) {
        items.push(lines[i].trim().replace(/^([-*]|\d+\.)\s+/, ""));
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      html.push(
        `<${tag} style="margin:0 0 12px;padding-left:22px;">` +
          items.map((it) => `<li style="${P_STYLE}margin-bottom:6px;">${inline(escapeHtml(it))}</li>`).join("") +
          `</${tag}>`,
      );
      continue;
    }
    if (t.startsWith("|")) {
      flushParagraph(para);
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      const cellStyle = `padding:8px 10px;border:1px solid ${HAIRLINE};font-size:14px;line-height:1.5;color:${INK};text-align:left;vertical-align:top;`;
      html.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 14px;width:100%;">` +
          (head
            ? `<tr>${head.map((c) => `<th style="${cellStyle}background:${CREAM};font-weight:700;">${inline(escapeHtml(c))}</th>`).join("")}</tr>`
            : "") +
          body.map((r) => `<tr>${r.map((c) => `<td style="${cellStyle}">${inline(escapeHtml(c))}</td>`).join("")}</tr>`).join("") +
          `</table>`,
      );
      continue;
    }
    para.push(t);
    i++;
  }
  flushParagraph(para);
  return html.join("\n");
}

/** The branded shell: cream ground, white card, larkit wordmark, footer. */
function layout(args: { preheader: string; contentHtml: string; footerHtml: string }): string {
  return (
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>` +
    `<body style="margin:0;padding:0;background:${CREAM};">` +
    `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(args.preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};"><tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">` +
    `<tr><td style="padding:0 8px 16px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="vertical-align:middle;"><img src="${LOGO_URL}" width="44" height="44" alt="" style="display:block;border-radius:11px;border:1px solid ${HAIRLINE};"></td>` +
    `<td style="vertical-align:middle;padding-left:12px;font-family:${DISPLAY_FONT};font-weight:600;font-size:30px;line-height:1;color:${TEAL};">larkit</td>` +
    `</tr></table></td></tr>` +
    `<tr><td style="background:#ffffff;border:1.5px solid ${HAIRLINE};border-radius:18px;padding:32px 28px;font-family:${BODY_FONT};">` +
    args.contentHtml +
    `</td></tr>` +
    `<tr><td style="padding:20px 8px 0;font-family:${BODY_FONT};font-size:12px;line-height:1.7;color:${MUTED};">` +
    args.footerHtml +
    `<br>${ENTITY_FOOTER} \u00b7 <a href="https://www.larkit.io" style="color:${TEAL};">larkit.io</a>` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

function ctaButton(label: string, url: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto 6px;"><tr><td style="border-radius:14px;background:${TEAL};box-shadow:0 4px 0 ${DEEP_TEAL};">` +
    `<a href="${url}" style="display:inline-block;padding:14px 36px;font-family:${DISPLAY_FONT};font-weight:600;font-size:17px;color:${CREAM};text-decoration:none;border-radius:14px;">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

/** Direct-notice email: CTA first (the thing the parent must do), then the
 *  full notice — COPPA requires the content delivered, not linked. */
export function consentRequestEmailHtml(args: {
  kidFirstName: string;
  noticeMd: string;
  confirmUrl: string;
}): string {
  const kid = escapeHtml(displayName(args.kidFirstName));
  const content =
    `<div style="width:44px;height:7px;border-radius:4px;background:#f26b3a;margin:0 0 16px;"></div>` +
    `<h1 style="margin:0 0 10px;font-family:${DISPLAY_FONT};font-weight:600;font-size:24px;line-height:1.3;color:${INK};">One tap, and ${kid} can start practising</h1>` +
    `<p style="${P_STYLE}">You started creating a profile for ${kid} on larkit. Because larkit is made for kids, U.S. law (COPPA) asks us to get your consent as the parent before anything about ${kid} is saved.</p>` +
    ctaButton(`I give my consent for ${displayName(args.kidFirstName)}`, args.confirmUrl) +
    `<div style="height:24px;"></div>` +
    `<hr style="border:none;border-top:1px solid ${HAIRLINE};margin:0 0 22px;">` +
    `<p style="margin:0 0 14px;font-size:12px;letter-spacing:0.06em;font-weight:700;color:${TEAL};">THE FULL NOTICE, FOR YOUR RECORDS</p>` +
    mdToEmailHtml(stripDraftingNotes(args.noticeMd)) +
    `<p style="${P_STYLE}margin-top:18px;color:${MUTED};">If you do nothing, we delete your contact information and the name you entered within 14 days, and no profile is created.</p>` +
    `<hr style="border:none;border-top:1px solid ${HAIRLINE};margin:20px 0 12px;">` +
    `<p style="margin:0;font-size:11px;line-height:1.6;color:${MUTED};">Button not working? Copy this address into your browser:<br><span style="word-break:break-all;">${args.confirmUrl}</span></p>`;
  return layout({
    preheader: `Your consent is needed before ${displayName(args.kidFirstName)} can start practising — one tap.`,
    contentHtml: content,
    footerHtml:
      `You're receiving this because this email address was used to start creating a child profile on larkit. ` +
      `Wasn't you? Ignore this email — the request deletes itself. Questions: <a href="mailto:support@larkit.io" style="color:${TEAL};">support@larkit.io</a>`,
  });
}

/** Confirming message: consent recorded + the revocation notice §312.5(b)(2)(viii) requires. */
export function consentConfirmedEmailHtml(args: {
  kidFirstName: string;
  revocationUrl: string;
  appBaseUrl: string;
}): string {
  const kid = escapeHtml(displayName(args.kidFirstName));
  const content =
    `<div style="width:44px;height:7px;border-radius:4px;background:#f26b3a;margin:0 0 16px;"></div>` +
    `<h1 style="margin:0 0 10px;font-family:${DISPLAY_FONT};font-weight:600;font-size:24px;line-height:1.3;color:${INK};">Consent confirmed — ${kid} is ready to practise</h1>` +
    `<p style="${P_STYLE}">Thank you. ${kid}'s profile is set up, and you can hand over the screen whenever you're both ready.</p>` +
    `<h2 style="margin:24px 0 8px;font-family:${DISPLAY_FONT};font-weight:600;font-size:17px;color:${INK};">What you consented to</h2>` +
    `<p style="${P_STYLE}">We collect ${kid}'s first name, age, and grade (entered by you), a random profile identifier, and practice activity — questions shown, answers given, levels, and rewards earned. Nothing else, no ads, and no sale of data. The full notice is at <a href="${args.appBaseUrl}/parental-consent" style="color:${TEAL};">larkit.io/parental-consent</a> and the Privacy Policy at <a href="${args.appBaseUrl}/privacy" style="color:${TEAL};">larkit.io/privacy</a>.</p>` +
    `<h2 style="margin:24px 0 8px;font-family:${DISPLAY_FONT};font-weight:600;font-size:17px;color:${INK};">You can revoke this consent at any time</h2>` +
    `<p style="${P_STYLE}">Revoking deletes ${kid}'s profile and all associated information, and stops any further collection. <a href="${args.revocationUrl}" style="color:${TEAL};">Revoke consent</a> (this link stays in this email — keep it), or review and delete everything from your account page whenever you like.</p>`;
  return layout({
    preheader: `${displayName(args.kidFirstName)}'s profile is ready — and how to revoke consent, any time.`,
    contentHtml: content,
    footerHtml:
      `You're receiving this because you confirmed parental consent for a child profile on larkit. ` +
      `Questions: <a href="mailto:support@larkit.io" style="color:${TEAL};">support@larkit.io</a>`,
  });
}

/** Subscription-started acknowledgment (see billingEmails.ts for the text
 *  part, which is the legally load-bearing copy — keep the two in step). */
export function subscriptionStartedEmailHtml(args: {
  planName: string;
  amount: string;
  per: string;
  trialLine: string;
  renewLine: string;
  billingUrl: string;
  appBaseUrl: string;
}): string {
  const content =
    `<div style="width:44px;height:7px;border-radius:4px;background:#f26b3a;margin:0 0 16px;"></div>` +
    `<h1 style="margin:0 0 10px;font-family:${DISPLAY_FONT};font-weight:600;font-size:24px;line-height:1.3;color:${INK};">Welcome to larkit Plus</h1>` +
    `<p style="${P_STYLE}">Thanks for subscribing. Every game, every kid in your household, printable flight logs, and progress that follows you across web, iPad, and iPhone.</p>` +
    `<h2 style="margin:24px 0 8px;font-family:${DISPLAY_FONT};font-weight:600;font-size:17px;color:${INK};">Your copy of the terms</h2>` +
    `<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.65;color:${INK};">` +
    `<li><strong>Plan:</strong> larkit Plus, ${escapeHtml(args.planName)} — ${escapeHtml(args.amount)} per ${escapeHtml(args.per)}</li>` +
    `<li>${escapeHtml(args.trialLine)}</li>` +
    `<li>${escapeHtml(args.renewLine)}</li>` +
    `</ul>` +
    `<h2 style="margin:24px 0 8px;font-family:${DISPLAY_FONT};font-weight:600;font-size:17px;color:${INK};">How to cancel</h2>` +
    `<p style="${P_STYLE}">One step, any time, no phone call and no survey. Cancel during the trial and you will not be charged; cancel later and you keep access until the end of the period you already paid for.</p>` +
    ctaButton("Manage or cancel", args.billingUrl) +
    `<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">` +
    `<a href="${args.appBaseUrl}/terms" style="color:${TEAL};">Terms</a> \u00b7 ` +
    `<a href="${args.appBaseUrl}/privacy" style="color:${TEAL};">Privacy</a></p>`;
  return layout({
    preheader: `Your larkit Plus terms, and the one-step cancel link.`,
    contentHtml: content,
    footerHtml:
      `You're receiving this because you started a larkit Plus subscription with this email address. ` +
      `Questions: <a href="mailto:support@larkit.io" style="color:${TEAL};">support@larkit.io</a>`,
  });
}
