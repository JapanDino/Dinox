export function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDateTimeLocalValue(value: string): Date {
  return new Date(value);
}

export function defaultEndFromStart(start: Date, durationMinutes = 60): Date {
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}
