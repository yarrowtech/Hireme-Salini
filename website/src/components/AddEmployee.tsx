import { useRef, useState, type ChangeEvent } from "react"
import { toast } from "react-toastify"
import { FaUser, FaFileAlt, FaGraduationCap, FaCreditCard, FaBriefcase, FaUpload, FaEye, FaTimes } from "react-icons/fa"

export default function AddEmployee() {
    const [subFormState, setSubFormState] = useState<"details" | "documents" | "education" | "bank" | "job">("details")
    const [personalDetails, setPersonalDetails] = useState<{ firstname: string, lastname: string, middlename: string, dob: string, mobile: string, email: string, address: string, pic: File | null }>({
        firstname: "",
        middlename: "",
        lastname: "",
        dob: "",
        mobile: "",
        email: "",
        address: "",
        pic: null
    })
    const [documentFiles, setDocumentFiles] = useState<{
        aadhaarNo: string,
        panNo: string,
        aadhaar: File | null,
        pan: File | null,
        voter: File | null
    }>({
        aadhaarNo: "",
        panNo: "",
        aadhaar: null,
        pan: null,
        voter: null
    })
    const [educationDetails, setEducationDetails] = useState<{ qualification: string, institute: string, yearOfPassing: string, percentage: number, marksheet: File | null }>({
        qualification: "",
        institute: "",
        yearOfPassing: "",
        percentage: 0,
        marksheet: null
    })
    const [bankDetails, setBankDetails] = useState<{
        accountHolderName: string,
        bankName: string,
        accountNumber: string,
        ifscCode: string,
        branchName: string,
        accountType: string
    }>({
        accountHolderName: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        branchName: "",
        accountType: ""
    })
    const [jobDetails, setJobDetails] = useState<{
        post: string,
        amount: number,
        paymentFrequency: string,
        joiningDate: string,
        accessLevel: string
    }>({
        post: "",
        amount: 0,
        paymentFrequency: "",
        joiningDate: "",
        accessLevel: ""
    })

    const [isSubmitting, setIsSubmitting] = useState(false);
    const confirmAccountNumberRef = useRef<HTMLInputElement>(null);

    // Form steps configuration
    const steps = [
        { id: "details", label: "Personal Details", icon: FaUser },
        { id: "documents", label: "Documents", icon: FaFileAlt },
        { id: "education", label: "Education", icon: FaGraduationCap },
        { id: "bank", label: "Bank Details", icon: FaCreditCard },
        { id: "job", label: "Job Specifications", icon: FaBriefcase }
    ];

    const currentStepIndex = steps.findIndex(step => step.id === subFormState);
    const isLastStep = currentStepIndex === steps.length - 1;

    // Reset form function
    function resetForm() {
        setPersonalDetails({
            firstname: "",
            middlename: "",
            lastname: "",
            dob: "",
            mobile: "",
            email: "",
            address: "",
            pic: null
        });
        setDocumentFiles({
            aadhaarNo: "",
            panNo: "",
            aadhaar: null,
            pan: null,
            voter: null
        });
        setEducationDetails({
            qualification: "",
            institute: "",
            yearOfPassing: "",
            percentage: 0,
            marksheet: null
        });
        setBankDetails({
            accountHolderName: "",
            bankName: "",
            accountNumber: "",
            ifscCode: "",
            branchName: "",
            accountType: ""
        });
        setJobDetails({
            post: "",
            amount: 0,
            paymentFrequency: "",
            joiningDate: "",
            accessLevel: ""
        });
        setSubFormState("details");
    }

    // Check if current step is completed
    function isCurrentStepValid() {
        return validateStep(subFormState) === null;
    }

    // Handle next step
    function handleNextStep() {
        const error = validateStep(subFormState);
        if (error) {
            toast.error(error);
            return;
        }
        
        if (currentStepIndex < steps.length - 1) {
            const nextStep = steps[currentStepIndex + 1];
            setSubFormState(nextStep.id as typeof subFormState);
        }
    }

    // Handle previous step
    function handlePreviousStep() {
        if (currentStepIndex > 0) {
            const prevStep = steps[currentStepIndex - 1];
            setSubFormState(prevStep.id as typeof subFormState);
        }
    }

    // Validation function for a specific step
    function validateStep(step: string) {
        switch (step) {
            case "details":
                if (!personalDetails.firstname.trim()) return "First name is required";
                if (!personalDetails.lastname.trim()) return "Last name is required";
                if (!personalDetails.dob) return "Date of birth is required";
                if (!personalDetails.mobile.match(/^\d{10}$/)) return "Mobile number must be 10 digits";
                if (!personalDetails.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return "Invalid email address";
                if (!personalDetails.address.trim()) return "Address is required";
                if (!personalDetails.pic) return "Photo is required";
                return null;
            
            case "documents":
                if (!documentFiles.aadhaarNo.match(/^\d{12}$/)) return "Aadhaar number must be 12 digits";
                if (!documentFiles.aadhaar) return "Aadhaar card file is required";
                if (!documentFiles.panNo.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) return "PAN number format is invalid";
                if (!documentFiles.pan) return "PAN card file is required";
                return null;
            
            case "education":
                if (!educationDetails.qualification.trim()) return "Qualification is required";
                if (!educationDetails.institute.trim()) return "Institute is required";
                if (!educationDetails.yearOfPassing.match(/^\d{4}$/)) return "Year of passing must be 4 digits";
                if (educationDetails.percentage < 0 || educationDetails.percentage > 100) return "Percentage must be between 0 and 100";
                if (!educationDetails.marksheet) return "Marksheet file is required";
                return null;
            
            case "bank":
                if (!bankDetails.accountHolderName.trim()) return "Account holder name is required";
                if (!bankDetails.bankName.trim()) return "Bank name is required";
                if (!bankDetails.accountNumber.trim()) return "Account number is required";
                if (!bankDetails.ifscCode.match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) return "Invalid IFSC code";
                if (!bankDetails.branchName.trim()) return "Branch name is required";
                if (!bankDetails.accountType) return "Account type is required";
                if (
                    confirmAccountNumberRef.current &&
                    bankDetails.accountNumber !== confirmAccountNumberRef.current.value.trim()
                ) return "Account number and confirm account number do not match";
                return null;
            
            case "job":
                if (!jobDetails.post.trim()) return "Job post is required";
                if (!jobDetails.joiningDate) return "Joining date is required";
                if (!jobDetails.amount || jobDetails.amount <= 0) return "Amount must be greater than 0";
                if (!jobDetails.paymentFrequency) return "Payment frequency is required";
                if (!jobDetails.accessLevel) return "Access level is required";
                return null;
            
            default:
                return null;
        }
    }

    // Form submission handler
    async function handleSubmit() {
        setIsSubmitting(true);

        // Validate all steps before submission
        const errors = [];
        for (const step of steps) {
            const error = validateStep(step.id);
            if (error) errors.push(`${step.label}: ${error}`);
        }

        if (errors.length > 0) {
            toast.error(errors[0]); // Show first error
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData();

        formData.append("Name", `${personalDetails.firstname} ${personalDetails.middlename} ${personalDetails.lastname}`.trim());
        formData.append("DOB", personalDetails.dob);
        formData.append("Email", personalDetails.email);
        formData.append("Mobile", personalDetails.mobile);
        formData.append("Address", personalDetails.address);
        if (personalDetails.pic) formData.append("Pic", personalDetails.pic);

        formData.append("AadhaarNo", documentFiles.aadhaarNo);
        formData.append("PanNo", documentFiles.panNo);
        if (documentFiles.aadhaar) formData.append("Aadhaar", documentFiles.aadhaar);
        if (documentFiles.pan) formData.append("Pan", documentFiles.pan);
        if (documentFiles.voter) formData.append("Voter", documentFiles.voter);

        formData.append("Qualification", educationDetails.qualification);
        formData.append("Institution", educationDetails.institute);
        formData.append("YearOfPassing", educationDetails.yearOfPassing);
        formData.append("Percentage", educationDetails.percentage.toString());
        if (educationDetails.marksheet) formData.append("Marksheet", educationDetails.marksheet);

        formData.append("AccountHolderName", bankDetails.accountHolderName);
        formData.append("BankName", bankDetails.bankName);
        formData.append("AccountNumber", bankDetails.accountNumber);
        formData.append("IFSCCode", bankDetails.ifscCode);
        formData.append("Branch", bankDetails.branchName);
        formData.append("AccountType", bankDetails.accountType);

        formData.append("Post", jobDetails.post);
        formData.append("Amount", jobDetails.amount.toString());
        formData.append("PaymentFrequency", jobDetails.paymentFrequency);
        formData.append("JoiningDate", jobDetails.joiningDate);
        formData.append("AccessLevel", jobDetails.accessLevel);
        formData.append("Password", "defaultPassword");

        try {
            const token = localStorage.getItem("authToken");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/employee/add-employee`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Employee added successfully!");
                resetForm();
            } else {
                toast.error(typeof data.message === 'object' ? data.message[0] : data.message || "Failed to add employee");
            }
        } catch (err) {
            toast.error("An error occurred while submitting the employee.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="w-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-8 border border-blue-200/50 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-xl bg-blue-100/80 shadow-inner">
                    <FaUser className="text-2xl text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-blue-800 tracking-tight">Add New Employee</h2>
                    <p className="text-blue-600">Fill in the employee information step by step</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="mb-8">
                <div className="flex justify-between items-center bg-white/80 rounded-xl p-4 shadow-sm border border-blue-100">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const isAccessible = index <= currentStepIndex;
                        
                        return (
                            <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <button
                                        type="button"
                                        onClick={() => isAccessible ? setSubFormState(step.id as typeof subFormState) : null}
                                        disabled={!isAccessible}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                                            isCompleted
                                                ? "bg-green-600 text-white shadow-lg"
                                                : isCurrent
                                                ? "bg-blue-600 text-white shadow-lg"
                                                : isAccessible
                                                ? "bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer"
                                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        }`}
                                    >
                                        {isCompleted ? "✓" : <step.icon />}
                                    </button>
                                    <span className={`text-xs font-medium mt-2 hidden sm:block ${
                                        isCompleted ? "text-green-600" :
                                        isCurrent ? "text-blue-800" :
                                        isAccessible ? "text-blue-600" : "text-gray-400"
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`w-8 h-px mx-2 hidden sm:block ${
                                        isCompleted ? "bg-green-300" : "bg-blue-200"
                                    }`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Form Content */}
            <div className="space-y-6">
                <div className="bg-white/80 rounded-xl p-6 shadow-sm border border-blue-100">
                    {subFormState === "details" && (
                        <PersonalDetails personalDetails={personalDetails} setPersonalDetails={setPersonalDetails} />
                    )}
                    {subFormState === "documents" && (
                        <Documents documentFiles={documentFiles} setDocumentFiles={setDocumentFiles} />
                    )}
                    {subFormState === "education" && (
                        <Education educationDetails={educationDetails} setEducationDetails={setEducationDetails} />
                    )}
                    {subFormState === "bank" && (
                        <Bank bankDetails={bankDetails} setBankDetails={setBankDetails} confirmAccountNumberRef={confirmAccountNumberRef} />
                    )}
                    {subFormState === "job" && (
                        <JobSpecifications jobDetails={jobDetails} setJobDetails={setJobDetails} />
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                    {/* Previous Button */}
                    <button
                        type="button"
                        onClick={handlePreviousStep}
                        disabled={currentStepIndex === 0}
                        className={`px-6 py-3 font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 ${
                            currentStepIndex === 0 
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                                : "bg-white border border-blue-300 text-blue-600 hover:bg-blue-50"
                        }`}
                    >
                        ← Previous
                    </button>

                    {/* Next/Submit Button */}
                    {isLastStep ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !isCurrentStepValid()}
                            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Adding Employee...
                                </>
                            ) : (
                                <>
                                    Add Employee
                                    ✓
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleNextStep}
                            disabled={!isCurrentStepValid()}
                            className={`px-6 py-3 font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 ${
                                isCurrentStepValid()
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                        >
                            Continue →
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function PersonalDetails({
    personalDetails,
    setPersonalDetails
}: {
    personalDetails: {
        firstname: string,
        middlename: string,
        lastname: string,
        dob: string,
        mobile: string,
        email: string,
        address: string,
        pic: File | null
    },
    setPersonalDetails: React.Dispatch<React.SetStateAction<{
        firstname: string;
        middlename: string;
        lastname: string;
        dob: string;
        mobile: string;
        email: string;
        address: string;
        pic: File | null;
    }>>
}) {
    const employeePicUploader = useRef<HTMLInputElement>(null)
    const [employeePic, setEmployeePic] = useState<string | null>(personalDetails.pic ? URL.createObjectURL(personalDetails.pic) : null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setPersonalDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <FaUser className="text-blue-600" />
                Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    label="First Name"
                    name="firstname"
                    type="text"
                    placeholder="Enter first name"
                    value={personalDetails.firstname}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Middle Name"
                    name="middlename"
                    type="text"
                    placeholder="Enter middle name"
                    value={personalDetails.middlename}
                    onChange={handleChange}
                />
                <FormField
                    label="Last Name"
                    name="lastname"
                    type="text"
                    placeholder="Enter last name"
                    value={personalDetails.lastname}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    label="Date of Birth"
                    name="dob"
                    type="date"
                    value={personalDetails.dob}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Mobile Number"
                    name="mobile"
                    type="tel"
                    placeholder="Enter mobile number"
                    value={personalDetails.mobile}
                    onChange={handleChange}
                    required
                />
            </div>

            <FormField
                label="Email Address"
                name="email"
                type="email"
                placeholder="Enter email address"
                value={personalDetails.email}
                onChange={handleChange}
                required
            />

            <div>
                <label className="block text-blue-700 font-medium mb-2">Address</label>
                <textarea
                    name="address"
                    placeholder="Enter complete address"
                    value={personalDetails.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/90 resize-none"
                    required
                />
            </div>

            {/* Photo Upload */}
            <div className="space-y-3">
                <label className="block text-blue-700 font-medium">Employee Photo</label>
                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        accept="image/*"
                        ref={employeePicUploader}
                        className="hidden"
                        onChange={() => {
                            const file = employeePicUploader.current?.files?.[0]
                            if (!file) return
                            setEmployeePic(URL.createObjectURL(file))
                            setPersonalDetails(prev => ({
                                ...prev,
                                pic: file
                            }))
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => employeePicUploader.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                        <FaUpload />
                        Upload Photo
                    </button>
                    {employeePic && (
                        <div className="flex items-center gap-3">
                            <img
                                src={employeePic}
                                alt="Employee preview"
                                className="w-16 h-16 rounded-lg object-cover border-2 border-blue-200"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setEmployeePic(null)
                                    setPersonalDetails(prev => ({
                                        ...prev,
                                        pic: null
                                    }))
                                }}
                                className="text-red-600 hover:text-red-800 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function Documents({ documentFiles, setDocumentFiles }: { 
    documentFiles: { aadhaarNo: string, panNo: string, aadhaar: File | null, pan: File | null, voter: File | null }, 
    setDocumentFiles: React.Dispatch<React.SetStateAction<{ aadhaarNo: string, panNo: string, aadhaar: File | null, pan: File | null, voter: File | null }>> 
}) {
    const aadhaarCardRef = useRef<HTMLInputElement>(null)
    const panCardRef = useRef<HTMLInputElement>(null)
    const voterCardRef = useRef<HTMLInputElement>(null)
    const [aadhaarPreview, setAadhaarPreview] = useState<string>()
    const [panPreview, setPanPreview] = useState<string>()
    const [voterPreview, setVoterPreview] = useState<string>()

    const handleFileChange = (e: ChangeEvent, fileType: string) => {
        const file = (e.currentTarget as HTMLInputElement).files?.[0]
        if (!file) return
        
        const url = URL.createObjectURL(file)
        if (fileType === 'aadhaar') setAadhaarPreview(url)
        else if (fileType === "pan") setPanPreview(url)
        else setVoterPreview(url)
        
        setDocumentFiles(prev => ({ ...prev, [fileType]: file }))
    }

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDocumentFiles(prev => ({
            ...prev,
            [name]: value
        }));
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <FaFileAlt className="text-blue-600" />
                Identity Documents
            </h3>

            {/* Aadhaar Card */}
            <DocumentSection
                title="Aadhaar Card"
                numberLabel="Aadhaar Number"
                numberName="aadhaarNo"
                numberPlaceholder="Enter 12-digit Aadhaar number"
                numberValue={documentFiles.aadhaarNo}
                onNumberChange={handleInputChange}
                fileRef={aadhaarCardRef}
                onFileChange={(e) => handleFileChange(e, 'aadhaar')}
                file={documentFiles.aadhaar}
                preview={aadhaarPreview}
                onClear={() => setDocumentFiles(prev => ({ ...prev, aadhaar: null }))}
                required
            />

            {/* PAN Card */}
            <DocumentSection
                title="PAN Card"
                numberLabel="PAN Number"
                numberName="panNo"
                numberPlaceholder="Enter PAN number (e.g., ABCDE1234F)"
                numberValue={documentFiles.panNo}
                onNumberChange={handleInputChange}
                fileRef={panCardRef}
                onFileChange={(e) => handleFileChange(e, 'pan')}
                file={documentFiles.pan}
                preview={panPreview}
                onClear={() => setDocumentFiles(prev => ({ ...prev, pan: null }))}
                required
            />

            {/* Voter ID */}
            <DocumentSection
                title="Voter ID Card"
                numberLabel=""
                numberName=""
                numberPlaceholder=""
                numberValue=""
                onNumberChange={() => {}}
                fileRef={voterCardRef}
                onFileChange={(e) => handleFileChange(e, 'voter')}
                file={documentFiles.voter}
                preview={voterPreview}
                onClear={() => setDocumentFiles(prev => ({ ...prev, voter: null }))}
                showNumberInput={false}
            />
        </div>
    )
}

function DocumentSection({
    title,
    numberLabel,
    numberName,
    numberPlaceholder,
    numberValue,
    onNumberChange,
    fileRef,
    onFileChange,
    file,
    preview,
    onClear,
    required = false,
    showNumberInput = true
}: {
    title: string;
    numberLabel: string;
    numberName: string;
    numberPlaceholder: string;
    numberValue: string;
    onNumberChange: (e: ChangeEvent<HTMLInputElement>) => void;
    fileRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: ChangeEvent) => void;
    file: File | null;
    preview?: string;
    onClear: () => void;
    required?: boolean;
    showNumberInput?: boolean;
}) {
    return (
        <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50/50">
            <h4 className="font-medium text-blue-800 mb-3">{title}</h4>
            
            {showNumberInput && (
                <div className="mb-3">
                    <input
                        type="text"
                        name={numberName}
                        placeholder={numberPlaceholder}
                        value={numberValue}
                        onChange={onNumberChange}
                        className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/90"
                        required={required}
                    />
                </div>
            )}
            
            <div className="flex items-center gap-3">
                <input
                    type="file"
                    ref={fileRef}
                    accept="application/pdf,image/*"
                    onChange={onFileChange}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                    <FaUpload />
                    Upload {title}
                </button>
                
                {file && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-green-700 font-medium">
                            ✓ {file.name}
                        </span>
                        {preview && (
                            <a
                                href={preview}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                <FaEye />
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={onClear}
                            className="text-red-600 hover:text-red-800 transition-colors"
                        >
                            <FaTimes />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function Education({ educationDetails, setEducationDetails }: {
    educationDetails: { qualification: string, institute: string, yearOfPassing: string, percentage: number, marksheet: File | null },
    setEducationDetails: React.Dispatch<React.SetStateAction<{ qualification: string, institute: string, yearOfPassing: string, percentage: number, marksheet: File | null }>>
}) {
    const marksheetRef = useRef<HTMLInputElement>(null)
    const [marksheetPreview, setMarksheetPreview] = useState<string | null>(null)
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEducationDetails(prev => ({
            ...prev,
            [name]: name === 'percentage' ? parseFloat(value) || 0 : value
        }));
    };

    const handleFileChange = (e: ChangeEvent) => {
        const file = (e.currentTarget as HTMLInputElement).files?.[0]
        if (file) {
            setMarksheetPreview(URL.createObjectURL(file))
            setEducationDetails(prev => ({
                ...prev,
                marksheet: file
            }))
        }
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <FaGraduationCap className="text-blue-600" />
                Educational Qualifications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    label="Highest Qualification"
                    name="qualification"
                    type="text"
                    placeholder="e.g., Bachelor's in Computer Science"
                    value={educationDetails.qualification}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Institute/University"
                    name="institute"
                    type="text"
                    placeholder="Enter institute name"
                    value={educationDetails.institute}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Year of Passing"
                    name="yearOfPassing"
                    type="text"
                    placeholder="e.g., 2023"
                    value={educationDetails.yearOfPassing}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Percentage/CGPA"
                    name="percentage"
                    type="number"
                    placeholder="Enter percentage or CGPA"
                    value={educationDetails.percentage || ''}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.01"
                    required
                />
            </div>

            {/* Marksheet Upload */}
            <div className="space-y-3">
                <label className="block text-blue-700 font-medium">Marksheet/Certificate</label>
                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        accept="application/pdf,image/*"
                        ref={marksheetRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => marksheetRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                        <FaUpload />
                        Upload Marksheet
                    </button>
                    {educationDetails.marksheet && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-green-700 font-medium">
                                ✓ {educationDetails.marksheet.name}
                            </span>
                            {marksheetPreview && (
                                <a
                                    href={marksheetPreview}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    <FaEye />
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setEducationDetails(prev => ({ ...prev, marksheet: null }))
                                    setMarksheetPreview(null)
                                }}
                                className="text-red-600 hover:text-red-800 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function Bank({ bankDetails, setBankDetails, confirmAccountNumberRef }: {
    bankDetails: {
        accountHolderName: string, bankName: string, accountNumber: string, ifscCode: string,
        branchName: string, accountType: string
    },
    setBankDetails: React.Dispatch<React.SetStateAction<{ accountHolderName: string, bankName: string; accountNumber: string, ifscCode: string, branchName: string, accountType: string }>>,
    confirmAccountNumberRef: React.RefObject<HTMLInputElement|null>
}) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBankDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <FaCreditCard className="text-blue-600" />
                Bank Account Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    label="Account Holder Name"
                    name="accountHolderName"
                    type="text"
                    placeholder="Enter account holder name"
                    value={bankDetails.accountHolderName}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Bank Name"
                    name="bankName"
                    type="text"
                    placeholder="Enter bank name"
                    value={bankDetails.bankName}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Account Number"
                    name="accountNumber"
                    type="text"
                    placeholder="Enter account number"
                    value={bankDetails.accountNumber}
                    onChange={handleChange}
                    required
                />
                <div>
                    <label className="block text-blue-700 font-medium mb-2">Confirm Account Number</label>
                    <input
                        type="text"
                        name="confirmAccountNumber"
                        placeholder="Re-enter account number"
                        ref={confirmAccountNumberRef}
                        className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/90"
                        required
                    />
                </div>
                <FormField
                    label="IFSC Code"
                    name="ifscCode"
                    type="text"
                    placeholder="Enter IFSC code"
                    value={bankDetails.ifscCode}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Branch Name"
                    name="branchName"
                    type="text"
                    placeholder="Enter branch name"
                    value={bankDetails.branchName}
                    onChange={handleChange}
                    required
                />
            </div>

            <div>
                <label className="block text-blue-700 font-medium mb-2">Account Type</label>
                <select
                    name="accountType"
                    value={bankDetails.accountType}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/90"
                    required
                >
                    <option value="">Select Account Type</option>
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                    <option value="salary">Salary</option>
                </select>
            </div>
        </div>
    )
}

function JobSpecifications({ jobDetails, setJobDetails }: {
    jobDetails: { post: string, amount: number, paymentFrequency: string, joiningDate: string, accessLevel: string },
    setJobDetails: React.Dispatch<React.SetStateAction<{ post: string, amount: number, paymentFrequency: string, joiningDate: string, accessLevel: string }>>
}) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setJobDetails(prev => ({
            ...prev,
            [name]: name === 'amount' ? parseFloat(value) || 0 : value
        }));
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <FaBriefcase className="text-blue-600" />
                Job Specifications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    label="Job Position"
                    name="post"
                    type="text"
                    placeholder="Enter job position"
                    value={jobDetails.post}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Joining Date"
                    name="joiningDate"
                    type="date"
                    value={jobDetails.joiningDate}
                    onChange={handleChange}
                    required
                />
                <FormField
                    label="Salary Amount"
                    name="amount"
                    type="number"
                    placeholder="Enter salary amount"
                    value={jobDetails.amount || ''}
                    onChange={handleChange}
                    min="0"
                    required
                />
                <div>
                    <label className="block text-blue-700 font-medium mb-2">Payment Frequency</label>
                    <select
                        name="paymentFrequency"
                        value={jobDetails.paymentFrequency}
                        onChange={handleChange}
                        className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/90"
                        required
                    >
                        <option value="">Select Payment Frequency</option>
                        <option value="monthly">Monthly</option>
                        <option value="hourly">Hourly</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-blue-700 font-medium mb-2">Access Level</label>
                <select
                    name="accessLevel"
                    value={jobDetails.accessLevel}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/90"
                    required
                >
                    <option value="">Select Access Level</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                </select>
            </div>
        </div>
    )
}

function FormField({
    label,
    name,
    type = "text",
    placeholder,
    value,
    onChange,
    required = false,
    min,
    max,
    step
}: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    min?: string;
    max?: string;
    step?: string;
}) {
    return (
        <div>
            <label className="block text-blue-700 font-medium mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/90 transition-all duration-200"
                required={required}
            />
        </div>
    )
}