import companyApi from "../../api/company.api.js";

const STORAGE_KEYS = {
  companyId: "companyId",
  activeCompanyId: "activeCompanyId",
  companyName: "companyName",
  company: "company",
  subscription: "companySubscription",
};

export function readStoredJson<T = any>(keys: string[]): T | null {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      return JSON.parse(raw) as T;
    } catch {
      continue;
    }
  } 
  return null;
}

export function getCompanyLabel(company: any, fallback = "Company") {
  const candidate =
    company?.CompanyName ||
    company?.companyName ||
    company?.name ||
    company?.organizationName ||
    company?.orgName ||
    company?.company_name ||
    fallback;
  return String(candidate || fallback).trim() || fallback;
}

export function getPlanLabel(planKey?: string | null) {
  const plan = String(planKey || "").toUpperCase();
  if (plan === "PROFESSIONAL") return "Professional";
  if (plan === "ENTERPRISE") return "Enterprise";
  if (plan === "STARTER") return "Starter";
  if (plan === "FREE") return "Free";
  return plan || "Starter";
}

export function normalizePlanKey(planKey?: string | null) {
  const raw = String(planKey || "").trim();
  if (!raw) return "STARTER";

  const plan = raw.toUpperCase();
  if (plan === "PROFESSIONAL" || plan === "PROFESSIONAL PLAN" || plan === "PRO") return "PROFESSIONAL";
  if (plan === "ENTERPRISE" || plan === "ENTERPRISE PLAN") return "ENTERPRISE";
  if (plan === "STARTER" || plan === "STARTER PLAN" || plan === "BASIC") return "STARTER";
  if (plan === "FREE") return "FREE";

  const numeric = Number(raw.replace(/[^\d.]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) {
    const priceMap: Record<number, "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | "FREE"> = {
      0: "FREE",
      799: "STARTER",
      999: "STARTER",
      9588: "STARTER",
      9990: "STARTER",
      7990: "STARTER",
      9999: "PROFESSIONAL",
      99990: "PROFESSIONAL",
      119988: "PROFESSIONAL",
      19999: "ENTERPRISE",
      199990: "ENTERPRISE",
      239988: "ENTERPRISE",
    };

    if (priceMap[numeric]) return priceMap[numeric];
  }

  return "STARTER";
}

function getCompanyPlanHint(data: any) {
  const raw =
    data?.company?.planKey ||
    data?.company?.plan ||
    data?.company?.planPrice ||
    data?.dashboard?.company?.planKey ||
    data?.dashboard?.company?.plan ||
    data?.dashboard?.company?.planPrice ||
    data?.subscription?.company?.planKey ||
    data?.subscription?.company?.plan ||
    data?.subscription?.company?.planPrice ||
    null;

  return normalizePlanKey(raw);
}

export function getPlanPrice(planKey?: string | null, billing?: string | null) {
  const plan = normalizePlanKey(planKey);
  const cycle = String(billing || "MONTHLY").toUpperCase().trim();

  if (plan === "PROFESSIONAL") return cycle === "YEARLY" ? 9999 * 12 : 9999;
  if (plan === "ENTERPRISE") return cycle === "YEARLY" ? 19999 * 12 : 19999;
  if (plan === "FREE") return 0;
  return cycle === "YEARLY" ? 799 * 12 : 999;
}

export function getResolvedPlanPrice(data: any, planKey?: string | null, billing?: string | null) {
  const directCandidates = [
    data?.subscription?.subscription?.planPrice,
    data?.subscription?.serviceAccess?.subscription?.planPrice,
    data?.subscription?.planPrice,
    data?.dashboard?.subscription?.planPrice,
    data?.dashboard?.serviceAccess?.subscription?.planPrice,
    data?.serviceAccess?.subscription?.planPrice,
  ];

  for (const candidate of directCandidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }

  const resolvedPlanKey = normalizePlanKey(
    planKey ||
      data?.subscription?.subscription?.planKey ||
      data?.subscription?.subscription?.plan ||
      data?.subscription?.serviceAccess?.subscription?.planKey ||
      data?.subscription?.serviceAccess?.subscription?.plan ||
      data?.subscription?.planKey ||
      data?.subscription?.plan ||
      data?.dashboard?.subscription?.planKey ||
      data?.dashboard?.subscription?.plan ||
      data?.dashboard?.company?.planKey ||
      data?.dashboard?.company?.plan ||
      data?.serviceAccess?.subscription?.planKey ||
      data?.serviceAccess?.subscription?.plan ||
      data?.company?.planKey ||
      data?.company?.plan ||
      null
  );

  if (resolvedPlanKey && resolvedPlanKey !== "STARTER") {
    return getPlanPrice(resolvedPlanKey, billing);
  }

  const companyFallback = Number(data?.dashboard?.company?.planPrice || data?.company?.planPrice || data?.company?.planAmount || 0);
  if (Number.isFinite(companyFallback) && companyFallback > 0) return companyFallback;

  return getPlanPrice(resolvedPlanKey, billing);
}

