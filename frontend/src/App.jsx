import { useState, useEffect } from "react";
import ModeSelector from "./components/ModeSelector";
import Mode1 from "./pages/Mode1";
import Mode2 from "./pages/Mode2";
import Mode3 from "./pages/Mode3";

export default function App() {
  const [mode, setMode] = useState(2);
  const [health, setHealth] = useState("checking");

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || "";

// inside useEffect:
fetch(`${API_BASE}/health`)
      .then(r => r.ok ? setHealth("ok") : setHealth("error"))
      .catch(() => setHealth("error"));
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&family=Geist:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #080910; --surface: #0e1016; --panel: #13161f;
          --border: #1e2130; --border2: #252838;
          --accent: #6366f1; --accent2: #818cf8;
          --text: #e8eaf0; --text2: #9499b0; --text3: #555870;
          --red: #f87171; --orange: #fb923c; --green: #4ade80;
          --gray: #6b7280; --yellow: #fbbf24;
        }
        html, body { background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; min-height: 100vh; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
        select, input, button { font-family: inherit; outline: none; }
        button { cursor: pointer; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .fu  { animation: fadeUp 0.45s ease both; }
        .fu1 { animation: fadeUp 0.45s 0.06s ease both; }
        .fu2 { animation: fadeUp 0.45s 0.12s ease both; }
        .fu3 { animation: fadeUp 0.45s 0.18s ease both; }
        .fu4 { animation: fadeUp 0.45s 0.24s ease both; }
        .fu5 { animation: fadeUp 0.45s 0.30s ease both; }
        .fu6 { animation: fadeUp 0.45s 0.36s ease both; }
      `}</style>

      <div style={s.shell}>
        <header style={s.header}>
          <div style={s.hl}>
            <div style={s.logo}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14.9 5V11L8 15L1.1 11V5L8 1Z" stroke="#6366f1" strokeWidth="1.4" fill="none"/>
                <circle cx="8" cy="8" r="2" fill="#6366f1"/>
              </svg>
              <span style={s.logoText}>BIAS-TOOL</span>
            </div>
            <span style={s.sep}>|</span>
            <span style={s.ver}>v1.0.0</span>
          </div>
          <div style={s.hr}>
            <div style={s.pill}>
              <div style={{
                ...s.dot,
                background: health==="ok" ? "#4ade80" : health==="error" ? "#f87171" : "#fbbf24",
                boxShadow: health==="ok" ? "0 0 7px #4ade8077" : "0 0 7px #f8717177",
                animation: health==="checking" ? "pulse 1.4s infinite" : "none",
              }}/>
              <span style={s.pillTxt}>
                {health==="ok"?"Backend connected":health==="error"?"Backend offline":"Connecting…"}
              </span>
            </div>
          </div>
        </header>

        <main style={s.main}>
          <div style={s.inner}>
            <div className="fu" style={s.hero}>
              <div>
                <div style={s.heroTag}>AI FAIRNESS AUDITING</div>
                <h1 style={s.heroTitle}>Bias Detection Tool</h1>
              </div>
              <p style={s.heroDesc}>
                Find and fix discrimination in datasets and trained models — before it reaches production.
              </p>
            </div>
            <div className="fu1"><ModeSelector active={mode} onChange={setMode} /></div>
            <div className="fu2">
              {mode===1 && <Mode1 />}
              {mode===2 && <Mode2 />}
              {mode===3 && <Mode3 />}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

const s = {
  shell: { minHeight:"100vh", display:"flex", flexDirection:"column" },
  header: {
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"0 32px", height:"50px",
    borderBottom:"1px solid var(--border)",
    background:"rgba(8,9,16,0.9)", backdropFilter:"blur(16px)",
    position:"sticky", top:0, zIndex:100,
  },
  hl: { display:"flex", alignItems:"center", gap:"12px" },
  logo: { display:"flex", alignItems:"center", gap:"8px" },
  logoText: { fontFamily:"'Geist Mono',monospace", fontWeight:"700", fontSize:"12px", letterSpacing:"0.12em", color:"var(--text)" },
  sep: { color:"var(--border2)", fontSize:"14px" },
  ver: { fontSize:"11px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace" },
  hr: { display:"flex", alignItems:"center" },
  pill: {
    display:"flex", alignItems:"center", gap:"6px",
    background:"var(--panel)", border:"1px solid var(--border)",
    borderRadius:"99px", padding:"4px 12px",
  },
  dot: { width:"6px", height:"6px", borderRadius:"50%", flexShrink:0 },
  pillTxt: { fontSize:"11px", color:"var(--text2)", fontFamily:"'Geist Mono',monospace" },
  main: { flex:1, padding:"40px 32px 80px" },
  inner: { maxWidth:"980px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"32px" },
  hero: { display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:"16px" },
  heroTag: { fontSize:"10px", color:"var(--accent)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.16em", fontWeight:"600", marginBottom:"8px" },
  heroTitle: { fontSize:"28px", fontWeight:"700", letterSpacing:"-0.025em", color:"var(--text)", lineHeight:1.1 },
  heroDesc: { fontSize:"13px", color:"var(--text2)", maxWidth:"340px", lineHeight:"1.65" },
};
