import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/chat";
import Practice from "./pages/Practice";

import MainLayout from "./Layouts/MainLayouts";
import ProtectedRoute from "./components/ProtectedRoute";
import Contact from "./pages/contact";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>

          {/* Public routes */}
          <Route index element={<Login />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="practice" element={<Practice />} />
          <Route path="contact" element={<Contact />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="chat" element={<Chat />} />
            
          </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
