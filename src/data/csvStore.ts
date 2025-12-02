export interface RecordItem {
  id: number;
  name: string;
  value: number;
}

// Simple CSV parser for predictable structure: id,name,value
export function parseCsv(csv: string): RecordItem[] {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  if (headers.join(',') !== 'id,name,value') {
    console.warn('Unexpected CSV header:', headers);
  }
  const items: RecordItem[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const [idStr, name, valueStr] = line.split(',');
    const id = Number(idStr);
    const value = Number(valueStr);
    if (Number.isFinite(id) && Number.isFinite(value)) {
      items.push({ id, name, value });
    }
  }
  return items;
}

export function toCsv(records: RecordItem[]): string {
  const rows = ['id,name,value'];
  for (const r of records) {
    rows.push(`${r.id},${escapeCsv(r.name)},${r.value}`);
  }
  return rows.join('\n');
}

function escapeCsv(field: string): string {
  if (/[",\n]/.test(field)) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}
