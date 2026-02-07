import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "../utils/api.js";

/**
 * Component that sets up Clerk token for API requests
 * Must be inside ClerkProvider
 */
export default function ClerkApiSetup({ children }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    console.log("🔧 ClerkApiSetup mounted", { isLoaded, isSignedIn });
    
    if (isLoaded && isSignedIn) {
      // Set the token getter function for axios interceptor
      setClerkTokenGetter(async () => {
        try {
          const token = await getToken();
          console.log("🎫 Got Clerk token:", token ? "✅ exists" : "❌ null");
          return token;
        } catch (error) {
          console.error("❌ Failed to get Clerk token:", error);
          return null;
        }
      });
      
      console.log("✅ Clerk token getter set up");
    } else {
      console.log("⏳ Waiting for Clerk to load or user to sign in");
    }
    
    return () => {
      setClerkTokenGetter(null);
      console.log("🧹 Clerk token getter cleaned up");
    };
  }, [getToken, isLoaded, isSignedIn]);

  return children;
}
