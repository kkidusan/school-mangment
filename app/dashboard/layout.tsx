"use client";

import { useState, useContext } from "react";
import Sidebar from "../components/Sidebar";
import { ThemeContext } from "../context/ThemeContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className={`flex min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <main className={`flex-1 p-6 ${isSidebarOpen ? "ml-64" : "ml-0"} transition-all duration-300`}>
        {children}
      </main>
    </div>
  );
}