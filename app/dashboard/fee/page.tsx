"use client";

import { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { db } from "../../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import { DollarSign, Loader2 } from "lucide-react";

interface Fee {
  id: string;
  studentId: string;
  amount: number;
  status: "paid" | "unpaid";
  dueDate: string;
}

export default function FeeManagement() {
  const context = useContext(ThemeContext);
  const [fees, setFees] = useState<Fee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Fetch fees
  useEffect(() => {
    const fetchFees = async () => {
      try {
        setIsLoading(true);
        const feesRef = collection(db, "fees");
        const snapshot = await getDocs(feesRef);
        const feeList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Fee[];
        setFees(feeList);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching fees:", error);
        toast.error("Failed to load fees. Please try again.");
        setIsLoading(false);
      }
    };
    fetchFees();
  }, []);

  // Placeholder: Add a new fee
  const handleAddFee = async () => {
    try {
      await addDoc(collection(db, "fees"), {
        studentId: "student123",
        amount: 1000,
        status: "unpaid",
        dueDate: new Date().toISOString(),
      });
      toast.success("Fee added successfully!");
      const feesRef = collection(db, "fees");
      const snapshot = await getDocs(feesRef);
      setFees(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Fee[]);
    } catch (error) {
      console.error("Error adding fee:", error);
      toast.error("Failed to add fee. Please try again.");
    }
  };

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
        Fee Management
      </h1>
      <div
        className={`p-6 rounded-xl shadow-sm ${
          theme === "light"
            ? "bg-gradient-to-br from-blue-100 to-purple-100"
            : "bg-gradient-to-br from-gray-700 to-gray-800"
        }`}
      >
        <button
          onClick={handleAddFee}
          className={`mb-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all`}
        >
          Add New Fee
        </button>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : (
          <div className="space-y-4">
            {fees.length === 0 ? (
              <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                No fees found. Add a new fee to get started.
              </p>
            ) : (
              fees.map((fee) => (
                <div
                  key={fee.id}
                  className={`p-4 rounded-lg ${
                    theme === "light" ? "bg-white" : "bg-gray-800"
                  } flex items-center justify-between`}
                >
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-3" />
                    <div>
                      <p className={`font-semibold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                        Student ID: {fee.studentId}
                      </p>
                      <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                        Amount: ${fee.amount} | Status: {fee.status} | Due: {new Date(fee.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}