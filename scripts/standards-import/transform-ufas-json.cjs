const fs = require("fs");
const crypto = require("crypto");

const INPUT = "scripts/standards-import/UFAS.json";
const OUTPUT = "scripts/standards-import/ufas_standards.json";

function textOf(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (!node.children) return "";
  return node.children.map(textOf).join(" ").replace(/\s+/g, " ").trim();
}

function walk(node, callback, parent = null) {
  if (!node || typeof node === "string") return;
  callback(node, parent);
  if (Array.isArray(node.children)) {
    node.children.forEach(child => walk(child, callback, node));
  }
}

function makeId(order, citationNum, relationType) {
  const safeCitation = String(citationNum || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeType = String(relationType || "standard")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");

  return `${order}_${safeCitation}_${safeType}`;
}

function parseCitationFromHeading(text) {
  const match = text.match(/^([A]?\d+(?:\.\d+)*\*?)\s+(.+)$/);
  if (!match) return null;

  return {
    citation_num: match[1].replace(/\*$/, ""),
    citation_name: match[2].trim()
  };
}

function inferRelationType(text, tagName) {
  const clean = text.trim();

  if (/^EXCEPTION/i.test(clean)) return "Exception";
  if (/^Advisory/i.test(clean)) return "Advisory";
  if (/^Figure\s+/i.test(clean)) return "Figure";
  if (/^Table\s+/i.test(clean)) return "Table";

  if (tagName === "figure") return "Figure";
  if (tagName === "table") return "Table";

  return "Standard";
}

function main() {
  const raw = JSON.parse(fs.readFileSync(INPUT, "utf8"));

  const records = [];

  let currentChapter = "";
  let currentSectionNum = "";
  let currentSectionName = "";
  let currentCitationNum = "";
  let currentCitationName = "";
  let order = 1000;

  walk(raw, node => {
    const tag = node.tagName;
    if (!tag) return;

    const txt = textOf(node);
    if (!txt) return;

    // Chapter / major heading
    if (tag === "h3") {
      currentChapter = txt;
      const parsed = parseCitationFromHeading(txt);
      if (parsed) {
        currentSectionNum = parsed.citation_num;
        currentSectionName = parsed.citation_name;
      }
      return;
    }

    // Section/subsection heading
    if (tag === "h4" || tag === "h5" || tag === "h6") {
      const parsed = parseCitationFromHeading(txt);
      if (parsed) {
        currentCitationNum = parsed.citation_num;
        currentCitationName = parsed.citation_name;
        currentSectionNum = parsed.citation_num.split(".").slice(0, 2).join(".");
        currentSectionName = parsed.citation_name;
      }
      return;
    }

    // Paragraphs become standard/advisory/exception content
    if (tag === "p") {
      const relationType = inferRelationType(txt, tag);

      const citationNum =
        relationType === "Advisory"
          ? (txt.match(/^Advisory\s+([A]?\d+(?:\.\d+)*)/i)?.[1] || currentCitationNum)
          : currentCitationNum;

      const record = {
        id: makeId(order, citationNum, relationType),
        source: "UFAS",
        chapter_name: currentChapter,
        section_num: currentSectionNum,
        section_name: currentSectionName,
        citation_num: citationNum,
        citation_name: currentCitationName,
        content_text: txt,
        relation_type: relationType,
        order,
        imageId: null,
        imageUrl: null,
        imageCaption: ""
      };

      records.push(record);
      order += 10;
    }

    // Figures with images
    if (tag === "figure") {
      const captionNode = (node.children || []).find(c => c.tagName === "figcaption");
      const imgNode = (node.children || []).find(c => c.tagName === "img");

      const caption = textOf(captionNode);
      const imgSrc = imgNode?.attributes?.src || "";

      const relationType = inferRelationType(caption, tag);
      // Figures/tables are citation variants associated with the current standard section.
      // Keep the section citation as citation_num; preserve the literal figure/table label in citation_name/imageCaption.
      const citationNum = relationType === "Figure" || relationType === "Table" ? currentCitationNum : citationMatch?.[1];

      const imageId = imgSrc
        ? crypto.createHash("sha1").update(imgSrc).digest("hex").slice(0, 16)
        : null;

      const record = {
        id: makeId(order, citationNum, relationType),
        source: "UFAS",
        chapter_name: currentChapter,
        section_num: currentSectionNum,
        section_name: currentSectionName,
        citation_num: citationNum,
        citation_name: caption || currentCitationName,
        content_text: caption,
        relation_type: relationType,
        order,
        imageId,
        imageUrl: imgSrc,
        imageCaption: caption
      };

      records.push(record);
      order += 10;
    }

    // HTML tables as table records
    if (tag === "table") {
      const content = txt;
      const relationType = "Table";

      const record = {
        id: makeId(order, currentCitationNum, relationType),
        source: "UFAS",
        chapter_name: currentChapter,
        section_num: currentSectionNum,
        section_name: currentSectionName,
        citation_num: currentCitationNum,
        citation_name: currentCitationName || "Table",
        content_text: content,
        relation_type: relationType,
        order,
        imageId: null,
        imageUrl: null,
        imageCaption: ""
      };

      records.push(record);
      order += 10;
    }
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(records, null, 2));
  console.log(`Wrote ${records.length} records to ${OUTPUT}`);
}

main();