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
  const t = text.trim();
  // "4.1.1 Title" — space after full citation number
  let match = t.match(/^([A]?\d+(?:\.\d+)*\*?)\s+(.+)$/);
  if (match) {
    return {
      citation_num: match[1].replace(/\*$/, ""),
      citation_name: match[2].trim()
    };
  }
  // "1. Purpose" / "2. General" — dot then space after the leading segment (major UFAS h3)
  match = t.match(/^([A]?\d+(?:\.\d+)*\*?)\.\s+(.+)$/);
  if (match) {
    return {
      citation_num: match[1].replace(/\*$/, ""),
      citation_name: match[2].trim()
    };
  }
  return null;
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

/** Block-level nodes in document order (no descent into pushed blocks). */
const LINEAR_BLOCK_TAGS = new Set([
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "dl",
  "ul",
  "ol",
  "figure",
  "table"
]);

function linearizeBlocks(node, out) {
  if (!node || typeof node === "string") return;
  const tag = node.tagName;
  if (LINEAR_BLOCK_TAGS.has(tag)) {
    out.push(node);
    return;
  }
  if (Array.isArray(node.children)) {
    node.children.forEach(c => linearizeBlocks(c, out));
  }
}

/**
 * Extract text from a subtree; collect table/figure nodes into embedNodes
 * (placeholders in returned text) so table/figure are not duplicated verbatim.
 */
