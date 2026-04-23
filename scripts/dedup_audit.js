
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function runDedupAudit() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log("--- FINDINGS DEDUPLICATION AUDIT START ---");

  // 1. FETCH DATA
  const findingsSnap = await getDocs(collection(db, 'findings'));
  const glossarySnap = await getDocs(collection(db, 'glossary'));
  const pDataSnap = await getDocs(collection(db, 'projectData'));

  const findings = findingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const glossary = glossarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const pData = pDataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const normalize = (text) => (text || "").trim().toLowerCase();

  // 2. DUPLICATE GROUP IDENTIFICATION
  const groups = {};
  findings.forEach(f => {
    const key = normalize(f.fldFindShort);
    if (!groups[key]) {
      groups[key] = {
        normalizedKey: key,
        findings: []
      };
    }
    groups[key].findings.push(f);
  });

  const duplicateGroups = Object.values(groups).filter(g => g.findings.length > 1);

  // 3. ANALYSIS & CANONICAL SUGGESTIONS
  const reportGroups = [];
  let totalFindingsInDupGroups = 0;
  let identicalLongCount = 0;
  let differingLongCount = 0;

  duplicateGroups.forEach(group => {
    totalFindingsInDupGroups += group.findings.length;
    
    // Check if long text is identical across group
    const firstLong = normalize(group.findings[0].fldFindLong);
    const allLongIdentical = group.findings.every(f => normalize(f.fldFindLong) === firstLong);
    if (allLongIdentical) identicalLongCount++;
    else differingLongCount++;

    const findingsAnalysis = group.findings.map(f => {
      const glosRefs = glossary.filter(g => normalize(g.fldFind) === normalize(f.fldFindID || f.id));
      const glosIds = glosRefs.map(g => g.fldGlosId || g.id);
      
      const pDataRefs = pData.filter(d => {
        const dLink = normalize(d.fldData);
        return glosIds.some(gid => normalize(gid) === dLink);
      });

      return {
        id: f.id,
        rawShort: f.fldFindShort,
        rawLong: f.fldFindLong,
        glosCount: glosRefs.length,
        glosIds: glosIds,
        pDataCount: pDataRefs.length,
        completeness: Object.values(f).filter(v => v !== null && v !== "").length
      };
    });

    // 4. CANONICAL SELECTION
    // Priority: 1. Glos count, 2. pData count, 3. Completeness, 4. ID (earliest find)
    const sortedCandidates = [...findingsAnalysis].sort((a, b) => {
      if (b.glosCount !== a.glosCount) return b.glosCount - a.glosCount;
      if (b.pDataCount !== a.pDataCount) return b.pDataCount - a.pDataCount;
      if (b.completeness !== a.completeness) return b.completeness - a.completeness;
      return a.id.localeCompare(b.id);
    });

    const canonical = sortedCandidates[0];
    const rationale = canonical.glosCount > 0 ? `Highest glossary usage (${canonical.glosCount})` : 
                     canonical.pDataCount > 0 ? `Highest projectData dependency (${canonical.pDataCount})` :
                     `Selection by completeness/ID safety`;

    reportGroups.push({
      key: group.normalizedKey,
      findings: findingsAnalysis,
      isLongIdentical: allLongIdentical,
      canonicalId: canonical.id,
      rationale: rationale
    });
  });

  // OUTPUT ENTIRE REPORT AS JSON TO STDOUT FOR PARSING
  console.log(JSON.stringify({
    summary: {
      totalFindings: findings.length,
      duplicateGroupsCount: duplicateGroups.length,
      findingsInvolved: totalFindingsInDupGroups,
      identicalLongGroups: identicalLongCount,
      differingLongGroups: differingLongCount,
      percentAffected: ((totalFindingsInDupGroups / findings.length) * 100).toFixed(1) + "%"
    },
    groups: reportGroups
  }, null, 2));

  console.log("--- FINDINGS DEDUPLICATION AUDIT END ---");
}

runDedupAudit().catch(console.error);
