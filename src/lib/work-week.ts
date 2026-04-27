export const FULL_TIME_HOURS_PER_WEEK = 40;

type NormalizeWeekStartOptions = {
  fallbackDate?: Date;
  invalidMessage?: string;
  missingMessage?: string;
  strict?: boolean;
};

export function normalizeWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export function isoDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function normalizeWeekStartString(
  value: string | null | undefined,
  options: NormalizeWeekStartOptions = {}
) {
  const {
    fallbackDate = new Date(),
    invalidMessage = "Week start must be a valid date.",
    missingMessage = "Week start is required.",
    strict = false
  } = options;

  if (!value) {
    if (strict) {
      throw new Error(missingMessage);
    }

    return isoDateString(normalizeWeekStart(fallbackDate));
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    if (strict) {
      throw new Error(invalidMessage);
    }

    return isoDateString(normalizeWeekStart(fallbackDate));
  }

  return isoDateString(normalizeWeekStart(parsed));
}

export function shiftIsoDate(value: string, amount: number) {
  const next = new Date(`${value}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return isoDateString(next);
}

export function shiftWeek(weekStart: string, amount: number) {
  return shiftIsoDate(weekStart, amount * 7);
}

export function formatWeekRange(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);

  return `${new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit"
  }).format(start)} - ${new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(end)}`;
}

export function getIsoWeekData(value: string | Date) {
  const source =
    typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
  const target = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate())
  );
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const isoYear = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return { isoWeek, isoYear };
}

export function getIsoWeekNumber(weekStart: string) {
  return getIsoWeekData(weekStart).isoWeek;
}

export function getIsoWeekYear(weekStart: string) {
  return getIsoWeekData(weekStart).isoYear;
}

export function getWeekStartForIsoWeek(isoYear: number, isoWeek: number) {
  const januaryFourth = new Date(Date.UTC(isoYear, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const firstWeekMonday = new Date(januaryFourth);
  firstWeekMonday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1);
  firstWeekMonday.setUTCDate(firstWeekMonday.getUTCDate() + (isoWeek - 1) * 7);
  return isoDateString(firstWeekMonday);
}

export function getIsoWeeksInYear(isoYear: number) {
  return getIsoWeekData(new Date(Date.UTC(isoYear, 11, 28))).isoWeek;
}

export function isDateRangeActiveForWeek(
  startDate: string,
  endDate: string | null,
  weekStart: string
) {
  const weekEnd = shiftWeek(weekStart, 1);
  const inclusiveWeekEnd = new Date(`${weekEnd}T00:00:00.000Z`);
  inclusiveWeekEnd.setUTCDate(inclusiveWeekEnd.getUTCDate() - 1);
  const weekEndString = isoDateString(inclusiveWeekEnd);

  return startDate <= weekEndString && (!endDate || endDate >= weekStart);
}
