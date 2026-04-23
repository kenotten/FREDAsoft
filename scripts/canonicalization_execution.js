
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';

async function runCanonicalization() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log("--- FINDINGS CANONICALIZATION EXECUTION (TASK 106) ---");

  // 1. FETCH DATA
  const findingsSnap = await getDocs(collection(db, 'findings'));
  const glossarySnap = await getDocs(collection(db, 'glossary'));
  const pDataSnap = await getDocs(collection(db, 'projectData'));

  const findings = findingsSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  const glossary = glossarySnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  const pData = pDataSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));

  const normalize = (text) => (text || "").trim().toLowerCase();

  // 2. GROUPING
  const groups = {};
  findings.forEach(f => {
    if (f.fldIsDeleted) return; // Ignore already deleted
    const key = normalize(f.fldFindShort);
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });

  const allGroups = Object.values(groups).filter(g => g.length > 1);
  
  const results = {
    processedGroups: [],
    skippedFindings: [],
    softDeletedFindings: [],
    excludedGroups: [],
    metrics: {
      totalGroups: 0,
      totalDeleted: 0,
      totalSkipped: 0,
      totalManualReview: 0
    }
  };

  for (const group of allGroups) {
    const key = normalize(group[0].fldFindShort);
    
    // Safety check: Long text must be identical across group
    const firstLong = normalize(group[0].fldFindLong);
    const longTextsMatch = group.every(f => normalize(f.fldFindLong) === firstLong);

    if (!longTextsMatch) {
      results.excludedGroups.push({ key, reason: "Long text differs", count: group.length });
      results.metrics.totalManualReview++;
      continue;
    }

    // Analyze dependencies for selection
    const analysis = group.map(f => {
      const glosRefs = glossary.filter(g => normalize(g.fldFind) === normalize(f.fldFindID || f.firestoreId));
      const glosIds = glosRefs.map(g => g.fldGlosId || g.firestoreId);
      
      const pDataRefsCount = pData.filter(d => {
        const dLink = normalize(d.fldData);
        return glosIds.some(gid => normalize(gid) === dLink);
      }).length;

      return {
        ...f,
        glosCount: glosRefs.length,
        pDataCount: pDataRefsCount,
        completeness: Object.values(f).filter(v => v !== null && v !== "").length
      };
    });

    // Select Canonical
    const sorted = [...analysis].sort((a, b) => {
      if (b.glosCount !== a.glosCount) return b.glosCount - a.glosCount;
      if (b.pDataCount !== a.pDataCount) return b.pDataCount - a.pDataCount;
      if (b.completeness !== a.completeness) return b.completeness - a.completeness;
      return a.firestoreId.localeCompare(b.firestoreId);
    });

    const canonical = sorted[0];
    const duplicates = sorted.slice(1);

    results.processedGroups.push({
      key,
      canonicalId: canonical.firestoreId,
      duplicateCount: duplicates.length
    });
    results.metrics.totalGroups++;

    // Process Duplicates
    for (const dup of duplicates) {
      if (dup.glosCount > 0) {
        results.skippedFindings.push({ id: dup.firestoreId, reason: "Has glossary references" });
        results.metrics.totalSkipped++;
      } else {
        // EXECUTE SOFT DELETE
        const findDoc = doc(db, 'findings', dup.firestoreId);
        await updateDoc(findDoc, {
          fldIsDeleted: true,
          fldDeletedReason: "Duplicate finding — canonicalized"
        });
        results.softDeletedFindings.push(dup.firestoreId);
        results.metrics.totalDeleted++;
      }
    }
  }

  console.log(JSON.stringify(results, null, 2));
  console.log("--- FINDINGS CANONICALIZATION EXECUTION END ---");
}

runCanonicalization().catch(console.error);
