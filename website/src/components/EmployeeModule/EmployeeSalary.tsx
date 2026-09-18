import { useEffect, useState } from "react";
import { FaBriefcase, FaMoneyBillWave, FaReceipt } from "react-icons/fa";
import employeeApi from "../../api/employee.api";
import { currentMonthKey, fallbackDashboard, formatINR } from "./employeeUi";

type DashboardData = any;

export default function EmployeeSalary() {
  const [data, setData] = useState<DashboardData>(fallbackDashboard());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await employeeApi.getDashboard({ month: currentMonthKey() });
        if (alive && res?.success && res.data) setData({ ...fallbackDashboard(), ...res.data });
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const structure = data.salary?.structure;
  const payroll = data.salary?.latestPayroll;
  const history = data.salary?.history || [];
  const gross = payroll?.grossSalary || structure?.grossSalary || 0;
  const deductions = payroll?.totalDeductions || structure?.statutoryDeductions || 0;
  const net = payroll?.netSalary || structure?.netSalary || gross - deductions || 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 shadow-xl shadow-blue-900/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur text-2xl text-white ring-2 ring-white/25">
            <FaMoneyBillWave />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Salary Details</h1>
            <p className="text-sm text-blue-100/90 mt-1">Clear view of monthly salary, deductions, and payment status.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <PayCard label="Gross Salary" value={formatINR(gross)} />
        <PayCard label="Deductions" value={formatINR(deductions)} tone="rose" />
        <PayCard label="Net Salary" value={formatINR(net)} tone="emerald" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-blue-200/70 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FaReceipt className="text-blue-700" />
            <h2 className="text-lg font-extrabold text-slate-950">Salary Structure</h2>
          </div>
          {structure ? (
            <div className="space-y-3">
              <Row label="Basic Salary" value={formatINR(structure.basic || 0)} />
              <Row label="HRA" value={formatINR(structure.hra || 0)} />
              <Row label="Allowances" value={formatINR(structure.allowances || 0)} />
              <Row label="Gross Salary" value={formatINR(structure.grossSalary || gross)} />
              <Row label="Statutory Deductions" value={formatINR(structure.statutoryDeductions || deductions)} />
            </div>
          ) : (
            <Empty text={loading ? "Loading salary structure..." : "Salary structure is not assigned yet."} />
          )}
        </div>

        <div className="rounded-3xl border border-blue-200/70 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FaBriefcase className="text-blue-700" />
            <h2 className="text-lg font-extrabold text-slate-950">Latest Payroll</h2>
          </div>
          {payroll ? (
            <div className="space-y-3">
              <Row label="Payroll Month" value={payroll.month || currentMonthKey()} />
              <Row label="Status" value={payroll.status || "Calculated"} />
              <Row label="Payment Date" value={payroll.paymentDate || "Not paid yet"} />
              <Row label="Net Amount" value={formatINR(payroll.netSalary || net)} strong />
            </div>
          ) : (
            <Empty text={loading ? "Loading payroll..." : "No payroll run found for this month."} />
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-blue-200/70 bg-white p-5 sm:p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-slate-950">Salary History</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Month</th>
                <th className="px-3 py-3">Gross</th>
                <th className="px-3 py-3">Deductions</th>
                <th className="px-3 py-3">Net Salary</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item: any, idx: number) => (
                <tr key={`${item.month}-${idx}`}>
                  <td className="px-3 py-3 font-bold">{item.month}</td>
                  <td className="px-3 py-3">{formatINR(item.grossSalary || 0)}</td>
                  <td className="px-3 py-3">{formatINR(item.totalDeductions || 0)}</td>
                  <td className="px-3 py-3 font-extrabold text-emerald-700">{formatINR(item.netSalary || 0)}</td>
                  <td className="px-3 py-3">{item.status || "-"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">No salary history available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PayCard({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "emerald" | "rose" }) {
  const style = {
    blue: { border: "border-blue-200", bg: "bg-white text-blue-900", accent: "from-blue-400 to-blue-600" },
    emerald: { border: "border-emerald-200", bg: "bg-emerald-50 text-emerald-900", accent: "from-emerald-400 to-emerald-600" },
    rose: { border: "border-rose-200", bg: "bg-rose-50 text-rose-900", accent: "from-rose-400 to-rose-600" },
  };
  const s = style[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${s.border} ${s.bg}`}>
      <span className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${s.accent}`} />
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-0">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className={`text-right ${strong ? "text-lg font-black text-emerald-700" : "font-extrabold text-slate-900"}`}>{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>;
}

