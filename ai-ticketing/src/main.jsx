import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Admin from "./pages/admin.jsx";
import Navbar from "./components/navbar.jsx";
import InterviewPage from "./pages/interviewPage.jsx";
import PastInterviews from "./pages/PastInterviews.jsx";
import VapiinterviewPage from "./pages/VapiinterviewPage.jsx";

import { Provider } from "react-redux";
import { store, persistor } from "./redux/reduxStore.jsx";
import { PersistGate } from "redux-persist/integration/react";

import { ClerkProvider } from "@clerk/clerk-react";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ClerkApiSetup from "./components/ClerkApiSetup.jsx";

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
                  <ProtectedRoute>
                    <PastInterviews />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/interviews/:id"
                element={
                  <ProtectedRoute>
                    <div>Interview Details Page</div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
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
