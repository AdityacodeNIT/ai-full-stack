import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "../utils/api.js";
import { error } from "../utils/logger.js";


export default function ClerkApiSetup({ children }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setClerkTokenGetter(async () => {
        try {
          return await getToken();
        } catch (err) {
          error(" Failed to get Clerk token:", err);
          return null;
        }
      });
    }
    
    return () => {
      setClerkTokenGetter(null);
    };
  }, [getToken, isLoaded, isSignedIn]);

  return children;
}