function extractTextWithEmbeds(node, embedNodes, st) {
  if (!node) return "";
  if (typeof node === "string") return node.trim();
  const tag = node.tagName;
  if (tag === "table") {
    embedNodes.push({ type: "table", node });
    return "[Table: see separate record]";
  }
  if (tag === "figure") {
    embedNodes.push({ type: "figure", node });
    const captionNode = (node.children || []).find(c => c.tagName === "figcaption");
    const cap = textOf(captionNode);
    return cap ? `[Figure: ${cap}]` : "[Figure: see separate record]";
  }
  if (!node.children || !node.children.length) return "";
  const parts = node.children
    .map(c => extractTextWithEmbeds(c, embedNodes, st))
    .map(s => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.join("\n\n");
}

function blockToText(n, embedNodes, st) {
  const tag = n.tagName;
  if (tag === "p") {
    const raw = extractTextWithEmbeds(n, embedNodes, st);
    return raw.replace(/\s+/g, " ").trim();
  }
  if (tag === "dl" || tag === "ul" || tag === "ol") {
    const raw = extractTextWithEmbeds(n, embedNodes, st);
    return raw.replace(/\n{3,}/g, "\n\n").trim();
  }
  if (tag === "figure") {
    embedNodes.push({ type: "figure", node: n });
    const captionNode = (n.children || []).find(c => c.tagName === "figcaption");
    const cap = textOf(captionNode);
    return cap ? `[Figure: ${cap}]` : "[Figure: see separate record]";
  }
  if (tag === "table") {
    embedNodes.push({ type: "table", node: n });
    return "[Table: see separate record]";
  }
  return textOf(n);
}

function flushEmbedNodes(embedNodes, st, records) {
  embedNodes.forEach(({ type, node }) => {
    if (type === "table") records.push(makeTableRecord(node, st));
    else records.push(makeFigureRecord(node, st));
  });
  embedNodes.length = 0;
}

function makeFigureRecord(node, st) {
  const captionNode = (node.children || []).find(c => c.tagName === "figcaption");
  const imgNode = (node.children || []).find(c => c.tagName === "img");

  const caption = textOf(captionNode);
  const imgSrc = imgNode?.attributes?.src || "";

  const relationType = inferRelationType(caption, "figure");
  const citationNum = st.currentCitationNum;

  const imageId = imgSrc
    ? crypto.createHash("sha1").update(imgSrc).digest("hex").slice(0, 16)
    : null;

  const order = st.order;
  st.order += 10;

  return {
    id: makeId(order, citationNum, relationType),
    source: "UFAS",
    chapter_name: st.currentChapter,
    section_num: st.currentSectionNum,
    section_name: st.currentSectionName,
    citation_num: citationNum,
    citation_name: caption || st.currentCitationName,
    content_text: caption,
    relation_type: relationType,
    order,
    imageId,
    imageUrl: imgSrc,
    imageCaption: caption
  };
}

function makeTableRecord(node, st) {
  const content = textOf(node);
  const relationType = "Table";
  const order = st.order;
  st.order += 10;

  return {
    id: makeId(order, st.currentCitationNum, relationType),
    source: "UFAS",
    chapter_name: st.currentChapter,
    section_num: st.currentSectionNum,
    section_name: st.currentSectionName,
    citation_num: st.currentCitationNum,
    citation_name: st.currentCitationName || "Table",
    content_text: content,
    relation_type: relationType,
    order,
    imageId: null,
    imageUrl: null,
    imageCaption: ""
  };
}

function pushMergedCitationStandard(bodyBlocks, st, records, options = {}) {
  const emitEmpty = Boolean(options.emitEmpty);
  const embedNodes = [];
  const parts = bodyBlocks
    .map(b => blockToText(b, embedNodes, st))
    .map(s => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  const contentText = parts.join("\n\n").trim();
  if (!contentText && !emitEmpty) {
    flushEmbedNodes(embedNodes, st, records);
    return;
  }

  const order = st.order;
  st.order += 10;

  records.push({
    id: makeId(order, st.currentCitationNum, "Standard"),
    source: "UFAS",
    chapter_name: st.currentChapter,
    section_num: st.currentSectionNum,
    section_name: st.currentSectionName,
    citation_num: st.currentCitationNum,
    citation_name: st.currentCitationName,
    content_text: contentText || "",
    relation_type: "Standard",
    order,
    imageId: null,
    imageUrl: null,
    imageCaption: ""
  });

  flushEmbedNodes(embedNodes, st, records);
}

function pushOrphanParagraph(node, st, records) {
  const txt = textOf(node);
  if (!txt) return;

  const relationType = inferRelationType(txt, node.tagName);

  const citationNum =
    relationType === "Advisory"
      ? txt.match(/^Advisory\s+([A]?\d+(?:\.\d+)*)/i)?.[1] || st.currentCitationNum
      : st.currentCitationNum;

  const order = st.order;
  st.order += 10;

  records.push({
    id: makeId(order, citationNum, relationType),
    source: "UFAS",
    chapter_name: st.currentChapter,
    section_num: st.currentSectionNum,
    section_name: st.currentSectionName,
    citation_num: citationNum,
    citation_name: st.currentCitationName,
    content_text: txt,
    relation_type: relationType,
    order,
    imageId: null,
    imageUrl: null,
    imageCaption: ""
  });
}

function pushOrphanFigure(node, st, records) {
  const captionNode = (node.children || []).find(c => c.tagName === "figcaption");
  const imgNode = (node.children || []).find(c => c.tagName === "img");

  const caption = textOf(captionNode);
  const imgSrc = imgNode?.attributes?.src || "";

  const relationType = inferRelationType(caption, "figure");
  const citationNum = st.currentCitationNum;

  const imageId = imgSrc
    ? crypto.createHash("sha1").update(imgSrc).digest("hex").slice(0, 16)
    : null;

  const order = st.order;
  st.order += 10;

  records.push({
    id: makeId(order, citationNum, relationType),
    source: "UFAS",
    chapter_name: st.currentChapter,
    section_num: st.currentSectionNum,
    section_name: st.currentSectionName,
    citation_num: citationNum,
    citation_name: caption || st.currentCitationName,
    content_text: caption,
    relation_type: relationType,
    order,
    imageId,
    imageUrl: imgSrc,
    imageCaption: caption
  });
}

function pushOrphanTable(node, st, records) {
  const content = textOf(node);
  const order = st.order;
  st.order += 10;

  records.push({
    id: makeId(order, st.currentCitationNum, "Table"),
    source: "UFAS",
    chapter_name: st.currentChapter,
    section_num: st.currentSectionNum,
    section_name: st.currentSectionName,
    citation_num: st.currentCitationNum,
    citation_name: st.currentCitationName || "Table",
    content_text: content,
    relation_type: "Table",
    order,
    imageId: null,
    imageUrl: null,
    imageCaption: ""
  });
}

function main() {
  const raw = JSON.parse(fs.readFileSync(INPUT, "utf8"));

  const records = [];
  const linear = [];
  linearizeBlocks(raw, linear);

  const st = {
    currentChapter: "",
    currentSectionNum: "",
    currentSectionName: "",
    currentCitationNum: "",
    currentCitationName: "",
    order: 1000
  };

  let i = 0;
  while (i < linear.length) {
    const node = linear[i];
    const tag = node.tagName;

    if (tag === "h3") {
      const txt = textOf(node);
      const parsed = parseCitationFromHeading(txt);
      if (parsed) {
        // Major section (e.g. "1. Purpose"): emit Standard + body until any h3–h6 (do not absorb h4/h5/h6 children).
        if (txt) st.currentChapter = txt;
        st.currentSectionNum = parsed.citation_num;
        st.currentSectionName = parsed.citation_name;
        st.currentCitationNum = parsed.citation_num;
        st.currentCitationName = parsed.citation_name;

        const bodyBlocks = [];
        let j = i + 1;
        while (j < linear.length) {
          const next = linear[j];
          const nt = next.tagName;
          if (nt === "h3" || nt === "h4" || nt === "h5" || nt === "h6") break;
          bodyBlocks.push(next);
          j += 1;
        }

        pushMergedCitationStandard(bodyBlocks, st, records, { emitEmpty: true });
        i = j;
        continue;
      }
      if (txt) st.currentChapter = txt;
      i += 1;
      continue;
    }

    if (tag === "h4") {
      const txt = textOf(node);
      const parsed = parseCitationFromHeading(txt);
      if (parsed) {
        // h4 defines parent section for subsequent h5/h6 (and their figures/tables).
        st.currentSectionNum = parsed.citation_num;
        st.currentSectionName = parsed.citation_name;
        st.currentCitationNum = parsed.citation_num;
        st.currentCitationName = parsed.citation_name;

        const bodyBlocks = [];
        let j = i + 1;
        while (j < linear.length) {
          const next = linear[j];
          const nt = next.tagName;
          if (nt === "h3" || nt === "h4" || nt === "h5" || nt === "h6") break;
          bodyBlocks.push(next);
          j += 1;
        }

        pushMergedCitationStandard(bodyBlocks, st, records, { emitEmpty: true });

        i = j;
        continue;
      }
      i += 1;
      continue;
    }

    if (tag === "h5" || tag === "h6") {
      const txt = textOf(node);
      const parsed = parseCitationFromHeading(txt);
      if (parsed) {
        // h5/h6: citation only; keep currentSectionNum / currentSectionName from enclosing h4.
        st.currentCitationNum = parsed.citation_num;
        st.currentCitationName = parsed.citation_name;

        const bodyBlocks = [];
        let j = i + 1;
        while (j < linear.length) {
          const next = linear[j];
          const nt = next.tagName;
          if (nt === "h3" || nt === "h4" || nt === "h5" || nt === "h6") break;
          bodyBlocks.push(next);
          j += 1;
        }

        pushMergedCitationStandard(bodyBlocks, st, records, { emitEmpty: true });

        i = j;
        continue;
      }
      i += 1;
      continue;
    }

    if (tag === "p") {
      pushOrphanParagraph(node, st, records);
      i += 1;
      continue;
    }

    if (tag === "figure") {
      pushOrphanFigure(node, st, records);
      i += 1;
      continue;
    }

    if (tag === "table") {
      pushOrphanTable(node, st, records);
      i += 1;
      continue;
    }

    if (tag === "dl" || tag === "ul" || tag === "ol") {
      const embedNodes = [];
      const txt = blockToText(node, embedNodes, st).trim();
      if (txt) {
        const relationType = inferRelationType(txt, tag);
        const citationNum =
          relationType === "Advisory"
            ? txt.match(/^Advisory\s+([A]?\d+(?:\.\d+)*)/i)?.[1] || st.currentCitationNum
            : st.currentCitationNum;
        const o = st.order;
        st.order += 10;
        records.push({
          id: makeId(o, citationNum, relationType),
          source: "UFAS",
          chapter_name: st.currentChapter,
          section_num: st.currentSectionNum,
          section_name: st.currentSectionName,
          citation_num: citationNum,
          citation_name: st.currentCitationName,
          content_text: txt,
          relation_type: relationType,
          order: o,
          imageId: null,
          imageUrl: null,
          imageCaption: ""
        });
        flushEmbedNodes(embedNodes, st, records);
      } else {
        flushEmbedNodes(embedNodes, st, records);
      }
      i += 1;
      continue;
    }

    i += 1;
  }

  const filteredRecords = records.filter(
    r => !(r.relation_type === "Standard" && !String(r.citation_num ?? "").trim())
  );
  fs.writeFileSync(OUTPUT, JSON.stringify(filteredRecords, null, 2));
  console.log(`Wrote ${filteredRecords.length} records to ${OUTPUT}`);
}

main();
