import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCards } from "../hooks/index.js";
import { useApp }  from "../context/AppContext";
import { formatRate, formatVolume } from "../utils/index.js";

const C = { bg:"#0A0B0F", surface:"#111318", surfaceAlt:"#161A22", border:"#1E2330", accent:"#00E5A0", accentDim:"#00E5A015", accentMid:"#00E5A040", gold:"#F5C842", red:"#FF4D6A", text:"#F0F2F8", textSec:"#7A8299", textMuted:"#3D4459" };

const CATS = ["All", "Shopping", "Entertainment", "Gaming", "Apps", "Prepaid"];

export default function Marketplace() {
  const [category, setCategory] = useState("All");
  const [search,   setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [listData, setListData] = useState({ card_type_id:"", denomination:"", asking_price:"", sell_type:"instant" });
  const [submitting, setSubmitting] = useState(false);

  const { cards, loading } = useCards({ category: category !== "All" ? category : undefined, search });
  const { liveRates, showNotification } = useApp();
  const navigate = useNavigate();
  const { api } = require ? { api: null } : {};

  const handleList = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { api } = await import("../services/api.js");
      await api.listings.create(listData);
      showNotification("Listing created! ✅", "success");
      setShowForm(false);
    } catch (err) {
      showNotification(err.message, "error");
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:22 }}>
        <div>
          <h1 style={{ color:C.text, fontWeight:800, fontSize:26, letterSpacing:"-1px" }}>Marketplace</h1>
          <p style={{ color:C.textSec, margin:"4px 0 0", fontSize:13 }}>Live rates · {cards.length} card types available</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background:C.accent, color:"#000", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:800, fontSize:13, cursor:"pointer" }}>
          + List Gift Card
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ display:"flex", gap:10, marginBottom:22, flexWrap:"wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cards…"
          style={{ flex:"1", minWidth:160, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 14px", color:C.text, fontFamily:"JetBrains Mono, monospace", fontSize:12, outline:"none" }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              background: category === c ? C.accent : C.surfaceAlt,
              color: category === c ? "#000" : C.textSec,
              border:`1px solid ${category === c ? C.accent : C.border}`,
              borderRadius:8, padding:"8px 14px", fontWeight:700, fontSize:12, cursor:"pointer"
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div style={{ color:C.textSec, fontSize:13, textAlign:"center", paddingTop:40 }}>Loading market data…</div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))", gap:16 }}>
          {cards.map(card => {
            const liveRate = liveRates[card.id] || card.rate;
            return (
              <div key={card.id}
                style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", cursor:"pointer", transition:"transform 0.15s, border-color 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor=C.accentMid; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.borderColor=C.border;    }}
              >
                <div style={{ height:72, background:`linear-gradient(135deg, ${card.color}33, ${card.color}11)`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:32 }}>{card.icon}</span>
                  <div style={{ color: card.change > 0 ? C.accent : C.red, fontFamily:"JetBrains Mono, monospace", fontSize:12, fontWeight:700 }}>
                    {card.change > 0 ? "▲" : "▼"} {Math.abs(card.change)}%
                  </div>
                </div>
                <div style={{ padding:"14px 18px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <h3 style={{ color:C.text, fontWeight:800, fontSize:15 }}>{card.name}</h3>
                    <span style={{ color:C.textSec, fontSize:10, background:C.bg, border:`1px solid ${C.border}`, borderRadius:5, padding:"2px 7px", fontFamily:"JetBrains Mono, monospace" }}>{card.category}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                    <div>
                      <div style={{ color:C.textMuted, fontSize:9, fontFamily:"JetBrains Mono, monospace" }}>RATE</div>
                      <div style={{ color:C.accent, fontWeight:800, fontFamily:"JetBrains Mono, monospace", fontSize:20 }}>{formatRate(liveRate)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:C.textMuted, fontSize:9, fontFamily:"JetBrains Mono, monospace" }}>24H VOL</div>
                      <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{formatVolume(card.volume)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:C.textMuted, fontSize:9, fontFamily:"JetBrains Mono, monospace" }}>LISTINGS</div>
                      <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{card.listings}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => navigate("/trade")} style={{ flex:1, background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"9px", fontWeight:800, fontSize:12, cursor:"pointer" }}>
                      Sell Instantly
                    </button>
                    <button onClick={() => { setListData(l => ({ ...l, card_type_id: card.id })); setShowForm(true); }} style={{ flex:1, background:"transparent", color:C.accent, border:`1px solid ${C.accentMid}`, borderRadius:8, padding:"9px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                      List for Offers
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List Card Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"#000000AA", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:"100%", maxWidth:420 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ color:C.text, fontWeight:800, fontSize:18 }}>List Gift Card</h2>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", color:C.textSec, fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            <form onSubmit={handleList}>
              {[
                { label:"Card Type ID", key:"card_type_id", type:"text",   placeholder:"1 (Amazon), 2 (iTunes)…" },
                { label:"Face Value (USD)", key:"denomination",  type:"number", placeholder:"100" },
                { label:"Asking Price (₦)", key:"asking_price",  type:"number", placeholder:"87000" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <label style={{ display:"block", color:C.textSec, fontSize:10, fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:5 }}>{label.toUpperCase()}</label>
                  <input type={type} value={listData[key]} placeholder={placeholder} required
                    onChange={e => setListData(d => ({ ...d, [key]: e.target.value }))}
                    style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box" }}
                  />
                </div>
              ))}
              <div style={{ marginBottom:18 }}>
                <label style={{ display:"block", color:C.textSec, fontSize:10, fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:5 }}>SELL TYPE</label>
                <select value={listData.sell_type} onChange={e => setListData(d => ({ ...d, sell_type: e.target.value }))}
                  style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, outline:"none" }}>
                  <option value="instant">Instant Sale</option>
                  <option value="auction">Auction</option>
                  <option value="p2p">P2P Negotiation</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} style={{ width:"100%", background:C.accent, color:"#000", border:"none", borderRadius:10, padding:"12px", fontWeight:800, fontSize:14, cursor:"pointer", opacity:submitting?0.7:1 }}>
                {submitting ? "Creating…" : "Create Listing"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
