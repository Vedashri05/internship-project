import XLSX from 'xlsx';

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeRowKeys(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
}

export function valueFromKeys(row, keys, fallback = null) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return fallback;
}

export function normalizeGender(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['m', 'male'].includes(normalized)) return 'M';
  if (['f', 'female'].includes(normalized)) return 'F';
  return 'O';
}

export function normalizeTeachingType(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized.startsWith('n') ? 'NT' : 'T';
}

export function normalizeQualification(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized.includes('phd')) return 'PhD';
  if (normalized.includes('post')) return 'Postgraduate';
  return 'Graduate';
}

export function normalizeShift(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return 'M';
  if (
    normalized === 'E' ||
    normalized.startsWith('E') ||
    normalized.includes('EVENING') ||
    normalized.includes('AFTERNOON') ||
    normalized.includes('PM') ||
    normalized === '2'
  ) {
    return 'E';
  }
  return 'M';
}

export function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['true', 'yes', 'y', '1', 'leave', 'on_leave'].includes(normalized);
}

export function parseExcelDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const jsDate = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return jsDate.toISOString().slice(0, 10);
  }
  const normalized = String(value).trim();
  const dayFirstMatch = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dayFirstMatch) {
    const [, first, second, yearToken] = dayFirstMatch;
    let val1 = Number(first);
    let val2 = Number(second);
    
    let year = Number(yearToken);
    if (yearToken.length === 2) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }
    
    let day = val1;
    let month = val2;

    if (val2 > 12) {
      month = val1;
      day = val2;
    } else if (val1 > 12) {
      day = val1;
      month = val2;
    } else {
      if (normalized.includes('/')) {
        month = val1;
        day = val2;
      } else {
        day = val1;
        month = val2;
      }
    }
    
    const jsDate = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(jsDate.getTime())) {
      return jsDate.toISOString().slice(0, 10);
    }
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function parseWholeNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }

  const normalized = String(value ?? '').trim();
  if (!normalized) return 0;

  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return 0;

  return Math.max(0, Math.round(Number(match[0]) || 0));
}

export function calculateExperienceYears(dateOfJoining) {
  if (!dateOfJoining) return 0;
  const today = new Date();
  const joiningDate = new Date(dateOfJoining);
  const diffMs = today.getTime() - joiningDate.getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  return Math.max(0, years);
}

export function buildEmployeeCode(rawCode, row, index) {
  if (rawCode) {
    return String(rawCode).trim();
  }

  const namePart = String(valueFromKeys(row, ['name', 'faculty_name'], 'faculty'))
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  const deptPart = String(valueFromKeys(row, ['dept_id', 'department', 'dept'], 'GEN'))
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

  return `${deptPart || 'GEN'}-${namePart || 'FACULTY'}-${index + 1}`;
}
