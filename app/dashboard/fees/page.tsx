"use client";

import { useState, useEffect, useContext } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";

// Types
interface FeeStructure {
  id: string;
  category: string;
  amount: number;
  classProgram: string;
  installmentPlans: string[];
  dueDate: string;
}

interface StudentFeeAccount {
  id: string;
  studentId: string;
  studentName: string;
  balance: number;
  payments: { amount: number; date: string; method: string }[];
  familyAccountId?: string;
}

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  method: string;
  receiptId: string;
  isPartial: boolean;
  lateFee?: number;
}

interface Report {
  id: string;
  type: "daily" | "monthly" | "annual" | "defaulters" | "revenue";
  data: any;
  generatedAt: string;
}

export default function FeesPage() {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentAccounts, setStudentAccounts] = useState<StudentFeeAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("feeStructure");
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

  // Fetch fee data
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [feeStructuresSnapshot, studentAccountsSnapshot, paymentsSnapshot, reportsSnapshot] =
          await Promise.all([
            getDocs(collection(db, "feeStructures")),
            getDocs(collection(db, "studentFeeAccounts")),
            getDocs(collection(db, "payments")),
            getDocs(collection(db, "reports")),
          ]);

        setFeeStructures(
          feeStructuresSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FeeStructure))
        );
        setStudentAccounts(
          studentAccountsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as StudentFeeAccount))
        );
        setPayments(
          paymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Payment))
        );
        setReports(
          reportsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Report))
        );
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching fee data:", error);
        toast.error("Failed to load fee data. Please try again.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized]);

  // Handlers for adding new data
  const addFeeStructure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newFeeStructure = {
      category: formData.get("category") as string,
      amount: Number(formData.get("amount")),
      classProgram: formData.get("classProgram") as string,
      installmentPlans: (formData.get("installmentPlans") as string)
        .split(",")
        .map((item) => item.trim()),
      dueDate: formData.get("dueDate") as string,
    };

    try {
      await addDoc(collection(db, "feeStructures"), newFeeStructure);
      toast.success("Fee structure added successfully");
      setFeeStructures([...feeStructures, { id: "temp", ...newFeeStructure }]);
    } catch (error) {
      toast.error("Failed to add fee structure");
    }
  };

  const addPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPayment = {
      studentId: formData.get("studentId") as string,
      amount: Number(formData.get("amount")),
      date: formData.get("date") as string,
      method: formData.get("method") as string,
      receiptId: `REC-${Date.now()}`,
      isPartial: formData.get("isPartial") === "on",
      lateFee: Number(formData.get("lateFee") || 0),
    };

    try {
      await addDoc(collection(db, "payments"), newPayment);
      toast.success("Payment recorded successfully");
      setPayments([...payments, { id: "temp", ...newPayment }]);

      // Update student account balance
      const account = studentAccounts.find((acc) => acc.studentId === newPayment.studentId);
      if (account) {
        const newBalance = account.balance - newPayment.amount;
        await updateDoc(doc(db, "studentFeeAccounts", account.id), { balance: newBalance });
        setStudentAccounts(
          studentAccounts.map((acc) =>
            acc.studentId === newPayment.studentId ? { ...acc, balance: newBalance } : acc
          )
        );
      }
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const generateReport = async (type: Report["type"]) => {
    try {
      const reportData = {
        type,
        data:
          type === "defaulters"
            ? studentAccounts.filter((acc) => acc.balance > 0)
            : type === "revenue"
            ? payments.reduce((acc, payment) => acc + payment.amount, 0)
            : payments.filter((p) => {
                const paymentDate = new Date(p.date);
                const now = new Date();
                if (type === "daily")
                  return paymentDate.toDateString() === now.toDateString();
                if (type === "monthly")
                  return (
                    paymentDate.getMonth() === now.getMonth() &&
                    paymentDate.getFullYear() === now.getFullYear()
                  );
                if (type === "annual") return paymentDate.getFullYear() === now.getFullYear();
                return false;
              }),
        generatedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "reports"), reportData);
      toast.success(`${type} report generated successfully`);
      setReports([...reports, { id: "temp", ...reportData }]);
    } catch (error) {
      toast.error("Failed to generate report");
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
        className={`text-3xl font-bold mb-6 ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}
      >
        Fee Management
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
              { id: "feeStructure", label: "Fee Structure Setup" },
              { id: "studentAccounts", label: "Student Fee Accounts" },
              { id: "payments", label: "Payment Processing" },
              { id: "reports", label: "Reporting & Analytics" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? `border-b-2 border-blue-600 ${
                        theme === "light" ? "text-blue-600" : "text-blue-400"
                      }`
                    : `text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {/* 1. Fee Structure Setup */}
            {activeTab === "feeStructure" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Fee Structure Setup
                </h2>
                <form onSubmit={addFeeStructure} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Category (e.g., Tuition, Transportation)
                    </label>
                    <input
                      type="text"
                      name="category"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Class/Program
                    </label>
                    <input
                      type="text"
                      name="classProgram"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Installment Plans (comma-separated)
                    </label>
                    <textarea
                      name="installmentPlans"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded ${
                      theme === "light"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                    }`}
                  >
                    Add Fee Structure
                  </button>
                </form>
                <div className="mt-4">
                  {feeStructures.map((fee) => (
                    <div key={fee.id} className="py-2">
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        {fee.category} ({fee.classProgram}): ${fee.amount}, Due: {fee.dueDate}, Plans:{" "}
                        {fee.installmentPlans.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. Student Fee Accounts */}
            {activeTab === "studentAccounts" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Student Fee Accounts
                </h2>
                <div className="space-y-4">
                  {studentAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-4 rounded-lg ${
                        theme === "light" ? "bg-white" : "bg-gray-800"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          theme === "light" ? "text-zinc-800" : "text-zinc-100"
                        }`}
                      >
                        {account.studentName} (ID: {account.studentId})
                      </p>
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        Balance: ${account.balance}
                      </p>
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        Family Account: {account.familyAccountId || "None"}
                      </p>
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        Payments:{" "}
                        {account.payments
                          .map((p) => `${p.amount} (${p.method}, ${p.date})`)
                          .join(", ") || "No payments"}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/students"
                  className={`mt-4 inline-block text-sm ${
                    theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                  }`}
                  onClick={() => toast.info("Manage student profiles and fee accounts")}
                >
                  Manage Students
                </Link>
              </motion.div>
            )}

            {/* 3. Payment Processing */}
            {activeTab === "payments" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Payment Processing
                </h2>
                <form onSubmit={addPayment} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Student ID
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Payment Method
                    </label>
                    <select
                      name="method"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="online">Online</option>
                      <option value="mobile">Mobile Payment</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Late Fee (if applicable)
                    </label>
                    <input
                      type="number"
                      name="lateFee"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`flex items-center text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      <input type="checkbox" name="isPartial" className="mr-2" />
                      Partial Payment
                    </label>
                  </div>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded ${
                      theme === "light"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                    }`}
                  >
                    Record Payment
                  </button>
                </form>
                <div className="mt-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="py-2">
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        Student ID: {payment.studentId}, Amount: ${payment.amount}, Method: {payment.method}, Date: {payment.date}, Receipt: {payment.receiptId}
                        {payment.isPartial ? " (Partial)" : ""}{payment.lateFee ? `, Late Fee: $${payment.lateFee}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. Reporting & Analytics */}
            {activeTab === "reports" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Reporting & Analytics
                </h2>
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => generateReport("daily")}
                      className={`px-4 py-2 rounded ${
                        theme === "light"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                      }`}
                    >
                      Generate Daily Report
                    </button>
                    <button
                      onClick={() => generateReport("monthly")}
                      className={`px-4 py-2 rounded ${
                        theme === "light"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                      }`}
                    >
                      Generate Monthly Report
                    </button>
                    <button
                      onClick={() => generateReport("annual")}
                      className={`px-4 py-2 rounded ${
                        theme === "light"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                      }`}
                    >
                      Generate Annual Report
                    </button>
                    <button
                      onClick={() => generateReport("defaulters")}
                      className={`px-4 py-2 rounded ${
                        theme === "light"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                      }`}
                    >
                      Generate Defaulters Report
                    </button>
                    <button
                      onClick={() => generateReport("revenue")}
                      className={`px-4 py-2 rounded ${
                        theme === "light"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                      }`}
                    >
                      Generate Revenue Report
                    </button>
                  </div>
                  <div>
                    {reports.map((report) => (
                      <div key={report.id} className="py-2">
                        <p
                          className={`text-sm ${
                            theme === "light" ? "text-zinc-600" : "text-zinc-400"
                          }`}
                        >
                          {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report, Generated: {report.generatedAt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href="/admin/analytics"
                  className={`mt-4 inline-block text-sm ${
                    theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                  }`}
                  onClick={() => toast.info("View detailed financial analytics")}
                >
                  View Detailed Analytics
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}