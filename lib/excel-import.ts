import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportRow = {
  segment_id: string
  subsegment: string
  periode: string
  phase: string
}

export type ValidatedImportRow = ImportRow & {
  errors: string[]
  autoFixes: string[]
  isDuplicate: boolean
  skip: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const INDONESIAN_MONTH: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8,
  sep: 9, okt: 10, nov: 11, des: 12,
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function normalizeField(value: unknown) {
  return String(value ?? "").trim();
}

function tryFixSegmentId(raw: string): { value: string; fixed: boolean } | null {
  if (/^\d{9}$/.test(raw)) return { value: raw, fixed: false };

  const digitsOnly = raw.replace(/\D/g, "");

  if (digitsOnly.length === 9) return { value: digitsOnly, fixed: true };
  if (digitsOnly.length === 8) return { value: `0${digitsOnly}`, fixed: true };

  return null;
}

function detectWideFormat(headers: string[]): string[] | null {
  const monthHeaders = headers.filter((h) => {
    const lower = h.toLowerCase();
    return MONTH_LABELS.some((m) => lower.startsWith(m.toLowerCase())) ||
      /^\d{3,4}$/.test(h.trim());
  });
  return monthHeaders.length > 0 ? monthHeaders : null;
}

function parseWideFormat(
  raw: unknown[][],
  headers: string[],
  monthCols: string[],
  segmenIdx: number,
  subsegIdx: number,
  defaultYear?: number
): ImportRow[] {
  const rows: ImportRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    const segmentId = normalizeField(row[segmenIdx] ?? "");
    const subsegment = normalizeField(row[subsegIdx] ?? "");
    if (!segmentId || !subsegment) continue;

    for (const monthCol of monthCols) {
      const colIdx = headers.indexOf(monthCol);
      if (colIdx === -1) continue;
      const phaseRaw = row[colIdx];
      if (phaseRaw === "" || phaseRaw === undefined || phaseRaw === null) continue;
      const phase = normalizeField(phaseRaw);
      if (!phase) continue;

      let monthNum: number | null = null;
      let year: number | null = null;
      const lower = monthCol.toLowerCase();

      MONTH_LABELS.forEach((m, idx) => {
        if (lower.startsWith(m.toLowerCase())) monthNum = idx + 1;
      });

      if (monthNum) {
        year = defaultYear ?? null;
      } else {
        const digits = monthCol.replace(/\D/g, "");
        const m = parseInt(digits.slice(0, -2));
        if (m >= 1 && m <= 12) {
          monthNum = m;
          const yy = parseInt(digits.slice(-2));
          year = yy > 50 ? 1900 + yy : 2000 + yy;
        }
      }
      if (!monthNum || !year) continue;

      const period = `${year}-${String(monthNum).padStart(2, "0")}`;
      rows.push({ segment_id: segmentId, subsegment, periode: period, phase });
    }
  }
  return rows;
}

function parseLongFormat(
  headers: string[],
  raw: unknown[][],
  defaultPeriod?: string
): ImportRow[] {
  const rows: ImportRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];

    const segmentId = normalizeField(
      row[headers.findIndex((h) => ["segment_id", "id_segmen", "segmen", "id segmen"].includes(h.toLowerCase()))] ?? ""
    );
    const subsegment = normalizeField(
      row[headers.findIndex((h) => ["subsegment", "subsegmen", "sub segmen"].includes(h.toLowerCase()))] ?? ""
    );
    const periodIndex = headers.findIndex((h) => h.toLowerCase() === "periode");
    const phaseIdx = headers.findIndex(
      (h) => ["phase", "fase_tanam", "fase tanam", "n"].includes(h.toLowerCase())
    );

    let period = periodIndex >= 0 ? normalizeField(row[periodIndex] ?? "") : "";

    if (!period) {
      const tanggalIdx = headers.findIndex((h) => h.toLowerCase() === "tanggal");
      if (tanggalIdx >= 0) {
        const rawDate = row[tanggalIdx];
        if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
          const y = rawDate.getFullYear();
          const m = String(rawDate.getMonth() + 1).padStart(2, "0");
          period = `${y}-${m}`;
        }
      }
    }

    if (!period) {
      period = defaultPeriod ?? "";
    }

    const phase = phaseIdx >= 0 ? normalizeField(row[phaseIdx] ?? "") : "";

    rows.push({ segment_id: segmentId, subsegment, periode: period, phase });
  }
  return rows;
}

