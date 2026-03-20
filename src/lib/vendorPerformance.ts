// SUPERPOWERS-APP-01 — SP4: Vendor Performance Score
// Grade vendors A-F based on service records and documentation

export interface VendorScore {
  vendorName: string;
  vendorId: string;
  totalScore: number;
  letterGrade: string;
  timeliness: number;    // 40 pts max
  certQuality: number;   // 30 pts max
  coiCurrent: number;    // 15 pts max
  noMissedServices: number; // 15 pts max
  trend: 'up' | 'down' | 'stable';
  serviceCount: number;
}

interface ServiceRecord {
  vendor_id: string;
  vendor_name: string;
  service_date: string;
  next_due_date: string | null;
  safeguard_type: string | null;
}

interface VendorDoc {
  vendor_id: string;
  expiration_date: string | null;
  document_type: string;
}

export function computeVendorScores(
  serviceRecords: ServiceRecord[],
  documents: VendorDoc[],
): VendorScore[] {
  // Group by vendor
  const vendorMap = new Map<string, { name: string; records: ServiceRecord[]; docs: VendorDoc[] }>();

  for (const rec of serviceRecords) {
    const key = rec.vendor_id;
    if (!vendorMap.has(key)) {
      vendorMap.set(key, { name: rec.vendor_name, records: [], docs: [] });
    }
    vendorMap.get(key)!.records.push(rec);
  }

  for (const doc of documents) {
    const entry = vendorMap.get(doc.vendor_id);
    if (entry) entry.docs.push(doc);
  }

  const today = new Date();
  const scores: VendorScore[] = [];

  for (const [vendorId, data] of vendorMap) {
    const { name, records, docs } = data;
    if (records.length === 0) continue;

    // Timeliness (40 pts): % of services completed on or before due date
    let onTime = 0;
    let withDueDate = 0;
    for (const rec of records) {
      if (rec.next_due_date) {
        withDueDate++;
        if (new Date(rec.service_date) <= new Date(rec.next_due_date)) {
          onTime++;
        }
      }
    }
    const timelinessRate = withDueDate > 0 ? onTime / withDueDate : 1;
    const timeliness = Math.round(timelinessRate * 40);

    // Cert quality (30 pts): % of docs not expired
    let validDocs = 0;
    for (const doc of docs) {
      if (!doc.expiration_date || new Date(doc.expiration_date) >= today) {
        validDocs++;
      }
    }
    const certRate = docs.length > 0 ? validDocs / docs.length : 1;
    const certQuality = Math.round(certRate * 30);

    // COI current (15 pts): has at least one valid COI doc
    const hasCOI = docs.some(d =>
      d.document_type?.toLowerCase().includes('coi') ||
      d.document_type?.toLowerCase().includes('insurance')
    );
    const coiCurrent = hasCOI ? 15 : 0;

    // No missed services (15 pts): no overdue next_due_dates
    const overdueServices = records.filter(r =>
      r.next_due_date && new Date(r.next_due_date) < today
    ).length;
    const noMissedServices = overdueServices === 0 ? 15 : Math.max(0, 15 - overdueServices * 5);

    const totalScore = timeliness + certQuality + coiCurrent + noMissedServices;

    scores.push({
      vendorName: name,
      vendorId,
      totalScore,
      letterGrade: getLetterGrade(totalScore),
      timeliness,
      certQuality,
      coiCurrent,
      noMissedServices,
      trend: 'stable', // Would need historical data for real trend
      serviceCount: records.length,
    });
  }

  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

function getLetterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
