export function catalogSchoolHref(school: {
  id: string;
  isPartner?: boolean;
  slug?: string | null;
}) {
  if (school.isPartner) {
    return school.slug
      ? `/apply/school/${encodeURIComponent(school.slug)}`
      : `/apply?school=${encodeURIComponent(school.id)}`;
  }
  return `/university-forms/${school.id}`;
}

/** Partner/secured school — buy voucher / admission form for that school. */
export function partnerSchoolBuyFormsHref(school: {
  id: string;
  slug?: string | null;
}) {
  if (school.slug) {
    return `/apply/school/${encodeURIComponent(school.slug)}`;
  }
  return `/apply?school=${encodeURIComponent(school.id)}&step=voucher`;
}

/** Programme search / compare — public and secured schools use the same comparison page. */
export function programmeCompareHref(programme: {
  id: string;
  source?: string | null;
}) {
  const params = new URLSearchParams({ programmeId: programme.id });
  if (programme.source === "partner") params.set("source", "partner");
  return `/program-search/compare?${params.toString()}`;
}
