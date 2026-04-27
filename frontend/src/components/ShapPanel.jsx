export default function ShapPanel({ shapDivergence, riskFlags, groups, baselineScore }) {
  if (!shapDivergence) return null;

  const entries = Object.entries(shapDivergence).sort((a,b) => b[1]-a[1]);
  const max = entries[0]?.[1] || 1;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <div style={s.tag}>SHAP DIVERGENCE</div>
          <h3 style={s.title}>Feature Risk Scores</h3>
        </div>
        <div style={s.badges}>
          {baselineScore && <div style={s.badge}>PR-AUC {baselineScore}</div>}
          {groups && <div style={s.badge}>Groups: {groups.join(", ")}</div>}
        </div>
      </div>

      <div style={s.list}>
        {entries.map(([feat, val], i) => {
          const isRisk = riskFlags?.includes(feat);
          const pct = (val / max) * 100;
          return (
            <div key={feat} style={{ ...s.row, animationDelay:`${i*0.03}s` }} className="fu">
              <div style={s.rowTop}>
                <div style={s.featLeft}>
                  {isRisk && <span style={s.riskBadge}>HIGH RISK</span>}
                  <span style={{ ...s.featName, color: isRisk ? "var(--red)" : "var(--text)" }}>{feat}</span>
                </div>
                <span style={s.score}>{val.toFixed(4)}</span>
              </div>
              <div style={s.track}>
                <div style={{
                  ...s.bar,
                  width:`${pct}%`,
                  background: isRisk
                    ? "linear-gradient(90deg, #f87171, #fb923c)"
                    : "linear-gradient(90deg, #6366f1, #818cf8)",
                  boxShadow: isRisk ? "0 0 8px #f8717144" : "0 0 8px #6366f144",
                }}/>
              </div>
            </div>
          );
        })}
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
  tag: { fontSize:"10px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.12em", marginBottom:"4px" },
  title: { fontSize:"15px", fontWeight:"600", color:"var(--text)", letterSpacing:"-0.01em" },
  badges: { display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" },
  badge: {
    fontSize:"11px", color:"var(--accent2)", fontFamily:"'Geist Mono',monospace",
    background:"var(--surface)", border:"1px solid var(--border)",
    padding:"4px 10px", borderRadius:"6px",
  },
  list: { padding:"16px 24px", display:"flex", flexDirection:"column", gap:"12px" },
  row: { display:"flex", flexDirection:"column", gap:"6px" },
  rowTop: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  featLeft: { display:"flex", alignItems:"center", gap:"8px" },
  riskBadge: {
    fontSize:"9px", fontWeight:"700", color:"var(--red)",
    background:"#f8717110", border:"1px solid #f8717133",
    padding:"2px 6px", borderRadius:"4px", fontFamily:"'Geist Mono',monospace",
    letterSpacing:"0.06em",
  },
  featName: { fontSize:"12px", fontFamily:"'Geist Mono',monospace", fontWeight:"500" },
  score: { fontSize:"11px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace" },
  track: { height:"3px", background:"var(--border2)", borderRadius:"2px", overflow:"hidden" },
  bar: { height:"100%", borderRadius:"2px", transition:"width 0.6s cubic-bezier(0.16,1,0.3,1)" },
};