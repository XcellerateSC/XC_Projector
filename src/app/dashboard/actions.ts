"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function readFullName(formData: FormData) {
  const value = formData.get("full_name");

  if (typeof value !== "string" || !value.trim()) {
    redirect(
      `/dashboard?profileError=${encodeURIComponent(
        "Please enter your first and last name."
      )}`
    );
  }

  return value.trim();
}

function readReturnPath(formData: FormData) {
  const value = formData.get("return_path");

  if (value === "/profile") {
    return value;
  }

  return "/dashboard";
}

export async function updateFullName(formData: FormData) {
  const fullName = readFullName(formData);
  const returnPath = readReturnPath(formData);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("update_my_profile_full_name", {
    new_full_name: fullName
  });

  if (error) {
    redirect(
      `${returnPath}?profileError=${encodeURIComponent(
        error.message || "Could not update your profile name."
      )}`
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/people");
  redirect(`${returnPath}?profileSaved=1`);
}
