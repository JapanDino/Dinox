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

export function nextRoundedHour(now = new Date()): Date {
  const rounded = new Date(now);
  rounded.setSeconds(0, 0);

  if (rounded.getMinutes() > 0) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    rounded.setMinutes(0, 0, 0);
  }

  return rounded;
}

export function defaultStartFromContext(contextDate: Date, now = new Date()): Date {
  const hasExplicitTime =
    contextDate.getHours() !== 0 ||
    contextDate.getMinutes() !== 0 ||
    contextDate.getSeconds() !== 0 ||
    contextDate.getMilliseconds() !== 0;

  if (hasExplicitTime) {
    return new Date(contextDate);
  }

  const rounded = nextRoundedHour(now);
  const result = new Date(contextDate);
  result.setHours(rounded.getHours(), rounded.getMinutes(), 0, 0);

  if (
    contextDate.getFullYear() === now.getFullYear() &&
    contextDate.getMonth() === now.getMonth() &&
    contextDate.getDate() === now.getDate() &&
    rounded.getDate() !== now.getDate()
  ) {
    return rounded;
  }

  return result;
}
