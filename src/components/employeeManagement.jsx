// ניהול עובדים.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  Phone,
  Search,
  UserPlus,
} from "lucide-react";
import { firestore } from "../firebase"; // ייבוא מסד הנתונים שלך מפיירבייס
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [nameFilter, setNameFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    workingDays: "",
    contactNumber: "",
    email: "",
    assignedHall: "",
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [halls, setHalls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // שליפת כל העובדים והאולמות מ-Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // שליפת עובדים
        const employeesCollection = collection(firestore, "employees");
        const employeeSnapshot = await getDocs(employeesCollection);
        const employeesList = employeeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmployees(employeesList);
        setFilteredEmployees(employeesList); // מאתחל את הרשימה המסוננת עם כל העובדים

        // שליפת אולמות לבחירה בתפריט הנפתח
        const hallsCollection = collection(firestore, "halls");
        const hallSnapshot = await getDocs(hallsCollection);
        const hallsList = hallSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setHalls(hallsList);

        setLoading(false);
      } catch (error) {
        console.error("שגיאה בטעינת נתונים: ", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // סינון העובדים לפי שם
  useEffect(() => {
    if (nameFilter) {
      const filtered = employees.filter((employee) =>
        employee.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [nameFilter, employees]);

  // בדיקה אם שם העובד כבר קיים
  const checkEmployeeExists = async (name) => {
    // מתחשב במקרה של עריכת עובד קיים - לא לבדוק אם השם נשאר אותו שם
    if (editingEmployee && editingEmployee.name === name) {
      return false; // השם לא השתנה בעת עריכה - מותר
    }

    // בדיקה מקומית מהירה לפני הפנייה ל-Firestore
    const existsLocally = employees.some(
      (employee) =>
        employee.name.toLowerCase() === name.toLowerCase() &&
        (!editingEmployee || employee.id !== editingEmployee.id)
    );

    if (existsLocally) {
      return true; // השם כבר קיים במערכת
    }

    return false;
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name) {
      alert("שם הוא שדה חובה.");
      return;
    }

    setIsSubmitting(true);

    try {
      // בדיקה אם השם כבר קיים
      const exists = await checkEmployeeExists(newEmployee.name);

      if (exists) {
        alert(`העובד "${newEmployee.name}" כבר קיים במערכת. נא לבחור שם אחר.`);
        setIsSubmitting(false);
        return;
      }

      // הוספת עובד ל-Firestore
      const employeesCollection = collection(firestore, "employees");
      const docRef = await addDoc(employeesCollection, newEmployee);

      // עדכון המצב המקומי
      setEmployees([...employees, { ...newEmployee, id: docRef.id }]);

      // איפוס הטופס
      setNewEmployee({
        name: "",
        workingDays: "",
        contactNumber: "",
        email: "",
        assignedHall: "",
      });
      setShowAddForm(false);

      // הצגת התראת הצלחה
      alert("העובד נוסף בהצלחה!");
    } catch (error) {
      console.error("שגיאה בהוספת עובד: ", error);
      alert("שגיאה בהוספת עובד. אנא נסה שנית.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setNewEmployee({ ...employee });
    setShowAddForm(true);
  };

  const handleUpdateEmployee = async () => {
    if (!newEmployee.name) {
      alert("שם הוא שדה חובה.");
      return;
    }

    setIsSubmitting(true);

    try {
      // בדיקה אם השם כבר קיים (רק אם שינינו את השם)
      if (newEmployee.name !== editingEmployee.name) {
        const exists = await checkEmployeeExists(newEmployee.name);

        if (exists) {
          alert(
            `העובד "${newEmployee.name}" כבר קיים במערכת. נא לבחור שם אחר.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // עדכון עובד ב-Firestore
      const employeeRef = doc(firestore, "employees", editingEmployee.id);
      await updateDoc(employeeRef, newEmployee);

      // עדכון המצב המקומי
      setEmployees(
        employees.map((employee) =>
          employee.id === editingEmployee.id
            ? { ...newEmployee, id: editingEmployee.id }
            : employee
        )
      );

      // איפוס הטופס
      setNewEmployee({
        name: "",
        workingDays: "",
        contactNumber: "",
        email: "",
        assignedHall: "",
      });
      setEditingEmployee(null);
      setShowAddForm(false);

      // הצגת התראת הצלחה
      alert("העובד עודכן בהצלחה!");
    } catch (error) {
      console.error("שגיאה בעדכון עובד: ", error);
      alert("שגיאה בעדכון עובד. אנא נסה שנית.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    // הצגת דיאלוג אישור לפני מחיקה
    const confirmDelete = window.confirm("האם אתה בטוח שברצונך למחוק עובד זה?");

    if (confirmDelete) {
      try {
        // מחיקת עובד מ-Firestore
        const employeeRef = doc(firestore, "employees", id);
        await deleteDoc(employeeRef);

        // עדכון המצב המקומי
        setEmployees(employees.filter((employee) => employee.id !== id));

        // הצגת התראת הצלחה
        alert("העובד נמחק בהצלחה!");
      } catch (error) {
        console.error("שגיאה במחיקת עובד: ", error);
        alert("שגיאה במחיקת עובד. אנא נסה שנית.");
      }
    }
  };

  const goBackToDashboard = () => {
    navigate("/home");
  };

  // פונקציה חדשה: פורמט מספר טלפון למספר ללא מקפים או רווחים
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "";
    // מסיר כל התווים שאינם ספרות
    return phoneNumber.replace(/\D/g, "");
  };

  // פונקציה לניקוי הסינון
  const clearFilter = () => {
    setNameFilter("");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* כותרת עם כפתור חזרה */}
        <div className="flex items-center mb-6 justify-between">
          <h1 className="text-2xl font-bold text-gray-800">ניהול עובדים</h1>
          <button
            onClick={goBackToDashboard}
            className="ml-4 p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Users size={24} className="text-blue-600 mr-2" />
              <h2 className="text-xl font-bold">ניהול עובדים</h2>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Plus size={20} className="mr-2" />
              {showAddForm ? "ביטול" : "הוספת עובד"}
            </button>
          </div>

          {/* תקציר כמות עובדים */}
          <div className="mb-6" dir="rtl">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center">
                    <UserPlus size={18} className="ml-2 text-blue-600" />
                    כמות עובדים במערכת
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {employees.length}
                  </p>
                </div>
                {nameFilter && (
                  <div>
                    <h3 className="font-medium text-gray-700 flex items-center">
                      <Search size={18} className="ml-2 text-blue-600" />
                      סה"כ תוצאות חיפוש
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {filteredEmployees.length}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showAddForm && (
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h3 className="text-lg font-medium mb-4">
                {editingEmployee ? "עריכת עובד" : "הוספת עובד חדש"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם מלא *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, name: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="הכנס שם מלא"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ימי עבודה
                  </label>
                  <input
                    type="text"
                    value={newEmployee.workingDays}
                    onChange={(e) =>
                      setNewEmployee({
                        ...newEmployee,
                        workingDays: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="לדוגמה: ראשון-חמישי, סופי שבוע בלבד, או מספר ימים"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מספר טלפון
                  </label>
                  <input
                    type="tel"
                    value={newEmployee.contactNumber}
                    onChange={(e) =>
                      setNewEmployee({
                        ...newEmployee,
                        contactNumber: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="הכנס מספר טלפון"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    דוא"ל
                  </label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, email: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="הכנס כתובת דוא״ל"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    אולם משויך
                  </label>
                  <select
                    value={newEmployee.assignedHall}
                    onChange={(e) =>
                      setNewEmployee({
                        ...newEmployee,
                        assignedHall: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">-- בחר אולם --</option>
                    {halls.map((hall) => (
                      <option key={hall.id} value={hall.id}>
                        {hall.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={
                    editingEmployee ? handleUpdateEmployee : handleAddEmployee
                  }
                  className={`bg-blue-600 text-white px-4 py-2 rounded-md ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "מעבד..."
                    : editingEmployee
                    ? "עדכון עובד"
                    : "שמירת עובד"}
                </button>
              </div>
            </div>
          )}

          {/* סינון לפי שם */}
          <div className="mb-6">
            <div className="flex items-center">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="block w-full p-2 pr-10 border border-gray-300 rounded-md text-right"
                  placeholder="סנן לפי שם עובד"
                />
              </div>
              {nameFilter && (
                <button
                  onClick={clearFilter}
                  className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm"
                >
                  נקה סינון
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4">טוען עובדים...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שם
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ימי עבודה
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      טלפון
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      דוא"ל
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      אולם משויך
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        {nameFilter
                          ? "לא נמצאו עובדים התואמים לחיפוש."
                          : "לא נמצאו עובדים. הוסף אחד כדי להתחיל."}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {employee.workingDays || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {employee.contactNumber ? (
                            <a
                              href={`tel:${formatPhoneNumber(
                                employee.contactNumber
                              )}`}
                              className="flex items-center justify-end text-blue-600 hover:text-blue-800"
                            >
                              <Phone size={16} className="ml-1" />
                              {employee.contactNumber}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {employee.email ? (
                            <a
                              href={`mailto:${employee.email}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {employee.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {employee.assignedHall
                            ? halls.find(
                                (hall) => hall.id === employee.assignedHall
                              )?.name || "-"
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="text-blue-600 hover:text-blue-900 ml-3"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* תחתית הטבלה - תקציר */}
          <div className="mt-4 text-sm text-gray-500 text-right">
            {nameFilter
              ? `מציג ${filteredEmployees.length} מתוך ${employees.length} עובדים`
              : `סה"כ ${employees.length} עובדים במערכת`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagement;
