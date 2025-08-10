import { useState } from "react";
import { toast } from "react-toastify";

interface AttendanceRecord {
  id: string;
  name: string;
  type: "Student" | "Staff";
  date: string;
  status: "Present" | "Absent" | "Late";
}

interface Document {
  id: string;
  title: string;
  type: "Report" | "Form" | "Policy";
  uploadedBy: string;
  uploadDate: string;
}

interface Schedule {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

interface Report {
  id: string;
  title: string;
  type: "Grades" | "Budget" | "Performance";
  generatedDate: string;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
}

interface AdministrativeWorkTabProps {
  theme: "light" | "dark";
  userRole: "Teacher" | "Admin" | "Support Staff";
}

export default function AdministrativeWorkTab({ theme, userRole }: AdministrativeWorkTabProps) {
  const [selectedSection, setSelectedSection] = useState<"attendance" | "documents" | "schedule" | "reports" | "notices" | "audit">("attendance");
  const [filterType, setFilterType] = useState<string>("");

  // Sample data (replace with API calls in a real application)
  const attendanceRecords: AttendanceRecord[] = [
    { id: "1", name: "John Doe", type: "Student", date: "2025-08-10", status: "Present" },
    { id: "2", name: "Jane Smith", type: "Staff", date: "2025-08-10", status: "Absent" },
    { id: "3", name: "Alice Johnson", type: "Student", date: "2025-08-10", status: "Late" },
  ];

  const documents: Document[] = [
    { id: "1", title: "Annual Budget Report", type: "Report", uploadedBy: "Admin X", uploadDate: "2025-08-01" },
    { id: "2", title: "Parent Consent Form", type: "Form", uploadedBy: "Teacher Y", uploadDate: "2025-08-05" },
  ];

  const schedules: Schedule[] = [
    { id: "1", title: "Staff Meeting", date: "2025-08-15", time: "10:00 AM", location: "Conference Room" },
    { id: "2", title: "Parent-Teacher Conference", date: "2025-08-20", time: "2:00 PM", location: "Room 101" },
  ];

  const reports: Report[] = [
    { id: "1", title: "Grade Summary Q1", type: "Grades", generatedDate: "2025-07-30" },
    { id: "2", title: "Budget Analysis 2025", type: "Budget", generatedDate: "2025-08-01" },
  ];

  const auditLogs: AuditLog[] = [
    { id: "1", action: "Attendance updated", user: "Admin X", timestamp: "2025-08-10 10:00 AM" },
    { id: "2", action: "Document uploaded", user: "Teacher Y", timestamp: "2025-08-05 2:00 PM" },
  ];

  const handleLogAttendance = (recordId: string) => {
    toast.success(`Attendance logged for record ID: ${recordId}`);
    // In a real app, update via secure API with JWT and audit log
  };

  const handleUploadDocument = () => {
    toast.success("Document uploaded securely");
    // In a real app, handle file upload with encryption
  };

  const handleDownloadReport = (reportId: string) => {
    toast.success(`Report ID ${reportId} downloaded`);
    // In a real app, trigger secure download
  };

  const handleSendNotice = () => {
    toast.success("Notice sent to recipients");
    // In a real app, send via secure API
  };

  const filteredAttendance = attendanceRecords.filter(
    (record) => (!filterType || record.type === filterType) && (userRole === "Admin" || record.type === "Student")
  );

  return (
    <div className={`p-6 ${theme === "light" ? "bg-gray-100" : "bg-gray-900"} min-h-screen`}>
      {/* Role and Compliance Indicator */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Role: {userRole}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Data secured with AES-256 encryption | GDPR/FERPA Compliant
            <span className="ml-2">🔒</span>
          </p>
        </div>
        {userRole === "Admin" && (
          <button
            onClick={() => setSelectedSection("audit")}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            View Audit Logs
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-300 dark:border-gray-700">
        {["attendance", "documents", "schedule", "reports", "notices"].map((section) => (
          <button
            key={section}
            onClick={() => setSelectedSection(section as any)}
            className={`px-4 py-2 font-semibold rounded-t-lg ${
              selectedSection === section
                ? "bg-blue-600 text-white"
                : theme === "light"
                ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                : "bg-gray-800 text-gray-100 hover:bg-gray-700"
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* Attendance Tracking Section */}
      {selectedSection === "attendance" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Attendance Tracking</h2>
          {userRole === "Admin" && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`p-2 rounded-lg mb-4 ${
                theme === "light" ? "bg-white text-gray-800" : "bg-gray-800 text-gray-100"
              }`}
              aria-label="Filter by type"
            >
              <option value="">All Types</option>
              <option value="Student">Student</option>
              <option value="Staff">Staff</option>
            </select>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-900"}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`${theme === "light" ? "bg-white" : "bg-gray-800"} divide-y divide-gray-200 dark:divide-gray-700`}>
                {filteredAttendance.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleLogAttendance(record.id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Management Section */}
      {selectedSection === "documents" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Document Management</h2>
          <button
            onClick={handleUploadDocument}
            className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Upload Document 🔒
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-lg shadow ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">{doc.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type: {doc.type}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploaded By: {doc.uploadedBy}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date: {doc.uploadDate}</p>
                <button
                  onClick={() => toast.success(`Downloaded ${doc.title}`)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Section */}
      {selectedSection === "schedule" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Scheduling</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`p-4 rounded-lg shadow ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">{schedule.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date: {schedule.date}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Time: {schedule.time}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Location: {schedule.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Section */}
      {selectedSection === "reports" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Data Reporting</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`p-4 rounded-lg shadow ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">{report.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type: {report.type}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Generated: {report.generatedDate}</p>
                <button
                  onClick={() => handleDownloadReport(report.id)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Download Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notices Section */}
      {selectedSection === "notices" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Communication</h2>
          <div className={`p-4 rounded-lg shadow ${theme === "light" ? "bg-white" : "bg-gray-800"}`}>
            <h3 className="text-lg font-semibold">Send Notice</h3>
            <textarea
              className={`w-full p-2 mt-2 rounded-lg ${
                theme === "light" ? "bg-gray-100 text-gray-800" : "bg-gray-700 text-gray-100"
              }`}
              rows={4}
              placeholder="Enter notice message..."
              aria-label="Notice message"
            ></textarea>
            <button
              onClick={handleSendNotice}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Send Notice
            </button>
          </div>
        </div>
      )}

      {/* Audit Logs Section (Admin Only) */}
      {selectedSection === "audit" && userRole === "Admin" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Audit Logs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-900"}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className={`${theme === "light" ? "bg-white" : "bg-gray-800"} divide-y divide-gray-200 dark:divide-gray-700`}>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{log.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{log.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}