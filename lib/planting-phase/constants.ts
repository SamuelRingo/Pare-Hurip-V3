/**
 * Shared constants & pure helpers for the planting-phase domain
 * (district reference data, phase display order, colors, labels).
 */

/** Format KSA month-key header (e.g. "12026" -> "Januari 2026") */
export const formatKsaDate = (header: string, short = false): string => {
  const headerStr = String(header);
  if (!/^\d{3,}$/.test(headerStr) && isNaN(parseInt(headerStr))) return header;
  try {
    const year = parseInt(headerStr.slice(-2));
    const month = parseInt(headerStr.slice(0, -2));
    const fullYear = 2000 + year;
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    const longMonthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    if (month >= 1 && month <= 12)
      return short
        ? `${monthNames[month - 1]} '${year}`
        : `${longMonthNames[month - 1]} ${fullYear}`;
    return header;
  } catch {
    return header;
  }
};

/** Regional code -> district name mapping (Tasikmalaya city). */
export const districtMap: { [key: string]: string } = {
  "3278071": "Bungursari", "3278030": "Cibeureum", "3278050": "Cihideung",
  "3278080": "Cipedes", "3278070": "Indihiang", "3278010": "Kawalu",
  "3278060": "Mangkubumi", "3278031": "Purbaratu", "3278020": "Tamansari",
  "3278040": "Tawang",
};

/** Most frequent element in an array (used for phase aggregation). */
export const getMode = <T>(arr: T[]): T | null => {
  if (!arr.length) return null;
  const freqMap: { [key: string]: number } = {};
  let maxFreq = 0;
  let mode: T | null = null;
  arr.forEach((item) => {
    const key = String(item);
    freqMap[key] = (freqMap[key] || 0) + 1;
    if (freqMap[key] > maxFreq) {
      maxFreq = freqMap[key];
      mode = item;
    }
  });
  return mode;
};

/** Phase -> color used in the phase chart. */
export const getPhaseColor = (phase: number | null): string => {
  if (phase === null) return "#9E9E9E";
  if (phase === 13 || phase === 4.5) return "#FCCDE5";

  switch (phase) {
    case 5: return "#FCCDE5"; // Land preparation
    case 1: return "#8DD3C7"; // Vegetative 1
    case 2: return "#BEBADA"; // Vegetative 2
    case 3.1: return "#80B1D3"; // Generative 1
    case 3.2: return "#FB8072"; // Generative 2
    case 3.3: return "#B3DE69"; // Generative 3
    case 4: return "#FDB462"; // Harvest
    case 6: return "#333333"; // Failed crop (puso)
    case 8: return "#BDBDBD"; // Not rice field
    default: return "#78909C"; // Default
  }
};

// Natural green ramp for the rice-field map so each plot
// still reads as part of a rice paddy landscape.
export const getRiceFieldPhaseColor = (phase: number | null): string => {
  if (phase === null) return "#9E9E9E";
  if (phase === 13 || phase === 4.5) return "#A16D28";

  switch (phase) {
    case 5: return "#A16D28"; // Land preparation
    case 1: return "#3E5F44"; // Vegetative 1
    case 2: return "#5E936C"; // Vegetative 2
    case 3.1: return "#93DA97"; // Generative 1
    case 3.2: return "#B5E8B8"; // Generative 2
    case 3.3: return "#DAF5DB"; // Generative 3
    case 4: return "#FED16A"; // Harvest
    case 6: return "#4B5563"; // Failed crop (puso)
    case 8: return "#BDBDBD"; // Not rice field
    default: return "#78909C"; // Default
  }
};

/** Display order of phases along the chart's Y axis. */
export const displayOrder = [
  1.0,   // Vegetative 1
  2.0,   // Vegetative 2
  3.1,   // Generative 1
  3.2,   // Generative 2
  3.3,   // Generative 3
  4.0,   // Harvest
  5.0,   // Land preparation
  6.0,   // Failed crop (puso)
];

/** Phase value -> index in displayOrder (chart Y coordinate). */
export const phaseToYValue: { [key: string]: number } = {};
displayOrder.forEach((phase, index) => {
  phaseToYValue[String(phase)] = index;
});

/** Y coordinate -> phase label. */
export const yValueToLabel: { [key: string]: string } = {
  "0": "Vegetatif 1",
  "1": "Vegetatif 2",
  "2": "Generatif 1",
  "3": "Generatif 2",
  "4": "Generatif 3",
  "5": "Panen",
  "6": "Persiapan Lahan",
  "7": "Puso",
};

/** Phase value -> label (map legend). */
export const yAxisValueMap: { [key: string]: string } = {
  "1": "Vegetatif 1",
  "2": "Vegetatif 2",
  "3.1": "Generatif 1",
  "3.2": "Generatif 2",
  "3.3": "Generatif 3",
  "4": "Panen",
  "5": "Persiapan Lahan",
  "6": "Puso",
  "8": "Bukan Lahan Pertanian",
};

/** Short Indonesian month names, used in X-axis labels. */
export const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Sentinel subsegment value meaning "all subsegments in the district". */
export const AGGREGATE_VALUE = "aggregate";
