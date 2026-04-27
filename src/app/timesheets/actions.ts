"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSignedInUser } from "@/lib/access";
import {
  FULL_TIME_HOURS_PER_WEEK,
  normalizeWeekStartString
} from "@/lib/work-week";
const SUBMIT_TOLERANCE_HOURS = 0.01;

type ParsedEntry = {
  referenceId: string;
  hours: number;
  description: string;
};

function redirectTimesheet(
  weekStart: string,
  kind: "error" | "success",
  message: string
): never {
  const params = new URLSearchParams();
  params.set("week", weekStart);
  params.set(kind, message);
  redirect(`/timesheets?${params.toString()}`);
}

function readWeekStart(formData: FormData) {
  const value = formData.get("week_start");
  return normalizeWeekStartString(typeof value === "string" ? value : null);
}

function parseEntries(
  formData: FormData,
  prefix: "project" | "internal",
  requireDescription: boolean
) {
  const entries: ParsedEntry[] = [];

  for (const [key, rawValue] of formData.entries()) {
    if (!key.startsWith(`${prefix}_hours__`)) {
      continue;
    }

    const referenceId = key.replace(`${prefix}_hours__`, "");
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    const hours = value ? Number(value) : 0;

    if (Number.isNaN(hours) || !Number.isFinite(hours) || hours < 0) {
      throw new Error(`Invalid hours entered for ${prefix} entry ${referenceId}.`);
    }

    const descriptionRaw = formData.get(`${prefix}_description__${referenceId}`);
    const description = typeof descriptionRaw === "string" ? descriptionRaw.trim() : "";

    if (requireDescription && hours > 0 && !description) {
      throw new Error(`Please add a description for every ${prefix} entry with hours.`);
    }

    entries.push({
      referenceId,
      hours,
      description
    });
  }

  return entries;
}

async function requireUser() {
  return requireSignedInUser();
}

async function getTargetHours(
  supabase: Awaited<ReturnType<typeof requireSignedInUser>>["supabase"],
  userId: string,
  weekStart: string
) {
  const { data: capacityRows } = await supabase
    .from("employment_capacity_history")
    .select("capacity_percent, valid_from, valid_to")
    .eq("profile_id", userId)
    .lte("valid_from", weekStart)
    .or(`valid_to.is.null,valid_to.gte.${weekStart}`)
    .order("valid_from", { ascending: false })
    .limit(1);

  const capacityPercent = capacityRows?.[0]?.capacity_percent ?? 100;
  return Number(((FULL_TIME_HOURS_PER_WEEK * Number(capacityPercent)) / 100).toFixed(2));
}

async function ensureDraftTimesheet(
  supabase: Awaited<ReturnType<typeof requireSignedInUser>>["supabase"],
  userId: string,
  weekStart: string,
  targetHours: number
) {
  const { data: existing } = await supabase
    .from("weekly_timesheets")
    .select("id, status")
    .eq("profile_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (existing) {
    if (existing.status === "submitted") {
      throw new Error("This week has already been submitted and is locked.");
    }

    const { error: updateError } = await supabase
      .from("weekly_timesheets")
      .update({ target_hours: targetHours })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return existing.id;
  }

  const timesheetId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("weekly_timesheets").insert({
    id: timesheetId,
    profile_id: userId,
    week_start: weekStart,
    target_hours: targetHours,
    status: "draft"
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return timesheetId;
}

async function saveEntries(
  supabase: Awaited<ReturnType<typeof requireSignedInUser>>["supabase"],
  timesheetId: string,
  projectEntries: ParsedEntry[],
  internalEntries: ParsedEntry[]
) {
  const { data: existingRows, error: existingError } = await supabase
    .from("time_entries")
    .select(
      "id, entry_type, project_assignment_id, internal_time_account_type_id, hours, description"
    )
    .eq("weekly_timesheet_id", timesheetId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingProjectMap = new Map(
    (existingRows ?? [])
      .filter((row) => row.entry_type === "project" && row.project_assignment_id)
      .map((row) => [row.project_assignment_id as string, row])
  );

  const existingInternalMap = new Map(
    (existingRows ?? [])
      .filter((row) => row.entry_type === "internal" && row.internal_time_account_type_id)
      .map((row) => [row.internal_time_account_type_id as string, row])
  );

  for (const entry of projectEntries) {
    const existing = existingProjectMap.get(entry.referenceId);

    if (entry.hours <= 0) {
      if (existing) {
        const { error } = await supabase.from("time_entries").delete().eq("id", existing.id);

        if (error) {
          throw new Error(error.message);
        }
      }

      continue;
    }

    if (existing) {
      const { error } = await supabase
        .from("time_entries")
        .update({
          hours: entry.hours,
          description: entry.description
        })
        .eq("id", existing.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("time_entries").insert({
        id: crypto.randomUUID(),
        weekly_timesheet_id: timesheetId,
        entry_type: "project",
        project_assignment_id: entry.referenceId,
        hours: entry.hours,
        description: entry.description
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  for (const entry of internalEntries) {
    const existing = existingInternalMap.get(entry.referenceId);

    if (entry.hours <= 0) {
      if (existing) {
        const { error } = await supabase.from("time_entries").delete().eq("id", existing.id);

        if (error) {
          throw new Error(error.message);
        }
      }

      continue;
    }

    if (existing) {
      const { error } = await supabase
        .from("time_entries")
        .update({
          hours: entry.hours,
          description: entry.description
        })
        .eq("id", existing.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("time_entries").insert({
        id: crypto.randomUUID(),
        weekly_timesheet_id: timesheetId,
        entry_type: "internal",
        internal_time_account_type_id: entry.referenceId,
        hours: entry.hours,
        description: entry.description
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }
}

async function saveTimesheetInternal(formData: FormData, finalize: boolean) {
  const weekStart = readWeekStart(formData);
  let successMessage = "Draft saved.";

  try {
    const { supabase, userId } = await requireUser();
    const targetHours = await getTargetHours(supabase, userId, weekStart);
    const projectEntries = parseEntries(formData, "project", finalize);
    const internalEntries = parseEntries(formData, "internal", finalize);
    const totalHours = [...projectEntries, ...internalEntries].reduce(
      (sum, entry) => sum + entry.hours,
      0
    );

    if (finalize && Math.abs(totalHours - targetHours) > SUBMIT_TOLERANCE_HOURS) {
      throw new Error(
        `You can only submit a complete week. Target: ${targetHours.toFixed(2)}h, captured: ${totalHours.toFixed(2)}h.`
      );
    }

    const timesheetId = await ensureDraftTimesheet(supabase, userId, weekStart, targetHours);
    await saveEntries(supabase, timesheetId, projectEntries, internalEntries);

    if (finalize) {
      const { error: submitError } = await supabase
        .from("weekly_timesheets")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          target_hours: targetHours
        })
        .eq("id", timesheetId);

      if (submitError) {
        throw new Error(submitError.message);
      }
    }

    revalidatePath("/timesheets");
    revalidatePath("/dashboard");
    successMessage = finalize ? "Week submitted successfully." : "Draft saved.";
  } catch (error) {
    redirectTimesheet(
      weekStart,
      "error",
      error instanceof Error ? error.message : "Could not save the weekly timesheet."
    );
  }

  redirectTimesheet(weekStart, "success", successMessage);
}

export async function saveTimesheetDraft(formData: FormData) {
  return saveTimesheetInternal(formData, false);
}

export async function submitWeeklyTimesheet(formData: FormData) {
  return saveTimesheetInternal(formData, true);
}
