export default function Mode3() {
  return (
    <div style={s.page}>
      <div style={s.modeTag}>MODE 03 — FULL PIPELINE</div>
      <div style={s.card}>
        <div style={s.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4L28 10V22L16 28L4 22V10L16 4Z" stroke="#1e2130" strokeWidth="2" fill="none"/>
            <path d="M16 10L22 13V19L16 22L10 19V13L16 10Z" stroke="#252838" strokeWidth="1.5" fill="none"/>
            <circle cx="16" cy="16" r="2" fill="#252838"/>
          </svg>
        </div>
        <div style={s.label}>Coming post-MVP</div>
        <p style={s.sub}>
          Mode 3 will combine Mode 1 (post-training SHAP analysis) and Mode 2 (pre-training audit) into a single end-to-end pipeline. Use them independently for now.
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { display:"flex", flexDirection:"column", gap:"12px" },
  modeTag: { fontSize:"10px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.14em", fontWeight:"600" },
  card: {
    background:"var(--panel)", border:"1px dashed var(--border)",
    borderRadius:"12px", padding:"60px 32px",
    display:"flex", flexDirection:"column", alignItems:"center",
    gap:"12px", textAlign:"center",
  },
  iconWrap: { marginBottom:"4px" },
  label: { fontSize:"15px", fontWeight:"600", color:"var(--text3)", letterSpacing:"-0.01em" },
  sub: { fontSize:"13px", color:"var(--text3)", maxWidth:"400px", lineHeight:"1.65" },
};