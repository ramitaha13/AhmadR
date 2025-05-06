// מעקב משכורות עובדים.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Download,
  DollarSign,
  Calendar,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { firestore } from "../firebase"; // ייבוא מסד הנתונים שלך מפיירבייס
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const StaffSalaryTracker = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // קבלת פרטי החודש הנוכחי לחישוב משכורת
  const today = new Date();
  const currentMonth = today.toLocaleString("he-IL", { month: "long" });
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  // שליפת עובדים מ-Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const employeesCollection = collection(firestore, "employees");
        const employeeSnapshot = await getDocs(employeesCollection);
        const employeesList = employeeSnapshot.docs.map((doc) => {
          const data = doc.data();

          // קבלת פרטי שכר או הגדרת ברירות מחדל
          const dailyRate = data.dailyRate || "0";
          const hoursPerDay = data.hoursPerDay || 8;

          return {
            id: doc.id,
            name: data.name,
            contactNumber: data.contactNumber,
            email: data.email,
            workingDays: data.workingDays || "0",
            dailyRate: dailyRate,
            hoursPerDay: hoursPerDay,
            attendance: data.attendance || {},
            dailyHalls: data.dailyHalls || {},
          };
        });

        setEmployees(employeesList);
        setLoading(false);
      } catch (error) {
        console.error("שגיאה בטעינת נתונים: ", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // עדכון שכר יומי לעובד
  const updateDailyRate = async (id, newRate) => {
    try {
      // אחסון כמחרוזת ישירות, בלי המרה למספר
      const employeeRef = doc(firestore, "employees", id);

      // עדכון שדה dailyRate ב-Firestore
      await updateDoc(employeeRef, {
        dailyRate: newRate,
      });

      // עדכון המצב המקומי
      setEmployees(
        employees.map((employee) =>
          employee.id === id
            ? {
                ...employee,
                dailyRate: newRate,
              }
            : employee
        )
      );

      console.log(`שכר יומי עודכן עבור עובד ${id}`);
    } catch (error) {
      console.error("שגיאה בעדכון שכר יומי: ", error);
      alert("שגיאה בעדכון שכר יומי. אנא נסה שנית.");
    }
  };

  // איפוס נתוני עובד (ימי עבודה, נוכחות, ושיוך אולמות)
  const resetEmployeeData = async (id, name) => {
    // הצגת דיאלוג אישור
    const confirmReset = window.confirm(
      `האם אתה בטוח שברצונך לאפס את כל הנתונים (ימי עבודה, היסטוריית נוכחות, ושיוך אולמות) עבור ${name}?`
    );

    if (confirmReset) {
      try {
        const employeeRef = doc(firestore, "employees", id);

        // עדכון Firestore: איפוס workingDays ל-"0", attendance לאובייקט ריק, dailyHalls לאובייקט ריק
        await updateDoc(employeeRef, {
          workingDays: "0",
          attendance: {},
          dailyHalls: {},
        });

        // עדכון המצב המקומי
        setEmployees(
          employees.map((employee) =>
            employee.id === id
              ? {
                  ...employee,
                  workingDays: "0",
                  attendance: {},
                  dailyHalls: {},
                }
              : employee
          )
        );

        console.log(`כל הנתונים אופסו עבור עובד ${id}`);
        alert(`כל הנתונים אופסו בהצלחה עבור ${name}`);
      } catch (error) {
        console.error("שגיאה באיפוס נתוני עובד: ", error);
        alert("שגיאה באיפוס נתוני עובד. אנא נסה שנית.");
      }
    }
  };

  // חישוב משכורת חודשית לעובד
  const calculateMonthlySalary = (dailyRate, workingDays) => {
    // המרת מחרוזות למספרים לצורך חישוב
    const rate = parseFloat(dailyRate) || 0;
    const days = parseInt(workingDays, 10) || 0;
    return (rate * days).toFixed(2);
  };

  // חישוב סה"כ משכורת חודשית לכל העובדים
  const totalMonthlySalary = employees
    .reduce((total, emp) => {
      // המרת מחרוזות למספרים לצורך חישוב
      const rate = parseFloat(emp.dailyRate) || 0;
      const days = parseInt(emp.workingDays, 10) || 0;
      return total + rate * days;
    }, 0)
    .toFixed(2);

  // ייצוא רשימת עובדים ל-CSV
  const exportToCSV = () => {
    // יצירת כותרת CSV
    let csvContent =
      'שם,מספר טלפון,דוא"ל,ימי עבודה,שכר יומי,שעות ליום,משכורת חודשית\n';

    // הוספת כל עובד כשורה
    employees.forEach((employee) => {
      const monthlySalary = calculateMonthlySalary(
        employee.dailyRate,
        employee.workingDays
      );

      const row = [
        employee.name,
        employee.contactNumber || "-",
        employee.email || "-",
        employee.workingDays || "0",
        employee.dailyRate,
        employee.hoursPerDay,
        monthlySalary,
      ]
        .map((field) => `"${field}"`)
        .join(",");

      csvContent += row + "\n";
    });

    // יצירת קישור להורדה
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `משכורות_עובדים_${currentMonth}_${currentYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const goBackToDashboard = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* כותרת עם כפתור חזרה */}
        <div className="flex items-center mb-6 justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            מעקב משכורות עובדים
          </h1>
          <button
            onClick={goBackToDashboard}
            className="ml-4 p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <Users size={24} className="text-blue-600 ml-2" />
              <h2 className="text-xl font-bold">ניהול משכורות עובדים</h2>
            </div>

            <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
              <div className="self-end">
                <button
                  onClick={exportToCSV}
                  className="flex items-center p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  title="ייצוא ל-CSV"
                >
                  <Download size={18} className="ml-1" />
                  ייצוא
                </button>
              </div>
            </div>
          </div>

          {/* סיכום סטטיסטיקות */}
          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 text-gray-700 flex items-center">
                סה"כ משכורות חודשיות
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                ₪{totalMonthlySalary}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4">טוען נתוני עובדים...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שם
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      טלפון
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ימי עבודה
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שכר יומי
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      משכורת חודשית
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        לא נמצאו עובדים.
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {employee.contactNumber || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          <div className="flex items-center justify-end">
                            <span className="text-sm">
                              {employee.workingDays || "0"}
                            </span>
                            <Calendar
                              size={16}
                              className="mr-2 ml-2 text-gray-500"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          <div className="flex items-center justify-end">
                            <input
                              type="text"
                              value={employee.dailyRate}
                              onChange={(e) =>
                                updateDailyRate(employee.id, e.target.value)
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <span className="ml-1 mr-1 text-gray-500">₪</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">
                          <div className="flex items-center justify-end">
                            {calculateMonthlySalary(
                              employee.dailyRate,
                              employee.workingDays
                            )}
                            <span className="ml-1">₪</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() =>
                              resetEmployeeData(employee.id, employee.name)
                            }
                            className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                            title="אפס את כל נתוני העובד"
                          >
                            <RotateCcw size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* סיכום משכורות חודשיות */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex justify-between items-center">
              <p className="text-xl font-bold text-blue-800">
                ₪{totalMonthlySalary}
              </p>
              <div className="text-right">
                <h3 className="font-medium text-blue-800 flex items-center justify-end">
                  סה"כ משכורות חודשיות - {currentMonth} {currentYear}
                </h3>
                <p className="text-sm text-blue-600 mt-1">
                  מבוסס על ימי העבודה שהוזנו עבור כל עובד
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffSalaryTracker;
