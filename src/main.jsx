import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Home from "./components/home.jsx";
import Presence from "./components/presence.jsx";
import Salary from "./components/salary.jsx";
import Hallprice from "./components/hallprice.jsx";
import Hallmanagment from "./components/hallmanagment.jsx";
import EmployeeManagement from "./components/employeeManagement.jsx";
import EmployeeHallTracker from "./components/employeeHallTracker.jsx";
import Signup from "./components/signup.jsx";
import Login from "./components/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Userslist from "./components/userslist.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "*",
    element: <Login />,
  },
  {
    path: "/userslist",
    element: (
      <ProtectedRoute>
        <Userslist />
      </ProtectedRoute>
    ),
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/presence",
    element: (
      <ProtectedRoute>
        <Presence />
      </ProtectedRoute>
    ),
  },
  {
    path: "/salary",
    element: (
      <ProtectedRoute>
        <Salary />
      </ProtectedRoute>
    ),
  },
  {
    path: "/hallprice",
    element: (
      <ProtectedRoute>
        <Hallprice />
      </ProtectedRoute>
    ),
  },
  {
    path: "/hallmanagment",
    element: (
      <ProtectedRoute>
        <Hallmanagment />
      </ProtectedRoute>
    ),
  },
  {
    path: "/employeeManagement",
    element: (
      <ProtectedRoute>
        <EmployeeManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: "/employeeHallTracker",
    element: (
      <ProtectedRoute>
        <EmployeeHallTracker />
      </ProtectedRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <ProtectedRoute>
        <Signup />
      </ProtectedRoute>
    ),
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
