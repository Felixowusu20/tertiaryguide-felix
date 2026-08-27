/** Shared dropdown options for the admissions application form */

export const TITLES = [
  "Mr.",
  "Mrs.",
  "Miss",
  "Ms.",
  "Dr.",
  "Prof.",
  "Rev.",
  "Hon.",
] as const;

export const GUARDIAN_TITLES = [
  "Mr.",
  "Mrs.",
  "Miss",
  "Ms.",
  "Dr.",
  "Rev.",
] as const;

export const GENDERS = ["Male", "Female"] as const;

export const MARITAL_STATUSES = ["Single", "Married"] as const;

export const GHANA_REGIONS = [
  "Ashanti",
  "Greater Accra",
  "Central",
  "Eastern",
  "Western",
  "Western North",
  "Bono",
  "Bono East",
  "Ahafo",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Volta",
  "Oti",
] as const;

export const OCCUPATIONS = [
  "Student",
  "Employed",
  "Self Employed",
  "Unemployed",
  "Other",
] as const;

export const RELATIONSHIPS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Uncle",
  "Aunt",
  "Grandfather",
  "Grandmother",
  "Guardian",
  "Spouse",
  "Other",
] as const;

export const INSTITUTION_TYPES = ["Public", "Private"] as const;

export const SHS_PROGRAMMES = [
  "General Science",
  "General Arts",
  "Business",
  "Visual Arts",
  "Home Economics",
  "Agricultural Science",
  "Technical",
  "Vocational",
] as const;

export const EXAM_TYPES = [
  "WASSCE",
  "SSSCE",
  "GBCE",
  "ABCE",
  "IGCSE",
  "GCE",
  "NABPTEX",
  "Other",
] as const;

export const EXAM_BODIES = ["WAEC", "Cambridge", "NABPTEX", "Other"] as const;

export const SITTING_TYPES = ["May/June", "Nov/Dec"] as const;

export const WASSCE_GRADES = [
  "A1",
  "B2",
  "B3",
  "C4",
  "C5",
  "C6",
  "D7",
  "E8",
  "F9",
] as const;

export const CORE_SUBJECTS = [
  "English Language",
  "Core Mathematics",
  "Integrated Science",
  "Social Studies",
] as const;

export const ELECTIVE_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Biology",
  "Elective Mathematics",
  "Geography",
  "Economics",
  "Government",
  "History",
  "Literature in English",
  "French",
  "ICT",
  "Accounting",
  "Business Management",
  "Cost Accounting",
  "Management In Living",
  "Food and Nutrition",
  "Clothing and Textiles",
  "Graphic Design",
  "General Knowledge in Art",
  "Picture Making",
  "Sculpture",
  "Ceramics",
  "Textiles",
  "Jewellery",
  "Crop Husbandry",
  "Animal Husbandry",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Music",
  "Twi",
  "Fante",
  "Ga",
  "Ewe",
  "Dagbani",
] as const;

/** Curated Ghana SHS list (searchable). Expandable later via admin. */
export const GHANA_SHS_SCHOOLS = [
  "Achimota School",
  "Accra Academy",
  "Accra Girls SHS",
  "Adonten SHS",
  "Adisadel College",
  "Aggrey Memorial SHS",
  "Akosombo International School",
  "Anglican SHS, Kumasi",
  "Archbishop Porter Girls SHS",
  "Armed Forces SHS",
  "Asanteman SHS",
  "Bishop Herman College",
  "Cape Coast Technical Institute",
  "Chemu SHS",
  "Christian Methodist SHS",
  "Ebenezer SHS",
  "Ghana National College",
  "Ghana Senior High School, Koforidua",
  "Holy Child School",
  "Keta SHS",
  "Koforidua Secondary Technical",
  "Konongo Odumase SHS",
  "Kwegyir Aggrey SHS",
  "Labone SHS",
  "Mawuli School",
  "Mfantsipim School",
  "Nifa SHS",
  "Ofori Panin SHS",
  "Opoku Ware School",
  "Osei Tutu SHS",
  "Osu Presby SHS",
  "Otumfuo Osei Tutu II College",
  "Pentecost SHS",
  "Pope John SHS",
  "Prempeh College",
  "Presbyterian Boys Secondary School (PRESEC)",
  "Presbyterian SHS, Osu",
  "St. Augustine's College",
  "St. John's School, Sekondi",
  "St. Louis SHS",
  "St. Mary's SHS",
  "St. Peter's SHS",
  "St. Roses SHS",
  "Sunyani SHS",
  "Tamale SHS",
  "Temale Girls SHS",
  "T.I. Ahmadiyya SHS",
  "Tweneboa Kodua SHS",
  "University Practice SHS",
  "Wesley Girls High School",
  "Yaa Asantewaa Girls SHS",
  "Other",
] as const;

/** Common countries (Ghana first). Expandable list for nationality/country. */
export const COUNTRIES = [
  "Ghana",
  "Nigeria",
  "Togo",
  "Cote d'Ivoire",
  "Burkina Faso",
  "Benin",
  "Liberia",
  "Sierra Leone",
  "Gambia",
  "Senegal",
  "Mali",
  "Niger",
  "Cameroon",
  "South Africa",
  "Kenya",
  "Uganda",
  "Tanzania",
  "Egypt",
  "Morocco",
  "United Kingdom",
  "United States",
  "Canada",
  "Germany",
  "France",
  "Netherlands",
  "Italy",
  "Spain",
  "China",
  "India",
  "Australia",
  "Other",
] as const;

export const NATIONALITIES = [
  "Ghanaian",
  "Nigerian",
  "Togolese",
  "Ivorian",
  "Burkinabe",
  "Beninese",
  "Liberian",
  "Sierra Leonean",
  "Gambian",
  "Senegalese",
  "Malian",
  "Nigerien",
  "Cameroonian",
  "South African",
  "Kenyan",
  "Ugandan",
  "Tanzanian",
  "Egyptian",
  "British",
  "American",
  "Canadian",
  "German",
  "French",
  "Chinese",
  "Indian",
  "Other",
] as const;

export const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function daysInMonth(month: string, year: string): number {
  const m = Number(month);
  const y = Number(year);
  if (!m || !y) return 31;
  return new Date(y, m, 0).getDate();
}

export function yearOptions(fromOffset = 70, toOffset = 0): string[] {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current - toOffset; y >= current - fromOffset; y -= 1) {
    years.push(String(y));
  }
  return years;
}

export const APPLICATION_TABS = [
  { id: "personal", label: "Personal" },
  { id: "guardian", label: "Guardian" },
  { id: "programme", label: "Programme" },
  { id: "education", label: "Education" },
  { id: "examination", label: "Examination" },
  { id: "results", label: "Results" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
] as const;

export type ApplicationTabId = (typeof APPLICATION_TABS)[number]["id"];
