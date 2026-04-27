export default function ModeSelector({ active, onChange }) {
  const modes = [
    { id:1, code:"01", label:"Post-Training", sub:"SHAP divergence on trained model" },
    { id:2, code:"02", label:"Pre-Training",  sub:"Audit dataset before training"    },
    { id:3, code:"03", label:"Full Pipeline", sub:"End-to-end · Coming soon", disabled:true },
  ];

  return (
    <div style={s.row}>
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => !m.disabled && onChange(m.id)}
          style={{
            ...s.card,
            ...(active===m.id ? s.active : {}),
            ...(m.disabled ? s.disabled : {}),
          }}
        >
          <div style={s.top}>
            <span style={{ ...s.code, color: active===m.id ? "var(--accent2)" : "var(--text3)" }}>{m.code}</span>
            {active===m.id && <div style={s.activeDot}/>}
          </div>
          <div style={{ ...s.label, color: m.disabled ? "var(--text3)" : active===m.id ? "var(--text)" : "var(--text2)" }}>
            {m.label}
          </div>
          <div style={s.sub}>{m.sub}</div>
        </button>
      ))}
    </div>
  );
}

const s = {
  row: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px" },
  card: {
    background:"var(--surface)", border:"1px solid var(--border)",
    borderRadius:"10px", padding:"16px 18px",
    display:"flex", flexDirection:"column", gap:"5px",
    cursor:"pointer", textAlign:"left",
    transition:"border-color 0.15s, background 0.15s",
  },
  active: {
    background:"var(--panel)", border:"1px solid var(--accent)",
    boxShadow:"0 0 0 1px var(--accent)22, inset 0 1px 0 #ffffff08",
  },
  disabled: { opacity:0.35, cursor:"not-allowed" },
  top: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"2px" },
  code: { fontFamily:"'Geist Mono',monospace", fontSize:"10px", fontWeight:"600", letterSpacing:"0.1em" },
  activeDot: { width:"5px", height:"5px", borderRadius:"50%", background:"var(--accent)" },
  label: { fontSize:"14px", fontWeight:"600", letterSpacing:"-0.01em", fontFamily:"'Geist',sans-serif" },
  sub: { fontSize:"11px", color:"var(--text3)", marginTop:"1px" },
};