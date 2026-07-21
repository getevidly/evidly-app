/**
 * Shared payload builder for document-upload notification emails.
 * Extracted from vendor-secure-upload § 4b so both vendor-upload and
 * user-upload paths can build identical email payloads.
 */

// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from "npm:@supabase/supabase-js@2";

/* ── Lookup tables ─────────────────────────────────────────────── */

const PILLAR_LABELS: Record<string, string> = {
  fire_safety: "Fire Safety",
  food_safety: "Food Safety",
  facility_services: "Facility Services",
};

const SHORT_REQ: Record<string, string> = {
  KEC: "Hood Cleaning", FS: "Suppression", FA: "Fire Alarm",
  SP: "Sprinkler", FE: "Fire Extinguisher", PC: "Pest Control",
  FPM: "Fan Performance", GFX: "Filter Exchange", RGC: "Rooftop Containment",
};

const PRIMARY_CITE: Record<string, string> = {
  KEC: "NFPA 96", FS: "NFPA 17A", FA: "NFPA 72",
  SP: "NFPA 25", FE: "NFPA 10", PC: "CalCode \u00a7114259.1",
};

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly",
  semi_annual: "Semi-Annual", annual: "Annual",
};

/* ── Types ─────────────────────────────────────────────────────── */

export interface UploadedBy {
  type: "vendor" | "user" | "mixed";
  name: string;
}

export interface EmailRecord {
  display_name: string;
  group: string;
  category: string;
  maps_to: string | null;
  cadence: string | null;
}

export interface StandingData {
  pillar_label: string;
  on_file: number;
  total: number;
  pending: number;
}

export interface NotificationPayload {
  vendor_name: string;
  org_name: string;
  doc_count: number;
  records: EmailRecord[];
  standing: StandingData | null;
  uploaded_by: UploadedBy;
}

/* ── Builder ───────────────────────────────────────────────────── */

export async function buildUploadNotificationPayload(
  supabase: SupabaseClient,
  params: {
    document_ids: string[];
    organization_id: string;
    uploaded_by: UploadedBy;
  },
): Promise<NotificationPayload> {
  const { document_ids, organization_id, uploaded_by } = params;

  // Fetch org name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organization_id)
    .single();

  // Fetch documents
  const { data: docs } = await supabase
    .from("compliance_documents")
    .select("id, type, name, category, vendor_id, service_type_code")
    .in("id", document_ids);

  const docList: any[] = docs || [];

  // Resolve vendor name from first doc with a vendor_id
  let vendorName = "";
  const firstVendorDoc = docList.find((d) => d.vendor_id);
  if (firstVendorDoc) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("company_name")
      .eq("id", firstVendorDoc.vendor_id)
      .single();
    vendorName = vendor?.company_name || "";
  }

  // Build records + compute standing for first service doc's pillar
  const records: EmailRecord[] = [];
  let standing: StandingData | null = null;
  let standingComputed = false;

  for (const doc of docList) {
    const isServiceDoc = doc.category === "service" || doc.category === "vendor_service";
    const isBusinessDoc = doc.category === "business" || doc.category === "vendor_business";
    const docGroup = isServiceDoc
      ? "Vendor Service Record"
      : isBusinessDoc
        ? "Vendor Business Record"
        : "Document";

    let mapsTo: string | null = null;
    let cadence: string | null = null;

    if (doc.service_type_code) {
      const { data: svcType } = await supabase
        .from("service_type_definitions")
        .select("code, short_name, category, nfpa_citation, default_frequency")
        .eq("code", doc.service_type_code)
        .single();

      if (svcType) {
        const pillarLabel = PILLAR_LABELS[svcType.category] || svcType.category;
        const shortLabel = SHORT_REQ[svcType.code] || svcType.short_name;
        const citation = PRIMARY_CITE[svcType.code] || svcType.nfpa_citation || "";
        mapsTo = `${pillarLabel} \u00b7 ${shortLabel} ${citation}`.trim();
        cadence = FREQ_LABELS[svcType.default_frequency] || svcType.default_frequency || null;

        // Standing — compute once for the first service doc's pillar
        if (!standingComputed) {
          standingComputed = true;
          const { data: schedules } = await supabase
            .from("location_service_schedules")
            .select("id, last_service_date, service_type_code, service_type_definitions(category)")
            .eq("organization_id", organization_id)
            .eq("is_active", true);

          if (schedules && schedules.length > 0) {
            let onFile = 0;
            let total = 0;
            for (const s of schedules as any[]) {
              if (s.service_type_definitions?.category !== svcType.category) continue;
              total++;
              if (s.last_service_date) onFile++;
            }
            if (total > 0) {
              standing = { pillar_label: pillarLabel, on_file: onFile, total, pending: 1 };
            }
          }
        }
      }
    }

    records.push({
      display_name: doc.name || doc.type || "Document",
      group: docGroup,
      category: isServiceDoc ? "service" : "business",
      maps_to: mapsTo,
      cadence,
    });
  }

  return {
    vendor_name: vendorName,
    org_name: org?.name || "Organization",
    doc_count: docList.length,
    records,
    standing,
    uploaded_by,
  };
}
