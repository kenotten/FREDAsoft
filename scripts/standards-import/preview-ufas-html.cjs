const fs = require("fs");

const INPUT = "scripts/standards-import/ufas_standards.json";
const OUTPUT = "scripts/standards-import/ufas_preview.html";

// Change these numbers to preview a different range
const START = 10;
const COUNT = 200;

const records = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const sample = records.slice(START, START + COUNT);

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getHeadingClass(record) {
  const citation = String(record.citation_num || "");

  if (!citation.includes(".")) return "major-heading";
  if ((citation.match(/\./g) || []).length === 1) return "section-heading";
  return "subsection-heading";
}

function formatContent(text) {
  return esc(text)
    .split(/\n{2,}/)
    .map(p => {
      const trimmed = p.trim();
      const html = p.replace(/\n/g, "<br>");

      if (/^EXCEPTION:/i.test(trimmed)) {
        return `<p class="exception">${html}</p>`;
      }

      if (/^\[Table:/i.test(trimmed) || /^\[Figure:/i.test(trimmed)) {
        return `<p class="embed-note">${html}</p>`;
      }

      return `<p>${html}</p>`;
    })
    .join("\n");
}

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>UFAS Standards Preview</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 950px;
      margin: 40px auto;
      line-height: 1.6;
      color: #222;
      background: #fafafa;
    }

    .page {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 8px 24px rgba(0,0,0,.04);
    }

    .record {
      border-bottom: 1px solid #ddd;
      padding: 26px 0;
    }

    .record:last-child {
      border-bottom: none;
    }

    .meta {
      font-size: 11px;
      color: #777;
      text-transform: uppercase;
      letter-spacing: .05em;
      margin-bottom: 8px;
    }

    h1 {
      font-size: 30px;
      margin: 0 0 8px;
    }

    .subtitle {
      color: #666;
      margin: 0 0 28px;
    }

    h2 {
      margin: 0 0 10px;
      line-height: 1.25;
    }

    .major-heading {
      font-size: 28px;
      font-weight: 800;
      color: #111;
      margin-top: 8px;
    }

    .section-heading {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
    }

    .subsection-heading {
      font-size: 21px;
      font-weight: 650;
      color: #27272a;
    }

    .badge {
      display: inline-block;
      vertical-align: middle;
      padding: 2px 8px;
      border: 1px solid #aaa;
      border-radius: 999px;
      font-size: 11px;
      margin-left: 8px;
      color: #444;
      font-weight: 600;
      background: #f8f8f8;
    }

    .badge.figure,
    .badge.table {
      border-color: #7c3aed;
      color: #5b21b6;
      background: #f5f3ff;
    }

    .badge.exception {
      border-color: #dc2626;
      color: #991b1b;
      background: #fef2f2;
    }

    .badge.advisory {
      border-color: #2563eb;
      color: #1d4ed8;
      background: #eff6ff;
    }

    .content {
      margin-top: 14px;
      font-size: 15.5px;
    }

    .content p {
      margin: 11px 0;
    }

    .exception {
      color: #991b1b;
      font-weight: 650;
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 8px 12px;
      border-radius: 6px;
    }

    .embed-note {
      color: #5b21b6;
      font-weight: 650;
      background: #f5f3ff;
      border-left: 4px solid #7c3aed;
      padding: 8px 12px;
      border-radius: 6px;
    }

    img {
      max-width: 100%;
      border: 1px solid #ddd;
      padding: 8px;
      background: #fff;
      margin-top: 12px;
      border-radius: 6px;
    }

    .image-note {
      font-size: 13px;
      color: #555;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <main class="page">
    <h1>UFAS Standards Preview</h1>
    <p class="subtitle">Showing records ${START + 1}–${START + sample.length} of ${records.length}</p>

    ${sample.map(r => {
      const headingClass = getHeadingClass(r);
      const badgeClass = String(r.relation_type || "").toLowerCase();

      return `
        <section class="record">
          <div class="meta">
            ${esc(r.source)} · Order ${esc(r.order)} · ${esc(r.section_num)} ${esc(r.section_name)}
          </div>

          <h2 class="${headingClass}">
            ${esc(r.citation_num)} — ${esc(r.citation_name)}
            <span class="badge ${esc(badgeClass)}">${esc(r.relation_type)}</span>
          </h2>

          <div class="content">
            ${formatContent(r.content_text)}
          </div>

          ${r.imageUrl ? `
            <div class="image-note">
              Image: ${esc(r.imageUrl)}
            </div>
            <img src="https://www.access-board.gov${esc(r.imageUrl)}" alt="${esc(r.imageCaption || r.citation_name)}">
          ` : ""}
        </section>
      `;
    }).join("\n")}
  </main>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html);
console.log(`Wrote ${OUTPUT}`);