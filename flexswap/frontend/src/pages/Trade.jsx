// ── Trade Page ────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useConversation, useWallet } from "../hooks/index.js";
import { useApp }  from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatNaira, timeAgo, STATUS_COLORS, STATUS_LABELS } from "../utils/index.js";

const C = { bg:"#0A0B0F", surface:"#111318", surfaceAlt:"#161A22", border:"#1E2330", accent:"#00E5A0", accentDim:"#00E5A015", accentMid:"#00E5A040", red:"#FF4D6A", blue:"#3B82F6", text:"#F0F2F8", textSec:"#7A8299", textMuted:"#3D4459" };

export function Trade() {
  const { showNotification } = useApp();
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.listings.list({ limit:20 }).then(d => { setListings(d.listings); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleBuy = async (listingId) => {
    try {
      const { order } = await api.trades.buy({ listing_id: listingId });
      showNotification("Order created! Fund escrow to proceed.", "info");
      const { order: funded } = await api.trades.fundEscrow(order.id)
        .catch(() => { throw new Error("Escrow funding failed — check your balance"); });
      showNotification("Escrow funded ✅ Awaiting card details.", "success");
    } catch (err) { showNotification(err.message, "error"); }
  };

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ color:C.text, fontWeight:800, fontSize:26, letterSpacing:"-1px" }}>P2P Marketplace</h1>
        <p style={{ color:C.textSec, margin:"4px 0 0", fontSize:13 }}>Browse listings · Escrow protected · {listings.length} active</p>
      </div>

      {loading ? <div style={{ color:C.textSec, textAlign:"center", paddingTop:40 }}>Loading listings…</div> :
        listings.length === 0 ? (
          <div style={{ textAlign:"center", paddingTop:60, color:C.textSec }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <p>No active listings yet.</p>
            <button onClick={() => navigate("/marketplace")} style={{ color:C.accent, background:"none", border:"none", cursor:"pointer", fontSize:14, fontWeight:700, marginTop:10 }}>Be the first to list →</button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {listings.map(l => (
              <div key={l.id} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:42, height:42, background:`#00E5A020`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:C.accent, fontSize:16, flexShrink:0 }}>
                  {l.seller_username?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{l.seller_username}</div>
                  <div style={{ color:C.textSec, fontSize:11, fontFamily:"JetBrains Mono, monospace" }}>
                    {l.card_name} ${l.denomination} · {l.sell_type} · {timeAgo(l.created_at)}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:C.accent, fontWeight:800, fontFamily:"JetBrains Mono, monospace", fontSize:16 }}>{formatNaira(l.asking_price)}</div>
                  <div style={{ color:C.textSec, fontSize:10 }}>{(l.rate * 100).toFixed(0)}% rate</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => handleBuy(l.id)} style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"9px 16px", fontWeight:800, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                    Buy Now
                  </button>
                  <button onClick={() => navigate("/chat")} style={{ background:"transparent", color:C.accent, border:`1px solid ${C.accentMid}`, borderRadius:8, padding:"9px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}


// ── Chat Page ─────────────────────────────────────────────────────────────────
export function Chat() {
  const { id: convId } = useParams();
  const { user }       = useAuth();
  const { messages, typing, sendMessage, sendTyping } = useConversation(convId);
  const [input,  setInput]  = useState("");
  const [convs,  setConvs]  = useState([]);
  const bottomRef = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => {
    api.chat.conversations().then(d => setConvs(d.conversations || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !convId) return;
    const msg = input; setInput("");
    try { await sendMessage(msg); } catch {}
  };

  return (
    <div style={{ height:"calc(100vh - 110px)", display:"grid", gridTemplateColumns:"240px 1fr", background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
      {/* Thread list */}
      <div style={{ borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
          <h2 style={{ color:C.text, fontWeight:700, fontSize:14, marginBottom:10 }}>Messages</h2>
          <input placeholder="Search…" style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:"7px 10px", color:C.text, fontSize:11, outline:"none", boxSizing:"border-box" }} />
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {convs.length === 0 && <div style={{ color:C.textSec, fontSize:12, textAlign:"center", padding:20 }}>No conversations yet</div>}
          {convs.map(c => (
            <div key={c.id} onClick={() => navigate(`/chat/${c.id}`)} style={{
              display:"flex", gap:10, padding:"12px 14px", cursor:"pointer",
              background: c.id === convId ? C.accentDim : "transparent",
              borderLeft: `2px solid ${c.id === convId ? C.accent : "transparent"}`,
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ width:34, height:34, background:"#00E5A033", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:C.accent, flexShrink:0 }}>
                {c.participants?.find(p => p !== user?.id)?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ overflow:"hidden" }}>
                <div style={{ color:C.text, fontWeight:700, fontSize:12 }}>Conversation</div>
                <div style={{ color:C.textSec, fontSize:10, fontFamily:"JetBrains Mono, monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {c.last_message?.content || "No messages yet"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {!convId ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", color:C.textSec, fontSize:13 }}>
          Select a conversation to start chatting
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, background:C.surface }}>
            <div style={{ color:C.text, fontWeight:700 }}>Trade Chat</div>
            <div style={{ color:C.accent, fontSize:11, fontFamily:"JetBrains Mono, monospace" }}>🔒 Escrow protected</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
            {messages.map((m, i) => {
              const isMe = m.sender_id === user?.id;
              return (
                <div key={m.id || i} style={{ display:"flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth:"70%", padding:"10px 14px",
                    borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isMe ? `linear-gradient(135deg, ${C.accent}, #00B37A)` : C.bg,
                    border: isMe ? "none" : `1px solid ${C.border}`,
                  }}>
                    <div style={{ color: isMe ? "#000" : C.text, fontSize:13, fontWeight:500 }}>{m.content}</div>
                    <div style={{ color: isMe ? "#00000066" : C.textMuted, fontSize:9, marginTop:3, textAlign:"right", fontFamily:"JetBrains Mono, monospace" }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            {typing && <div style={{ color:C.textSec, fontSize:12, fontStyle:"italic" }}>Typing…</div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding:"12px 18px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10 }}>
            <input value={input} onChange={e => { setInput(e.target.value); sendTyping(); }}
              onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message…"
              style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.text, fontSize:13, outline:"none" }}
            />
            <button onClick={send} style={{ background:C.accent, color:"#000", border:"none", borderRadius:10, padding:"10px 18px", fontWeight:800, fontSize:14, cursor:"pointer" }}>↑</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Wallet Page ───────────────────────────────────────────────────────────────
export function Wallet() {
  const { wallet, loading, refresh } = useWallet();
  const { showNotification } = useApp();
  const [withdrawForm, setWithdrawForm] = useState({ amount:"", currency:"NGN" });
  const [converting, setConverting]   = useState(false);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      const { api } = await import("../services/api.js");
      const res = await api.wallet.withdraw(withdrawForm);
      showNotification(`Withdrawal of ₦${Number(withdrawForm.amount).toLocaleString()} initiated`, "success");
      refresh();
    } catch (err) { showNotification(err.message, "error"); }
  };

  const ASSET_CONFIG = [
    { key:"ngn",   label:"Nigerian Naira",  symbol:"₦", color:"#00E5A0", format: v => `₦${Number(v||0).toLocaleString()}` },
    { key:"usdt",  label:"USDT",            symbol:"₮", color:"#F5C842", format: v => `${Number(v||0).toFixed(2)} USDT`   },
    { key:"btc",   label:"Bitcoin",         symbol:"₿", color:"#F7931A", format: v => `${Number(v||0).toFixed(8)} BTC`    },
    { key:"escrow",label:"Escrow Held",     symbol:"🔒",color:"#3B82F6", format: v => `₦${Number(v||0).toLocaleString()}` },
  ];

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ color:C.text, fontWeight:800, fontSize:26, letterSpacing:"-1px" }}>Wallet</h1>
        <p style={{ color:C.textSec, margin:"4px 0 0", fontSize:13 }}>
          Total: {wallet ? formatNaira(wallet.total_ngn_equivalent) : "—"} NGN equivalent
        </p>
      </div>

      {loading ? <div style={{ color:C.textSec, textAlign:"center", paddingTop:40 }}>Loading wallet…</div> : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:16, marginBottom:28 }}>
            {ASSET_CONFIG.map(({ key, label, symbol, color, format }) => (
              <div key={key} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderTop:`3px solid ${color}`, borderRadius:16, padding:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{ color:C.textSec, fontSize:10, fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em" }}>{label.toUpperCase()}</span>
                  <span style={{ color, fontSize:18 }}>{symbol}</span>
                </div>
                <div style={{ color:C.text, fontWeight:800, fontSize:22, letterSpacing:"-0.5px" }}>{format(wallet?.[key])}</div>
                {key !== "escrow" && (
                  <div style={{ display:"flex", gap:8, marginTop:14 }}>
                    {["Withdraw","Convert"].map(action => (
                      <button key={action} style={{ flex:1, background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:7, padding:"7px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Withdraw Form */}
          <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:22, maxWidth:400 }}>
            <h2 style={{ color:C.text, fontWeight:700, fontSize:15, marginBottom:16 }}>Withdraw NGN</h2>
            <form onSubmit={handleWithdraw}>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", color:C.textSec, fontSize:10, fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:5 }}>AMOUNT (₦)</label>
                <input type="number" value={withdrawForm.amount} placeholder="Enter amount…" required min={500}
                  onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box" }}
                />
              </div>
              <button type="submit" style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"11px", width:"100%", fontWeight:800, fontSize:13, cursor:"pointer" }}>
                Withdraw to Bank
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}


// ── Analytics Page ────────────────────────────────────────────────────────────
export function Analytics() {
  const { cards, loading } = useCards ? useCards() : { cards:[], loading:false };

  const weeks   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const volumes = [42,78,55,91,67,110,88];
  const maxVol  = Math.max(...volumes);

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ color:C.text, fontWeight:800, fontSize:26, letterSpacing:"-1px" }}>Analytics</h1>
        <p style={{ color:C.textSec, margin:"4px 0 0", fontSize:13 }}>Market intelligence · AI rate predictions</p>
      </div>

      {/* Volume Chart */}
      <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ color:C.text, fontWeight:700, fontSize:15 }}>Trade Volume · 7 Days</h2>
          <span style={{ color:C.accent, fontFamily:"JetBrains Mono, monospace", fontSize:12 }}>↑ 23% vs last week</span>
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:140 }}>
          {weeks.map((day, i) => (
            <div key={day} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ width:"100%", background:`linear-gradient(180deg, ${C.accent}, ${C.accent}66)`, borderRadius:"6px 6px 0 0", height: `${(volumes[i]/maxVol)*120}px`, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:4, left:0, right:0, textAlign:"center", color:"#000", fontFamily:"JetBrains Mono, monospace", fontSize:9, fontWeight:800 }}>{volumes[i]}K</div>
              </div>
              <span style={{ color:C.textSec, fontSize:9, fontFamily:"JetBrains Mono, monospace" }}>{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Top cards */}
        <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
          <h3 style={{ color:C.text, fontWeight:700, fontSize:14, marginBottom:16 }}>Top Performing Cards</h3>
          {(loading ? [] : cards).slice(0,5).map((c, i) => (
            <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.textMuted, fontSize:11, fontFamily:"JetBrains Mono, monospace", width:16 }}>#{i+1}</span>
              <span style={{ fontSize:18 }}>{c.icon}</span>
              <span style={{ color:C.text, flex:1, fontSize:13, fontWeight:600 }}>{c.name}</span>
              <span style={{ color: c.change > 0 ? C.accent : C.red, fontFamily:"JetBrains Mono, monospace", fontSize:12 }}>
                {c.change > 0 ? "▲" : "▼"}{Math.abs(c.change)}%
              </span>
            </div>
          ))}
        </div>

        {/* AI rate predictions */}
        <div style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
          <h3 style={{ color:C.text, fontWeight:700, fontSize:14, marginBottom:16 }}>AI Rate Predictions</h3>
          {[
            { card:"Amazon",   current:"87%", predicted:"89%", conf:"High" },
            { card:"Visa",     current:"91%", predicted:"93%", conf:"High" },
            { card:"iTunes",   current:"82%", predicted:"81%", conf:"Med"  },
            { card:"Steam",    current:"79%", predicted:"80%", conf:"Med"  },
            { card:"Walmart",  current:"83%", predicted:"85%", conf:"High" },
          ].map((r, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}`, gap:10 }}>
              <span style={{ color:C.text, flex:1, fontSize:13, fontWeight:600 }}>{r.card}</span>
              <span style={{ color:C.textSec, fontFamily:"JetBrains Mono, monospace", fontSize:11 }}>{r.current}</span>
              <span style={{ color:C.textMuted }}>→</span>
              <span style={{ color: parseInt(r.predicted) > parseInt(r.current) ? C.accent : C.red, fontFamily:"JetBrains Mono, monospace", fontSize:11, fontWeight:700 }}>{r.predicted}</span>
              <span style={{ background: r.conf === "High" ? "#00E5A015" : "#F5C84215", color: r.conf === "High" ? C.accent : "#F5C842", borderRadius:5, padding:"2px 7px", fontSize:9, fontFamily:"JetBrains Mono, monospace" }}>{r.conf.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Trade;