export function formatInr(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function getResolvedSubscription(data: any) {
  const companyPlanHint = getCompanyPlanHint(data);
  const subscription =
    data?.subscription?.resolvedSubscription ||
    data?.dashboard?.resolvedSubscription ||
    data?.subscription?.subscription ||
    data?.subscription?.serviceAccess?.subscription ||
    data?.subscription ||
    data?.dashboard?.subscription ||
    data?.dashboard?.serviceAccess?.subscription ||
    data?.serviceAccess?.subscription ||
    null;

  if (!subscription) return null;

  let planKey = normalizePlanKey(
    subscription.planKey ||
      subscription.plan ||
      subscription.planPrice ||
      subscription.amount ||
      data?.company?.planKey ||
      data?.company?.planPrice ||
      "STARTER"
  );

  // If the company record has a stronger plan signal than a default starter
  // service-access snapshot, prefer the company-level plan.
  if (companyPlanHint !== "STARTER" && planKey === "STARTER") {
    planKey = companyPlanHint;
  }

  const billing = String(subscription.billing || subscription.billingCycle || data?.company?.billingCycle || "MONTHLY").toUpperCase();
  const purchasedAt = subscription.purchasedAt || subscription.startsAt || subscription.createdAt || new Date().toISOString();
  const expiresAt = subscription.expiresAt || subscription.endsAt || null;
  const status = String(subscription.status || "").toUpperCase();

  return {
    ...subscription,
    planKey,
    billing,
    purchasedAt,
    expiresAt,
    startsAt: subscription.startsAt || purchasedAt,
    status,
  };
}

export function toSubscriptionStorage(data: any) {
  const subscription = getResolvedSubscription(data);
  if (!subscription) return null;

  const next = {
    planKey: normalizePlanKey(subscription.planKey || "STARTER"),
    billing: String(subscription.billing || "MONTHLY").toUpperCase(),
    purchasedAt: subscription.purchasedAt || new Date().toISOString(),
    expiresAt: subscription.expiresAt || null,
    planPrice: Number(subscription.planPrice || getResolvedPlanPrice(data, subscription.planKey, subscription.billing)) || 0,
    purchaseCount: Number(subscription.purchaseCount || 1),
    renewCount: Number(subscription.renewCount || 0),
    history: Array.isArray(subscription.history) ? subscription.history : [],
  };

  return next;
}

export function syncCompanyStorage(data: any, companyId?: string) {
  const resolvedCompanyId = companyId || data?.company?._id || data?.company?.id || "";

  if (resolvedCompanyId) {
    localStorage.setItem(STORAGE_KEYS.companyId, String(resolvedCompanyId));
    localStorage.setItem(STORAGE_KEYS.activeCompanyId, String(resolvedCompanyId));
  }

  if (data?.company) {
    localStorage.setItem(STORAGE_KEYS.companyName, getCompanyLabel(data.company));
    localStorage.setItem(STORAGE_KEYS.company, JSON.stringify(data.company));
  }

  const subscription = toSubscriptionStorage(data);
  if (subscription) {
    localStorage.setItem(STORAGE_KEYS.subscription, JSON.stringify(subscription));
  }

  return { companyId: resolvedCompanyId, subscription };
}

export async function resolveCompanyId() {
  return companyApi.resolveCompanyId();
}

export async function loadCompanyBundle(companyId?: string) {
  const resolvedCompanyId = companyId || (await resolveCompanyId());
  if (!resolvedCompanyId) return null;

  const [dashboardRes, analyticsRes, employeesRes, hrRes, subscriptionRes, payrollRes] = await Promise.all([
    companyApi.getCompanyDashboard(resolvedCompanyId).catch((error) => ({ error })),
    companyApi.getCompanyAnalytics(resolvedCompanyId).catch((error) => ({ error })),
    companyApi.getCompanyEmployees(resolvedCompanyId).catch((error) => ({ error })),
    companyApi.getCompanyHrAccounts(resolvedCompanyId).catch((error) => ({ error })),
    companyApi.getCompanySubscription(resolvedCompanyId).catch((error) => ({ error })),
    companyApi.getCompanyPayroll(resolvedCompanyId).catch((error) => ({ error })),
  ]);

  const bundle = {
    companyId: resolvedCompanyId,
    dashboard: dashboardRes?.success ? dashboardRes : null,
    analytics: analyticsRes?.success ? analyticsRes : null,
    employees: employeesRes?.success ? employeesRes : null,
    hrAccess: hrRes?.success ? hrRes.hrAccess : null,
    subscription: subscriptionRes?.success ? subscriptionRes : null,
    payroll: payrollRes?.success ? payrollRes : null,
  };

  syncCompanyStorage(bundle, resolvedCompanyId);
  return bundle;
}
