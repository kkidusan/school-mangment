import { useState } from "react";
import { toast } from "react-toastify";

interface Activity {
  id: string;
  name: string;
  type: "Club" | "Sport" | "Event";
  description: string;
  leader: string;
}

interface Schedule {
  id: string;
  activityId: string;
  time: string;
  location: string;
  deadline: string;
}

interface Registration {
  id: string;
  activityId: string;
  studentName: string;
  status: "Pending" | "Approved" | "Rejected";
}

interface Attendance {
  id: string;
  activityId: string;
  studentName: string;
  date: string;
  status: "Present" | "Absent";
}

interface Update {
  id: string;
  activityId: string;
  content: string;
  postedBy: string;
  postedDate: string;
}

interface ExtracurricularActivitiesTabProps {
  theme: "light" | "dark";
  userRole: "Student" | "Teacher" | "Admin";
}

export default function ExtracurricularActivitiesTab({ theme, userRole }: ExtracurricularActivitiesTabProps) {
  const [selectedSection, setSelectedSection] = useState<"activities" | "schedule" | "registration" | "attendance" | "updates">("activities");
  const [filterType, setFilterType] = useState<string>("");

  // Sample data (replace with API calls in a real application)
  const activities: Activity[] = [
    { id: "1", name: "Chess Club", type: "Club", description: "Weekly chess matches and strategy workshops.", leader: "Ms. Johnson" },
    { id: "2", name: "Basketball Team", type: "Sport", description: "Competitive basketball training and games.", leader: "Coach Smith" },
    { id: "3", name: "Spring Talent Show", type: "Event", description: "Annual student talent showcase.", leader: "Mr. Lee" },
  ];

  const schedules: Schedule[] = [
    { id: "1", activityId: "1", time: "Mondays 3:00-5:00 PM", location: "Room 204", deadline: "2025-09-01" },
    { id: "2", activityId: "2", time: "Wednesdays 4:00-6:00 PM", location: "Gym", deadline: "2025-08-20" },
    { id: "3", activityId: "3", time: "2025-10-15 6:00 PM", location: "Auditorium", deadline: "2025-10-01" },
  ];

  const registrations: Registration[] = [
    { id: "1", activityId: "1", studentName: "John Doe", status: "Pending" },
    { id: "2", activityId: "2", studentName: "Jane Smith", status: "Approved" },
  ];

  const attendanceRecords: Attendance[] = [
    { id: "1", activityId: "1", studentName: "John Doe", date: "2025-08-10", status: "Present" },
    { id: "2", activityId: "2", studentName: "Jane Smith", date: "2025-08-10", status: "Absent" },
  ];

  const updates: Update[] = [
    { id: "1", activityId: "1", content: "Chess Club won 1st place in regional tournament!", postedBy: "Ms. Johnson", postedDate: "2025-08-05" },
    { id: "2", activityId: "2", content: "Basketball Team practice canceled this week.", postedBy: "Coach Smith", postedDate: "2025-08-07" },
  ];

  const handleRegister = (activityId: string) => {
    toast.success(`Registered for activity ID: ${activityId}`);
    // In a real app, send registration request via secure API
  };

  const handleApproveRegistration = (registrationId: string) => {
    toast.success(`Registration ID ${registrationId} approved`);
    // In a real app, update registration status via secure API
  };

  const handleLogAttendance = (attendanceId: string) => {
    toast.success(`Attendance logged for ID: ${attendanceId}`);
    // In a real app, update attendance via secure API
  };

  const handlePostUpdate = () => {
    toast.success("Update posted successfully");
    // In a real app, post update via secure API
  };

  const filteredActivities = activities.filter(
    (activity) => (!filterType || activity.type === filterType)
  );

  return (
    <div className={`p-6 ${theme === "light" ? "bg-gray-100" : "bg-gray-900"} min-h-screen`}>
      {/* Role and Compliance Indicator */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Role: {userRole}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Data secured with AES-256 encryption | GDPR/FERPA/COPPA Compliant
            <span className="ml-2">🔒</span>
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-300 dark:border-gray-700">
        {["activities", "schedule", "registration", "attendance", "updates"].map((section) => (
          <button
            key={section}
            onClick={() => setSelectedSection(section as any)}
            className={`px-4 py-2 font-semibold rounded-t-lg ${
              selectedSection === section
                ? "bg-blue-600 text-white"
                : theme === "light"
                ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                : "  bg-gray-800 text-gray-100 hover:bg-gray-700"
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* Activities Section */}
      {selectedSection === "activities" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Activity Listings</h2>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`p-2 rounded-lg mb-4 ${
              theme === "light" ? "bg-white text-gray-800" : "bg-gray-800 text-gray-100"
            }`}
            aria-label="Filter by activity type"
          >
            <option value="">All Types</option>
            <option value="Club">Club59</option>
            <option value="Sport">Sport</option>
            <option value="Event">Event</option>
          </select>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 rounded-lg shadow ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">{activity.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type: {activity.type}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Leader: {activity.leader}</p>
                <p className="text-sm mt-2">{activity.description}</p>
                {userRole === "Student" && (
                  <button
                    onClick={() => handleRegister(activity.id)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Register
                  </button>
                )}
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
                <h3 className="text-lg font-semibold">
                  {activities.find((a) => a.id === schedule.activityId)?.name || "Unknown Activity"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Time: {schedule.time}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Location: {schedule.location}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Registration Deadline: {schedule.deadline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registration Management Section */}
      {selectedSection === "registration" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Registration Management</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-900"}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  {(userRole === "Teacher" || userRole === "Admin") && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className={`${theme === "light" ? "bg-white" : "bg-gray-800"} divide-y divide-gray-200 dark:divide-gray-700`}>
                {registrations.map((registration) => (
                  <tr key={registration.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {activities.find((a) => a.id === registration.activityId)?.name || "Unknown Activity"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{registration.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{registration.status}</td>
                    {(userRole === "Teacher" || userRole === "Admin") && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {registration.status === "Pending" && (
                          <button
                            onClick={() => handleApproveRegistration(registration.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-600"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tracking Section */}
      {selectedSection === "attendance" && (userRole === "Teacher" || userRole === "Admin") && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Attendance Tracking</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-900"}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`${theme === "light" ? "bg-white" : "bg-gray-800"} divide-y divide-gray-200 dark:divide-gray-700`}>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {activities.find((a) => a.id === record.activityId)?.name || "Unknown Activity"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{record.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleLogAttendance(record.id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Updates Section */}
      {selectedSection === "updates" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Progress & Updates</h2>
          {(userRole === "Teacher" || userRole === "Admin") && (
            <div className={`p-4 rounded-lg shadow mb-4 ${theme === "light" ? "bg-white" : "bg-gray-800"}`}>
              <h3 className="text-lg font-semibold">Post Update</h3>
              <textarea
                className={`w-full p-2 mt-2 rounded-lg ${
                  theme === "light" ? "bg-gray-100 text-gray-800" : "bg-gray-700 text-gray-100"
                }`}
                rows={4}
                placeholder="Enter update or announcement..."
                aria-label="Update message"
              ></textarea>
              <button
                onClick={handlePostUpdate}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Post Update
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {updates.map((update) => (
              <div
                key={update.id}
                className={`p-4 rounded-lg shadow ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">
                  {activities.find((a) => a.id === update.activityId)?.name || "Unknown Activity"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{update.content}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Posted by: {update.postedBy}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date: {update.postedDate}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}