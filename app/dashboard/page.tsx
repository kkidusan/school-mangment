"use client";

import { useState, useEffect, useContext } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";

// Types
interface DashboardMetrics {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  pendingApprovals: number;
  unpaidFees: number;
  upcomingExams: number;
  libraryBooks: number;
  activeBuses: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    pendingApprovals: 0,
    unpaidFees: 0,
    upcomingExams: 0,
    libraryBooks: 0,
    activeBuses: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
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
          credentials: "include", // Include cookies
        });

        if (!response.ok) {
          const { error } = await response.json();
          toast.error(error || "Please log in as an admin to access this page");
          router.push("/");
          return;
        }

        // If response is OK, user is admin
        setIsAuthorized(true);
      } catch (error: any) {
        toast.error("Please log in as an admin to access this page");
        router.push("/login");
      }
    };

    validateSession();
  }, [router]);

  // Fetch dashboard metrics
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const ownersRef = collection(db, "owner");
        const feesRef = collection(db, "fees");
        const [ownersSnapshot, feesSnapshot] = await Promise.all([
          getDocs(ownersRef),
          getDocs(feesRef).catch(() => ({ docs: [] })),
        ]);
        const pendingApprovals = ownersSnapshot.docs.filter(
          (doc) => !doc.data().approved
        ).length;
        const unpaidFees = feesSnapshot.docs.filter(
          (doc) => doc.data().status === "unpaid"
        ).length;

        setMetrics({
          totalStudents: 500, // Replace with query to "students" collection
          totalTeachers: 50, // Replace with query to "teachers" collection
          totalClasses: 20, // Replace with query to "classes" collection
          pendingApprovals,
          unpaidFees,
          upcomingExams: 5, // Replace with query to "exams" collection
          libraryBooks: 1000, // Replace with query to "library" collection
          activeBuses: 10, // Replace with query to "transport" collection
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        toast.error("Failed to load dashboard data. Please try again.");
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [isAuthorized]);

  const dashboardCards = [
    {
      title: "Total Students",
      value: metrics.totalStudents,
      href: "/admin/students",
      action: () => toast.info("View and manage student profiles"),
    },
    {
      title: "Total Teachers",
      value: metrics.totalTeachers,
      href: "/admin/teachers",
      action: () => toast.info("View and manage teacher profiles"),
    },
    {
      title: "Total Classes",
      value: metrics.totalClasses,
      href: "/admin/academics",
      action: () => toast.info("Manage classes and schedules"),
    },
    {
      title: "Pending Approvals",
      value: metrics.pendingApprovals,
      href: "/admin/students",
      action: () => toast.info("Review and approve owner registrations"),
    },
    {
      title: "Unpaid Fees",
      value: metrics.unpaidFees,
      href: "/admin/fees",
      action: () => toast.info("Manage fee payments and reminders"),
    },
    {
      title: "Upcoming Exams",
      value: metrics.upcomingExams,
      href: "/admin/exams",
      action: () => toast.info("Schedule and manage exams"),
    },
    {
      title: "Library Books",
      value: metrics.libraryBooks,
      href: "/admin/library",
      action: () => toast.info("Track library books and resources"),
    },
    {
      title: "Active Buses",
      value: metrics.activeBuses,
      href: "/admin/transport",
      action: () => toast.info("Manage bus routes and tracking"),
    },
  ];

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
      className="max-w-7xl mx-auto"
    >
      <h1
        className={`text-3xl font-bold mb-6 ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}
      >
        School Management Dashboard
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-town-6">
          {dashboardCards.map((card) => (
            <motion.div
              key={card.title}
              className={`p-6 rounded-xl shadow-sm ${
                theme === "light"
                  ? "bg-gradient-to-br from-blue-100 to-purple-100"
                  : "bg-gradient-to-br from-gray-700 to-gray-800"
              }`}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className={`text-lg font-semibold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}>
                {card.title}
              </h3>
              <p className={`text-3xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                {card.value}
              </p>
              <Link
                href={card.href}
                className={`mt-4 inline-block text-sm ${theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"}`}
                onClick={card.action}
              >
                Manage
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        className={`mt-8 p-6 rounded-xl shadow-sm ${
          theme === "light"
            ? "bg-gradient-to-br from-blue-100 to-purple-100"
            : "bg-gradient-to-br from-gray-700 to-gray-800"
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h2 className={`text-2xl font-semibold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"} mb-4`}>
          Recent Activity
        </h2>
        <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
          No recent activity available. Perform actions like adding users or posting announcements to see updates here.
        </p>
      </motion.div>
    </motion.div>
  );
}