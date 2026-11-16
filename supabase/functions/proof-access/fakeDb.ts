// In-memory stand-in for the service-role Supabase client, covering only the
// query-builder calls Estimate Proof makes. Test use only (proof-access.test.ts).
// Every filter is applied exactly as written, so a missing company_id filter
// in the code under test shows up as a leak in the tests.

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

const DEFAULTS: Record<string, () => Row> = {
  insurance_requests: () => ({
    status: "open", coverages: [], endorsements: [], submitted_at: new Date().toISOString(),
    upload_path: null, answer_file_path: null, broker_emailed_at: null, answered_at: null, client_notified_at: null,
    holder_name: null, holder_address: null, who_is_asking: null, who_is_asking_other: null,
  }),
  estimate_proof_views: () => ({ viewed_at: new Date().toISOString(), item_id: null }),
  estimate_proof_links: () => ({ created_at: new Date().toISOString(), approved_at: null, revoked_at: null, client_email: null, client_name: null, location_ref: null }),
  company_certifications: () => ({ archived_at: null, sort_order: 0, created_at: new Date().toISOString(), file_path: null, reminder_stage_sent: null }),
  company_insurance_policies: () => ({ archived_at: null, sort_order: 0, created_at: new Date().toISOString(), file_path: null, endorsements: [], reminder_stage_sent: null }),
  company_area_links: () => ({ revoked_at: null }),
};

class Query {
  private filters: Filter[] = [];
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row[] = [];
  private patch: Row = {};
  private mode: "many" | "single" | "maybe" = "many";
  private max = Infinity;
  private head = false;
  private wantCount = false;
  private cols = "*";

  constructor(private db: FakeDb, private table: string) {}

  private get rows(): Row[] {
    return (this.db.tables[this.table] ??= []);
  }

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this.cols = cols;
    if (opts?.head) this.head = true;
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.patch = patch;
    return this;
  }
  upsert(row: Row, opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = [row];
    this.patch = { __key: opts?.onConflict ?? "id" };
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => r[c] === v);
    return this;
  }
  is(c: string, v: unknown) {
    this.filters.push((r) => (r[c] ?? null) === v);
    return this;
  }
  not(c: string, _op: string, v: unknown) {
    this.filters.push((r) => (r[c] ?? null) !== v);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[c]));
    return this;
  }
  gte(c: string, v: string) {
    this.filters.push((r) => String(r[c]) >= v);
    return this;
  }
  lte(c: string, v: string) {
    this.filters.push((r) => String(r[c]) <= v);
    return this;
  }
  ilike(c: string, v: string) {
    this.filters.push((r) => String(r[c] ?? "").toLowerCase() === v.toLowerCase());
    return this;
  }
  or(expr: string) {
    const parts = expr.split(",").map((p) => {
      const [col, op, ...rest] = p.split(".");
      const val = rest.join(".");
      return (r: Row) => (op === "is" && val === "null" ? (r[col] ?? null) === null : String(r[col]) === val);
    });
    this.filters.push((r) => parts.some((f) => f(r)));
    return this;
  }
  order() {
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }

  private shape(r: Row): Row {
    const out: Row = { ...r };
    const m = /estimate_proof_links\(([^)]*)\)/.exec(this.cols);
    if (m) out.estimate_proof_links = (this.db.tables.estimate_proof_links ?? []).find((l) => l.id === r.link_id) ?? null;
    return out;
  }

  private run(): { data: unknown; error: unknown; count?: number } {
    const match = (r: Row) => this.filters.every((f) => f(r));
    let result: Row[] = [];
    if (this.op === "select") {
      result = this.rows.filter(match);
    } else if (this.op === "insert") {
      for (const p of this.payload) {
        const row = { id: crypto.randomUUID(), ...(DEFAULTS[this.table]?.() ?? {}), ...p };
        this.rows.push(row);
        result.push(row);
      }
    } else if (this.op === "update") {
      for (const r of this.rows.filter(match)) {
        Object.assign(r, this.patch);
        result.push(r);
      }
    } else if (this.op === "upsert") {
      const key = String(this.patch.__key);
      const p = this.payload[0];
      const existing = this.rows.find((r) => r[key] === p[key]);
      if (existing) Object.assign(existing, p);
      else this.rows.push({ id: crypto.randomUUID(), ...p });
    } else if (this.op === "delete") {
      this.db.tables[this.table] = this.rows.filter((r) => !match(r));
    }
    result = result.slice(0, this.max).map((r) => this.shape(r));
    if (this.head) return { data: null, error: null, count: result.length };
    if (this.mode === "single") {
      return result.length === 1 ? { data: result[0], error: null } : { data: null, error: { message: `expected one row, got ${result.length}` } };
    }
    if (this.mode === "maybe") return { data: result[0] ?? null, error: null };
    return { data: result, error: null, count: this.wantCount ? result.length : undefined };
  }

  then<T>(resolve: (v: { data: unknown; error: unknown; count?: number }) => T) {
    return Promise.resolve(this.run()).then(resolve);
  }
}

export class FakeDb {
  tables: Record<string, Row[]> = {};
  files = new Map<string, Uint8Array>();

  from(table: string) {
    return new Query(this, table);
  }

  storage = {
    from: (_bucket: string) => ({
      upload: async (path: string, bin: Uint8Array) => {
        this.files.set(path, bin);
        return { data: { path }, error: null };
      },
      createSignedUrl: async (path: string) =>
        this.files.has(path)
          ? { data: { signedUrl: `https://signed.test/${path}` }, error: null }
          : { data: null, error: { message: "not found" } },
      download: async (path: string) =>
        this.files.has(path) ? { data: new Blob([this.files.get(path)!.slice() as Uint8Array<ArrayBuffer>]), error: null } : { data: null, error: { message: "not found" } },
    }),
  };
}
