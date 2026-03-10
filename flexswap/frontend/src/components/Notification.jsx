const TYPE_COLORS = {
  success: { bg:"#00E5A015", border:"#00E5A040", color:"#00E5A0", icon:"✓" },
  warning: { bg:"#F5C84215", border:"#F5C84240", color:"#F5C842", icon:"⚠" },
  error:   { bg:"#FF4D6A15", border:"#FF4D6A40", color:"#FF4D6A", icon:"✕" },
  info:    { bg:"#3B82F615", border:"#3B82F640", color:"#3B82F6", icon:"ℹ" },
};

export default function Notification({ message, type = "info" }) {
  const s = TYPE_COLORS[type] || TYPE_COLORS.info;
  return (
    <div style={{
      position:"fixed", top:20, right:20, zIndex:9999,
      background:"#111318", border:`1px solid ${s.border}`,
      borderLeft:`4px solid ${s.color}`,
      borderRadius:12, padding:"14px 18px",
      display:"flex", alignItems:"center", gap:12,
      boxShadow:"0 8px 32px #00000066",
      animation:"slideIn 0.25s ease",
      maxWidth:360,
    }}>
      <span style={{ color:s.color, fontSize:16, fontWeight:800 }}>{s.icon}</span>
      <span style={{ color:"#F0F2F8", fontSize:13, fontFamily:"Syne, sans-serif", fontWeight:600 }}>{message}</span>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}
