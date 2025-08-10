"use client";

import { useState, useContext } from "react";
import {
  BarChart2,
  Users,
  Calendar,
  FileText,
  Bell,
  Settings,
  DollarSign,
  BookOpen,
  Bus,
  MessageSquare,
  Trophy,
  Shield,
  Heart,
  Smartphone,
  Cloud,
  Brain,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";

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
        router.push("/login");
      } else {
        toast.error("Logout failed. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred during logout.");
      console.error("Logout error:", error);
    }
  };

  const navItems: NavItem[] = [
    { name: "Dashboard", icon: BarChart2, href: "/dashboard", action: undefined },
    {
      name: "Student Management",
      icon: Users,
      href: "/dashboard/students",
      action: () => toast.info("Manage student registration, profiles, and attendance"),
    },
    {
      name: "Teacher Management",
      icon: Users,
      href: "/dashboard/teachers",
      action: () => toast.info("Manage teacher profiles, attendance, and performance"),
    },
    {
      name: "Academic Management",
      icon: Calendar,
      href: "/dashboard/academics",
      action: () => toast.info("Plan curriculum, timetables, and assignments"),
    },
    {
      name: "Examinations",
      icon: FileText,
      href: "/dashboard/exams",
      action: () => toast.info("Schedule exams and manage grades"),
    },
    {
      name: "Fee Management",
      icon: DollarSign,
      href: "/dashboard/fees",
      action: () => toast.info("Manage fee structures and payments"),
    },
    {
      name: "Library Management",
      icon: BookOpen,
      href: "/dashboard/library",
      action: () => toast.info("Track books and manage library resources"),
    },
    {
      name: "Transport Management",
      icon: Bus,
      href: "/dashboard/transport",
      action: () => toast.info("Manage bus routes and transport tracking"),
    },
    {
      name: "Communication",
      icon: MessageSquare,
      href: "/dashboard/communication",
      action: () => toast.info("Send announcements and manage parent-teacher communication"),
    },
    {
      name: "Extracurricular",
      icon: Trophy,
      href: "/dashboard/extracurricular",
      action: () => toast.info("Manage clubs, sports, and events"),
    },
    {
      name: "Security & Access",
      icon: Shield,
      href: "/dashboard/security",
      action: () => toast.info("Manage role-based access and security features"),
    },
    {
      name: "Health & Wellness",
      icon: Heart,
      href: "/dashboard/health",
      action: () => toast.info("Track student medical records and wellness"),
    },
    {
      name: "Analytics & Reporting",
      icon: BarChart2,
      href: "/dashboard/analytics",
      action: () => toast.info("View performance trends and financial reports"),
    },
    {
      name: "Mobile App Integration",
      icon: Smartphone,
      href: "/dashboard/mobile",
      action: () => toast.info("Manage mobile app features for parents and students"),
    },
    {
      name: "Cloud Storage",
      icon: Cloud,
      href: "/dashboard/cloud",
      action: () => toast.info("Manage cloud-based storage and backups"),
    },
    {
      name: "AI Recommendations",
      icon: Brain,
      href: "/dashboard/ai",
      action: () => toast.info("Configure AI-based learning recommendations"),
    },
    {
      name: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
      action: () => toast.info("Manage school settings and configurations"),
    },
    {
      name: "Logout",
      icon: LogOut,
      href: "#",
      action: handleLogout,
    },
  ];

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: isSidebarOpen ? 0 : -300 }}
      transition={{ duration: 0.3 }}
      className={`fixed inset-y-0 left-0 z-50 w-64 ${
        theme === "light" ? "bg-gradient-to-b from-blue-50 to-purple-50" : "bg-gradient-to-b from-gray-800 to-gray-900"
      } shadow-lg transform transition-transform duration-300 ease-in-out`}
    >
      <div className="p-4">
        <h2 className={`text-2xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>School Admin</h2>
        <button
          onClick={toggleSidebar}
          className={`mt-4 p-2 rounded-full ${theme === "light" ? "text-zinc-600 hover:bg-blue-100" : "text-zinc-400 hover:bg-gray-700"}`}
        >
          {isSidebarOpen ? "← Close" : "→ Open"}
        </button>
      </div>
      <nav className="mt-4 max-h-[calc(100vh-120px)] overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={item.action}
            className={`flex items-center p-4 ${
              theme === "light" ? "text-zinc-700 hover:bg-blue-100" : "text-zinc-300 hover:bg-gray-700"
            } transition-colors duration-200`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </motion.aside>
  );
}