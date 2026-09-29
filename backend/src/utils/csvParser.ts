const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface ParsedCsvResult {
  validEmails: string[];
  invalidEntries: string[];
  duplicateCount: number;
  totalParsed: number;
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

export function parseCsvEmails(content: string): ParsedCsvResult {
  if (!content || typeof content !== 'string') {
    return {
      validEmails: [],
      invalidEntries: [],
      duplicateCount: 0,
      totalParsed: 0,
    };
  }

  // Normalize line breaks and split
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      validEmails: [],
      invalidEntries: [],
      duplicateCount: 0,
      totalParsed: 0,
    };
  }

  const seen = new Set<string>();
  const validEmails: string[] = [];
  const invalidEntries: string[] = [];
  let duplicateCount = 0;
  let totalParsed = 0;

  let emailColIndex = 0;
  let startIndex = 0;

  // Check if first row is a header
  const firstRowCols = parseCsvLine(lines[0]);
  const lowerCols = firstRowCols.map((c) => c.toLowerCase());
  const foundHeaderIndex = lowerCols.findIndex(
    (col) => col === 'email' || col === 'email address' || col === 'recipient' || col === 'mail'
  );

  if (foundHeaderIndex !== -1) {
    emailColIndex = foundHeaderIndex;
    startIndex = 1; // skip header line
  } else {
    // If not explicit header, let's see if column 1 or column 0 contains an email
    if (firstRowCols.length > 1) {
      if (isValidEmail(firstRowCols[1])) {
        emailColIndex = 1;
      } else if (isValidEmail(firstRowCols[0])) {
        emailColIndex = 0;
      }
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0) continue;

    totalParsed++;
    const rawCandidate = cols[emailColIndex] !== undefined ? cols[emailColIndex] : cols[0];
    const candidate = rawCandidate.trim();

    if (isValidEmail(candidate)) {
      const normalized = candidate.toLowerCase();
      if (seen.has(normalized)) {
        duplicateCount++;
      } else {
        seen.add(normalized);
        validEmails.push(candidate);
      }
    } else {
      invalidEntries.push(lines[i]);
    }
  }

  return {
    validEmails,
    invalidEntries,
    duplicateCount,
    totalParsed,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        // Escaped quote
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
