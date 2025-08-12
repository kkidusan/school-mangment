// File: app/dashboard/library/page.tsx
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
interface Book {
  id: string;
  title: string;
  author: string;
  classification: string;
  genre: string;
  gradeLevel: string;
  status: "available" | "issued";
}

interface IssueRecord {
  id: string;
  bookId: string;
  userId: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: "academic" | "non-academic";
  quantity: number;
  storageLocation: string;
}

interface PurchaseRequest {
  id: string;
  itemName: string;
  quantity: number;
  requester: string;
  status: "pending" | "approved" | "rejected";
}

interface AuditLog {
  id: string;
  type: "library" | "store";
  description: string;
  date: string;
}

export default function DashboardLibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [issueRecords, setIssueRecords] = useState<IssueRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("cataloging");
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

  // Fetch library and store data
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [booksSnapshot, issueRecordsSnapshot, inventorySnapshot, purchaseRequestsSnapshot, auditLogsSnapshot] =
          await Promise.all([
            getDocs(collection(db, "books")),
            getDocs(collection(db, "issueRecords")),
            getDocs(collection(db, "inventoryItems")),
            getDocs(collection(db, "purchaseRequests")),
            getDocs(collection(db, "auditLogs")),
          ]);

        setBooks(booksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Book)));
        setIssueRecords(issueRecordsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as IssueRecord)));
        setInventoryItems(inventorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as InventoryItem)));
        setPurchaseRequests(purchaseRequestsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PurchaseRequest)));
        setAuditLogs(auditLogsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuditLog)));
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching library/store data:", error);
        toast.error("Failed to load data. Please try again.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized]);

  // Handlers for adding new data
  const addBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBook = {
      title: formData.get("title") as string,
      author: formData.get("author") as string,
      classification: formData.get("classification") as string,
      genre: formData.get("genre") as string,
      gradeLevel: formData.get("gradeLevel") as string,
      status: "available" as const,
    };

    try {
      const docRef = await addDoc(collection(db, "books"), newBook);
      toast.success("Book added successfully");
      setBooks([...books, { id: docRef.id, ...newBook }]);
    } catch (error) {
      toast.error("Failed to add book");
    }
  };

  const issueBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newIssue = {
      bookId: formData.get("bookId") as string,
      userId: formData.get("userId") as string,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
    };

    try {
      const docRef = await addDoc(collection(db, "issueRecords"), newIssue);
      toast.success("Book issued successfully");
      setIssueRecords([...issueRecords, { id: docRef.id, ...newIssue }]);
    } catch (error) {
      toast.error("Failed to issue book");
    }
  };

  const addInventoryItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem = {
      name: formData.get("name") as string,
      category: formData.get("category") as "academic" | "non-academic",
      quantity: Number(formData.get("quantity")),
      storageLocation: formData.get("storageLocation") as string,
    };

    try {
      const docRef = await addDoc(collection(db, "inventoryItems"), newItem);
      toast.success("Inventory item added successfully");
      setInventoryItems([...inventoryItems, { id: docRef.id, ...newItem }]);
    } catch (error) {
      toast.error("Failed to add inventory item");
    }
  };

  const addPurchaseRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRequest = {
      itemName: formData.get("itemName") as string,
      quantity: Number(formData.get("quantity")),
      requester: formData.get("requester") as string,
      status: "pending" as const,
    };

    try {
      const docRef = await addDoc(collection(db, "purchaseRequests"), newRequest);
      toast.success("Purchase request submitted successfully");
      setPurchaseRequests([...purchaseRequests, { id: docRef.id, ...newRequest }]);
    } catch (error) {
      toast.error("Failed to submit purchase request");
    }
  };

  const addAuditLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLog = {
      type: formData.get("type") as "library" | "store",
      description: formData.get("description") as string,
      date: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "auditLogs"), newLog);
      toast.success("Audit log added successfully");
      setAuditLogs([...auditLogs, { id: docRef.id, ...newLog }]);
    } catch (error) {
      toast.error("Failed to add audit log");
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
        Library & Store Dashboard
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
              { id: "cataloging", label: "Cataloging & Organization" },
              { id: "issuing", label: "Issuing & Returning Books" },
              { id: "maintenance", label: "Maintenance & Upkeep" },
              { id: "digital", label: "Digital Resources" },
              { id: "promotions", label: "Promotions & Activities" },
              { id: "stock", label: "Stock Management" },
              { id: "procurement", label: "Procurement & Distribution" },
              { id: "storage", label: "Storage & Security" },
              { id: "auditing", label: "Auditing & Reporting" },
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
            {/* 1. Cataloging & Organization */}
            {activeTab === "cataloging" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Cataloging & Organization
                </h2>
                <form onSubmit={addBook} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Author
                    </label>
                    <input
                      type="text"
                      name="author"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Classification (DDC/LCC)
                    </label>
                    <input
                      type="text"
                      name="classification"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Genre
                    </label>
                    <input
                      type="text"
                      name="genre"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Grade Level
                    </label>
                    <input
                      type="text"
                      name="gradeLevel"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Add Book
                  </button>
                </form>
                <div className="mt-4">
                  {books.map((book) => (
                    <div key={book.id} className="py-2">
                      <p
                        className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                      >
                        {book.title} by {book.author} ({book.classification}, {book.genre}, Grade: {book.gradeLevel}, Status: {book.status})
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. Issuing & Returning Books */}
            {activeTab === "issuing" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Issuing & Returning Books
                </h2>
                <form onSubmit={issueBook} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Book ID
                    </label>
                    <input
                      type="text"
                      name="bookId"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      User ID (Student/Staff)
                    </label>
                    <input
                      type="text"
                      name="userId"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Issue Book
                  </button>
                </form>
                <div className="mt-4">
                  {issueRecords.map((record) => (
                    <div key={record.id} className="py-2">
                      <p
                        className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                      >
                        Book ID: {record.bookId}, User: {record.userId}, Issued: {record.issueDate}, Due: {record.dueDate}
                        {record.returnDate ? `, Returned: ${record.returnDate}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard/library/returns"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage book returns and due date reminders")}
                >
                  Manage Returns
                </Link>
              </motion.div>
            )}

            {/* 3. Maintenance & Upkeep */}
            {activeTab === "maintenance" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Maintenance & Upkeep
                </h2>
                <form onSubmit={addAuditLog} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Audit Type
                    </label>
                    <select
                      name="type"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    >
                      <option value="library">Library</option>
                      <option value="store">Store</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Description (e.g., Stock verification, Damaged book)
                    </label>
                    <textarea
                      name="description"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Add Audit Log
                  </button>
                </form>
                <div className="mt-4">
                  {auditLogs
                    .filter((log) => log.type === "library")
                    .map((log) => (
                      <div key={log.id} className="py-2">
                        <p
                          className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                        >
                          {log.description} on {log.date}
                        </p>
                      </div>
                    ))}
                </div>
                <Link
                  href="/dashboard/library/maintenance"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage library maintenance and damaged book policies")}
                >
                  Manage Maintenance
                </Link>
              </motion.div>
            )}

            {/* 4. Digital Resources */}
            {activeTab === "digital" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Digital Resources
                </h2>
                <p
                  className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                >
                  Manage e-books, online subscriptions (e.g., OverDrive, Project Gutenberg), and computer stations for grades 1-8.
                </p>
                <Link
                  href="/dashboard/digital-library"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Access the full Digital Library for grades 1-8")}
                >
                  Go to Digital Library
                </Link>
              </motion.div>
            )}

            {/* 5. Promotions & Activities */}
            {activeTab === "promotions" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Promotions & Activities
                </h2>
                <p
                  className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                >
                  Organize book clubs, reading challenges, author visits, and highlight new arrivals.
                </p>
                <Link
                  href="/dashboard/library/promotions"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage reading programs and promotions")}
                >
                  Manage Promotions
                </Link>
              </motion.div>
            )}

            {/* 6. Stock Management */}
            {activeTab === "stock" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Stock Management
                </h2>
                <form onSubmit={addInventoryItem} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Item Name
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
                      Category
                    </label>
                    <select
                      name="category"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    >
                      <option value="academic">Academic</option>
                      <option value="non-academic">Non-Academic</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Storage Location
                    </label>
                    <input
                      type="text"
                      name="storageLocation"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Add Inventory Item
                  </button>
                </form>
                <div className="mt-4">
                  {inventoryItems.map((item) => (
                    <div key={item.id} className="py-2">
                      <p
                        className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                      >
                        {item.name} ({item.category}), Quantity: {item.quantity}, Location: {item.storageLocation}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 7. Procurement & Distribution */}
            {activeTab === "procurement" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Procurement & Distribution
                </h2>
                <form onSubmit={addPurchaseRequest} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Item Name
                    </label>
                    <input
                      type="text"
                      name="itemName"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Requester
                    </label>
                    <input
                      type="text"
                      name="requester"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Submit Purchase Request
                  </button>
                </form>
                <div className="mt-4">
                  {purchaseRequests.map((request) => (
                    <div key={request.id} className="py-2">
                      <p
                        className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                      >
                        {request.itemName}, Quantity: {request.quantity}, Requester: {request.requester}, Status: {request.status}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard/store/procurement"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage procurement and vendor details")}
                >
                  Manage Procurement
                </Link>
              </motion.div>
            )}

            {/* 8. Storage & Security */}
            {activeTab === "storage" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Storage & Security
                </h2>
                <p
                  className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                >
                  Manage secure storage for high-value items and proper labeling for easy access.
                </p>
                <Link
                  href="/dashboard/store/storage"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Manage storage and security protocols")}
                >
                  Manage Storage
                </Link>
              </motion.div>
            )}

            {/* 9. Auditing & Reporting */}
            {activeTab === "auditing" && (
              <motion.div
                className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
                >
                  Auditing & Reporting
                </h2>
                <form onSubmit={addAuditLog} className="space-y-4">
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Audit Type
                    </label>
                    <select
                      name="type"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    >
                      <option value="library">Library</option>
                      <option value="store">Store</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                    >
                      Description (e.g., Monthly stock check, Wastage report)
                    </label>
                    <textarea
                      name="description"
                      className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
                  >
                    Add Audit Log
                  </button>
                </form>
                <div className="mt-4">
                  {auditLogs
                    .filter((log) => log.type === "store")
                    .map((log) => (
                      <div key={log.id} className="py-2">
                        <p
                          className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                        >
                          {log.description} on {log.date}
                        </p>
                      </div>
                    ))}
                </div>
                <Link
                  href="/dashboard/store/auditing"
                  className={theme === "light" ? "mt-4 inline-block text-sm text-blue-600 hover:text-blue-700" : "mt-4 inline-block text-sm text-blue-400 hover:text-blue-500"}
                  onClick={() => toast.info("Generate annual reports and manage audits")}
                >
                  Generate Reports
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}