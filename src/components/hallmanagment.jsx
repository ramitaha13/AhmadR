// HallManagement.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building, Plus, Edit, Trash2, ArrowRight } from "lucide-react";
import { firestore } from "../firebase"; // Import your firebase db
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const HallManagement = () => {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHall, setNewHall] = useState({
    name: "",
    location: "",
    workingDays: "",
    employees: [],
  });
  const [editingHall, setEditingHall] = useState(null);

  // Fetch all halls from Firestore
  useEffect(() => {
    const fetchHalls = async () => {
      try {
        const hallsCollection = collection(firestore, "halls");
        const hallSnapshot = await getDocs(hallsCollection);
        const hallsList = hallSnapshot.docs.map((doc) => {
          const data = doc.data();
          // Ensure all hall objects have workingDays and employees properties
          return {
            id: doc.id,
            name: data.name || "",
            location: data.location || "",
            workingDays: data.workingDays || "",
            employees: data.employees || [],
          };
        });
        setHalls(hallsList);
        setLoading(false);
      } catch (error) {
        console.error("שגיאה בטעינת אולמות: ", error);
        setLoading(false);
      }
    };

    fetchHalls();
  }, []);

  const handleAddHall = async () => {
    if (newHall.name && newHall.location) {
      try {
        // Process employee list if it's a string input
        const employeesToSave = Array.isArray(newHall.employees)
          ? newHall.employees
          : newHall.employees
              .split(",")
              .map((emp) => emp.trim())
              .filter((emp) => emp !== "");

        // Ensure workingDays and employees are always included in the data
        const hallData = {
          name: newHall.name,
          location: newHall.location,
          workingDays: newHall.workingDays || "",
          employees: employeesToSave || [],
        };

        // Add hall to Firestore
        const hallsCollection = collection(firestore, "halls");
        const docRef = await addDoc(hallsCollection, hallData);

        // Update the local state
        setHalls([...halls, { ...hallData, id: docRef.id }]);

        // Reset form
        setNewHall({ name: "", location: "", workingDays: "", employees: [] });
        setShowAddForm(false);
      } catch (error) {
        console.error("שגיאה בהוספת אולם: ", error);
      }
    }
  };

  const handleEditHall = (hall) => {
    setEditingHall(hall);
    setNewHall({ ...hall });
    setShowAddForm(true);
  };

  const handleUpdateHall = async () => {
    try {
      // Process employee list if it's a string input
      const employeesToSave = Array.isArray(newHall.employees)
        ? newHall.employees
        : newHall.employees
            .split(",")
            .map((emp) => emp.trim())
            .filter((emp) => emp !== "");

      // Ensure workingDays and employees are always included in the data
      const hallData = {
        name: newHall.name,
        location: newHall.location,
        workingDays: newHall.workingDays || "",
        employees: employeesToSave || [],
      };

      // Update hall in Firestore
      const hallRef = doc(firestore, "halls", editingHall.id);
      await updateDoc(hallRef, hallData);

      // Update the local state
      setHalls(
        halls.map((hall) =>
          hall.id === editingHall.id
            ? { ...hallData, id: editingHall.id }
            : hall
        )
      );

      // Reset form
      setNewHall({ name: "", location: "", workingDays: "", employees: [] });
      setEditingHall(null);
      setShowAddForm(false);
    } catch (error) {
      console.error("שגיאה בעדכון אולם: ", error);
    }
  };

  const handleDeleteHall = async (id) => {
    // Show confirmation dialog before deleting
    const confirmDelete = window.confirm(
      "האם אתה בטוח שברצונך למחוק את האולם?"
    );

    if (confirmDelete) {
      try {
        // Delete hall from Firestore
        const hallRef = doc(firestore, "halls", id);
        await deleteDoc(hallRef);

        // Update the local state
        setHalls(halls.filter((hall) => hall.id !== id));

        // Show success alert
        alert("האולם נמחק בהצלחה!");
      } catch (error) {
        console.error("שגיאה במחיקת אולם: ", error);
        // Show error alert
        alert("שגיאה במחיקת האולם. אנא נסה שנית.");
      }
    }
  };

  const goBackToDashboard = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center mb-6 justify-between">
          <h1 className="text-2xl font-bold text-gray-800">ניהול אולמות</h1>
          <button
            onClick={goBackToDashboard}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Plus size={20} className="ml-2" />
              {showAddForm ? "ביטול" : "הוספת אולם"}
            </button>
            <div className="flex items-center">
              <h2 className="text-xl font-bold ml-2">ניהול אולמות</h2>
              <Building size={24} className="text-blue-600" />
            </div>
          </div>

          {showAddForm && (
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h3 className="text-lg font-medium mb-4 text-right">
                {editingHall ? "עריכת אולם" : "הוספת אולם חדש"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    מיקום
                  </label>
                  <input
                    type="text"
                    value={newHall.location}
                    onChange={(e) =>
                      setNewHall({ ...newHall, location: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                    placeholder="הכנס מיקום"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    שם האולם
                  </label>
                  <input
                    type="text"
                    value={newHall.name}
                    onChange={(e) =>
                      setNewHall({ ...newHall, name: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                    placeholder="הכנס שם אולם"
                  />
                </div>
                {/* Removed Working Days and Employees fields from the form */}
              </div>
              <div className="mt-4 flex justify-start">
                <button
                  onClick={editingHall ? handleUpdateHall : handleAddHall}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  {editingHall ? "עדכון אולם" : "שמירת אולם"}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">טוען אולמות...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      מיקום
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שם
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {halls.map((hall) => (
                    <tr key={hall.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <button
                          onClick={() => handleDeleteHall(hall.id)}
                          className="text-red-600 hover:text-red-900 ml-3"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={() => handleEditHall(hall)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={18} />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {hall.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {hall.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HallManagement;
