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
  unpaidFees: number;
  upcomingExams: number;
  libraryBooks: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    unpaidFees: 0,
    upcomingExams: 0,
    libraryBooks: 0,
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
          credentials: "include",
        });

        if (!response.ok) {
          const { error } = await response.json();
          toast.error(error || "Please log in as an admin to access this page");
          router.push("/");
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

  // Fetch dashboard metrics
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const teachersRef = collection(db, "teachers");
        const feesRef = collection(db, "fees");
        const [teachersSnapshot, feesSnapshot] = await Promise.all([
          getDocs(teachersRef),
          getDocs(feesRef).catch(() => ({ docs: [] })),
        ]);

        // Calculate total classes from teachers' assigned classes
        const totalClasses = teachersSnapshot.docs.reduce((acc, doc) => {
          const teacherData = doc.data();
          return acc + (teacherData.classes?.length || 0);
        }, 0);

        const unpaidFees = feesSnapshot.docs.filter(
          (doc) => doc.data().status === "unpaid"
        ).length;

        setMetrics({
          totalStudents: 500, // Replace with query to "students" collection
          totalTeachers: teachersSnapshot.docs.length,
          totalClasses,
          unpaidFees,
          upcomingExams: 5, // Replace with query to "exams" collection
          libraryBooks: 1000, // Replace with query to "library" collection
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
      href: "/dashboard/students",
      action: () => toast.info("View and manage student profiles"),
      icon: "👥",
    },
    {
      title: "Total Teachers",
      value: metrics.totalTeachers,
      href: "/dashboard/teachers",
      action: () => toast.info("View and manage teacher profiles"),
      icon: "🧑‍🏫",
    },
    {
      title: "Total Classes",
      value: metrics.totalClasses,
      href: "/dashboard/academics",
      action: () => toast.info("Manage classes and schedules"),
      icon: "📚",
    },
    {
      title: "Unpaid Fees",
      value: metrics.unpaidFees,
      href: "/dashboard/fees",
      action: () => toast.info("Manage fee payments and reminders"),
      icon: "💰",
    },
    {
      title: "Upcoming Exams",
      value: metrics.upcomingExams,
      href: "/dashboard/exams",
      action: () => toast.info("Schedule and manage exams"),
      icon: "📝",
    },
    {
      title: "Library Books",
      value: metrics.libraryBooks,
      href: "/dashboard/library",
      action: () => toast.info("Track library books and resources"),
      icon: "📖",
    },
  ];

  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <h1
        className={`text-4xl font-extrabold mb-8 ${
          theme === "light" ? "text-gray-800" : "text-gray-100"
        } tracking-tight`}
      >
        School Management Dashboard
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card) => (
            <motion.div
              key={card.title}
              className={`relative p-6 rounded-2xl shadow-lg overflow-hidden ${
                theme === "light"
                  ? "bg-white border border-gray-200"
                  : "bg-gray-800 border border-gray-700"
              } transition-all duration-300 hover:shadow-xl`}
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
              <div className="flex items-center space-x-4">
                <span className="text-3xl">{card.icon}</span>
                <div>
                  <h3
                    className={`text-lg font-semibold ${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`text-3xl font-bold ${
                      theme === "light" ? "text-gray-800" : "text-gray-100"
                    }`}
                  >
                    {card.value}
                  </p>
                </div>
              </div>
              <Link
                href={card.href}
                className={`mt-4 inline-block text-sm font-medium ${
                  theme === "light"
                    ? "text-blue-600 hover:text-blue-800"
                    : "text-blue-400 hover:text-blue-500"
                } transition-colors duration-200`}
                onClick={card.action}
              >
                Manage →
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        className={`mt-10 p-6 rounded-2xl shadow-lg ${
          theme === "light" ? "bg-white border border-gray-200" : "bg-gray-800 border border-gray-700"
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h2
          className={`text-2xl font-semibold ${
            theme === "light" ? "text-gray-700" : "text-gray-300"
          } mb-4`}
        >
          Recent Activity
        </h2>
        <p
          className={`text-sm ${
            theme === "light" ? "text-gray-600" : "text-gray-400"
          }`}
        >
          No recent activity available. Perform actions like adding users or posting announcements to see updates here.
        </p>
      </motion.div>
    </motion.div>
  );
}