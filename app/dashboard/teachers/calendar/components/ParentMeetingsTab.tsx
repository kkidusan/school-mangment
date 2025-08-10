import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { db } from "../../../../firebase";
import { doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";

interface ParentMeetingsTabProps {
  theme: string;
}

interface PTMSchedule {
  id: string;
  date: string;
  time: string;
  purpose: string;
  partner: "PTM" | "Student-Teacher" | "Collaboration" | "Peer Partner";
}

export default function ParentMeetingsTab({ theme }: ParentMeetingsTabProps) {
  const [ptmSchedules, setPtmSchedules] = useState<PTMSchedule[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    date: "",
    time: "",
    purpose: "",
    partner: "PTM" as PTMSchedule["partner"],
  });
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Fetch PTM schedules from Firestore on component mount
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "ptm_schedules"));
        const schedules: PTMSchedule[] = [];
        querySnapshot.forEach((doc) => {
          schedules.push(doc.data() as PTMSchedule);
        });
        setPtmSchedules(schedules);
      } catch (error) {
        console.error("Error fetching PTM schedules:", error);
        toast.error("Failed to fetch PTM schedules.");
      }
    };
    fetchSchedules();
  }, []);

  const handleSavePTMSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.partner) {
      toast.error("Please select a partner before saving.");
      return;
    }
    try {
      const scheduleId = editingScheduleId || `ptm_${Date.now()}`;
      const scheduleData = {
        id: scheduleId,
        ...newSchedule,
      };
      await setDoc(doc(db, "ptm_schedules", scheduleId), scheduleData);
      if (editingScheduleId) {
        setPtmSchedules(ptmSchedules.map((schedule) => (schedule.id === scheduleId ? scheduleData : schedule)));
        toast.success("Meeting schedule updated successfully!");
      } else {
        setPtmSchedules([...ptmSchedules, scheduleData]);
        toast.success("Meeting schedule saved successfully!");
      }
      setNewSchedule({
        date: "",
        time: "",
        purpose: "",
        partner: "PTM",
      });
      setShowForm(false);
      setCurrentStep(1);
      setEditingScheduleId(null);
    } catch (error) {
      console.error("Error saving PTM schedule:", error);
      toast.error("Failed to save PTM schedule.");
    }
  };

  const handleEditPTMSchedule = (schedule: PTMSchedule) => {
    setNewSchedule({
      date: schedule.date,
      time: schedule.time,
      purpose: schedule.purpose,
      partner: schedule.partner,
    });
    setEditingScheduleId(schedule.id);
    setCurrentStep(1);
    setShowForm(true);
  };

  const handleDeletePTMSchedule = async (scheduleId: string) => {
    try {
      await deleteDoc(doc(db, "ptm_schedules", scheduleId));
      setPtmSchedules(ptmSchedules.filter((schedule) => schedule.id !== scheduleId));
      toast.success("PTM schedule deleted successfully!");
    } catch (error) {
      console.error("Error deleting PTM schedule:", error);
      toast.error("Failed to delete PTM schedule.");
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && newSchedule.date && newSchedule.time) {
      setCurrentStep(2);
    } else if (currentStep === 2 && newSchedule.purpose) {
      setCurrentStep(3);
    } else {
      toast.error("Please fill all fields before proceeding.");
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div className="relative">
      {showForm && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`p-8 rounded-2xl shadow-2xl max-w-md w-full ${theme === "light" ? "bg-white" : "bg-gray-900"} transition-all duration-300`}>
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
              {editingScheduleId ? "Edit Meeting Schedule" : "Create Meeting Schedule"}
            </h2>
            <form onSubmit={handleSavePTMSchedule} className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Date</label>
                    <input
                      type="date"
                      value={newSchedule.date}
                      onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                      className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 ${
                        theme === "light" ? "bg-gray-50 text-gray-800 border-gray-300" : "bg-gray-800 text-gray-100 border-gray-600"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Time</label>
                    <input
                      type="time"
                      value={newSchedule.time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                      className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 ${
                        theme === "light" ? "bg-gray-50 text-gray-800 border-gray-300" : "bg-gray-800 text-gray-100 border-gray-600"
                      }`}
                      required
                    />
                  </div>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Purpose</label>
                    <input
                      type="text"
                      value={newSchedule.purpose}
                      onChange={(e) => setNewSchedule({ ...newSchedule, purpose: e.target.value })}
                      className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 ${
                        theme === "light" ? "bg-gray-50 text-gray-800 border-gray-300" : "bg-gray-800 text-gray-100 border-gray-600"
                      }`}
                      required
                    />
                  </div>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Partner</label>
                    <select
                      value={newSchedule.partner}
                      onChange={(e) => setNewSchedule({ ...newSchedule, partner: e.target.value as PTMSchedule["partner"] })}
                      className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 ${
                        theme === "light" ? "bg-gray-50 text-gray-800 border-gray-300" : "bg-gray-800 text-gray-100 border-gray-600"
                      }`}
                      required
                    >
                      <option value="" disabled>Select a partner</option>
                      <option value="PTM">Parent-Teacher Meeting (PTM)</option>
                      <option value="Student-Teacher">Student-Teacher Meeting</option>
                      <option value="Collaboration">Collaboration Meeting</option>
                      <option value="Peer Partner">Peer Partner Meeting</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-6">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                  >
                    Previous
                  </button>
                )}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentStep(1);
                      setEditingScheduleId(null);
                      setNewSchedule({ date: "", time: "", purpose: "", partner: "PTM" });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Save Schedule
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {ptmSchedules.length === 0 ? (
        <div className="text-center py-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
            No Meeting Schedules Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create a new schedule to start managing meetings.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
          >
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Scheduled Meetings</h2>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
            >
              Create Schedule
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-900"}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Purpose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`${theme === "light" ? "bg-white" : "bg-gray-800"} divide-y divide-gray-200 dark:divide-gray-700`}>
                {ptmSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{schedule.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{schedule.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{schedule.purpose}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{schedule.partner}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex space-x-3">
                      <div className="relative group">
                        <button
                          onClick={() => handleEditPTMSchedule(schedule)}
                          className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 transform hover:scale-110"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Edit
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleDeletePTMSchedule(schedule.id)}
                          className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200 transform hover:scale-110"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4M9 7v12m6-12v12" />
                          </svg>
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Delete
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}