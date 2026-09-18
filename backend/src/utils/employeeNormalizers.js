/**
 * Pure helpers for normalising employee records coming from different sources
 * (the new CompanyEmployeeData collection, legacy CompanyServiceAccess.employees[],
 * and EmployeeProfile auth rows). Extracted so both the controller and the
 * companyEmployees service can share them without a circular dependency.
 */

function isHrRecordLike(emp) {
  return (
    String(emp?.type || "").toUpperCase() === "HR" ||
    String(emp?.role || "").toUpperCase() === "HR" ||
    String(emp?.designation || "").toUpperCase() === "HR" ||
    String(emp?.department || "").toUpperCase() === "HUMAN RESOURCES"
  );
}

function dedupeAccountsById(accounts) {
  const map = new Map();
  for (const account of Array.isArray(accounts) ? accounts : []) {
    const id = String(account?.id || account?.employeeId || "").trim();
    if (!id) continue;
    map.set(id, { ...map.get(id), ...account, id, employeeId: account?.employeeId || id });
  }
  return Array.from(map.values());
}

function normalizeProfileEmployee(profile) {
  const user = profile?.userId && typeof profile.userId === "object" ? profile.userId : null;
  const id = String(profile?.employeeId || profile?.id || "").trim();
  return {
    ...profile,
    id,
    employeeId: id,
    name: String(profile?.name || user?.name || user?.username || "").trim(),
    email: String(profile?.email || user?.email || "").trim().toLowerCase(),
    username: String(profile?.username || user?.username || "").trim().toLowerCase(),
    role: String(profile?.role || profile?.designation || "Employee").trim() || "Employee",
    department: String(profile?.department || "General").trim() || "General",
    companyCode: String(profile?.companyCode || user?.companyCode || "").trim(),
    status: user?.isActive === false ? "INACTIVE" : String(profile?.status || "ACTIVE").trim().toUpperCase(),
    type: "EMPLOYEE",
  };
}

function normalizeServiceEmployee(employee, companyCode = "", index = 0) {
  const id = String(employee?.id || employee?.employeeId || `EMP-${index + 1}`).trim();
  const phone = String(employee?.phone || employee?.contact || "").trim();
  const dateOfBirth = String(employee?.dateOfBirth || employee?.dob || "").trim();

  return {
    id,
    employeeId: String(employee?.employeeId || id).trim(),
    companyCode: String(employee?.companyCode || companyCode || "").trim(),
    name: String(employee?.name || employee?.employeeName || "Employee").trim(),
    role: String(employee?.role || employee?.designation || "Employee").trim() || "Employee",
    department: String(employee?.department || "General").trim() || "General",
    designation: String(employee?.designation || employee?.role || "").trim(),
    type: "EMPLOYEE",
    email: String(employee?.email || "").trim().toLowerCase(),
    phone,
    contact: String(employee?.contact || phone || employee?.email || "").trim(),
    username: String(employee?.username || "").trim().toLowerCase(),
    photoUrl: String(employee?.photoUrl || "").trim(),
    aadhaarNumber: String(employee?.aadhaarNumber || "").trim(),
    aadhaarStatus: String(employee?.aadhaarStatus || "").trim(),
    panNumber: String(employee?.panNumber || "").trim(),
    panStatus: String(employee?.panStatus || "").trim(),
    employmentType: String(employee?.employmentType || "").trim(),
    joiningDate: String(employee?.joiningDate || "").trim(),
    manager: String(employee?.manager || "").trim(),
    supervisorName: String(employee?.supervisorName || "").trim(),
    workLocation: String(employee?.workLocation || "").trim(),
    shiftName: String(employee?.shiftName || "").trim(),
    shiftStart: String(employee?.shiftStart || "").trim(),
    shiftEnd: String(employee?.shiftEnd || "").trim(),
    weeklyOff: String(employee?.weeklyOff || "").trim(),
    attendanceMode: String(employee?.attendanceMode || "").trim(),
    geoTaggingEnabled: Boolean(employee?.geoTaggingEnabled),
    accessLevel: String(employee?.accessLevel || "").trim(),
    dateOfBirth,
    dob: dateOfBirth,
    gender: String(employee?.gender || "").trim(),
    address: String(employee?.address || "").trim(),
    emergencyContactName: String(employee?.emergencyContactName || employee?.emergencyContact?.name || "").trim(),
    emergencyContactPhone: String(employee?.emergencyContactPhone || employee?.emergencyContact?.phone || "").trim(),
    notes: String(employee?.notes || "").trim(),
    status: String(employee?.status || "ACTIVE").trim().toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    assignedHrId: String(employee?.assignedHrId || "").trim(),
    assignedHrName: String(employee?.assignedHrName || "").trim(),
    assignedAt: employee?.assignedAt || null,
    hasLogin: Boolean(employee?.hasLogin),
    loginUpdatedAt: employee?.loginUpdatedAt || null,
    passwordUpdatedAt: employee?.passwordUpdatedAt || null,
  };
}

module.exports = {
  isHrRecordLike,
  dedupeAccountsById,
  normalizeProfileEmployee,
  normalizeServiceEmployee,
};
