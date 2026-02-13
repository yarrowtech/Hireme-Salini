import { UserContext } from "../context/UserContext";
import { useNavigate, useParams } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import RightArrow from "../assets/right-arrow.svg";
import LeftArrow from "../assets/left-arrow.svg";
import { toast } from "react-toastify";

export default function Employee() {
  const { userState } = useContext(UserContext)!;
  const [employeeDetailsType, setEmployeeDetailsType] = useState<
    "details" | "job" | "attendance" | "education" | "bank"
  >("details");
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();

  useEffect(() => {
    if (userState.position === "guest" && userState.Company === null)
      navigate("/");

    const fetchEmployeeDetails = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/employee/get-employee-details/${
            params.id
          }`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setEmployeeData(data);
        } else {
          toast.error("Failed to fetch employee details");
        }
      } catch (error) {
        toast.error("Error fetching employee details");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <section className="flex flex-col md:grid md:grid-cols-[18rem_auto] min-h-screen mt-[12vh] bg-gradient-to-br from-blue-50 to-blue-100">
      <SideBar
        employeeDetailsType={employeeDetailsType}
        setEmployeeDetailsType={setEmployeeDetailsType}
      />
      <main className="flex flex-col items-center w-full p-4">
        {employeeDetailsType === "details" && (
          <PersonalDetailsContainer data={employeeData} />
        )}
        {employeeDetailsType === "job" && (
          <JobDescriptionContainer data={employeeData} />
        )}
        {employeeDetailsType === "attendance" && <Attendance />}
        {employeeDetailsType === "education" && (
          <EducationQualificationsContainer data={employeeData} />
        )}
        {employeeDetailsType === "bank" && (
          <BankDetailsContainer data={employeeData} />
        )}
      </main>
    </section>
  );
}

function SideBar({
  employeeDetailsType,
  setEmployeeDetailsType,
}: {
  employeeDetailsType: "details" | "job" | "attendance" | "education" | "bank";
  setEmployeeDetailsType: React.Dispatch<
    React.SetStateAction<
      "details" | "job" | "attendance" | "education" | "bank"
    >
  >;
}) {
  return (
    <nav className="h-full w-full md:w-auto bg-gradient-to-b from-blue-900 to-blue-700 shadow-xl p-6 flex flex-row md:flex-col items-center gap-6 md:gap-8 rounded-b-3xl md:rounded-none md:rounded-r-3xl">
      <button
        className={`px-6 py-3 rounded-2xl w-full text-lg font-semibold transition-all duration-300 ease-linear focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          employeeDetailsType === "details"
            ? "bg-white text-blue-900 shadow-lg"
            : "text-white hover:bg-blue-300 hover:text-blue-900 hover:scale-105 hover:shadow-lg"
        }`}
        onClick={() => setEmployeeDetailsType("details")}
      >
        Personal Details
      </button>
      <button
        className={`px-6 py-3 rounded-2xl w-full text-lg font-semibold transition-all duration-300 ease-linear focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          employeeDetailsType === "education"
            ? "bg-white text-blue-900 shadow-lg"
            : "text-white hover:bg-blue-300 hover:text-blue-900 hover:scale-105 hover:shadow-lg"
        }`}
        onClick={() => setEmployeeDetailsType("education")}
      >
        Education
      </button>
      <button
        className={`px-6 py-3 rounded-2xl w-full text-lg font-semibold transition-all duration-300 ease-linear focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          employeeDetailsType === "bank"
            ? "bg-white text-blue-900 shadow-lg"
            : "text-white hover:bg-blue-300 hover:text-blue-900 hover:scale-105 hover:shadow-lg"
        }`}
        onClick={() => setEmployeeDetailsType("bank")}
      >
        Bank Details
      </button>
      <button
        className={`px-6 py-3 rounded-2xl w-full text-lg font-semibold transition-all duration-300 ease-linear focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          employeeDetailsType === "job"
            ? "bg-white text-blue-900 shadow-lg"
            : "text-white hover:bg-blue-300 hover:text-blue-900 hover:scale-105 hover:shadow-lg"
        }`}
        onClick={() => setEmployeeDetailsType("job")}
      >
        Job Description
      </button>
      <button
        className={`px-6 py-3 rounded-2xl w-full text-lg font-semibold transition-all duration-300 ease-linear focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          employeeDetailsType === "attendance"
            ? "bg-white text-blue-900 shadow-lg"
            : "text-white hover:bg-blue-300 hover:text-blue-900 hover:scale-105 hover:shadow-lg"
        }`}
        onClick={() => setEmployeeDetailsType("attendance")}
      >
        Attendance
      </button>
    </nav>
  );
}

function PersonalDetailsContainer({ data }: { data: any }) {
  return (
    <div className="w-full max-w-xl bg-white/90 rounded-3xl shadow-2xl p-10 flex flex-col gap-8 border border-blue-100">
      <h2 className="text-2xl font-extrabold text-blue-900 mb-2 tracking-tight">
        Personal Details
      </h2>
      {data.Pic && (
        <img
          src={`${import.meta.env.VITE_API_URL}/${data.Pic}`}
          className="w-32 h-32 object-cover m-auto border-2 rounded-full bg-blue-100"
          alt="Profile"
        />
      )}
      <div className="grid grid-cols-[40%_auto] gap-5">
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Full Name:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.Name}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Date of Birth:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.DOB}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Mobile No.:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.Mobile}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Email ID:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.Email}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Address:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.Address}
        </h3>
      </div>

      <div className="border-t-2 border-blue-200 pt-6">
        <h3 className="text-xl font-bold text-blue-900 mb-4">
          Company Details
        </h3>
        <div className="grid grid-cols-[40%_auto] gap-5">
          <h2 className="text-center text-lg font-semibold text-blue-900">
            Username
          </h2>
          <h3 className="text-center text-base font-medium text-blue-800">
            {data.Username}
          </h3>
          <h2 className="text-center text-lg font-semibold text-blue-900">
            Company Name
          </h2>
          <h3 className="text-center text-base font-medium text-blue-800">
            {data.Company.CompanyName}
          </h3>
          <h2 className="text-center text-lg font-semibold text-blue-900">
            Company Code
          </h2>
          <h3 className="text-center text-base font-medium text-blue-800">
            {data.CompanyCode}
          </h3>
          <h2 className="text-center text-lg font-semibold text-blue-900">
            Company Contact No
          </h2>
          <h3 className="text-center text-base font-medium text-blue-800">
            {data.Company.Contact}
          </h3>
          <h2 className="text-center text-lg font-semibold text-blue-900">
            Company Email
          </h2>
          <h3 className="text-center text-base font-medium text-blue-800">
            {data.Company.Email}
          </h3>
          <h2 className="text-center text-lg font-semibold text-blue-900">
            Company Address
          </h2>
          <h3 className="text-center text-base font-medium text-blue-800">
            {data.Company.Address}
          </h3>
        </div>
      </div>

      <div className="border-t-2 border-blue-200 pt-6">
        <h3 className="text-xl font-bold text-blue-900 mb-4">
          Identity Documents
        </h3>
        <div className="grid grid-cols-[40%_auto] gap-5">
          <h2 className="text-center text-lg font-semibold text-blue-900">
            Aadhaar Number:
          </h2>
          <h3 className="text-center text-base font-medium text-blue-800">
            {data.AadhaarNo}
          </h3>
          {data.Aadhaar && (
            <>
              <h2 className="text-center text-lg font-semibold text-blue-900">
                Aadhaar Card:
              </h2>
              <a
                href={`${import.meta.env.VITE_API_URL}/${data.Aadhaar}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-base font-medium text-blue-600 hover:text-blue-800 underline"
              >
                View Document
              </a>
            </>
          )}

          <h2 className="text-center text-lg font-semibold text-blue-900">
            PAN Number:
          </h2>
          <h3 className="text-center text-base font-medium text-blue-800">
            {data.PanNo}
          </h3>
          {data.Pan && (
            <>
              <h2 className="text-center text-lg font-semibold text-blue-900">
                PAN Card:
              </h2>
              <a
                href={`${import.meta.env.VITE_API_URL}/${data.Pan}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-base font-medium text-blue-600 hover:text-blue-800 underline"
              >
                View Document
              </a>
            </>
          )}

          {data.Voter && (
            <>
              <h2 className="text-center text-lg font-semibold text-blue-900">
                Voter ID:
              </h2>
              <a
                href={`${import.meta.env.VITE_API_URL}/${data.Voter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-base font-medium text-blue-600 hover:text-blue-800 underline"
              >
                View Document
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function JobDescriptionContainer({ data }: { data: any }) {
  return (
    <div className="w-full max-w-xl bg-white/90 rounded-3xl shadow-2xl p-10 flex flex-col gap-8 border border-blue-100">
      <h2 className="text-2xl font-extrabold text-blue-900 mb-2 tracking-tight">
        Job Description
      </h2>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-blue-900">
            Job Post Name:
          </span>
          <span className="text-base font-medium text-blue-800">
            {data.Post}
          </span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-lg font-semibold text-blue-900">
            Payable Amount:
          </span>
          <span className="text-base font-medium text-blue-800">
            ₹ {data.Amount}
          </span>
          <span className="text-lg font-semibold text-blue-900">Basis:</span>
          <span className="text-base font-medium text-blue-800">
            {data.PaymentFrequency}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-blue-900">
            Joining Date:
          </span>
          <span className="text-base font-medium text-blue-800">
            {data.JoiningDate}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-blue-900">
            Access Level:
          </span>
          <span className={`text-base font-bold text-blue-800 ${data.AccessLevel === "EMPLOYEE" ? "text-green-600" : "text-yellow-600"}`}>
            {data.AccessLevel}
          </span>
        </div>
      </div>
    </div>
  );
}

function Attendance() {
  const [date, setDate] = useState<{ month: number; year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const [attendanceData, setAttendanceData] = useState<
    { Date: Date; Present: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const { userState } = useContext(UserContext)!;
  const title = useRef<HTMLHeadingElement>(null);
  const calendarGrid = useRef<HTMLDivElement>(null);

  function generateCalendar() {
    calendarGrid.current!.innerHTML = "";

    const { month, year } = date;
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    title.current!.innerHTML = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // creating empty boxes for first days
    for (let i = 0; i < firstDay; i++) {
      const p = document.createElement("p");
      p.classList.add("calendar-day");
      calendarGrid.current?.appendChild(p);
    }

    for (let i = 1; i <= totalDays; i++) {
      const p = document.createElement("p");
      p.classList.add("calendar-day");
      p.innerText = `${i}`;
      const attendance = attendanceData.find((data) => {
        const date = new Date(data.Date);
        return (
          date.getDate() === i &&
          date.getMonth() === month &&
          date.getFullYear() === year
        );
      });
      if (attendance) {
        p.classList.add(attendance.Present ? "bg-green-600" : "bg-red-600");
      }
      calendarGrid.current?.appendChild(p);
    }
  }

  const markAttendance = async (present: boolean) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/employee/mark-attendance/${params.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify({
            date: new Date().toISOString(),
            present: present,
          }),
        }
      );

      if (response.ok) {
        toast.success("Attendance marked successfully");
        fetchAttendance();
      } else {
        toast.error("Failed to mark attendance");
      }
    } catch (error) {
      toast.error("Error marking attendance");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/employee/get-attendance/${params.id}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setAttendanceData(data);
    } else {
      throw new Error();
    }
  };

  const decreaseDate = () => {
    if (date.month > 0) {
      setDate({ ...date, month: date.month - 1 });
      return;
    }
    setDate({ month: 11, year: date.year - 1 });
  };
  const increaseDate = () => {
    if (date.month < 11) {
      setDate({ ...date, month: date.month + 1 });
      return;
    }
    setDate({ month: 0, year: date.year + 1 });
  };

  useEffect(() => {
    try {
      setLoading(true);
      fetchAttendance();
    } catch (error) {
      toast.error("Error fetching attendance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      generateCalendar();
    }
  }, [date, loading, attendanceData]);

  if (loading) {
    return (
      <p className="text-blue-500 font-bold my-10">
        Loading attendance data....
      </p>
    );
  }

  return (
    <section className="w-[70%] bg-white/90 rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-8 border border-blue-100">
      <div className="grid grid-cols-[10%_auto_10%] items-center w-full mb-4">
        <img
          src={LeftArrow}
          alt="Previous"
          className="cursor-pointer w-10 hover:scale-110 transition-transform"
          onClick={decreaseDate}
        />
        <h2
          ref={title}
          className="font-extrabold text-blue-900 text-2xl justify-self-center"
        >
          Calendar
        </h2>
        <img
          src={RightArrow}
          alt="Next"
          className="cursor-pointer w-10 hover:scale-110 transition-transform"
          onClick={increaseDate}
        />
      </div>

      <div className="flex flex-col items-center gap-6 w-full h-full">
        <div className="grid grid-cols-7 gap-2 w-full h-2/5">
          <p className="calendar-day-name">Sun</p>
          <p className="calendar-day-name">Mon</p>
          <p className="calendar-day-name">Tue</p>
          <p className="calendar-day-name">Wed</p>
          <p className="calendar-day-name">Thu</p>
          <p className="calendar-day-name">Fri</p>
          <p className="calendar-day-name">Sat</p>
        </div>
        <div ref={calendarGrid} className="grid grid-cols-7 gap-2 w-full"></div>
      </div>
      {/* Add Mark Attendance Button */}
      {userState.position === "company" && <div className="flex gap-4">
        <button
          onClick={() => markAttendance(true)}
          disabled={loading}
          className={`px-6 py-3 rounded-xl bg-green-600 text-white font-semibold 
                        transition-all duration-300 hover:bg-green-700 focus:outline-none focus:ring-2 
                        focus:ring-green-400 disabled:bg-green-300 disabled:cursor-not-allowed
                        flex items-center gap-2`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Marking...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              Mark Present
            </>
          )}
        </button>

        <button
          onClick={() => markAttendance(false)}
          disabled={loading}
          className={`px-6 py-3 rounded-xl bg-red-600 text-white font-semibold 
                        transition-all duration-300 hover:bg-red-700 focus:outline-none focus:ring-2 
                        focus:ring-red-400 disabled:bg-red-300 disabled:cursor-not-allowed
                        flex items-center gap-2`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Marking...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
              Mark Absent
            </>
          )}
        </button>
      </div>}
    </section>
  );
}

function EducationQualificationsContainer({ data }: { data: any }) {
  return (
    <div className="w-full max-w-xl bg-white/90 rounded-3xl shadow-2xl p-10 flex flex-col gap-8 border border-blue-100">
      <h2 className="text-2xl font-extrabold text-blue-900 mb-2 tracking-tight">
        Education Qualifications
      </h2>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-blue-900">
            Qualification:
          </span>
          <span className="text-base font-medium text-blue-800">
            {data.Qualification}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-blue-900">
            Institution:
          </span>
          <span className="text-base font-medium text-blue-800">
            {data.Institution}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-blue-900">
            Year of Passing:
          </span>
          <span className="text-base font-medium text-blue-800">
            {data.YearOfPassing}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-blue-900">
            Percentage:
          </span>
          <span className="text-base font-medium text-blue-800">
            {data.Percentage}%
          </span>
          <span className="text-lg font-semibold text-blue-900">
            Marksheet:
          </span>
          <a
            className="text-base font-medium text-blue-800 underline"
            href={`${import.meta.env.VITE_API_URL}/${data.Marksheet}`}
            target="_blank"
          >
            Marksheet File
          </a>
        </div>
      </div>
    </div>
  );
}

function BankDetailsContainer({ data }: { data: any }) {
  return (
    <div className="w-full max-w-xl bg-white/90 rounded-3xl shadow-2xl p-10 flex flex-col gap-8 border border-blue-100">
      <h2 className="text-2xl font-extrabold text-blue-900 mb-2 tracking-tight">
        Bank Details
      </h2>
      <div className="grid grid-cols-[40%_auto] gap-5">
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Account Holder:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.AccountHolderName}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Account Number:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.AccountNumber}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          IFSC Code:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.IFSCCode}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Bank Name:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.BankName}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Branch:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.Branch}
        </h3>
        <h2 className="text-center text-lg font-semibold text-blue-900">
          Account Type:
        </h2>
        <h3 className="text-center text-base font-medium text-blue-800">
          {data.AccountType}
        </h3>
      </div>
    </div>
  );
}
