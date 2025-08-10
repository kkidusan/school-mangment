"use client";

import { useContext, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import {
  LayoutDashboard,
  Users,
  Book,
  Calendar,
  BarChart,
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import Link from "next/link";

// Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  dueDate: string;
  attachments: { name: string; url: string }[];
  relatedClass: string;
  recurring: boolean;
  category: string;
  status: "To Do" | "In Progress" | "For Review" | "Completed";
  assignedTo: string;
  progress: number;
}

interface QuickStat {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}

export default function Dashboard() {
  const context = useContext(ThemeContext);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newTask, setNewTask] = useState<Omit<Task, "id" | "status" | "progress">>({
    title: "",
    description: "",
    priority: "Medium",
    dueDate: "",
    attachments: [],
    relatedClass: "",
    recurring: false,
    category: "",
    assignedTo: "",
  });
  const [activeView, setActiveView] = useState<"board" | "calendar">("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Mock quick stats data
  const quickStats: QuickStat[] = [
    { title: "Total Teachers", value: 45, icon: <Users className="w-6 h-6" /> },
    { title: "Active Classes", value: 32, icon: <Book className="w-6 h-6" /> },
    { title: "Pending Tasks", value: 12, icon: <FileText className="w-6 h-6" /> },
    { title: "Upcoming Events", value: 5, icon: <Calendar className="w-6 h-6" /> },
    { title: "Attendance Rate", value: "95%", icon: <Clock className="w-6 h-6" /> },
    { title: "Performance Metrics", value: "82%", icon: <BarChart className="w-6 h-6" /> },
  ];

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const tasksRef = collection(db, "tasks");
        const snapshot = await getDocs(tasksRef);
        const taskList = snapshot.docs.map((doc) => {
          const data = doc.data();
          // Ensure status is one of the allowed values
          const status = ["To Do", "In Progress", "For Review", "Completed"].includes(data.status)
            ? (data.status as Task["status"])
            : "To Do";
          return {
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            priority: (["High", "Medium", "Low"].includes(data.priority) ? data.priority : "Medium") as Task["priority"],
            dueDate: data.dueDate || "",
            attachments: data.attachments || [],
            relatedClass: data.relatedClass || "",
            recurring: data.recurring || false,
            category: data.category || "",
            assignedTo: data.assignedTo || "",
            status,
            progress: data.progress || 0,
          } as Task;
        });
        setTasks(taskList);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load tasks. Please try again.");
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // Handle task creation
  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.dueDate || !newTask.category || !newTask.assignedTo) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      const taskData = {
        ...newTask,
        status: "To Do" as const,
        progress: 0,
      };
      const tasksRef = collection(db, "tasks");
      const docRef = await addDoc(tasksRef, taskData);
      setTasks([...tasks, { id: docRef.id, ...taskData }]);
      setNewTask({
        title: "",
        description: "",
        priority: "Medium",
        dueDate: "",
        attachments: [],
        relatedClass: "",
        recurring: false,
        category: "",
        assignedTo: "",
      });
      setShowTaskModal(false);
      toast.success("Task created successfully!");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task. Please try again.");
    }
  };

  // Handle task status update
  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });
      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)));
      toast.success("Task status updated!");
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status. Please try again.");
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      setTasks(tasks.filter((task) => task.id !== taskId));
      if (selectedTask?.id === taskId) {
        setShowTaskModal(false);
        setSelectedTask(null);
      }
      toast.success("Task deleted successfully!");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task. Please try again.");
    }
  };

  // Handle task progress update
  const handleUpdateTaskProgress = async (taskId: string, progress: number) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { progress });
      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, progress } : task)));
      toast.success("Task progress updated!");
    } catch (error) {
      console.error("Error updating task progress:", error);
      toast.error("Failed to update task progress. Please try again.");
    }
  };

  // Group tasks by status for board view
  const groupedTasks = tasks.reduce(
    (acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  // Get deadline urgency color
  const getDeadlineColor = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 2) return "text-red-500";
    if (diffDays <= 7) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto p-8"
      >
        <h1
          className={`text-3xl font-bold mb-6 ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}
        >
          Dashboard
        </h1>

        {/* Quick Stats Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              } shadow-sm flex items-center`}
            >
              <div className="mr-4 text-blue-600">{stat.icon}</div>
              <div>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  {stat.title}
                </p>
                <p className={`text-xl font-semibold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Teacher Task Management */}
        <div
          className={`p-6 rounded-xl ${
            theme === "light" ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-gray-700 to-gray-800"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2
              className={`text-2xl font-semibold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}
            >
              Teacher Task Management
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveView("board")}
                className={`px-4 py-2 rounded-lg ${
                  activeView === "board"
                    ? "bg-blue-600 text-white"
                    : theme === "light"
                    ? "bg-white text-zinc-600"
                    : "bg-gray-800 text-zinc-300"
                }`}
              >
                Board View
              </button>
              <Link href="/dashboard/teachers/calendar">
                <button
                  className={`px-4 py-2 rounded-lg ${
                    activeView === "calendar"
                      ? "bg-blue-600 text-white"
                      : theme === "light"
                      ? "bg-white text-zinc-600"
                      : "bg-gray-800 text-zinc-300"
                  }`}
                  onClick={() => setActiveView("calendar")}
                >
                  Calendar View
                </button>
              </Link>
              <button
                onClick={() => setShowTaskModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                aria-label="Create new task"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Task
              </button>
            </div>
          </div>

          {/* Task Board View */}
          {activeView === "board" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {["To Do", "In Progress", "For Review", "Completed"].map((status) => (
                <div key={status} className="space-y-2">
                  <h3
                    className={`text-lg font-semibold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}
                  >
                    {status}
                  </h3>
                  <div
                    className={`p-4 rounded-lg min-h-[200px] ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                  >
                    {(groupedTasks[status] || []).map((task) => (
                      <motion.div
                        key={task.id}
                        className={`p-3 mb-2 rounded-lg ${
                          theme === "light" ? "bg-zinc-100" : "bg-gray-700"
                        } cursor-pointer`}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskModal(true);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <p className={`font-semibold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                            {task.title}
                          </p>
                          <div className="flex space-x-2">
                            <span className={getDeadlineColor(task.dueDate)}>
                              <Calendar className="w-4 h-4" />
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              className="text-red-500 hover:text-red-600"
                              aria-label={`Delete task ${task.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                        <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                          Priority: {task.priority}
                        </p>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Task Creation/View Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`p-6 rounded-xl max-w-lg w-full ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-semibold ${
                    theme === "light" ? "text-zinc-800" : "text-zinc-100"
                  }`}
                >
                  {selectedTask ? "Task Details" : "Create New Task"}
                </h2>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                  }}
                  className={`p-2 rounded-full ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-gray-700"
                  }`}
                  aria-label="Close task modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={selectedTask ? selectedTask.title : newTask.title}
                    onChange={(e) =>
                      selectedTask
                        ? setSelectedTask({ ...selectedTask, title: e.target.value })
                        : setNewTask({ ...newTask, title: e.target.value })
                    }
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    disabled={!!selectedTask}
                    aria-required="true"
                  />
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Description
                  </label>
                  <textarea
                    value={selectedTask ? selectedTask.description : newTask.description}
                    onChange={(e) =>
                      selectedTask
                        ? setSelectedTask({ ...selectedTask, description: e.target.value })
                        : setNewTask({ ...newTask, description: e.target.value })
                    }
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    disabled={!!selectedTask}
                  />
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Priority
                  </label>
                  <select
                    value={selectedTask ? selectedTask.priority : newTask.priority}
                    onChange={(e) =>
                      selectedTask
                        ? setSelectedTask({ ...selectedTask, priority: e.target.value as Task["priority"] })
                        : setNewTask({ ...newTask, priority: e.target.value as Task["priority"] })
                    }
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    disabled={!!selectedTask}
                    aria-required="true"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={selectedTask ? selectedTask.dueDate : newTask.dueDate}
                    onChange={(e) =>
                      selectedTask
                        ? setSelectedTask({ ...selectedTask, dueDate: e.target.value })
                        : setNewTask({ ...newTask, dueDate: e.target.value })
                    }
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    disabled={!!selectedTask}
                    aria-required="true"
                  />
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Category
                  </label>
                  <select
                    value={selectedTask ? selectedTask.category : newTask.category}
                    onChange={(e) =>
                      selectedTask
                        ? setSelectedTask({ ...selectedTask, category: e.target.value })
                        : setNewTask({ ...newTask, category: e.target.value })
                    }
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    disabled={!!selectedTask}
                    aria-required="true"
                  >
                    <option value="">Select Category</option>
                    <option value="Lesson Planning">Lesson Planning</option>
                    <option value="Grading/Assessment">Grading/Assessment</option>
                    <option value="Parent Meetings">Parent Meetings</option>
                    <option value="Professional Development">Professional Development</option>
                    <option value="Administrative Work">Administrative Work</option>
                    <option value="Extracurricular Activities">Extracurricular Activities</option>
                    <option value="School Events">School Events</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Related Class/Subject
                  </label>
                  <input
                    type="text"
                    value={selectedTask ? selectedTask.relatedClass : newTask.relatedClass}
                    onChange={(e) =>
                      selectedTask
                        ? setSelectedTask({ ...selectedTask, relatedClass: e.target.value })
                        : setNewTask({ ...newTask, relatedClass: e.target.value })
                    }
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    disabled={!!selectedTask}
                  />
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Assigned To (Teacher ID)
                  </label>
                  <input
                    type="text"
                    value={selectedTask ? selectedTask.assignedTo : newTask.assignedTo}
                    onChange={(e) =>
                      selectedTask
                        ? setSelectedTask({ ...selectedTask, assignedTo: e.target.value })
                        : setNewTask({ ...newTask, assignedTo: e.target.value })
                    }
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    disabled={!!selectedTask}
                    aria-required="true"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTask ? selectedTask.recurring : newTask.recurring}
                    onChange={(e) =>
                      selectedTask
                        ? setSelectedTask({ ...selectedTask, recurring: e.target.checked })
                        : setNewTask({ ...newTask, recurring: e.target.checked })
                    }
                    className="mr-2"
                    disabled={!!selectedTask}
                  />
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Recurring Task
                  </label>
                </div>
                {selectedTask && (
                  <div>
                    <label
                      className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                    >
                      Progress
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTask.progress}
                      onChange={(e) => {
                        const progress = parseInt(e.target.value);
                        setSelectedTask({ ...selectedTask, progress });
                        handleUpdateTaskProgress(selectedTask.id, progress);
                      }}
                      className="w-full"
                      aria-label="Task progress"
                    />
                    <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                      {selectedTask.progress}%
                    </p>
                  </div>
                )}
                {!selectedTask && (
                  <button
                    onClick={handleCreateTask}
                    className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    aria-label="Create task"
                  >
                    Create Task
                  </button>
                )}
                {selectedTask && (
                  <div className="flex space-x-2">
                    {selectedTask.status !== "Completed" && (
                      <button
                        onClick={() => handleUpdateTaskStatus(selectedTask.id, "Completed")}
                        className="flex-1 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        aria-label="Mark task as completed"
                      >
                        <CheckCircle className="w-5 h-5 inline mr-2" />
                        Mark as Completed
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="flex-1 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-5 h-5 inline mr-2" />
                      Delete Task
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}