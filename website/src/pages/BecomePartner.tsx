import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

// ? NEW: use company api (axios)
import companyApi from "../api/company.api.js";

import {
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaIdCard,
  FaFileUpload,
  FaEye,
  FaTrash,
  FaCheck,
  FaArrowRight,
  FaArrowLeft,
  FaShieldAlt,
  FaCloudUploadAlt,
  FaTimes,
  FaBolt,
  FaCrown,
  FaLeaf,
  FaRegClock,
  FaUsers,
  FaChartLine,
  FaHeadset,
} from "react-icons/fa";

type BillingCycle = "MONTHLY" | "YEARLY";
type PlanKey = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export default function BecomePartner() {
  const [currentStep, setCurrentStep] = useState(1);

  const [requestDetails, setRequestDetails] = useState({
    CompanyName: "",
    Contact: "",
    Email: "",
    Address: "",
    CIN: "",
    PAN_No: "",
  });

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setRequestDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  }

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    PAN: null,
    ESI: null,
    PF: null,
    MOA: null,
    MSMC: null,
    GST: null,
    TradeLicense: null,
  });

  const [previewData, setPreviewData] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ? Subscription Plan state
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("PROFESSIONAL");

  const panCardRef = useRef<HTMLInputElement>(null);
  const gstRef = useRef<HTMLInputElement>(null);
  const tradeRef = useRef<HTMLInputElement>(null);
  const esiRef = useRef<HTMLInputElement>(null);
  const pfRef = useRef<HTMLInputElement>(null);
  const moaRef = useRef<HTMLInputElement>(null);
  const msmcRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  const steps = [
    { id: 1, title: "Company Information", description: "Basic company details" },
    { id: 2, title: "Document Upload", description: "Required legal documents" },
    { id: 3, title: "Choose Plan", description: "Pick subscription plan" },
    { id: 4, title: "Review & Submit", description: "Verify and submit application" },
  ];

  const fileRequirements = [
    { key: "PAN", label: "PAN Card", ref: panCardRef, required: true },
    { key: "ESI", label: "ESI Certificate", ref: esiRef, required: true },
    { key: "PF", label: "PF Registration", ref: pfRef, required: true },
    { key: "MOA", label: "MOA Document", ref: moaRef, required: true },
    { key: "MSMC", label: "MSMC Certificate", ref: msmcRef, required: false },
    { key: "GST", label: "GST Certificate", ref: gstRef, required: true },
    { key: "TradeLicense", label: "Trade License", ref: tradeRef, required: true },
  ];

  const validateStep = (step: number) => {
    if (step === 1) {
      return (
        requestDetails.CompanyName &&
        requestDetails.Contact &&
        requestDetails.Email &&
        requestDetails.Address &&
        requestDetails.CIN &&
        requestDetails.PAN_No
      );
    }
    if (step === 2) {
      const requiredFiles = fileRequirements.filter((f) => f.required);
      return requiredFiles.every((f) => files[f.key as keyof typeof files]);
    }
    if (step === 3) return !!selectedPlan;
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    } else {
      toast.error("Please complete all required fields before proceeding.");
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof files) {
    const file = e.target.files?.[0] || null;
    setFiles((prev) => ({
      ...prev,
      [field]: file,
    }));
  }

  function handlePreview(file: File) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setPreviewData(URL.createObjectURL(file));
    setPreviewVisible(true);
  }

  function clearFile(field: keyof typeof files) {
    setFiles((prev) => ({
      ...prev,
      [field]: null,
    }));
  }

  // ? UPDATED: submit via companyApi (NO fetch, NO FormData here)
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (currentStep !== 4) return;

    try {
      setIsSubmitting(true);

      const payload = {
        ...requestDetails,
        files,
        planKey: selectedPlan,     // ? backend expects planKey
        billingCycle,             // ? backend expects billingCycle
      };

      const data = await companyApi.sendRequest(payload);

      toast.success(data?.message || "Partner request submitted!");
      if (data?.companyCode) toast.info(`Company Code: ${data.companyCode}`);

      navigate("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "An error occurred while submitting the request.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ? UPDATED: just trigger submit logic
  async function handleFinalSubmit() {
    const fakeEvent = { preventDefault: () => {} } as any;
    await handleSubmit(fakeEvent);
  }

  const { userState } = useContext(UserContext)!;

  useEffect(() => {
    if (userState.position !== "guest") {
      navigate("/");
      toast.success("You already have an account with us.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-purple-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-to-br from-indigo-400/10 to-purple-500/10 rounded-full blur-2xl animate-float" />
      </div>

      {/* Floating Grid Pattern */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ3LCAxOTcsIDI1MywgMC4xKSIvPgo8L3N2Zz4=')] opacity-30"></div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
            <FaBuilding className="text-3xl text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Partner{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Registration
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Join our ecosystem of trusted partners and unlock new business opportunities
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-12">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                      currentStep >= step.id
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg scale-110"
                        : "bg-white/10 text-slate-400 border border-white/20"
                    }`}
                  >
                    {currentStep > step.id ? <FaCheck /> : step.id}
                  </div>
                  <div className="text-center mt-2">
                    <p className={`font-semibold text-sm ${currentStep >= step.id ? "text-white" : "text-slate-400"}`}>
                      {step.title}
                    </p>
                    <p className={`text-xs ${currentStep >= step.id ? "text-slate-300" : "text-slate-500"}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded-full transition-all duration-300 ${
                      currentStep > step.id ? "bg-gradient-to-r from-cyan-400 to-blue-500" : "bg-white/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          {/* Animated border glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 p-[2px] opacity-50 rounded-3xl">
            <div className="w-full h-full bg-gradient-to-br from-slate-800/90 via-blue-900/90 to-indigo-900/90 rounded-3xl"></div>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10">
            {/* Step 1 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaBuilding className="text-cyan-400" />
                  Company Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    icon={FaBuilding}
                    label="Company Name"
                    name="CompanyName"
                    placeholder="Enter your company name"
                    value={requestDetails.CompanyName}
                    onChange={handleInputChange}
                    required
                  />
                  <FormField
                    icon={FaPhone}
                    label="Contact Number"
                    name="Contact"
                    placeholder="Enter contact number"
                    value={requestDetails.Contact}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    icon={FaEnvelope}
                    label="Email Address"
                    name="Email"
                    type="email"
                    placeholder="Enter email address"
                    value={requestDetails.Email}
                    onChange={handleInputChange}
                    required
                  />
                  <FormField
                    icon={FaIdCard}
                    label="CIN Number"
                    name="CIN"
                    placeholder="Corporate Identity Number"
                    value={requestDetails.CIN}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <FormField
                  icon={FaIdCard}
                  label="PAN Number"
                  name="PAN_No"
                  placeholder="Enter PAN card number"
                  value={requestDetails.PAN_No}
                  onChange={handleInputChange}
                  required
                />

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <FaMapMarkerAlt className="text-cyan-400" />
                    Company Address *
                  </label>
                  <textarea
                    name="Address"
                    rows={4}
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-slate-400 backdrop-blur-sm transition-all duration-300 resize-none"
                    placeholder="Enter complete company address"
                    value={requestDetails.Address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaFileUpload className="text-cyan-400" />
                  Document Upload
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fileRequirements.map((requirement) => (
                    <FileUploadCard
                      key={requirement.key}
                      label={requirement.label}
                      fileKey={requirement.key as string}
                      file={files[requirement.key as keyof typeof files]}
                      required={requirement.required}
                      onUpload={() => requirement.ref.current?.click()}
                      onPreview={(file) => handlePreview(file)}
                      onDelete={() => clearFile(requirement.key as keyof typeof files)}
                    />
                  ))}
                </div>

                {/* Hidden file inputs */}
                {fileRequirements.map((requirement) => (
                  <input
                    key={requirement.key}
                    type="file"
                    ref={requirement.ref}
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileInputChange(e, requirement.key as keyof typeof files)}
                  />
                ))}
              </div>
            )}

            {/* ? Step 3: Choose subscription plan (LIKE SCREENSHOT) */}
            {currentStep === 3 && (
              <div className="space-y-7 w-full  max-w-[1600px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Choose a Plan</h3>
                    <p className="text-sm text-slate-300">
                      Pick a plan and billing cycle. 
                    </p>
                  </div>

                  {/* right actions (Monthly / Yearly / History / Export PDF) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-white/10 border border-white/15 rounded-2xl p-1">
                      <button
                        type="button"
                        onClick={() => setBillingCycle("MONTHLY")}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          billingCycle === "MONTHLY"
                            ? "bg-white/15 text-white shadow"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle("YEARLY")}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          billingCycle === "YEARLY"
                            ? "bg-white/15 text-white shadow"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Yearly
                      </button>
                    </div>

                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
                  <PlanCard
                    planKey="STARTER"
                    selectedPlan={selectedPlan}
                    setSelectedPlan={setSelectedPlan}
                    billingCycle={billingCycle}
                    title="Starter"
                    icon={<FaLeaf className="text-white" />}
                    badgeText="Best for small teams"
                    priceMonthly={999}
                    priceYearly={799 * 12} // example yearly discount
                    highlights={[
                      "Up to 25 employees",
                      "Company-managed employee data",
                      "Basic reports",
                      "Email support",
                    ]}
                    stats={[
                      { label: "Employees", value: "25", icon: <FaUsers className="text-slate-200" /> },
                      { label: "Employee Management", value: "Company", icon: <FaUsers className="text-slate-200" /> },
                      { label: "Reports", value: "Basic", icon: <FaChartLine className="text-slate-200" /> },
                      { label: "Support", value: "Email", icon: <FaHeadset className="text-slate-200" /> },
                    ]}
                    gradient="from-slate-700/30 to-slate-800/30"
                    accent="from-emerald-400/20 to-cyan-400/10"
                  />

                  <PlanCard
                    planKey="PROFESSIONAL"
                    selectedPlan={selectedPlan}
                    setSelectedPlan={setSelectedPlan}
                    billingCycle={billingCycle}
                    title="Professional"
                    icon={<FaBolt className="text-white" />}
                    badgeText="Growing business"
                    priceMonthly={9999}
                    priceYearly={9999 * 12}
                    highlights={[
                      "Up to 100 employees",
                      "Company-managed employee data",
                      "Advanced reports",
                      "Priority support",
                    ]}
                    stats={[
                      { label: "Employees", value: "100", icon: <FaUsers className="text-slate-200" /> },
                      { label: "Employee Management", value: "Company", icon: <FaUsers className="text-slate-200" /> },
                      { label: "Reports", value: "Advanced", icon: <FaChartLine className="text-slate-200" /> },
                      { label: "Support", value: "Priority", icon: <FaHeadset className="text-slate-200" /> },
                    ]}
                    gradient="from-cyan-900/30 to-blue-900/30"
                    accent="from-cyan-400/30 to-blue-400/10"
                    featured
                  />

                  <PlanCard
                    planKey="ENTERPRISE"
                    selectedPlan={selectedPlan}
                    setSelectedPlan={setSelectedPlan}
                    billingCycle={billingCycle}
                    title="Enterprise"
                    icon={<FaCrown className="text-white" />}
                    badgeText="Large organizations"
                    priceMonthly={19999}
                    priceYearly={19999 * 12}
                    highlights={[
                      "Unlimited employees",
                      "Company-managed employee data",
                      "Admin dashboard",
                      "Dedicated manager",
                    ]}
                    stats={[
                      { label: "Employees", value: "Unlimited", icon: <FaUsers className="text-slate-200" /> },
                      { label: "Employee Management", value: "Company", icon: <FaUsers className="text-slate-200" /> },
                      { label: "Reports", value: "Pro", icon: <FaChartLine className="text-slate-200" /> },
                      { label: "Support", value: "Dedicated", icon: <FaHeadset className="text-slate-200" /> },
                    ]}
                    gradient="from-slate-700/30 to-slate-800/30"
                    accent="from-amber-400/20 to-yellow-400/10"
                  />
                </div>

                <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                  <FaRegClock className="text-slate-400" />
                  Your selected plan will be attached to this partner request.
                </div>
              </div>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaShieldAlt className="text-cyan-400" />
                  Review & Submit
                </h3>

                <ReviewSection
                  requestDetails={requestDetails}
                  files={files}
                  fileRequirements={fileRequirements}
                  selectedPlan={selectedPlan}
                  billingCycle={billingCycle}
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
              {currentStep > 1 && (
                <button
  type="button"
  onClick={prevStep}
  disabled={isSubmitting}
  className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <FaArrowLeft />
  Previous
</button>

              )}

              <div className="ml-auto">
                {currentStep < 4 ? (
                 <button
  type="button"
  onClick={nextStep}
  disabled={isSubmitting}
  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
>
  Next Step
  <FaArrowRight />
</button>

                ) : (
                  <button
        type="button"
        onClick={handleFinalSubmit}
        disabled={isSubmitting}
        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl font-bold text-white"
      >
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {previewVisible && <DocumentPreview fileData={previewData} setPreviewVisible={setPreviewVisible} />}
    </div>
  );
}

/* ----------------------------- Plan UI ----------------------------- */

function formatINR(n: number) {
  try {
    return n.toLocaleString("en-IN");
  } catch {
    return String(n);
  }
}

function PlanCard({
  planKey,
  selectedPlan,
  setSelectedPlan,
  billingCycle,
  title,
  icon,
  badgeText,
  priceMonthly,
  priceYearly,
  priceText,
  highlights,
  stats,
  gradient,
  accent,
  featured = false,
}: {
  planKey: PlanKey;
  selectedPlan: PlanKey;
  setSelectedPlan: React.Dispatch<React.SetStateAction<PlanKey>>;
  billingCycle: BillingCycle;
  title: string;
  icon: React.ReactNode;
  badgeText: string;
  priceMonthly?: number;
  priceYearly?: number;
  priceText?: string;
  highlights: string[];
  stats: Array<{ label: string; value: string; icon: React.ReactNode }>;
  gradient: string;
  accent: string;
  featured?: boolean;
}) {
  const isSelected = selectedPlan === planKey;

  const priceBlock = (() => {
    if (priceText) return <span className="text-sm font-semibold text-slate-200">{priceText}</span>;
    const v = billingCycle === "MONTHLY" ? priceMonthly : priceYearly;
    const suffix = billingCycle === "MONTHLY" ? "/ month" : "/ year";
    return (
      <div className="text-right">
        <div className="text-xl font-extrabold text-white">
          ?{formatINR(v || 0)}
          <span className="text-xs font-semibold text-slate-300"> {suffix}</span>
        </div>
      </div>
    );
  })();

  return (
    <div
      className={[
        "relative rounded-3xl border transition-all duration-300 overflow-hidden",
        "bg-white/5 border-white/10 backdrop-blur-sm",
        isSelected ? "ring-2 ring-cyan-400/60 border-cyan-400/40 shadow-[0_0_35px_rgba(34,211,238,0.18)]" : "",
        featured ? "lg:scale-[1.02]" : "",
      ].join(" ")}
    >
      {/* top glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60`} />
      <div className={`absolute -top-20 -right-24 w-56 h-56 rounded-full blur-3xl bg-gradient-to-br ${accent}`} />

      <div className="relative p-6">
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                {icon}
              </div>
              <div>
                <h4 className="text-white font-extrabold text-lg">{title}</h4>
                <p className="text-slate-300 text-xs">{badgeText}</p>
              </div>
            </div>
          </div>
          {priceBlock}
        </div>

        {/* mini stats grid like screenshot */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/7 border border-white/10 px-3 py-3 flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-300 leading-none">{s.label}</div>
                <div className="text-sm font-bold text-white truncate">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* highlights */}
        <div className="mt-5 space-y-2">
          {highlights.map((h) => (
            <div key={h} className="flex items-center gap-2 text-sm text-slate-200">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
                <FaCheck className="text-emerald-300 text-[10px]" />
              </span>
              <span className="text-slate-200">{h}</span>
            </div>
          ))}
        </div>

        {/* action button */}
        <button
          type="button"
          onClick={() => setSelectedPlan(planKey)}
          className={[
            "mt-6 w-full rounded-2xl px-4 py-3 font-bold transition-all duration-300",
            "border",
            isSelected
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 border-cyan-400/30 text-white shadow-lg"
              : "bg-white/10 border-white/15 text-slate-100 hover:bg-white/15",
          ].join(" ")}
        >
          {isSelected ? "Selected" : "Select Plan"}
        </button>
      </div>
    </div>
  );
}


/* ----------------------------- Components you already had ----------------------------- */

// Form Field Component
function FormField({
  icon: Icon,
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
}: {
  icon: React.ComponentType<any>;
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
        <Icon className="text-cyan-400" />
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-slate-400 backdrop-blur-sm transition-all duration-300"
      />
    </div>
  );
}

// File Upload Card Component
function FileUploadCard({
  label,
  file,
  required,
  onUpload,
  onPreview,
  onDelete,
}: {
  label: string;
  fileKey: string;
  file: File | null;
  required: boolean;
  onUpload: () => void;
  onPreview: (file: File) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
          <FaFileUpload className="text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-white">{label}</h4>
          <p className="text-xs text-slate-400">{required ? "Required" : "Optional"} • PDF only</p>
        </div>
      </div>

      {!file ? (
        <button
          type="button"
          onClick={onUpload}
          className="w-full p-4 border-2 border-dashed border-white/30 rounded-2xl hover:border-cyan-400 hover:bg-white/5 transition-all duration-300 group"
        >
          <div className="flex flex-col items-center gap-2">
            <FaCloudUploadAlt className="text-2xl text-slate-400 group-hover:text-cyan-400 transition-colors" />
            <span className="text-slate-400 group-hover:text-white text-sm">Click to upload {label}</span>
          </div>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl">
            <FaFileUpload className="text-cyan-400" />
            <span className="text-white text-sm font-medium flex-1 truncate">{file.name}</span>
            <div className="flex items-center gap-2 px-2 py-1 bg-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-xs">Uploaded</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPreview(file)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all duration-300 text-sm font-medium"
            >
              <FaEye />
              Preview
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-all duration-300 text-sm font-medium"
            >
              <FaTrash />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Review Section Component
function ReviewSection({
  requestDetails,
  files,
  fileRequirements,
  selectedPlan,
  billingCycle,
}: {
  requestDetails: any;
  files: any;
  fileRequirements: any[];
  selectedPlan: PlanKey;
  billingCycle: BillingCycle;
}) {
  return (
    <div className="space-y-6">
      {/* ? Selected Plan Review */}
      <div className="p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-400/15">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FaBolt className="text-cyan-300" />
          Selected Subscription
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-slate-200 text-sm font-semibold">
            Plan: {selectedPlan}
          </span>
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-slate-200 text-sm font-semibold">
            Billing: {billingCycle}
          </span>
        </div>
        <p className="text-xs text-slate-300 mt-3">
          Final subscription activation happens after admin approval (payment/setup can be added later).
        </p>
      </div>

      {/* Company Information Review */}
      <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FaBuilding className="text-cyan-400" />
          Company Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Company Name:</span>
            <p className="text-white font-medium">{requestDetails.CompanyName}</p>
          </div>
          <div>
            <span className="text-slate-400">Contact:</span>
            <p className="text-white font-medium">{requestDetails.Contact}</p>
          </div>
          <div>
            <span className="text-slate-400">Email:</span>
            <p className="text-white font-medium">{requestDetails.Email}</p>
          </div>
          <div>
            <span className="text-slate-400">CIN:</span>
            <p className="text-white font-medium">{requestDetails.CIN}</p>
          </div>
          <div>
            <span className="text-slate-400">PAN:</span>
            <p className="text-white font-medium">{requestDetails.PAN_No}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-slate-400">Address:</span>
            <p className="text-white font-medium">{requestDetails.Address}</p>
          </div>
        </div>
      </div>

      {/* Documents Review */}
      <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FaFileUpload className="text-cyan-400" />
          Uploaded Documents
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fileRequirements.map((req) => (
            <div key={req.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-slate-300">{req.label}</span>
              <div className="flex items-center gap-2">
                {files[req.key] ? (
                  <div className="flex items-center gap-2 px-2 py-1 bg-green-500/20 rounded-full">
                    <FaCheck className="text-green-400 text-xs" />
                    <span className="text-green-400 text-xs">Uploaded</span>
                  </div>
                ) : req.required ? (
                  <div className="flex items-center gap-2 px-2 py-1 bg-red-500/20 rounded-full">
                    <FaTimes className="text-red-400 text-xs" />
                    <span className="text-red-400 text-xs">Missing</span>
                  </div>
                ) : (
                  <span className="text-slate-500 text-xs">Optional</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl border border-blue-500/20">
        <div className="flex items-start gap-3">
          <FaShieldAlt className="text-cyan-400 text-xl mt-1" />
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">Terms & Conditions</h4>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              By submitting this application, you agree to our partner terms and conditions. Your application will be
              reviewed within 3-5 business days. We may contact you for additional information if required.
            </p>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>• All information provided must be accurate and up-to-date</li>
              <li>• Documents must be clear and readable PDF files</li>
              <li>• Approval is subject to verification of all submitted documents</li>
              <li>• Partnership terms will be provided upon approval</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({
  fileData,
  setPreviewVisible,
}: {
  fileData: string;
  setPreviewVisible: (v: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <button
        onClick={() => setPreviewVisible(false)}
        className="absolute top-6 right-6 text-white"
      >
        <FaTimes />
      </button>
      <object data={fileData} type="application/pdf" className="w-[90vw] h-[90vh]" />
    </div>
  );
}
