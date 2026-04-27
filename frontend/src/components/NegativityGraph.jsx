const QUAD = {
  remove:   { color:"#f87171", label:"Remove",   desc:"High bias · Low value — drop" },
  decouple: { color:"#fb923c", label:"Decouple", desc:"High bias · High value — Fair PCA" },
  useless:  { color:"#555870", label:"Useless",  desc:"Low bias · Low value — drop" },
  safe:     { color:"#4ade80", label:"Safe",      desc:"Low bias · High value — keep" },
};

export default function NegativityGraph({ imageB64, equation, annotations }) {
  if (!imageB64) return null;

  const counts = { remove:0, decouple:0, useless:0, safe:0 };
  (annotations||[]).forEach(a => { if (counts[a.quadrant]!==undefined) counts[a.quadrant]++; });

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.left}>
          <div style={s.tag}>NEGATIVITY GRAPH</div>
          <h3 style={s.title}>Feature Cluster Risk Map</h3>
        </div>
        <div style={s.eq}>{equation}</div>
      </div>

      <div style={s.imgWrap}>
        <img src={`data:image/png;base64,${imageB64}`} alt="Negativity Graph" style={s.img} />
      </div>

      <div style={s.legend}>
        {Object.entries(QUAD).map(([key, meta]) => (
          <div key={key} style={s.legendItem}>
            <div style={{ ...s.legendDot, background: meta.color, boxShadow:`0 0 6px ${meta.color}55` }} />
            <div>
              <div style={{ ...s.legendLabel, color: meta.color }}>
                {meta.label}
                <span style={s.cnt}> ×{counts[key]}</span>
              </div>
              <div style={s.legendDesc}>{meta.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: {
    background:"var(--panel)", border:"1px solid var(--border)",
    borderRadius:"12px", overflow:"hidden",
  },
  header: {
    display:"flex", justifyContent:"space-between", alignItems:"flex-start",
    flexWrap:"wrap", gap:"12px", padding:"20px 24px 16px",
    borderBottom:"1px solid var(--border)",
  },
  left: {},
  tag: { fontSize:"10px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.12em", marginBottom:"4px" },
  title: { fontSize:"15px", fontWeight:"600", color:"var(--text)", letterSpacing:"-0.01em" },
  eq: {
    fontSize:"11px", color:"var(--accent2)", fontFamily:"'Geist Mono',monospace",
    background:"var(--surface)", border:"1px solid var(--border)",
    padding:"6px 12px", borderRadius:"6px", alignSelf:"center",
  },
  imgWrap: { padding:"0" },
  img: { width:"100%", display:"block" },
  legend: {
    display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))",
    gap:"14px", padding:"16px 24px",
    borderTop:"1px solid var(--border)",
  },
  legendItem: { display:"flex", gap:"10px", alignItems:"flex-start" },
  legendDot: { width:"8px", height:"8px", borderRadius:"50%", marginTop:"4px", flexShrink:0 },
  legendLabel: { fontSize:"12px", fontWeight:"600", fontFamily:"'Geist Mono',monospace" },
  cnt: { color:"var(--text3)", fontWeight:"400" },
  legendDesc: { fontSize:"11px", color:"var(--text3)", marginTop:"2px" },
};