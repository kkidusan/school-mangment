// File: app/dashboard/security/page.tsx
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
interface SecurityIncident {
  id: string;
  type:
    | "physical"
    | "emergency"
    | "cyber"
    | "behavioral"
    | "community"
    | "audit";
  description: string;
  date: string;
  gradeLevel?: string; // Optional, for incidents related to specific grades
  status: "open" | "resolved" | "in-progress";
}

interface SecurityAudit {
  id: string;
  type:
    | "access-control"
    | "surveillance"
    | "perimeter"
    | "fire-safety"
    | "medical"
    | "lockdown"
    | "cybersecurity";
  description: string;
  date: string;
  findings: string;
  status: "pending" | "completed";
}

export default function SecurityPage() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [audits, setAudits] = useState<SecurityAudit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("incidents");
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

  // Fetch security incidents and audits
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [incidentsSnapshot, auditsSnapshot] = await Promise.all([
          getDocs(collection(db, "securityIncidents")),
          getDocs(collection(db, "securityAudits")),
        ]);

        setIncidents(
          incidentsSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as SecurityIncident)
          )
        );
        setAudits(
          auditsSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as SecurityAudit)
          )
        );
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching security data:", error);
        toast.error("Failed to load security data. Please try again.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized]);

  // Handler for adding new security incident
  const addIncident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newIncident = {
      type: formData.get("type") as
        | "physical"
        | "emergency"
        | "cyber"
        | "behavioral"
        | "community"
        | "audit",
      description: formData.get("description") as string,
      date: new Date().toISOString(),
      gradeLevel: formData.get("gradeLevel") as string,
      status: "open" as const,
    };

    try {
      const docRef = await addDoc(collection(db, "securityIncidents"), newIncident);
      toast.success("Security incident logged successfully");
      setIncidents([...incidents, { id: docRef.id, ...newIncident }]);
    } catch (error) {
      toast.error("Failed to log security incident");
    }
  };

  // Handler for adding new security audit
  const addAudit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAudit = {
      type: formData.get("type") as
        | "access-control"
        | "surveillance"
        | "perimeter"
        | "fire-safety"
        | "medical"
        | "lockdown"
        | "cybersecurity",
      description: formData.get("description") as string,
      date: new Date().toISOString(),
      findings: formData.get("findings") as string,
      status: "pending" as const,
    };

    try {
      const docRef = await addDoc(collection(db, "securityAudits"), newAudit);
      toast.success("Security audit logged successfully");
      setAudits([...audits, { id: docRef.id, ...newAudit }]);
    } catch (error) {
      toast.error("Failed to log security audit");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const grades = ["1", "2", "3", "4", "5", "6", "7", "8"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto p-6"
    >
      <h1
        className={
          theme === "light"
            ? "text-3xl font-bold mb-6 text-zinc-800"
            : "text-3xl font-bold mb-6 text-zinc-100"
        }
      >
        Security Management (Grades 1-8)
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
              { id: "incidents", label: "Security Incidents" },
              { id: "audits", label: "Security Audits" },
              { id: "physical", label: "Physical Security" },
              { id: "emergency", label: "Emergency Preparedness" },
              { id: "cyber", label: "Cyber & Digital Security" },
              { id: "behavioral", label: "Behavioral Safety" },
              { id: "community", label: "Community Involvement" },
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
            {/* 1. Security Incidents */}
            {activeTab === "incidents" && (
              <motion.div
                className={
                  theme === "light"
                    ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100"
                    : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={
                    theme === "light"
                      ? "text-2xl font-semibold text-zinc-700 mb-4"
                      : "text-2xl font-semibold text-zinc-300 mb-4"
                  }
                >
                  Log Security Incident
                </h2>
                <form onSubmit={addIncident} className="space-y-4">
                  <div>
                    <label
                      className={
                        theme === "light"
                          ? "block text-sm text-zinc-600"
                          : "block text-sm text-zinc-400"
                      }
                    >
                      Incident Type
                    </label>
                    <select
                      name="type"
                      className={
                        theme === "light"
                          ? "w-full p-2 rounded bg-white text-zinc-800"
                          : "w-full p-2 rounded bg-gray-800 text-zinc-100"
                      }
                      required
                    >
                      <option value="physical">Physical Security</option>
                      <option value="emergency">Emergency</option>
                      <option value="cyber">Cyber/Digital</option>
                      <option value="behavioral">Behavioral</option>
                      <option value="community">Community</option>
                      <option value="audit">Audit</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={
                        theme === "light"
                          ? "block text-sm text-zinc-600"
                          : "block text-sm text-zinc-400"
                      }
                    >
                      Grade Level (Optional)
                    </label>
                    <select
                      name="gradeLevel"
                      className={
                        theme === "light"
                          ? "w-full p-2 rounded bg-white text-zinc-800"
                          : "w-full p-2 rounded bg-gray-800 text-zinc-100"
                      }
                    >
                      <option value="">Select Grade (if applicable)</option>
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>
                          Grade {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className={
                        theme === "light"
                          ? "block text-sm text-zinc-600"
                          : "block text-sm text-zinc-400"
                      }
                    >
                      Description
                    </label>
                    <textarea
                      name="description"
                      className={
                        theme === "light"
                          ? "w-full p-2 rounded bg-white text-zinc-800"
                          : "w-full p-2 rounded bg-gray-800 text-zinc-100"
                      }
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={
                      theme === "light"
                        ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                        : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"
                    }
                  >
                    Log Incident
                  </button>
                </form>
                <div className="mt-4">
                  {incidents.length === 0 ? (
                    <p
                      className={
                        theme === "light"
                          ? "text-sm text-zinc-600"
                          : "text-sm text-zinc-400"
                      }
                    >
                      No incidents logged yet.
                    </p>
                  ) : (
                    incidents.map((incident) => (
                      <div key={incident.id} className="py-2">
                        <p
                          className={
                            theme === "light"
                              ? "text-sm text-zinc-600"
                              : "text-sm text-zinc-400"
                          }
                        >
                          {incident.type.toUpperCase()}: {incident.description} (Grade: {incident.gradeLevel || "N/A"}, Status: {incident.status}, Date: {incident.date})
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. Security Audits */}
            {activeTab === "audits" && (
              <motion.div
                className={
                  theme === "light"
                    ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100"
                    : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={
                    theme === "light"
                      ? "text-2xl font-semibold text-zinc-700 mb-4"
                      : "text-2xl font-semibold text-zinc-300 mb-4"
                  }
                >
                  Log Security Audit
                </h2>
                <form onSubmit={addAudit} className="space-y-4">
                  <div>
                    <label
                      className={
                        theme === "light"
                          ? "block text-sm text-zinc-600"
                          : "block text-sm text-zinc-400"
                      }
                    >
                      Audit Type
                    </label>
                    <select
                      name="type"
                      className={
                        theme === "light"
                          ? "w-full p-2 rounded bg-white text-zinc-800"
                          : "w-full p-2 rounded bg-gray-800 text-zinc-100"
                      }
                      required
                    >
                      <option value="access-control">Access Control</option>
                      <option value="surveillance">Surveillance Systems</option>
                      <option value="perimeter">Perimeter Security</option>
                      <option value="fire-safety">Fire Safety</option>
                      <option value="medical">Medical Emergencies</option>
                      <option value="lockdown">Lockdown Plans</option>
                      <option value="cybersecurity">Cybersecurity</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={
                        theme === "light"
                          ? "block text-sm text-zinc-600"
                          : "block text-sm text-zinc-400"
                      }
                    >
                      Description
                    </label>
                    <textarea
                      name="description"
                      className={
                        theme === "light"
                          ? "w-full p-2 rounded bg-white text-zinc-800"
                          : "w-full p-2 rounded bg-gray-800 text-zinc-100"
                      }
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={
                        theme === "light"
                          ? "block text-sm text-zinc-600"
                          : "block text-sm text-zinc-400"
                      }
                    >
                      Findings
                    </label>
                    <textarea
                      name="findings"
                      className={
                        theme === "light"
                          ? "w-full p-2 rounded bg-white text-zinc-800"
                          : "w-full p-2 rounded bg-gray-800 text-zinc-100"
                      }
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={
                      theme === "light"
                        ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                        : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"
                    }
                  >
                    Log Audit
                  </button>
                </form>
                <div className="mt-4">
                  {audits.length === 0 ? (
                    <p
                      className={
                        theme === "light"
                          ? "text-sm text-zinc-600"
                          : "text-sm text-zinc-400"
                      }
                    >
                      No audits logged yet.
                    </p>
                  ) : (
                    audits.map((audit) => (
                      <div key={audit.id} className="py-2">
                        <p
                          className={
                            theme === "light"
                              ? "text-sm text-zinc-600"
                              : "text-sm text-zinc-400"
                          }
                        >
                          {audit.type.toUpperCase()}: {audit.description} (Findings: {audit.findings}, Status: {audit.status}, Date: {audit.date})
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <Link
                  href="/dashboard/security/reports"
                  className={
                    theme === "light"
                      ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
                      : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"
                  }
                  onClick={() => toast.info("Generate security reports and review audits")}
                >
                  Generate Reports
                </Link>
              </motion.div>
            )}

            {/* 3. Physical Security */}
            {activeTab === "physical" && (
              <motion.div
                className={
                  theme === "light"
                    ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100"
                    : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={
                    theme === "light"
                      ? "text-2xl font-semibold text-zinc-700 mb-4"
                      : "text-2xl font-semibold text-zinc-300 mb-4"
                  }
                >
                  Physical Security Measures
                </h2>
                <p
                  className={
                    theme === "light"
                      ? "text-sm text-zinc-600"
                      : "text-sm text-zinc-400"
                  }
                >
                  Manage access control (guarded entry, ID cards, biometrics), surveillance (CCTV, alarms), and perimeter security (fences, lighting, gates).
                </p>
                <Link
                  href="/dashboard/security/physical"
                  className={
                    theme === "light"
                      ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
                      : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"
                  }
                  onClick={() => toast.info("Manage physical security protocols")}
                >
                  Manage Physical Security
                </Link>
              </motion.div>
            )}

            {/* 4. Emergency Preparedness */}
            {activeTab === "emergency" && (
              <motion.div
                className={
                  theme === "light"
                    ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100"
                    : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={
                    theme === "light"
                      ? "text-2xl font-semibold text-zinc-700 mb-4"
                      : "text-2xl font-semibold text-zinc-300 mb-4"
                  }
                >
                  Emergency Preparedness
                </h2>
                <p
                  className={
                    theme === "light"
                      ? "text-sm text-zinc-600"
                      : "text-sm text-zinc-400"
                  }
                >
                  Manage fire safety (smoke detectors, drills), medical emergencies (first aid, trained staff), and lockdown/evacuation plans.
                </p>
                <Link
                  href="/dashboard/security/emergency"
                  className={
                    theme === "light"
                      ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
                      : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"
                  }
                  onClick={() => toast.info("Manage emergency preparedness protocols")}
                >
                  Manage Emergency Plans
                </Link>
              </motion.div>
            )}

            {/* 5. Cyber & Digital Security */}
            {activeTab === "cyber" && (
              <motion.div
                className={
                  theme === "light"
                    ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100"
                    : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={
                    theme === "light"
                      ? "text-2xl font-semibold text-zinc-700 mb-4"
                      : "text-2xl font-semibold text-zinc-300 mb-4"
                  }
                >
                  Cyber & Digital Security
                </h2>
                <p
                  className={
                    theme === "light"
                      ? "text-sm text-zinc-600"
                      : "text-sm text-zinc-400"
                  }
                >
                  Manage restricted Wi-Fi, student data protection (ERP encryption), cybersecurity training, and device monitoring.
                </p>
                <Link
                  href="/dashboard/security/cyber"
                  className={
                    theme === "light"
                      ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
                      : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"
                  }
                  onClick={() => toast.info("Manage cyber and digital security protocols")}
                >
                  Manage Cyber Security
                </Link>
              </motion.div>
            )}

            {/* 6. Behavioral & Psychological Safety */}
            {activeTab === "behavioral" && (
              <motion.div
                className={
                  theme === "light"
                    ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100"
                    : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={
                    theme === "light"
                      ? "text-2xl font-semibold text-zinc-700 mb-4"
                      : "text-2xl font-semibold text-zinc-300 mb-4"
                  }
                >
                  Behavioral & Psychological Safety
                </h2>
                <p
                  className={
                    theme === "light"
                      ? "text-sm text-zinc-600"
                      : "text-sm text-zinc-400"
                  }
                >
                  Manage anti-bullying policies, anonymous reporting, counseling support, and staff/student vigilance (background checks, monitoring).
                </p>
                <Link
                  href="/dashboard/security/behavioral"
                  className={
                    theme === "light"
                      ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
                      : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"
                  }
                  onClick={() => toast.info("Manage behavioral and psychological safety protocols")}
                >
                  Manage Behavioral Safety
                </Link>
              </motion.div>
            )}

            {/* 7. Community & Parental Involvement */}
            {activeTab === "community" && (
              <motion.div
                className={
                  theme === "light"
                    ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100"
                    : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={
                    theme === "light"
                      ? "text-2xl font-semibold text-zinc-700 mb-4"
                      : "text-2xl font-semibold text-zinc-300 mb-4"
                  }
                >
                  Community & Parental Involvement
                </h2>
                <p
                  className={
                    theme === "light"
                      ? "text-sm text-zinc-600"
                      : "text-sm text-zinc-400"
                  }
                >
                  Manage parental alerts (SMS/email), neighborhood watch with local police, and safety workshops for parents.
                </p>
                <Link
                  href="/dashboard/security/community"
                  className={
                    theme === "light"
                      ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
                      : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"
                  }
                  onClick={() => toast.info("Manage community and parental involvement protocols")}
                >
                  Manage Community Involvement
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}