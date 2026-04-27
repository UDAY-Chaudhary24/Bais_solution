import { useState } from "react";
import FileUpload from "../components/FileUpload";
import ShapPanel from "../components/ShapPanel";
import { suggestColumns, runAnalysis } from "../api/client";

export default function Mode1() {
  const [dataset, setDataset] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [protectedCol, setProtectedCol] = useState("");
  const [targetCol, setTargetCol] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);

  const handleSuggest = async () => {
    if (!dataset) return;
    setLoading(true); setError(null);
    try {
      const res = await suggestColumns(dataset);
      setColumns(res.columns || []);
      setSuggestions(res.suggestions || []);
      setStep(2);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleAnalyze = async () => {
    if (!dataset || !modelFile || !protectedCol || !targetCol) return;
    setLoading(true); setError(null);
    try {
      const res = await runAnalysis(dataset, modelFile, protectedCol, targetCol);
      setResult(res); setStep(3);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.pageHead}>
        <div style={s.modeTag}>MODE 01 — POST-TRAINING EXPLAINER</div>
        <p style={s.desc}>Upload a trained model and its dataset. Get SHAP divergence scores per demographic group and per-cluster ablation analysis.</p>
      </div>

      {/* Step 1 */}
      <div style={s.section} className="fu">
        <SectionHead num="01" title="Upload Files" />
        <div style={s.sectionBody}>
          <div style={s.uploadRow}>
            <FileUpload label="Upload Dataset (.csv)" accept=".csv" onFile={setDataset} file={dataset} />
            <FileUpload label="Upload Model (.pkl / .joblib)" accept=".pkl,.joblib" onFile={setModelFile} file={modelFile} />
          </div>
          <button style={s.btn} onClick={handleSuggest} disabled={!dataset || loading}>
            {loading && step===1 ? "Scanning…" : <>Scan Columns <span>→</span></>}
          </button>
        </div>
      </div>

      {/* Step 2 */}
      {step >= 2 && (
        <div style={s.section} className="fu">
          <SectionHead num="02" title="Select Columns" />
          <div style={s.sectionBody}>
            {suggestions.length > 0 && (
              <div style={s.suggestBox}>
                <div style={s.suggestLabel}>Suggested protected attributes</div>
                <div style={s.suggestRow}>
                  {suggestions.map(sg => (
                    <button
                      key={sg.column}
                      style={{ ...s.suggestChip, ...(protectedCol===sg.column ? s.suggestActive : {}) }}
                      onClick={() => setProtectedCol(sg.column)}
                    >
                      {sg.column}
                      <span style={s.conf}>{Math.round(sg.confidence*100)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={s.selectRow}>
              <div style={s.field}>
                <div style={s.fieldLabel}>Protected Column</div>
                <select style={s.sel} value={protectedCol} onChange={e => setProtectedCol(e.target.value)}>
                  <option value="">— select —</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <div style={s.fieldLabel}>Target Column</div>
                <select style={s.sel} value={targetCol} onChange={e => setTargetCol(e.target.value)}>
                  <option value="">— select —</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button
              style={{ ...s.btn, opacity: (!protectedCol||!targetCol||!modelFile||loading)?0.5:1 }}
              onClick={handleAnalyze}
              disabled={!protectedCol||!targetCol||!modelFile||loading}
            >
              {loading && step===2 ? "Analyzing…" : <>Run Analysis <span>→</span></>}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={s.error}>
          <span>⚠</span> {error}
        </div>
      )}

      {result && (
        <div style={s.section} className="fu">
          <SectionHead num="03" title="SHAP Divergence Results" />
          <div style={s.sectionBody}>
            <ShapPanel
              shapDivergence={result.shap_divergence}
              riskFlags={result.risk_flags}
              groups={result.groups}
              baselineScore={result.baseline_score}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ num, title }) {
  return (
    <div style={sh.wrap}>
      <span style={sh.num}>{num}</span>
      <span style={sh.title}>{title}</span>
    </div>
  );
}

const sh = {
  wrap: { display:"flex", alignItems:"center", gap:"12px", padding:"14px 20px", borderBottom:"1px solid var(--border)", background:"var(--surface)" },
  num: { fontFamily:"'Geist Mono',monospace", fontSize:"10px", fontWeight:"700", color:"var(--accent)", letterSpacing:"0.1em", background:"var(--accent)15", border:"1px solid var(--accent)33", padding:"2px 8px", borderRadius:"4px" },
  title: { fontSize:"13px", fontWeight:"600", color:"var(--text)", letterSpacing:"-0.01em" },
};

const s = {
  page: { display:"flex", flexDirection:"column", gap:"16px" },
  pageHead: { marginBottom:"4px" },
  modeTag: { fontSize:"10px", color:"var(--accent2)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.14em", fontWeight:"600", marginBottom:"8px" },
  desc: { fontSize:"13px", color:"var(--text2)", lineHeight:"1.65", maxWidth:"620px" },
  section: { background:"var(--panel)", border:"1px solid var(--border)", borderRadius:"12px", overflow:"hidden" },
  sectionBody: { padding:"20px", display:"flex", flexDirection:"column", gap:"16px" },
  uploadRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" },
  btn: {
    alignSelf:"flex-start", display:"inline-flex", alignItems:"center", gap:"8px",
    background:"var(--accent)", color:"white", border:"none",
    borderRadius:"8px", padding:"10px 20px", fontSize:"13px", fontWeight:"600",
    letterSpacing:"-0.01em",
  },
  suggestBox: { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"8px", padding:"12px 14px", display:"flex", flexDirection:"column", gap:"8px" },
  suggestLabel: { fontSize:"10px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.08em" },
  suggestRow: { display:"flex", gap:"6px", flexWrap:"wrap" },
  suggestChip: {
    background:"var(--panel)", border:"1px solid var(--border2)",
    borderRadius:"6px", padding:"5px 12px", fontSize:"12px",
    color:"var(--text2)", fontFamily:"'Geist Mono',monospace",
    display:"flex", gap:"6px", alignItems:"center",
  },
  suggestActive: { border:"1px solid var(--accent)", color:"var(--accent2)", background:"var(--accent)10" },
  conf: { fontSize:"10px", color:"var(--text3)" },
  selectRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" },
  field: { display:"flex", flexDirection:"column", gap:"6px" },
  fieldLabel: { fontSize:"11px", fontWeight:"600", color:"var(--text2)" },
  sel: {
    background:"var(--surface)", border:"1px solid var(--border2)",
    borderRadius:"7px", color:"var(--text)", padding:"9px 12px",
    fontSize:"12px", fontFamily:"'Geist Mono',monospace",
  },
  error: {
    display:"flex", alignItems:"center", gap:"10px",
    background:"#f8717108", border:"1px solid #f8717133",
    borderRadius:"8px", padding:"12px 16px",
    color:"var(--red)", fontSize:"12px", fontFamily:"'Geist Mono',monospace",
  },
};