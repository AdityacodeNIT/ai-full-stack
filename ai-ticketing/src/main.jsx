import { createRoot } from "react-dom/client";
import { lazy, Suspense, memo } from "react";
import "./index.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

// Eager load only critical components
import Navbar from "./components/navbar.jsx";
import ClerkApiSetup from "./components/ClerkApiSetup.jsx";
import { InterviewLockProvider } from "./context/InterviewLockContext.jsx";
import InterviewNavigationBlocker from "./components/InterviewNavigationBlocker.jsx";

// Lazy load ALL route components including ProtectedRoute
const ProtectedRoute = lazy(() => import("./components/protectedRoute.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const InterviewPage = lazy(() => import("./pages/Interview/interviewPage.jsx"));
const PastInterviews = lazy(() => import("./pages/PastInterviews.jsx"));
const InterviewDetails = lazy(() => import("./pages/InterviewDetails.jsx"));
const VapiinterviewPage = lazy(() => import("./pages/VapiinterviewPage.jsx"));

import { Provider } from "react-redux";
import { store, persistor } from "./redux/reduxStore.jsx";
import { PersistGate } from "redux-persist/integration/react";

import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

// Optimized loading component with memo
const PageLoader = memo(() => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-white text-xl">Loading...</div>
    </div>
  </div>
));

createRoot(document.getElementById("root")).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <ClerkApiSetup>
      <Provider store={store}>
        <PersistGate 
          loading={<PageLoader />} 
          persistor={persistor}
          timeout={1000}
        >
          <InterviewLockProvider>
            <BrowserRouter>
              <InterviewNavigationBlocker />
              <Navbar />
              
              <Suspense fallback={<PageLoader />}>
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
              </Suspense>
          </BrowserRouter>
        </InterviewLockProvider>
      </PersistGate>
    </Provider>
    </ClerkApiSetup>
  </ClerkProvider>
);