export function parseExcelToRows(file: File, defaultYear?: number, defaultPeriod?: string): Promise<ImportRow[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });

      if (json.length === 0 || raw.length < 2) {
        reject(new Error("File tidak berisi data baris yang dapat diproses."));
        return;
      }

      const headers = raw[0].map((h) => String(h).trim());
      const monthCols = detectWideFormat(headers);

      let rows: ImportRow[];

      if (monthCols) {
        const segmenIdx = headers.findIndex(
          (h) => ["id segmen", "segmen", "segment_id", "id_segmen"].includes(h.toLowerCase())
        );
        const subsegIdx = headers.findIndex(
          (h) => ["subsegmen", "subsegment", "sub segmen"].includes(h.toLowerCase())
        );

        if (segmenIdx === -1 || subsegIdx === -1) {
          reject(new Error("Kolom 'id segmen' atau 'subsegmen' tidak ditemukan pada format lebar."));
          return;
        }

        rows = parseWideFormat(raw, headers, monthCols, segmenIdx, subsegIdx, defaultYear);
      } else {
        rows = parseLongFormat(headers, raw, defaultPeriod);
      }

      resolve(rows);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Gagal membaca file Excel."));
    }
  });
}

export function extractFileInfo(name: string): { periode?: string; year?: number } {
  const raw = name.replace(/\.\w+$/, "").toLowerCase();
  let foundMonth: number | null = null;
  let foundYear: number | null = null;

  for (const [word, num] of Object.entries(INDONESIAN_MONTH)) {
    if (raw.includes(word)) {
      foundMonth = num;
      break;
    }
  }

  const yearMatch = raw.match(/\b(20\d{2})\b/);
  if (yearMatch) foundYear = parseInt(yearMatch[1]);

  if (foundMonth && foundYear) {
    return { periode: `${foundYear}-${String(foundMonth).padStart(2, "0")}`, year: foundYear };
  }
  if (foundYear) return { year: foundYear };
  return {};
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateRows(rows: ImportRow[]): ValidatedImportRow[] {
  const fixedRows = rows.map((row) => {
    const errors: string[] = [];
    const autoFixes: string[] = [];

    let segment_id = row.segment_id;
    const idFix = tryFixSegmentId(row.segment_id);
    if (idFix) {
      segment_id = idFix.value;
      if (idFix.fixed) autoFixes.push(`ID segmen dikoreksi jadi "${idFix.value}"`);
    } else {
      errors.push("ID segmen harus 9 digit angka");
    }

    if (!row.subsegment) {
      errors.push("Subsegmen tidak boleh kosong");
    }
    if (!row.periode) {
      errors.push("Periode tidak boleh kosong");
    }
    if (!row.phase) {
      errors.push("Phase tidak boleh kosong");
    }

    return { ...row, segment_id, errors, autoFixes };
  });

  const keyCount = new Map<string, number>();
  fixedRows.forEach((row) => {
    const key = `${row.segment_id}|${row.subsegment}|${row.periode}`;
    keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
  });

  const seenKeys = new Set<string>();

  return fixedRows.map((row) => {
    const key = `${row.segment_id}|${row.subsegment}|${row.periode}`;
    const isDuplicate = (keyCount.get(key) ?? 0) > 1;
    let skip = false;

    if (isDuplicate) {
      if (seenKeys.has(key)) {
        row.errors.push("Duplikat kombinasi segmen + subsegmen + periode (baris ini dilewati otomatis)");
        skip = true;
      } else {
        row.autoFixes.push("Duplikat ditemukan -- baris pertama ini yang akan disimpan");
      }
      seenKeys.add(key);
    }

    return { ...row, isDuplicate, skip };
  });
}
