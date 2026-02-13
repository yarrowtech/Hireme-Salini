declare module "../../api/admin.api.js" {
  export function adminLogin(payload: any): Promise<any>;
  export function adminLogout(): Promise<any>;
  export function getAdminMe(): Promise<any>;

  export function getAdminDashboardOverview(): Promise<any>;

  export function getCompanyRequests(status?: any): Promise<any>;
  export function getPendingCompanyRequests(): Promise<any>;
  export function getApprovedCompanyRequests(): Promise<any>;
  export function getRejectedCompanyRequests(): Promise<any>;

  export function getCompanyRequestById(requestId: any): Promise<any>;
  export function approveCompanyRequest(requestId: any): Promise<any>;
  export function rejectCompanyRequest(requestId: any, payload: any): Promise<any>;

  export function getCompanyDetails(companyId: any): Promise<any>;
  export function getCompanyDocuments(companyId: any): Promise<any>;
  export function getCompanyDocument(companyId: any, docKey: any): Promise<any>;
  export function getCompanyDocumentBlob(companyId: any, docKey: any): Promise<any>;

  export function deleteCompany(companyId: any): Promise<any>;
}
