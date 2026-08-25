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
