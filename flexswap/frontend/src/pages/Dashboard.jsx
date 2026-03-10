// ── All page components — split into individual files in src/pages/ ───────────
// Pages: Dashboard.jsx, Marketplace.jsx, Trade.jsx, Chat.jsx, Wallet.jsx, Analytics.jsx

// ============================================================
// src/pages/Dashboard.jsx
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp }  from "../context/AppContext";
import { useCards, useWallet } from "../hooks/index.js";
import { api } from "../services/api";
import { formatNaira, formatRate, timeAgo } from "../utils/index.js";

const C = { bg:"#0A0B0F", surface:"#111318", surfaceAlt:"#161A22", border:"#1E2330", accent:"#00E5A0", accentDim:"#00E5A015", accentMid:"#00E5A040", gold:"#F5C842", blue:"#3B82F6", red:"#FF4D6A", text:"#F0F2F8", textSec:"#7A8299", textMuted:"#3D4459" };

export function Dashboard() {
  const { user }             = useAuth();
  const { liveRates }        = useApp();
  const { cards, loading }   = useCards();
  const { wallet }           = useWallet();
  const [trades, setTrades]  = useState([]);
  const navigate             = useNavigate();

  useEffect(() => {
    api.trades.mine({ limit: 4 }).then(d => setTrades(d.orders || [])).catch(() => {});
  }, []);

  const stats = [
    { label:"Portfolio Value", value: wallet ? formatNaira(wallet.total_ngn_equivalent) : "—",    sub:"All assets",              accent: C.accent },
    { label:"Active Listings", value: "—",                                                          sub:"Check marketplace",       accent: C.gold   },
    { label:"Trades (30d)",    value: user?.total_trades ?? "—",                                    sub:"Lifetime count",          accent: C.blue   },
    { label:"Rep Score",       value: `${user?.rep_score ?? "5.0"} ★`,                             sub:`${user?.badge || "New Trader"}`, accent: "#B45EFF" },
  ];

  return (
    <div>
      <div style={{ marginBottom:26 }}>
        <h1 style={{ color:C.text, fontWeight:800, fontSize:26, letterSpacing:"-1px" }}>
          Good morning, <span style={{ color:C.accent }}>{user?.username}</span> 👋
        </h1>
        <p style={{ color:C.textSec, marginTop:4, fontSize:13 }}>Your trading overview</p>
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:14, marginBottom:26, flexWrap:"wrap" }}>
        {stats.map(s => (
          <div key={s.label} style={{ flex:"1", minWidth:140, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderTop:`2px solid ${s.accent}`, borderRadius:14, padding:20 }}>
            <div style={{ color:C.textSec, fontSize:10, fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:8 }}>{s.label.toUpperCase()}</div>
            <div style={{ color:C.text, fontSize:22, fontWeight:800, letterSpacing:"-0.5px" }}>{s.value}</div>
            <div style={{ color:s.accent, fontSize:10, marginTop:4, fontFamily:"JetBrains Mono, monospace" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:18 }}>
        {/* Top Cards */}
        <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <h2 style={{ color:C.text, fontWeight:700, fontSize:15 }}>Top Card Rates</h2>
            <button onClick={() => navigate("/marketplace")} style={{ background:"none", border:"none", color:C.accent, fontSize:11, fontFamily:"JetBrains Mono, monospace", cursor:"pointer" }}>VIEW ALL →</button>
          </div>
          {loading ? <div style={{ color:C.textSec, fontSize:13 }}>Loading…</div> :
            cards.slice(0, 6).map(card => (
              <div key={card.id} onClick={() => navigate("/marketplace")}
                style={{ display:"flex", alignItems:"center", padding:"10px 8px", borderRadius:10, cursor:"pointer", transition:"background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.accentDim}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width:34, height:34, background:`${card.color}22`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, marginRight:12 }}>{card.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontWeight:700, fontSize:13 }}>{card.name}</div>
                  <div style={{ color:C.textMuted, fontSize:10, fontFamily:"JetBrains Mono, monospace" }}>{card.listings} listings</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:C.text, fontWeight:700, fontFamily:"JetBrains Mono, monospace", fontSize:13 }}>
                    {formatRate(liveRates[card.id] || card.rate)}
                  </div>
                  <div style={{ color: card.change > 0 ? C.accent : C.red, fontSize:10, fontFamily:"JetBrains Mono, monospace" }}>
                    {card.change > 0 ? "▲" : "▼"} {Math.abs(card.change)}%
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Recent Trades */}
        <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
          <h2 style={{ color:C.text, fontWeight:700, fontSize:15, marginBottom:16 }}>Recent Activity</h2>
          {trades.length === 0 ? (
            <div style={{ color:C.textSec, fontSize:13, textAlign:"center", paddingTop:20 }}>
              No trades yet.<br />
              <button onClick={() => navigate("/marketplace")} style={{ color:C.accent, background:"none", border:"none", fontSize:13, cursor:"pointer", marginTop:8, fontWeight:700 }}>Browse marketplace →</button>
            </div>
          ) : trades.map(t => (
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background: t.status === "complete" ? C.accentDim : "#F5C84220", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>
                {t.buyer_id === user?.id ? "↓" : "↑"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:C.text, fontSize:12, fontWeight:600 }}>{t.card_name}</div>
                <div style={{ color:C.textSec, fontSize:10, fontFamily:"JetBrains Mono, monospace" }}>{timeAgo(t.created_at)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:C.accent, fontSize:12, fontWeight:700, fontFamily:"JetBrains Mono, monospace" }}>{formatNaira(t.amount_ngn)}</div>
                <div style={{ color:C.textMuted, fontSize:9, letterSpacing:"0.1em" }}>{t.status.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
