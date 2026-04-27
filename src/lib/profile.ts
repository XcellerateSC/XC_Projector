export const PROFILE_AVATAR_BUCKET = "profile-avatars";

export function buildProfileInitials(
  name: string | null | undefined,
  email: string | null | undefined
) {
  const source = name?.trim() || email?.trim() || "User";
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "U";
}

export function buildProfileFirstName(
  name: string | null | undefined,
  email: string | null | undefined
) {
  const source = name?.trim() || email?.trim().replace(/@.*/, "") || "User";
  const firstName = source.split(/[\s._-]+/).find(Boolean) ?? "User";

  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

export function formatSystemRoleLabel(role: string | null | undefined) {
  if (!role) {
    return "Profile incomplete";
  }

  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
