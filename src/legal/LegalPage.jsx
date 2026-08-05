import { useMemo } from "react";
import { useTheme } from "../useTheme";
import { getLegalDoc } from "./index.js";

/**
 * One renderer for every legal document. Routes:
 *   /privacy  → <LegalPage slug="privacy" />
 *   /terms    → <LegalPage slug="terms" />
 *   /security → <LegalPage slug="security" />
 *
 * Deliberately dependency-free. The markdown is OURS — first-party, committed
 * to the repo, never user input — so there is no sanitization problem, and
 * pulling react-markdown + remark + rehype (~100kB) to render three static
 * pages would be a poor trade on an iPad over school wifi. This handles the
 * subset the documents actually use: h1–h3, paragraphs, bullet lists, tables,
 * bold, inline code, links, blockquotes, and horizontal rules.
 *
 * If you find yourself wanting a markdown feature this doesn't support, prefer
 * rewriting the sentence over adding a parser branch. Legal copy reads better
 * in plain prose anyway.
 */

// --- inline: **bold**, `code`, [text](href) --------------------------------
function renderInline(text, keyPrefix) {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  return text.split(pattern).filter(Boolean).map((chunk, i) => {
    const key = `${keyPrefix}-${i}`;
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return <strong key={key} className="font-bold">{chunk.slice(2, -2)}</strong>;
    }
    if (chunk.startsWith("`") && chunk.endsWith("`")) {
      return <code key={key} className="px-1 py-0.5 rounded bg-black/5 text-[0.9em]">{chunk.slice(1, -1)}</code>;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(chunk);
    if (link) {
      const [, label, href] = link;
      const external = /^https?:/.test(href);
      return (
        <a
          key={key}
          href={href}
          className="underline underline-offset-2"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
        </a>
      );
    }
    return <span key={key}>{chunk}</span>;
  });
}

const splitRow = (line) =>
  line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());

function parseBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (/^---+$/.test(line.trim())) { blocks.push({ type: "hr" }); i++; continue; }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    // table: a header row, a separator row of dashes, then body rows
    if (line.trim().startsWith("|") && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")) {
      const header = splitRow(line.trim());
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Blockquote → callout box. Parsed RECURSIVELY, because the conspicuous
    // notices at the top of the Terms (arbitration, automatic renewal) are
    // blockquotes containing a heading plus body text. Those boxes are legally
    // load-bearing — "clear and conspicuous" under the state auto-renewal laws,
    // and the notice predicate for the arbitration agreement — so flattening
    // them into one italic run-on paragraph is a compliance defect, not a
    // cosmetic one.
    if (line.trim().startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "callout", blocks: parseBlocks(quote.join("\n")) });
      continue;
    }

    // paragraph: consume until a blank line or the start of another block
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|---+$|\s*[-*]\s|\s*\d+\.\s|>|\|)/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

export default function LegalPage({ slug }) {
  const { theme } = useTheme();
  const doc = getLegalDoc(slug);
  const blocks = useMemo(() => (doc ? parseBlocks(doc.markdown) : []), [doc]);

  if (!doc) {
    return (
      <main className="px-4 py-16 text-center">
        <p className={theme.textSecondary}>That page doesn&rsquo;t exist.</p>
      </main>
    );
  }

  function renderBlocks(list, prefix) {
    return list.map((block, idx) => {
          const key = `${prefix}-${idx}`;
          switch (block.type) {
            case "heading": {
              if (block.level === 1) {
                return (
                  <h1 key={key} className={`text-4xl font-extrabold mt-0 mb-6 ${theme.textPrimary}`}>
                    {renderInline(block.text, key)}
                  </h1>
                );
              }
              if (block.level === 2) {
                return (
                  <h2 key={key} className={`text-2xl font-extrabold mt-10 mb-3 ${theme.textPrimary}`}>
                    {renderInline(block.text, key)}
                  </h2>
                );
              }
              return (
                <h3 key={key} className={`text-lg font-bold mt-6 mb-2 ${theme.textPrimary}`}>
                  {renderInline(block.text, key)}
                </h3>
              );
            }
            case "paragraph":
              return (
                <p key={key} className={`mt-4 leading-relaxed ${theme.textSecondary}`}>
                  {renderInline(block.text, key)}
                </p>
              );
            case "list": {
              const Tag = block.ordered ? "ol" : "ul";
              return (
                <Tag
                  key={key}
                  className={`mt-4 space-y-2 ${block.ordered ? "list-decimal" : "list-disc"} pl-6 ${theme.textSecondary}`}
                >
                  {block.items.map((item, j) => (
                    <li key={`${key}-${j}`} className="leading-relaxed">
                      {renderInline(item, `${key}-${j}`)}
                    </li>
                  ))}
                </Tag>
              );
            }
            case "table":
              return (
                <div key={key} className="mt-5 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    {/* A table whose header row is entirely blank is a
                        label/value block (e.g. the operator-identity table
                        COPPA §312.4(d)(1) requires), not a real table.
                        Rendering an empty <thead> there is just a stray rule. */}
                    {block.header.some((c) => c !== "") && (
                    <thead>
                      <tr>
                        {block.header.map((cell, j) => (
                          <th
                            key={`${key}-h-${j}`}
                            className={`border-b-2 border-black/10 py-2 pr-4 font-bold ${theme.textPrimary}`}
                          >
                            {renderInline(cell, `${key}-h-${j}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    )}
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={`${key}-r-${r}`}>
                          {row.map((cell, c) => (
                            <td
                              key={`${key}-r-${r}-${c}`}
                              className={`border-b border-black/5 py-2 pr-4 align-top ${theme.textSecondary}`}
                            >
                              {renderInline(cell, `${key}-r-${r}-${c}`)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case "callout":
              return (
                <aside
                  key={key}
                  className="mt-6 mb-2 rounded-xl border-2 border-black/20 bg-black/[0.035] px-5 py-4 [&>*:first-child]:mt-0"
                >
                  {renderBlocks(block.blocks, key)}
                </aside>
              );
            case "hr":
              return <hr key={key} className="my-8 border-black/10" />;
            default:
              return null;
          }
    });
  }

  return (
    <main className="relative min-h-screen px-4 py-10">
      <article className="relative max-w-3xl mx-auto legal-prose">
        {renderBlocks(blocks, "b")}

        <p className={`mt-12 text-xs ${theme.textMuted}`}>
          {doc.title} · version {doc.version}
        </p>
      </article>
    </main>
  );
}
