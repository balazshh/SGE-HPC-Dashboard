export function parseQstatDate(value) {
  const [datePart, timePart] = value.trim().split(/\s+/);
  const [month, day, year] = datePart.split("/").map(Number);
  const [hours, minutes, seconds] = timePart.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds)).toISOString();
}

export function parseQacctDate(value) {
  const date = new Date(value.trim() + " UTC");
  return date.toISOString();
}

export function floorUtcHour(iso) {
  const date = new Date(iso);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

export function floorUtcDay(iso) {
  return iso.slice(0, 10);
}
