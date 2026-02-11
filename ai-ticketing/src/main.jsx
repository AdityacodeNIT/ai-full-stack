import { createRoot } from "react-dom/client";
import "./index.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Admin from "./pages/admin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Navbar from "./components/navbar.jsx";
import InterviewPage from "./pages/Interview/interviewPage.jsx";
import PastInterviews from "./pages/PastInterviews.jsx";
import VapiinterviewPage from "./pages/VapiinterviewPage.jsx";

import { Provider } from "react-redux";
import { store, persistor } from "./redux/reduxStore.jsx";
import { PersistGate } from "redux-persist/integration/react";

import { ClerkProvider } from "@clerk/clerk-react";
import ProtectedRoute from "./components/protectedRoute.jsx";
import ClerkApiSetup from "./components/ClerkApiSetup.jsx";
import InterviewDetails from "./pages/InterviewDetails.jsx";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

createRoot(document.getElementById("root")).render(
  // Temporarily disabled StrictMode to avoid double WebSocket connections
  // <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ClerkApiSetup>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <BrowserRouter>
              <Navbar />

            <Routes>
              {/* Public */}
              <Route path="/aiInterview" element={<VapiinterviewPage />} />
           

              {/* Protected */}
              <Route
                path="/"
                element={
                    <Home />
                }
              />

              <Route
                path="/interview"
                element={
                  <ProtectedRoute>
                    <InterviewPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/interviews"
                element={
            
                    <PastInterviews />
                
                }
              />

              <Route
                path="/interviews/:id"
                element={
                  <ProtectedRoute>
                    <InterviewDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </PersistGate>
      </Provider>
      </ClerkApiSetup>
    </ClerkProvider>
  // </StrictMode>
);
