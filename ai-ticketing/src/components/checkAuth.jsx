import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";

function CheckAuth({ children, protectedRoute }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Try to get user info from the server (which checks the HTTP-only cookie)
        const res = await api.get('/api/auth/me');
        
        if (protectedRoute) {
          // User is authenticated and route is protected - allow access
          setLoading(false);
        } else {
          // User is authenticated but trying to access login/signup - redirect to home
          navigate("/");
        }
      } catch (error) {
        // User is not authenticated
        if (protectedRoute) {
          // Route is protected but user not authenticated - redirect to login
          navigate("/login");
        } else {
          // Route is not protected and user not authenticated - allow access
          setLoading(false);
        }
      }
    };

    checkAuthentication();
  }, [navigate, protectedRoute]);

  if (loading) {
    return <div>Loading...</div>;
  } else {
    return children;
  }
}

export default CheckAuth;
