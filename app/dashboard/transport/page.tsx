"use client";

import { useState, useEffect, useContext } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";

// Types
interface Route {
  id: string;
  name: string;
  zone: string;
  schedule: string;
  vehicleId: string;
  capacity: number;
}

interface Vehicle {
  id: string;
  licensePlate: string;
  type: string;
  lastMaintenance: string;
  gpsInstalled: boolean;
}

interface Driver {
  id: string;
  name: string;
  trainingCompleted: string[];
  backgroundCheckStatus: string;
}

interface SafetyRecord {
  id: string;
  studentId: string;
  boardingTime: string;
  alightingTime: string;
  routeId: string;
}

interface Feedback {
  id: string;
  parentId: string;
  comment: string;
  submittedAt: string;
}

export default function TransportPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [safetyRecords, setSafetyRecords] = useState<SafetyRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("planning");
  const context = useContext(ThemeContext);
  const router = useRouter();

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Validate session and role
  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          toast.error("Please log in as an admin to access this page");
          router.push("/login");
          return;
        }
        setIsAuthorized(true);
      } catch (error: any) {
        toast.error("Please log in as an admin to access this page");
        router.push("/login");
      }
    };

    validateSession();
  }, [router]);

  // Fetch transport data
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [routesSnapshot, vehiclesSnapshot, driversSnapshot, safetyRecordsSnapshot, feedbacksSnapshot] =
          await Promise.all([
            getDocs(collection(db, "routes")),
            getDocs(collection(db, "vehicles")),
            getDocs(collection(db, "drivers")),
            getDocs(collection(db, "safetyRecords")),
            getDocs(collection(db, "feedbacks")),
          ]);

        setRoutes(routesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Route)));
        setVehicles(vehiclesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Vehicle)));
        setDrivers(driversSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Driver)));
        setSafetyRecords(
          safetyRecordsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SafetyRecord))
        );
        setFeedbacks(feedbacksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Feedback)));
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching transport data:", error);
        toast.error("Failed to load transport data. Please try again.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized]);

  // Handlers for adding new data
  const addRoute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRoute = {
      name: formData.get("name") as string,
      zone: formData.get("zone") as string,
      schedule: formData.get("schedule") as string,
      vehicleId: formData.get("vehicleId") as string,
      capacity: Number(formData.get("capacity")),
    };

    try {
      await addDoc(collection(db, "routes"), newRoute);
      toast.success("Route added successfully");
      setRoutes([...routes, { id: "temp", ...newRoute }]);
    } catch (error) {
      toast.error("Failed to add route");
    }
  };

  const addVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newVehicle = {
      licensePlate: formData.get("licensePlate") as string,
      type: formData.get("type") as string,
      lastMaintenance: formData.get("lastMaintenance") as string,
      gpsInstalled: formData.get("gpsInstalled") === "on",
    };

    try {
      await addDoc(collection(db, "vehicles"), newVehicle);
      toast.success("Vehicle added successfully");
      setVehicles([...vehicles, { id: "temp", ...newVehicle }]);
    } catch (error) {
      toast.error("Failed to add vehicle");
    }
  };

  const addDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newDriver = {
      name: formData.get("name") as string,
      trainingCompleted: (formData.get("trainingCompleted") as string)
        .split(",")
        .map((item) => item.trim()),
      backgroundCheckStatus: formData.get("backgroundCheckStatus") as string,
    };

    try {
      await addDoc(collection(db, "drivers"), newDriver);
      toast.success("Driver added successfully");
      setDrivers([...drivers, { id: "temp", ...newDriver }]);
    } catch (error) {
      toast.error("Failed to add driver");
    }
  };

  const addSafetyRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSafetyRecord = {
      studentId: formData.get("studentId") as string,
      boardingTime: formData.get("boardingTime") as string,
      alightingTime: formData.get("alightingTime") as string,
      routeId: formData.get("routeId") as string,
    };

    try {
      await addDoc(collection(db, "safetyRecords"), newSafetyRecord);
      toast.success("Safety record added successfully");
      setSafetyRecords([...safetyRecords, { id: "temp", ...newSafetyRecord }]);
    } catch (error) {
      toast.error("Failed to add safety record");
    }
  };

  const addFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newFeedback = {
      parentId: formData.get("parentId") as string,
      comment: formData.get("comment") as string,
      submittedAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "feedbacks"), newFeedback);
      toast.success("Feedback submitted successfully");
      setFeedbacks([...feedbacks, { id: "temp", ...newFeedback }]);
    } catch (error) {
      toast.error("Failed to submit feedback");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto p-6"
    >
      <h1
        className={theme === "light" ? "text-3xl font-bold mb-6 text-zinc-800" : "text-3xl font-bold mb-6 text-zinc-100"}
      >
        Transport Management
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: "planning", label: "Planning & Organization" },
              { id: "vehicleDriver", label: "Vehicle & Driver Management" },
              { id: "safety", label: "Student Safety Protocols" },
              { id: "technology", label: "Technology Integration" },
              { id: "communication", label: "Communication Systems" },
              { id: "performance", label: "Performance Monitoring" },
              { id: "specialNeeds", label: "Special Needs" },
              { id: "financial", label: "Financial Management" },
              { id: "compliance", label: "Regulatory Compliance" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id
                    ? `px-4 py-2 text-sm font-medium border-b-2 border-blue-600 ${
                        theme === "light" ? "text-blue-600" : "text-blue-400"
                      }`
                    : `px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {/* 1. Planning and Organization */}
            {activeTab === "planning" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Planning & Organization
                </h2>
                <form onSubmit={addRoute} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Route Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Zone
                    </label>
                    <input
                      type="text"
                      name="zone"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Schedule
                    </label>
                    <input
                      type="text"
                      name="schedule"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Vehicle ID
                    </label>
                    <input
                      type="text"
                      name="vehicleId"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Capacity
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Add Route
                  </button>
                </form>
                <div className="mt-4">
                  {routes.map((route) => (
                    <div key={route.id} className="py-2">
                      <p
                        className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                      >
                        {route.name} (Zone: {route.zone}, Schedule: {route.schedule}, Vehicle: {route.vehicleId}, Capacity: {route.capacity})
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. Vehicle and Driver Management */}
            {activeTab === "vehicleDriver" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Vehicle & Driver Management
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3
                      className={theme === "light" ? "text-lg font-semibold text-zinc-600 mb-2" : "text-lg font-semibold text-zinc-400 mb-2"}
                    >
                      Add Vehicle
                    </h3>
                    <form onSubmit={addVehicle} className="space-y-4">
                      <div>
                        <label
                          className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                        >
                          License Plate
                        </label>
                        <input
                          type="text"
                          name="licensePlate"
                          className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                          required
                        />
                      </div>
                      <div>
                        <label
                          className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                        >
                          Vehicle Type
                        </label>
                        <input
                          type="text"
                          name="type"
                          className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                          required
                        />
                      </div>
                      <div>
                        <label
                          className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                        >
                          Last Maintenance
                        </label>
                        <input
                          type="date"
                          name="lastMaintenance"
                          className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                          required
                        />
                      </div>
                      <div>
                        <label
                          className={theme === "light" ? "flex items-center text-sm text-zinc-600" : "flex items-center text-sm text-zinc-400"}
                        >
                          <input type="checkbox" name="gpsInstalled" className="mr-2" />
                          GPS Installed
                        </label>
                      </div>
                      <button
                        type="submit"
                        className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                      >
                        Add Vehicle
                      </button>
                    </form>
                    <div className="mt-4">
                      {vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="py-2">
                          <p
                            className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                          >
                            {vehicle.licensePlate} ({vehicle.type}), Last Maintenance: {vehicle.lastMaintenance}
                            {vehicle.gpsInstalled ? ", GPS Installed" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3
                      className={theme === "light" ? "text-lg font-semibold text-zinc-600 mb-2" : "text-lg font-semibold text-zinc-400 mb-2"}
                    >
                      Add Driver
                    </h3>
                    <form onSubmit={addDriver} className="space-y-4">
                      <div>
                        <label
                          className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                        >
                          Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                          required
                        />
                      </div>
                      <div>
                        <label
                          className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                        >
                          Training Completed (comma-separated)
                        </label>
                        <input
                          type="text"
                          name="trainingCompleted"
                          className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                          required
                        />
                      </div>
                      <div>
                        <label
                          className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                        >
                          Background Check Status
                        </label>
                        <select
                          name="backgroundCheckStatus"
                          className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                          required
                        >
                          <option value="Completed">Completed</option>
                          <option value="Pending">Pending</option>
                          <option value="Failed">Failed</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                      >
                        Add Driver
                      </button>
                    </form>
                    <div className="mt-4">
                      {drivers.map((driver) => (
                        <div key={driver.id} className="py-2">
                          <p
                            className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                          >
                            {driver.name}, Training: {driver.trainingCompleted.join(", ")}, Background Check: {driver.backgroundCheckStatus}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. Student Safety Protocols */}
            {activeTab === "safety" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Student Safety Protocols
                </h2>
                <form onSubmit={addSafetyRecord} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Student ID
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Boarding Time
                    </label>
                    <input
                      type="datetime-local"
                      name="boardingTime"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Alighting Time
                    </label>
                    <input
                      type="datetime-local"
                      name="alightingTime"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Route ID
                    </label>
                    <input
                      type="text"
                      name="routeId"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Add Safety Record
                  </button>
                </form>
                <div className="mt-4">
                  {safetyRecords.map((record) => (
                    <div key={record.id} className="py-2">
                      <p
                        className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                      >
                        Student ID: {record.studentId}, Route: {record.routeId}, Boarded: {record.boardingTime}, Alighted: {record.alightingTime}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/safety"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage safety protocols and emergency procedures")}
                >
                  Manage Safety Protocols
                </Link>
              </motion.div>
            )}

            {/* 4. Technology Integration */}
            {activeTab === "technology" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Technology Integration
                </h2>
                <p
                  className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                >
                  Manage transport management software, parent communication apps, RFID systems, and camera installations.
                </p>
                <Link
                  href="/admin/technology"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage technology integrations for transport")}
                >
                  Manage Technology
                </Link>
              </motion.div>
            )}

            {/* 5. Communication Systems */}
            {activeTab === "communication" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Communication Systems
                </h2>
                <p
                  className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                >
                  Manage parent handbooks, driver-parent communication channels, and school coordination meetings.
                </p>
                <Link
                  href="/admin/communication"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage communication systems for transport")}
                >
                  Manage Communication
                </Link>
              </motion.div>
            )}

            {/* 6. Performance Monitoring */}
            {activeTab === "performance" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Performance Monitoring
                </h2>
                <form onSubmit={addFeedback} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Parent ID
                    </label>
                    <input
                      type="text"
                      name="parentId"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Comment
                    </label>
                    <textarea
                      name="comment"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Submit Feedback
                  </button>
                </form>
                <div className="mt-4">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.id} className="py-2">
                      <p
                        className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                      >
                        Parent ID: {feedback.parentId}, Comment: {feedback.comment}, Submitted: {feedback.submittedAt}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/performance"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("View performance metrics and incident reports")}
                >
                  View Performance Metrics
                </Link>
              </motion.div>
            )}

            {/* 7. Special Needs Considerations */}
            {activeTab === "specialNeeds" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Special Needs Considerations
                </h2>
                <p
                  className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                >
                  Manage accessible vehicles, trained staff, and individualized plans for students with special needs.
                </p>
                <Link
                  href="/admin/special-needs"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage special needs accommodations")}
                >
                  Manage Special Needs
                </Link>
              </motion.div>
            )}

            {/* 8. Financial Management */}
            {activeTab === "financial" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Financial Management
                </h2>
                <p
                  className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                >
                  Review transport expenses, manage fee structures, and oversee subsidy programs.
                </p>
                <Link
                  href="/admin/financial"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage transport financials")}
                >
                  Manage Financials
                </Link>
              </motion.div>
            )}

            {/* 9. Regulatory Compliance */}
            {activeTab === "compliance" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Regulatory Compliance
                </h2>
                <p
                  className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                >
                  Ensure vehicle licensing, insurance, and safety standard compliance.
                </p>
                <Link
                  href="/admin/compliance"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage regulatory compliance")}
                >
                  Manage Compliance
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}