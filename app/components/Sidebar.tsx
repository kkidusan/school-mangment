
"use client";

import { useContext } from "react";
import {
  BarChart2,
  Users,
  Calendar,
  Settings,
  DollarSign,
  BookOpen,
  Bus,
  MessageSquare,
  Shield,
  LogOut,
  Book,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import LogoImage from "../asset/LogoImage.avif";

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  action?: () => void;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const context = useContext(ThemeContext);
  const router = useRouter();

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Logged out successfully");
        router.push("/");
      } else {
        toast.error("Logout failed. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred during logout.");
      console.error("Logout error:", error);
    }
  };

  const navItems: NavItem[] = [
    { name: "Dashboard", icon: BarChart2, href: "/dashboard" },
    { name: "Student Management", icon: Users, href: "/dashboard/students" },
    { name: "Teacher Management", icon: Users, href: "/dashboard/teachers" },
    { name: "Academic Management", icon: Calendar, href: "/dashboard/academics" },
    { name: "Fee Management", icon: DollarSign, href: "/dashboard/fees" },
    { name: "Library Management", icon: BookOpen, href: "/dashboard/library" },
    { name: "Transport Management", icon: Bus, href: "/dashboard/transport" },
    { name: "Security & Access", icon: Shield, href: "/dashboard/security" },
    { name: "Courses", icon: Book, href: "/dashboard/courses" },
    { name: "Logout", icon: LogOut, href: "#", action: handleLogout },
  ];

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      className={`fixed inset-y-0 left-0 z-50 ${isSidebarOpen ? "w-64" : "w-16"} ${
        theme === "light"
          ? "bg-gradient-to-b from-indigo-100/80 to-purple-100/80 backdrop-blur-lg"
          : "bg-gradient-to-b from-gray-900/80 to-indigo-900/80 backdrop-blur-lg"
      } shadow-2xl rounded-r-2xl transition-all duration-300 ease-in-out font-sans`}
    >
      <div className={`p-3 flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"}`}>
        {isSidebarOpen && (
          <div className="flex items-center gap-2">
            <img
              src={LogoImage.src}
              alt="KK School Logo"
              className="w-8 h-8 object-contain rounded-full"
            />
            <h2
              className={`text-xl font-semibold tracking-tight ${
                theme === "light" ? "text-indigo-900" : "text-indigo-100"
              }`}
            >
              KK School
            </h2>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-full ${
            theme === "light"
              ? "text-indigo-600 hover:bg-indigo-200/50"
              : "text-indigo-300 hover:bg-indigo-800/50"
          } transition-colors duration-200`}
        >
          {isSidebarOpen ? "←" : "→"}
        </button>
      </div>
      <nav className="mt-2 max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-400">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={item.action}
            className={`relative flex items-center p-3 mx-2 my-1 rounded-lg ${
              theme === "light"
                ? "text-indigo-800 hover:bg-indigo-200/50"
                : "text-indigo-200 hover:bg-indigo-800/50"
            } transition-all duration-200 group ${isSidebarOpen ? "justify-start" : "justify-center"}`}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <item.icon className="w-5 h-5" />
            </motion.div>
            {isSidebarOpen && <span className="ml-3 text-sm font-medium">{item.name}</span>}
            {!isSidebarOpen && (
              <span
                className={`absolute left-full ml-3 px-3 py-1.5 text-sm font-medium rounded-lg shadow-lg transform translate-y-[-50%] top-1/2 transition-all duration-200 ease-in-out opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-95 ${
                  theme === "light" ? "bg-indigo-600 text-white" : "bg-indigo-800 text-indigo-100"
                }`}
              >
                {item.name}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </motion.aside>
  );
}