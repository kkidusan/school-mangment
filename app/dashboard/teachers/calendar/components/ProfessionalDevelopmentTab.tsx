import { useState } from "react";
import { toast } from "react-toastify";

interface TrainingCourse {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  status: "Not Started" | "In Progress" | "Completed" | "Mandatory";
  completionDate?: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: string;
}

interface Resource {
  id: string;
  title: string;
  type: "Article" | "Video" | "Lesson Plan" | "Research";
  url: string;
}

export default function ProfessionalDevelopmentTab({ theme }: { theme: "light" | "dark" }) {
  const [selectedSection, setSelectedSection] = useState<"courses" | "progress" | "events" | "resources">("courses");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Sample data (replace with API calls in a real application)
  const trainingCourses: TrainingCourse[] = [
    { id: "1", title: "Classroom Management 101", category: "Pedagogy", description: "Learn effective classroom management techniques.", duration: "4 hours", status: "Not Started" },
    { id: "2", title: "Google Classroom Integration", category: "Technology", description: "Master Google Classroom for hybrid learning.", duration: "3 hours", status: "In Progress" },
    { id: "3", title: "Child Safety Training", category: "Compliance", description: "Mandatory training on child safety protocols.", duration: "2 hours", status: "Mandatory" },
    { id: "4", title: "Advanced Teaching Methods", category: "Pedagogy", description: "Explore innovative teaching strategies.", duration: "5 hours", status: "Completed", completionDate: "2025-06-15" },
  ];

  const events: Event[] = [
    { id: "1", title: "EdTech Conference 2025", date: "2025-09-10", time: "9:00 AM", location: "Online", type: "Conference" },
    { id: "2", title: "In-House PD Workshop", date: "2025-08-20", time: "1:00 PM", location: "School Auditorium", type: "Workshop" },
  ];

  const resources: Resource[] = [
    { id: "1", title: "Effective Lesson Planning Guide", type: "Article", url: "https://example.com/article1" },
    { id: "2", title: "Blended Learning Video Tutorial", type: "Video", url: "https://example.com/video1" },
    { id: "3", title: "STEM Lesson Plan", type: "Lesson Plan", url: "https://example.com/lesson1" },
  ];

  const handleEnroll = (courseId: string) => {
    toast.success(`Enrolled in course ID: ${courseId}`);
    // In a real app, update course status via API
  };

  const filteredCourses = trainingCourses.filter(
    (course) =>
      (!filterCategory || course.category === filterCategory) &&
      (!filterStatus || course.status === filterStatus)
  );

  return (
    <div className={`p-6 ${theme === "light" ? "bg-gray-100" : "bg-gray-900"} min-h-screen`}>
      {/* Navigation Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-300 dark:border-gray-700">
        {["courses", "progress", "events", "resources"].map((section) => (
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

      {/* Training Courses Section */}
      {selectedSection === "courses" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Training Courses</h2>
          <div className="flex space-x-4 mb-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`p-2 rounded-lg ${
                theme === "light" ? "bg-white text-gray-800" : "bg-gray-800 text-gray-100"
              }`}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {[...new Set(trainingCourses.map((course) => course.category))].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`p-2 rounded-lg ${
                theme === "light" ? "bg-white text-gray-800" : "bg-gray-800 text-gray-100"
              }`}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Mandatory">Mandatory</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className={`p-4 rounded-lg shadow ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{course.category}</p>
                <p className="text-sm mt-2">{course.description}</p>
                <p className="text-sm mt-2">Duration: {course.duration}</p>
                <p className="text-sm mt-2">Status: {course.status}</p>
                {course.status !== "Completed" && (
                  <button
                    onClick={() => handleEnroll(course.id)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {course.status === "Mandatory" ? "Start Mandatory Training" : "Enroll"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Tracking Section */}
      {selectedSection === "progress" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Training Progress</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-900"}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Completion Date</th>
                </tr>
              </thead>
              <tbody className={`${theme === "light" ? "bg-white" : "bg-gray-800"} divide-y divide-gray-200 dark:divide-gray-700`}>
                {trainingCourses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{course.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{course.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{course.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{course.completionDate || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming Events Section */}
      {selectedSection === "events" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg shadow ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">{event.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date: {event.date}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Time: {event.time}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Location: {event.location}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type: {event.type}</p>
                <button
                  onClick={() => toast.success(`Registered for ${event.title}`)}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Register
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources Section */}
      {selectedSection === "resources" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className={`p-4 rounded-lg shadow ${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">{resource.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type: {resource.type}</p>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Access Resource
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}