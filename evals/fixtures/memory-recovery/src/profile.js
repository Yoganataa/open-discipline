export function profileLabel(profile) {
  return [profile.displayName, profile.role].filter(Boolean).join(" — ");
}
