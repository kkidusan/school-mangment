
"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Sidebar from "../components/Sidebar";
import { ThemeContext } from "../context/ThemeContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const context = useContext(ThemeContext);
  const router = useRouter();

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    setIsMounted(true);
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
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [router]);

  if (!isMounted) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}
      >
        <div className="text-center">
          <svg
            className={`animate-spin h-10 w-10 ${theme === "light" ? "text-indigo-600" : "text-indigo-300"}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p
            className={`mt-4 text-lg ${theme === "light" ? "text-indigo-900" : "text-indigo-100"}`}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}
      >
        <div className="text-center">
          <svg
            className={`animate-spin h-10 w-10 ${theme === "light" ? "text-indigo-600" : "text-indigo-300"}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p
            className={`mt-4 text-lg ${theme === "light" ? "text-indigo-900" : "text-indigo-100"}`}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div
      className={`flex min-h-screen ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}
    >
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <main
        className={`flex-1 p-6 ${isSidebarOpen ? "ml-64" : "ml-20"} transition-all duration-300`}
      >
        {children}
      </main>
    </div>
  );
}