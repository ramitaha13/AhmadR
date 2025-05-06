import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { firestore } from "../firebase"; // Import your firebase config
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  Trash2,
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  XCircle,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Lock,
} from "lucide-react";

const UsersManagement = () => {
  const navigate = useNavigate();

  // State for users data
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Navigation function
  const goToSignup = () => {
    navigate("/signup");
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phone.includes(searchTerm)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Function to fetch all users from Firestore
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamp to date string
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate().toLocaleDateString("he-IL")
            : "תאריך לא זמין",
        });
      });

      setUsers(usersData);
      setFilteredUsers(usersData);
      setError("");
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("אירעה שגיאה בטעינת המשתמשים");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle user deletion
  const handleDeleteUser = async (userId) => {
    try {
      await deleteDoc(doc(firestore, "users", userId));

      // Update state by removing the deleted user
      const updatedUsers = users.filter((user) => user.id !== userId);
      setUsers(updatedUsers);
      setFilteredUsers(
        updatedUsers.filter(
          (user) =>
            searchTerm.trim() === "" ||
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone.includes(searchTerm)
        )
      );

      // Show success message
      setDeleteSuccess("המשתמש נמחק בהצלחה");
      setTimeout(() => setDeleteSuccess(""), 3000);
    } catch (err) {
      console.error("Error deleting user:", err);
      setDeleteError("אירעה שגיאה במחיקת המשתמש");
      setTimeout(() => setDeleteError(""), 3000);
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Format date string for display
  const formatDate = (dateString) => {
    if (!dateString || dateString === "תאריך לא זמין") return "תאריך לא זמין";
    return dateString;
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center">
          <button
            onClick={goToSignup}
            className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ml-2"
            aria-label="חזרה לדף ההרשמה"
          >
            <ArrowRight className="h-6 w-6 text-blue-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניהול משתמשים</h1>
            <p className="mt-2 text-sm text-gray-700">
              סקירה וניהול של כל המשתמשים הרשומים במערכת
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="חיפוש לפי שם, אימייל או טלפון"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border-r-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success message for deletion */}
      {deleteSuccess && (
        <div className="mb-4 bg-green-50 border-r-4 border-green-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-green-800">{deleteSuccess}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error message for deletion */}
      {deleteError && (
        <div className="mb-4 bg-red-50 border-r-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-red-800">{deleteError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        משתמש
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        סיסמה
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        טלפון
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        תאריך הרשמה
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        תפקיד
                      </th>

                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">פעולות</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-full">
                                <User className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="mr-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.fullName}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Mail className="h-4 w-4 ml-1" />
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Lock className="h-4 w-4 ml-1 text-gray-500" />
                              {user.password}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Phone className="h-4 w-4 ml-1 text-gray-500" />
                              {user.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="h-4 w-4 ml-1 text-gray-500" />
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Shield className="h-4 w-4 ml-1 text-gray-500" />
                              {user.role === "admin" ? "מנהל" : "משתמש"}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                            {deleteConfirm === user.id ? (
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-white bg-red-600 hover:bg-red-700 rounded-md px-2 py-1 text-xs font-medium mr-2"
                                >
                                  אישור
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md px-2 py-1 text-xs font-medium"
                                >
                                  ביטול
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(user.id)}
                                className="text-red-600 hover:text-red-900 flex items-center"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <AlertTriangle className="h-10 w-10 text-yellow-500 mb-2" />
                            <p className="text-lg font-medium text-gray-900">
                              לא נמצאו משתמשים
                            </p>
                            {searchTerm ? (
                              <p className="text-sm text-gray-500 mt-1">
                                נסה לשנות את מונחי החיפוש
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500 mt-1">
                                לא קיימים משתמשים במערכת
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
