import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import Tickets from "./pages/tickets.jsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Ticket from "./pages/ticket.jsx";
import Login from "./pages/login.jsx";
import Signup from "./pages/signup.jsx";
import Admin from "./pages/admin.jsx";
import CheckAuth from "./components/checkAuth.jsx";
import Navbar from "./components/navbar.jsx";
import InterviewPage from "./pages/interviewPage.jsx";
import PastInterviews from "./pages/PastInterviews.jsx";
import { Provider } from "react-redux";
import { store,persistor } from "./redux/reduxStore.jsx";
import { PersistGate } from "redux-persist/integration/react";
import VapiinterviewPage from "./pages/VapiinterviewPage.jsx";

createRoot(document.getElementById("root")).render(
  // <StrictMode>
  <Provider store={store}>

   <PersistGate loading={null} persistor={persistor}>

    <BrowserRouter>
    <Navbar/>
      <Routes><Route
  path="/"
  element={
    <CheckAuth protectedRoute={true}>
      <Tickets />
    </CheckAuth>
  }
/>

<Route
  path="/ticket/:id"
  element={
    <CheckAuth protectedRoute={true}>
      <Ticket />
    </CheckAuth>
  }
/>

<Route
  path="/login"
  element={
    <CheckAuth protectedRoute={false}>
      <Login />
    </CheckAuth>
  }
/>

<Route
  path="/signup"
  element={
    <CheckAuth protectedRoute={false}>
      <Signup />
    </CheckAuth>
  }
/>

<Route
  path="/admin"
  element={
    <CheckAuth protectedRoute={true}>
      <Admin />
    </CheckAuth>
  }
/>
<Route
  path="/interview"
  element={
    <CheckAuth protectedRoute={true}>
      <InterviewPage/>
    </CheckAuth>
  }
/>
<Route
  path="/interviews"
  element={
    <CheckAuth protectedRoute={true}>
      <PastInterviews />
    </CheckAuth>
  }
/>
<Route
  path="/interviews/:id"
  element={
    <CheckAuth protectedRoute={true}>
      <div>Interview Details Page</div>
    </CheckAuth>
  }
/>
<Route path="/aiInterview"
element={<VapiinterviewPage/>}/>

      </Routes>
    </BrowserRouter>
       </PersistGate>
  </Provider>
  //</StrictMode>
);
