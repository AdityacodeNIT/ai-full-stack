import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../utils/api.js";

function CheckAuth({ children, protectedRoute }) {
  const [status, setStatus] = useState("checking"); 
  // checking | auth | noauth

  useEffect(() => {
    let mounted = true;

    api
      .get("/api/auth/me")
      .then(() => {
        if (mounted) setStatus("auth");
      })
      .catch(() => {
        if (mounted) setStatus("noauth");
      });

    return () => {
      mounted = false;
    };
  }, []); // 🔥 EMPTY DEP ARRAY (CRITICAL)

  if (status === "checking") return null;

  if (protectedRoute && status === "noauth") {
    return <Navigate to="/login" replace />;
  }

  if (!protectedRoute && status === "auth") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default CheckAuth;
