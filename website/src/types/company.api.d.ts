declare module "../../api/company.api" {
  const companyApi: {
    sendRequest(payload: any): Promise<any>;
    listMyRequests(params?: any): Promise<any>;
    getRequestById(requestId: any): Promise<any>;
    getDocUrl(requestId: any, docKey: any): string;
    getRequestDoc(requestId: any, docKey: any): Promise<any>;
    resolveCompanyId(): Promise<string>;
    getCompanyDashboard(companyId?: any): Promise<any>;
    getCompanyAnalytics(companyId?: any): Promise<any>;
    getCompanyEmployees(companyId?: any): Promise<any>;
    upsertCompanyEmployee(companyId: any, payload: any): Promise<any>;
    deleteCompanyEmployee(companyId: any, employeeId: any): Promise<any>;
    getCompanySubscription(companyId?: any): Promise<any>;
    upsertCompanySubscription(companyId: any, payload: any): Promise<any>;
    getCompanyPayroll(companyId?: any): Promise<any>;
    submitCompanyPayroll(companyId: any, payload: any): Promise<any>;
  };

  export default companyApi;
}
