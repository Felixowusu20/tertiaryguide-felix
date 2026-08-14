import type { Db, ObjectId } from "mongodb";

export type DashboardMetrics = {
  totalApplications: number;
  applicationsToday: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  underReviewApplications: number;
  admittedApplications: number;
  totalRevenue: number;
  totalVouchersSold: number;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function computeMetrics(
  db: Db,
  schoolId?: ObjectId,
): Promise<DashboardMetrics> {
  const apps = db.collection("applications");
  const payments = db.collection("admissionPayments");
  const vouchers = db.collection("admissionVouchers");
  const today = startOfToday();
  const schoolFilter = schoolId ? { schoolId } : {};

  const [
    totalApplications,
    applicationsToday,
    approvedApplications,
    rejectedApplications,
    pendingApplications,
    underReviewApplications,
    admittedApplications,
    revenueAgg,
    totalVouchersSold,
  ] = await Promise.all([
    apps.countDocuments(schoolFilter),
    apps.countDocuments({ ...schoolFilter, submittedAt: { $gte: today } }),
    apps.countDocuments({ ...schoolFilter, status: "Approved" }),
    apps.countDocuments({ ...schoolFilter, status: "Rejected" }),
    apps.countDocuments({ ...schoolFilter, status: "Pending" }),
    apps.countDocuments({ ...schoolFilter, status: "Under Review" }),
    apps.countDocuments({ ...schoolFilter, status: "Admitted" }),
    payments
      .aggregate<{ total: number }>([
        { $match: { ...schoolFilter, status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .toArray(),
    vouchers.countDocuments(schoolFilter),
  ]);

  return {
    totalApplications,
    applicationsToday,
    approvedApplications,
    rejectedApplications,
    pendingApplications,
    underReviewApplications,
    admittedApplications,
    totalRevenue: revenueAgg[0]?.total ?? 0,
    totalVouchersSold,
  };
}

export async function getSchoolDashboardMetrics(
  db: Db,
  schoolId: ObjectId,
): Promise<DashboardMetrics> {
  return computeMetrics(db, schoolId);
}

export async function getPlatformDashboardMetrics(db: Db): Promise<
  DashboardMetrics & { partnerSchools: number; activePartnerSchools: number }
> {
  const schools = db.collection("schools");
  const [partnerSchools, activePartnerSchools, metrics] = await Promise.all([
    schools.countDocuments({ isPartner: true }),
    schools.countDocuments({ isPartner: true, isActive: { $ne: false } }),
    computeMetrics(db),
  ]);

  return {
    ...metrics,
    partnerSchools,
    activePartnerSchools,
  };
}
