// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  // Attempt to read the "user" item from localStorage
  const userData = localStorage.getItem("user");

  // If "user" is missing in localStorage, the user is not logged in
  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  // If userData exists, render the protected component
  return children;
};

export default ProtectedRoute;
