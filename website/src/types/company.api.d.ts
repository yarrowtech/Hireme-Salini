declare module "../../api/company.api" {
  const companyApi: {
    isAuthTokenExpired(): boolean;
    clearExpiredCompanySession(): void;
    sendRequest(payload: any): Promise<any>;
    listMyRequests(params?: any): Promise<any>;
    getRequestById(requestId: any): Promise<any>;
    getDocUrl(requestId: any, docKey: any): string;
    getRequestDoc(requestId: any, docKey: any): Promise<any>;
    resolveCompanyId(): Promise<string>;
    getCompanyDashboard(companyId?: any): Promise<any>;
    getCompanyAnalytics(companyId?: any): Promise<any>;
    getCompanyEmployees(companyId?: any): Promise<any>;
    getCompanyEmployee(companyId: any, employeeId: any): Promise<any>;
    upsertCompanyEmployee(companyId: any, payload: any): Promise<any>;
    deleteCompanyEmployee(companyId: any, employeeId: any): Promise<any>;
    getCompanySubscription(companyId?: any): Promise<any>;
    upsertCompanySubscription(companyId: any, payload: any): Promise<any>;
    getCompanyPayroll(companyId?: any, params?: any): Promise<any>;
    submitCompanyPayroll(companyId: any, payload: any): Promise<any>;
    getCompanyAttendance(companyId?: any, params?: any): Promise<any>;
    getAttendanceDaily(companyId?: any, params?: any): Promise<any>;
    getAttendanceMonthly(companyId?: any, params?: any): Promise<any>;
    getAttendanceYearly(companyId?: any, params?: any): Promise<any>;
    bulkAttendance(companyId: any, payload: any): Promise<any>;
    runAutoAbsent(companyId: any, payload?: any): Promise<any>;
    getAttendancePolicy(companyId?: any): Promise<any>;
    saveAttendancePolicy(companyId: any, payload: any): Promise<any>;
    getHolidays(companyId?: any, params?: any): Promise<any>;
    saveHoliday(companyId: any, payload: any): Promise<any>;
    deleteHoliday(companyId: any, holidayId: any): Promise<any>;
    upsertCompanyAttendance(companyId: any, payload: any): Promise<any>;
    requestAttendanceCorrection(companyId: any, employeeId: any, payload: any): Promise<any>;
    reviewAttendanceCorrection(companyId: any, attendanceId: any, requestId: any, payload: any): Promise<any>;
    getCompanySalaryStructures(companyId?: any, params?: any): Promise<any>;
    upsertCompanySalaryStructure(companyId: any, payload: any): Promise<any>;
    createPayrollRun(companyId: any, payload: any): Promise<any>;
    lockPayrollAttendance(companyId: any, runId: any, payload?: any): Promise<any>;
    calculatePayrollRun(companyId: any, runId: any): Promise<any>;
    approvePayrollRun(companyId: any, runId: any, payload?: any): Promise<any>;
    confirmPayrollPayment(companyId: any, runId: any, payload: any): Promise<any>;
    getEmployeePayslip(companyId: any, employeeId: any, params?: any): Promise<any>;
  };

  export default companyApi;
}

declare module "../../api/company.api.js" {
  const companyApi: {
    isAuthTokenExpired(): boolean;
    clearExpiredCompanySession(): void;
    sendRequest(payload: any): Promise<any>;
    listMyRequests(params?: any): Promise<any>;
    getRequestById(requestId: any): Promise<any>;
    getDocUrl(requestId: any, docKey: any): string;
    getRequestDoc(requestId: any, docKey: any): Promise<any>;
    resolveCompanyId(): Promise<string>;
    getCompanyDashboard(companyId?: any): Promise<any>;
    getCompanyAnalytics(companyId?: any): Promise<any>;
    getCompanyEmployees(companyId?: any): Promise<any>;
    getCompanyEmployee(companyId: any, employeeId: any): Promise<any>;
    upsertCompanyEmployee(companyId: any, payload: any): Promise<any>;
    deleteCompanyEmployee(companyId: any, employeeId: any): Promise<any>;
    getCompanySubscription(companyId?: any): Promise<any>;
    upsertCompanySubscription(companyId: any, payload: any): Promise<any>;
    getCompanyPayroll(companyId?: any, params?: any): Promise<any>;
    submitCompanyPayroll(companyId: any, payload: any): Promise<any>;
    getCompanyAttendance(companyId?: any, params?: any): Promise<any>;
    getAttendanceDaily(companyId?: any, params?: any): Promise<any>;
    getAttendanceMonthly(companyId?: any, params?: any): Promise<any>;
    getAttendanceYearly(companyId?: any, params?: any): Promise<any>;
    bulkAttendance(companyId: any, payload: any): Promise<any>;
    runAutoAbsent(companyId: any, payload?: any): Promise<any>;
    getAttendancePolicy(companyId?: any): Promise<any>;
    saveAttendancePolicy(companyId: any, payload: any): Promise<any>;
    getHolidays(companyId?: any, params?: any): Promise<any>;
    saveHoliday(companyId: any, payload: any): Promise<any>;
    deleteHoliday(companyId: any, holidayId: any): Promise<any>;
    upsertCompanyAttendance(companyId: any, payload: any): Promise<any>;
    requestAttendanceCorrection(companyId: any, employeeId: any, payload: any): Promise<any>;
    reviewAttendanceCorrection(companyId: any, attendanceId: any, requestId: any, payload: any): Promise<any>;
    getCompanySalaryStructures(companyId?: any, params?: any): Promise<any>;
    upsertCompanySalaryStructure(companyId: any, payload: any): Promise<any>;
    createPayrollRun(companyId: any, payload: any): Promise<any>;
    lockPayrollAttendance(companyId: any, runId: any, payload?: any): Promise<any>;
    calculatePayrollRun(companyId: any, runId: any): Promise<any>;
    approvePayrollRun(companyId: any, runId: any, payload?: any): Promise<any>;
    confirmPayrollPayment(companyId: any, runId: any, payload: any): Promise<any>;
    getEmployeePayslip(companyId: any, employeeId: any, params?: any): Promise<any>;
  };

  export default companyApi;
}
