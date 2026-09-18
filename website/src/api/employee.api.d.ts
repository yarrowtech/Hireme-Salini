export interface EmployeeDashboardData {
  employee: {
    employeeId: string;
    name: string;
    role: string;
    department: string;
    designation: string;
    email: string;
    phone: string;
    shiftStart: string;
    shiftEnd: string;
    shiftName: string;
    weeklyOff: string;
    workLocation: string;
    joiningDate: string;
    status: string;
    attendanceMode: string;
  };
  company: {
    name: string;
    code?: number | string;
    email?: string;
    phone?: string;
  } | null;
  todayAttendance: {
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    workingHours?: number;
  };
  monthlySummary: {
    month: string;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    paidLeave: number;
    attendancePct: number;
  };
  salary: {
    structure: any | null;
    latestPayroll: {
      month: string;
      netSalary: number;
      grossSalary: number;
      totalDeductions: number;
      status: string;
      paymentDate?: string | null;
    } | null;
    history: Array<any>;
  };
  recentAttendance: Array<{
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    lateMinutes?: number;
  }>;
}

export interface EmployeeApi {
  me(): Promise<any>;
  getDashboard(params?: { month?: string; year?: number }): Promise<{ success: boolean; data: EmployeeDashboardData; message?: string }>;
  getAttendance(params?: any): Promise<any>;
  checkIn(payload?: { time?: string }): Promise<any>;
  checkOut(payload?: { time?: string }): Promise<any>;
  leaveRequest(payload: { date: string; reason: string }): Promise<any>;
}

declare const employeeApi: EmployeeApi;
export default employeeApi;

