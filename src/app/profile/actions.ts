"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PROFILE_AVATAR_BUCKET } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function redirectToProfile(params: Record<string, string>): never {
  const search = new URLSearchParams(params);
  redirect(`/profile?${search.toString()}`);
}

async function requireCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function revalidateProfileSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/people");
  revalidatePath("/timesheets");
  revalidatePath("/customers");
  revalidatePath("/programs");
  revalidatePath("/portfolios");
  revalidatePath("/projects");
}

export async function uploadProfileAvatar(formData: FormData) {
  const { supabase, user } = await requireCurrentUser();
  const avatarInput = formData.get("avatar");

  if (!(avatarInput instanceof File) || avatarInput.size === 0) {
    redirectToProfile({ avatarError: "Please choose an image file first." });
  }

  const file = avatarInput;

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    redirectToProfile({ avatarError: "Please upload a JPG, PNG, WebP or GIF image." });
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    redirectToProfile({ avatarError: "Profile pictures must be 5 MB or smaller." });
  }

  const avatarPath = `${user.id}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(avatarPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true
    });

  if (uploadError) {
    redirectToProfile({
      avatarError: uploadError.message || "Could not upload your profile picture."
    });
  }

  const { error: profileError } = await supabase.rpc("update_my_profile_avatar_path", {
    new_avatar_path: avatarPath
  });

  if (profileError) {
    redirectToProfile({
      avatarError: profileError.message || "Could not save your profile picture."
    });
  }

  revalidateProfileSurfaces();
  redirectToProfile({ avatarSaved: "1" });
}

export async function removeProfileAvatar() {
  const { supabase, user } = await requireCurrentUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.avatar_path) {
    const { error: removeError } = await supabase.storage
      .from(PROFILE_AVATAR_BUCKET)
      .remove([profile.avatar_path]);

    if (removeError) {
      redirectToProfile({
        avatarError: removeError.message || "Could not remove your profile picture."
      });
    }
  }

  const { error: profileError } = await supabase.rpc("update_my_profile_avatar_path", {
    new_avatar_path: null
  });

  if (profileError) {
    redirectToProfile({
      avatarError: profileError.message || "Could not reset your profile picture."
    });
  }

  revalidateProfileSurfaces();
  redirectToProfile({ avatarRemoved: "1" });
}
