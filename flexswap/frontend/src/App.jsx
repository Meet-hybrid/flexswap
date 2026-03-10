import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useApp }  from "./context/AppContext";
import Layout      from "./components/Layout";
import Login       from "./pages/Login";
import Register    from "./pages/Register";
import Dashboard   from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import Trade       from "./pages/Trade";
import Chat        from "./pages/Chat";
import Wallet      from "./pages/Wallet";
import Analytics   from "./pages/Analytics";
import Notification from "./components/Notification";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"#00E5A0", fontFamily:"JetBrains Mono, monospace", fontSize:"13px" }}>Loading FlexSwap…</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const { notification } = useApp();

  return (
    <>
      {notification && <Notification {...notification} />}
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index                  element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"       element={<Dashboard />} />
          <Route path="marketplace"     element={<Marketplace />} />
          <Route path="trade"           element={<Trade />} />
          <Route path="chat"            element={<Chat />} />
          <Route path="chat/:id"        element={<Chat />} />
          <Route path="wallet"          element={<Wallet />} />
          <Route path="analytics"       element={<Analytics />} />
        </Route>
      </Routes>
    </>
  );
}
