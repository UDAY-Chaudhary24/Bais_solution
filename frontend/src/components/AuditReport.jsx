const QUAD_COLOR = {
  remove:"#f87171", decouple:"#fb923c", useless:"#555870", safe:"#4ade80"
};

export default function AuditReport({ clusters, annotations, miPairs, baselineScore, isClassification }) {
  if (!clusters) return null;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.tag}>AUDIT REPORT</div>
        <h3 style={s.title}>Analysis Summary</h3>
      </div>

      {/* Stats row */}
      <div style={s.statsRow}>
        <Stat value={Object.keys(clusters).length} label="Clusters" accent />
        <Stat value={baselineScore} label="Baseline PR-AUC" />
        <Stat value={isClassification ? "CLF" : "REG"} label="Task Type" />
        <Stat value={miPairs?.length ?? "—"} label="High-MI Pairs" />
        <Stat value={annotations?.filter(a=>a.quadrant==="remove").length ?? 0} label="Remove" color="var(--red)" />
        <Stat value={annotations?.filter(a=>a.quadrant==="decouple").length ?? 0} label="Decouple" color="var(--orange)" />
        <Stat value={annotations?.filter(a=>a.quadrant==="safe").length ?? 0} label="Safe" color="var(--green)" />
      </div>

      {/* Cluster risk table */}
      {annotations?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Cluster Risk Map</div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Cluster","Features","Quadrant","Pred. Contribution (X)","Bias Score (Y)","Risk Score"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(annotations||[]).map((a, i) => {
                  const color = QUAD_COLOR[a.quadrant] || "var(--text2)";
                  const feats = (clusters[a.cluster_id]||[]);
                  return (
                    <tr key={a.cluster_id} style={{ ...s.tr, background: i%2===0 ? "var(--surface)" : "transparent" }}>
                      <td style={s.td}>
                        <span style={{ ...s.clusterBadge, color, borderColor:`${color}44`, background:`${color}0d` }}>
                          {a.cluster_id.replace("cluster_","C")}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={s.featList}>
                          {feats.slice(0,3).map(f => (
                            <span key={f} style={s.featChip}>{f}</span>
                          ))}
                          {feats.length > 3 && <span style={s.featMore}>+{feats.length-3}</span>}
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.quadBadge, color, background:`${color}10`, border:`1px solid ${color}33` }}>
                          {a.quadrant.toUpperCase()}
                        </span>
                      </td>
                      <td style={s.tdNum}>
                        <BarCell value={a.x} color="var(--accent2)" />
                      </td>
                      <td style={s.tdNum}>
                        <BarCell value={a.y} color={a.y > 0.5 ? "var(--red)" : "var(--green)"} />
                      </td>
                      <td style={{ ...s.tdNum, color: a.risk_score > 1 ? "var(--red)" : "var(--text2)" }}>
                        {a.risk_score?.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MI pairs */}
      {miPairs?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>High Mutual Information Pairs</div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Feature A","Feature B","MI Score"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {miPairs.slice(0,10).map((p,i) => (
                  <tr key={i} style={{ ...s.tr, background: i%2===0 ? "var(--surface)" : "transparent" }}>
                    <td style={s.td}><span style={s.featChip}>{p.feature_a}</span></td>
                    <td style={s.td}><span style={s.featChip}>{p.feature_b}</span></td>
                    <td style={s.tdNum}>
                      <BarCell value={Math.min(typeof p.mi==="number"?p.mi/3:0,1)} label={typeof p.mi==="number"?p.mi.toFixed(4):p.mi} color="var(--yellow)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, accent, color }) {
  return (
    <div style={ss.box}>
      <div style={{ ...ss.val, color: color || (accent ? "var(--accent2)" : "var(--text)") }}>{value}</div>
      <div style={ss.lbl}>{label}</div>
    </div>
  );
}

function BarCell({ value, color, label }) {
  const pct = Math.min(Math.max((value||0)*100, 0), 100);
  return (
    <div style={bc.wrap}>
      <span style={{ ...bc.num, color }}>{label ?? (value||0).toFixed(3)}</span>
      <div style={bc.track}>
        <div style={{ ...bc.bar, width:`${pct}%`, background:color }}/>
      </div>
    </div>
  );
}

const ss = {
  box: {
    background:"var(--surface)", border:"1px solid var(--border)",
    borderRadius:"8px", padding:"14px 16px", textAlign:"center", flex:1,
  },
  val: { fontSize:"18px", fontWeight:"700", fontFamily:"'Geist Mono',monospace", letterSpacing:"-0.02em" },
  lbl: { fontSize:"10px", color:"var(--text3)", marginTop:"4px", textTransform:"uppercase", letterSpacing:"0.08em" },
};

const bc = {
  wrap: { display:"flex", flexDirection:"column", gap:"4px" },
  num: { fontSize:"11px", fontFamily:"'Geist Mono',monospace", fontWeight:"500" },
  track: { height:"3px", background:"var(--border2)", borderRadius:"2px", overflow:"hidden" },
  bar: { height:"100%", borderRadius:"2px", opacity:0.8 },
};

const s = {
  wrap: {
    background:"var(--panel)", border:"1px solid var(--border)",
    borderRadius:"12px", overflow:"hidden",
  },
  header: {
    padding:"20px 24px 16px",
    borderBottom:"1px solid var(--border)",
  },
  tag: { fontSize:"10px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.12em", marginBottom:"4px" },
  title: { fontSize:"15px", fontWeight:"600", color:"var(--text)", letterSpacing:"-0.01em" },
  statsRow: { display:"flex", gap:"8px", padding:"16px 24px", flexWrap:"wrap" },
  section: { padding:"0 24px 20px", display:"flex", flexDirection:"column", gap:"10px" },
  sectionTitle: {
    fontSize:"10px", color:"var(--text3)", textTransform:"uppercase",
    letterSpacing:"0.12em", fontFamily:"'Geist Mono',monospace",
    paddingTop:"16px", borderTop:"1px solid var(--border)",
  },
  tableWrap: { overflowX:"auto", borderRadius:"8px", border:"1px solid var(--border)" },
  table: { width:"100%", borderCollapse:"collapse", fontSize:"12px" },
  th: {
    padding:"10px 14px", textAlign:"left", fontWeight:"600",
    color:"var(--text3)", fontFamily:"'Geist Mono',monospace",
    fontSize:"10px", letterSpacing:"0.08em", textTransform:"uppercase",
    background:"var(--surface)", borderBottom:"1px solid var(--border)",
    whiteSpace:"nowrap",
  },
  tr: { transition:"background 0.1s" },
  td: { padding:"10px 14px", color:"var(--text2)", verticalAlign:"middle" },
  tdNum: { padding:"10px 14px", verticalAlign:"middle", fontFamily:"'Geist Mono',monospace" },
  clusterBadge: {
    fontSize:"11px", fontWeight:"700", fontFamily:"'Geist Mono',monospace",
    padding:"2px 8px", borderRadius:"5px", border:"1px solid",
  },
  quadBadge: {
    fontSize:"9px", fontWeight:"700", fontFamily:"'Geist Mono',monospace",
    padding:"2px 7px", borderRadius:"4px", letterSpacing:"0.06em",
  },
  featList: { display:"flex", gap:"4px", flexWrap:"wrap" },
  featChip: {
    fontSize:"10px", color:"var(--text2)", background:"var(--surface)",
    border:"1px solid var(--border)", padding:"2px 6px", borderRadius:"4px",
    fontFamily:"'Geist Mono',monospace",
  },
  featMore: { fontSize:"10px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace", padding:"2px 4px" },
};