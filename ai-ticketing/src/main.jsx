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
import Interview from "../../ai-ticket-assistant/models/interview.js";
import InterviewPage from "./pages/interviewPage.jsx";
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
<Route path="/interview"
element={
  <InterviewPage/>
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
