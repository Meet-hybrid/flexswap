import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const C = { bg:"#0A0B0F", surface:"#111318", border:"#1E2330", accent:"#00E5A0", text:"#F0F2F8", textSec:"#7A8299", red:"#FF4D6A" };

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]   = useState({ username:"", email:"", password:"", phone:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.phone);
      navigate("/dashboard");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fields = [
    { label:"Username",    key:"username",  type:"text",     placeholder:"e.g. kachi_trades"    },
    { label:"Email",       key:"email",     type:"email",    placeholder:"you@example.com"      },
    { label:"Password",    key:"password",  type:"password", placeholder:"Min. 8 characters"   },
    { label:"Phone (opt)", key:"phone",     type:"tel",      placeholder:"+234 800 000 0000"    },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:440 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:56, height:56, background:`linear-gradient(135deg, ${C.accent}, #00B37A)`, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 14px" }}>⇄</div>
          <h1 style={{ color:C.text, fontWeight:800, fontSize:26, letterSpacing:"-1px" }}>Create Account</h1>
          <p style={{ color:C.textSec, fontSize:13, marginTop:4 }}>Join thousands of traders on FlexSwap</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28 }}>
          {error && (
            <div style={{ background:"#FF4D6A15", border:`1px solid #FF4D6A40`, borderRadius:8, padding:"10px 14px", marginBottom:18, color:C.red, fontSize:13 }}>{error}</div>
          )}
          {fields.map(({ label, key, type, placeholder }) => (
            <div key={key} style={{ marginBottom:15 }}>
              <label style={{ display:"block", color:C.textSec, fontSize:11, fontFamily:"JetBrains Mono, monospace", letterSpacing:"0.08em", marginBottom:6 }}>{label.toUpperCase()}</label>
              <input
                type={type} value={form[key]} placeholder={placeholder}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required={key !== "phone"}
                style={{ width:"100%", background:"#0A0B0F", border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 14px", color:C.text, fontSize:14, outline:"none", fontFamily:"Syne, sans-serif", boxSizing:"border-box" }}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{ width:"100%", background:C.accent, color:"#000", border:"none", borderRadius:10, padding:"13px", fontWeight:800, fontSize:14, marginTop:10, opacity:loading?0.7:1, cursor:loading?"wait":"pointer" }}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign:"center", color:C.textSec, fontSize:13, marginTop:20 }}>
          Already have an account? <Link to="/login" style={{ color:C.accent, fontWeight:700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
