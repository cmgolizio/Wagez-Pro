/**
 * A company is distinct from a rate profile. One employer can be recorded as
 * several named profiles, each with its own hourly rate. Assign those profiles
 * the same company name to include all of their historical shifts together.
 *
 * Old employer records without companyName are their own company by default.
 */
export function companyNameFor(employer) {
  return employer?.companyName?.trim() || employer?.name?.trim() || "";
}

export function companyKey(name) {
  return typeof name === "string" ? name.trim().toLocaleLowerCase("en-US") : "";
}

export function companyGroups(employers = []) {
  const groups = new Map();
  for (const employer of employers) {
    const name = companyNameFor(employer);
    const key = companyKey(name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { key, name, profileIds: [] });
    groups.get(key).profileIds.push(employer.id);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** A filter may target a whole company or a single pay-rate profile. */
export function matchesEmployerFilter(shift, filter, employers = []) {
  if (filter === "all") return true;
  if (filter === "none") return !shift.employerId;
  if (filter.startsWith("employer:")) {
    return shift.employerId === filter.slice("employer:".length);
  }
  if (filter.startsWith("company:")) {
    const employer = employers.find((entry) => entry.id === shift.employerId);
    return employer !== undefined &&
      companyKey(companyNameFor(employer)) === filter.slice("company:".length);
  }
  // Compatibility for existing callers using raw employer IDs.
  return shift.employerId === filter;
}
