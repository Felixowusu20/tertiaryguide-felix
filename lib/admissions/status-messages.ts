export type StudentStatusTone = "neutral" | "info" | "success" | "care";

export type StudentStatusCopy = {
  badge: string;
  title: string;
  message: string;
  tone: StudentStatusTone;
  emailSubject: (schoolName: string) => string;
  emailPreview: string;
};

function normalizeStatus(status: string): string {
  if (status === "accepted" || status === "Accepted") return "Approved";
  return status;
}

export function studentStatusCopy(status: string): StudentStatusCopy {
  switch (normalizeStatus(status)) {
    case "Pending":
      return {
        badge: "Received",
        title: "We’ve received your application",
        message:
          "Thank you for applying. The admissions team will review your form and update you here — and by email — when there’s news.",
        tone: "neutral",
        emailSubject: (school) => `We’ve received your application to ${school}`,
        emailPreview: "Your application is safely with the school.",
      };
    case "Under Review":
      return {
        badge: "Under review",
        title: "Your application is being reviewed",
        message:
          "The admissions team is taking a careful look at your application. There’s nothing you need to do right now. We’ll write as soon as a decision is ready.",
        tone: "info",
        emailSubject: (school) => `Your ${school} application is under review`,
        emailPreview: "The school is reviewing your application.",
      };
    case "Approved":
      return {
        badge: "Approved",
        title: "Good news — your application is approved",
        message:
          "The school has approved your application. Please watch this page and your email for any next steps they share with you.",
        tone: "success",
        emailSubject: (school) => `Good news from ${school}`,
        emailPreview: "Your application has been approved.",
      };
    case "Admitted":
      return {
        badge: "Admitted",
        title: "Congratulations — you’ve been offered admission",
        message:
          "We’re delighted to share that the school has offered you a place. Check your email for enrolment details, and keep this page handy as your application record.",
        tone: "success",
        emailSubject: (school) => `Congratulations — admission offer from ${school}`,
        emailPreview: "You’ve been offered admission.",
      };
    case "Rejected":
      return {
        badge: "Not offered this round",
        title: "Thank you for applying — a place isn’t available this time",
        message:
          "The school wasn’t able to offer you admission in this round. That doesn’t take away from the work you put in, and it doesn’t mean you won’t thrive somewhere else. Many students find a great fit on a later try or at another institution. Whenever you’re ready, you can explore other programmes on TertiaryGuide — we’re here for the next step.",
        tone: "care",
        emailSubject: (school) => `An update on your application to ${school}`,
        emailPreview: "A kind update on your application.",
      };
    default:
      return {
        badge: status || "Update",
        title: "Your application has been updated",
        message:
          "There’s a new update on your application. Please check this page for the latest details from the school.",
        tone: "neutral",
        emailSubject: (school) => `An update on your application to ${school}`,
        emailPreview: "Your application status has been updated.",
      };
  }
}

export function studentStatusBadgeClass(status: string): string {
  switch (studentStatusCopy(status).tone) {
    case "success":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
    case "info":
      return "bg-sky-50 text-sky-800 ring-1 ring-sky-100";
    case "care":
      return "bg-amber-50 text-amber-900 ring-1 ring-amber-100";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-100";
  }
}
