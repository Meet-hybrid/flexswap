import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp }  from "../context/AppContext";

const C = {
  bg: "#0A0B0F", surface: "#111318", border: "#1E2330",
  accent: "#00E5A0", accentDim: "#00E5A015", accentMid: "#00E5A040",
  text: "#F0F2F8", textSec: "#7A8299", textMuted: "#3D4459",
};

const NAV = [
  { to: "/dashboard",   icon: "⬡", label: "Dashboard"   },
  { to: "/marketplace", icon: "◈", label: "Marketplace"  },
  { to: "/trade",       icon: "⇄", label: "P2P Trade"    },
  { to: "/chat",        icon: "◎", label: "Messages"     },
  { to: "/wallet",      icon: "◐", label: "Wallet"       },
  { to: "/analytics",   icon: "◬", label: "Analytics"    },
];

const RATES = [
  "Amazon $100 → ₦87,000 ▲2.3%",
  "iTunes $50  → ₦41,000 ▼0.8%",
  "Visa $200   → ₦182,000 ▲4.2%",
  "Steam $25   → ₦19,750 ▲1.1%",
  "Walmart $100→ ₦83,000 ▲3.1%",
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadMsgs }   = useApp();
  const navigate = useNavigate();

  return (
    <div style={{ display:"flex", minHeight:"100vh", background: C.bg }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:220, flexShrink:0, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:100 }}>

        {/* Logo */}
        <div style={{ padding:"22px 18px 18px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:`linear-gradient(135deg, ${C.accent}, #00B37A)`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900, color:"#000" }}>⇄</div>
            <div>
              <div style={{ color:C.text, fontWeight:800, fontSize:18, letterSpacing:"-0.5px" }}>FlexSwap</div>
              <div style={{ color:C.accent, fontSize:9, letterSpacing:"0.15em", fontFamily:"JetBrains Mono, monospace" }}>GIFT CARD EXCHANGE</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"14px 10px", display:"flex", flexDirection:"column", gap:3, overflowY:"auto" }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:11, padding:"10px 12px",
              background: isActive ? C.accentDim : "transparent",
              border: `1px solid ${isActive ? C.accentMid : "transparent"}`,
              borderRadius:10, textDecoration:"none", transition:"all 0.15s",
              color: isActive ? C.accent : C.textSec,
            })}>
              <span style={{ fontSize:15, width:20, textAlign:"center" }}>{icon}</span>
              <span style={{ fontWeight:600, fontSize:13 }}>{label}</span>
              {label === "Messages" && unreadMsgs > 0 && (
                <span style={{ marginLeft:"auto", background:C.accent, color:"#000", borderRadius:10, fontSize:9, fontWeight:800, padding:"2px 6px" }}>{unreadMsgs}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding:14, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:34, height:34, background:`linear-gradient(135deg, ${C.accent}, #3B82F6)`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, color:"#000", flexShrink:0 }}>
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ overflow:"hidden" }}>
              <div style={{ color:C.text, fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.username || "User"}</div>
              <div style={{ color:C.accent, fontSize:10, fontFamily:"JetBrains Mono, monospace" }}>★ {user?.rep_score || "5.0"} · {user?.total_trades || 0} trades</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ width:"100%", background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, padding:"7px", color:C.textSec, fontSize:11, fontWeight:600, transition:"all 0.15s" }}
            onMouseEnter={e => e.target.style.borderColor = "#FF4D6A"}
            onMouseLeave={e => e.target.style.borderColor = C.border}
          >Sign Out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ marginLeft:220, flex:1, display:"flex", flexDirection:"column" }}>

        {/* Ticker */}
        <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"7px 0", overflow:"hidden" }}>
          <div style={{ display:"flex", animation:"ticker 25s linear infinite", whiteSpace:"nowrap", gap:60 }}>
            {[...RATES, ...RATES].map((r, i) => (
              <span key={i} style={{ color: r.includes("▼") ? "#FF4D6A" : C.accent, fontSize:11, fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.05em" }}>{r}</span>
            ))}
          </div>
        </div>

        <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

        {/* Page content */}
        <main style={{ flex:1, padding:"30px 36px", maxWidth:1200, width:"100%" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
