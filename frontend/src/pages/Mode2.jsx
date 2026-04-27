import { useState } from "react";
import FileUpload from "../components/FileUpload";
import NegativityGraph from "../components/NegativityGraph";
import AuditReport from "../components/AuditReport";
import { getColumns, runAudit, runDecouple } from "../api/client";

export default function Mode2() {
  const [dataset, setDataset] = useState(null);
  const [columns, setColumns] = useState([]);
  const [protectedCol, setProtectedCol] = useState("");
  const [targetCol, setTargetCol] = useState("");
  const [threshold, setThreshold] = useState(1.0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [decoupling, setDecoupling] = useState(false);
  const [method, setMethod] = useState("residualize");
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);

  const handleUpload = async file => {
    setDataset(file); setError(null);
    try {
      const res = await getColumns(file);
      setColumns(res.columns || []);
      setStep(2);
    } catch(e) { setError(e.message); }
  };

  const handleAudit = async () => {
    if (!dataset || !protectedCol || !targetCol) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await runAudit(dataset, protectedCol, targetCol, threshold);
      setResult(res); setStep(3);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDecouple = async () => {
    if (!result) return;
    setDecoupling(true); setError(null);
    try {
      const res = await runDecouple(dataset, protectedCol, targetCol, result.annotations, result.clusters, method);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "debiased_dataset.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { setError(e.message); }
    finally { setDecoupling(false); }
  };

  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.pageHead}>
        <div style={s.modeTag}>MODE 02 — PRE-TRAINING AUDIT</div>
        <p style={s.desc}>
          Upload a raw dataset. The tool clusters features by mutual information, runs a probe classifier to measure bias per cluster, ablates each cluster to measure predictive contribution, and plots the Negativity Graph.
        </p>
      </div>

      {/* Step 1 */}
      <Section num="01" title="Upload Dataset" active={step>=1}>
        <FileUpload label="Upload Dataset (.csv)" accept=".csv" onFile={handleUpload} file={dataset} />
        {columns.length > 0 && (
          <div style={s.colPill}>
            <span style={s.colPillLabel}>Detected {columns.length} columns</span>
            <div style={s.colList}>
              {columns.slice(0,8).map(c => <span key={c} style={s.chip}>{c}</span>)}
              {columns.length > 8 && <span style={s.chipMore}>+{columns.length-8} more</span>}
            </div>
          </div>
        )}
      </Section>

      {/* Step 2 */}
      {step >= 2 && (
        <Section num="02" title="Configure Audit" active={step>=2}>
          <div style={s.configRow}>
            <Field label="Protected Column" hint="Demographic attribute to audit (e.g. race, sex)">
              <Select value={protectedCol} onChange={setProtectedCol} options={columns} placeholder="Select column" />
            </Field>
            <Field label="Target Column" hint="What your model predicts (e.g. income)">
              <Select value={targetCol} onChange={setTargetCol} options={columns} placeholder="Select column" />
            </Field>
            <Field label="Boundary Threshold" hint="Slope of risk boundary line (default 1.0)">
              <input
                type="number" step="0.1" min="0.1" max="5" value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
                style={s.numInput}
              />
            </Field>
          </div>

          <button
            style={{ ...s.btn, ...(loading ? s.btnLoading : {}) }}
            onClick={handleAudit}
            disabled={!protectedCol || !targetCol || loading}
          >
            {loading ? (
              <><span style={s.spinner}>◌</span> Running Audit…</>
            ) : (
              <> Run Audit <span style={s.arrow}>→</span></>
            )}
          </button>
        </Section>
      )}

      {/* Error */}
      {error && (
        <div style={s.error}>
          <span style={s.errorIcon}>⚠</span>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <Section num="03" title="Negativity Graph" active>
            <NegativityGraph
              imageB64={result.graph_image}
              equation={result.equation}
              annotations={result.annotations}
            />
          </Section>

          <Section num="04" title="Audit Report" active>
            <AuditReport
              clusters={result.clusters}
              annotations={result.annotations}
              miPairs={result.mi_pairs}
              baselineScore={result.baseline_score}
              isClassification={result.is_classification}
            />
          </Section>

          <Section num="05" title="Decouple (Optional)" active>
            <p style={s.decoupleDesc}>
              Apply decoupling to flagged clusters. Downloads a debiased version of your dataset.
            </p>
            <div style={s.decoupleRow}>
              <Field label="Method">
                <Select
                  value={method} onChange={setMethod}
                  options={["residualize","fair_pca"]}
                  labels={["Residualize","Fair PCA"]}
                />
              </Field>
              <button
                style={{ ...s.btn, ...s.btnGreen, marginTop:"22px" }}
                onClick={handleDecouple}
                disabled={decoupling}
              >
                {decoupling ? "Processing…" : <> Download Debiased CSV <span style={s.arrow}>↓</span></>}
              </button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ num, title, active, children }) {
  return (
    <div style={{ ...sec.wrap, opacity: active ? 1 : 0.4 }} className="fu">
      <div style={sec.head}>
        <span style={sec.num}>{num}</span>
        <span style={sec.title}>{title}</span>
      </div>
      <div style={sec.body}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={f.wrap}>
      <div style={f.label}>{label}</div>
      {children}
      {hint && <div style={f.hint}>{hint}</div>}
    </div>
  );
}

function Select({ value, onChange, options, labels, placeholder }) {
  return (
    <select style={sel.el} value={value} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o,i) => <option key={o} value={o}>{labels?.[i] || o}</option>)}
    </select>
  );
}

const sec = {
  wrap: {
    background:"var(--panel)", border:"1px solid var(--border)",
    borderRadius:"12px", overflow:"hidden", transition:"opacity 0.3s",
  },
  head: {
    display:"flex", alignItems:"center", gap:"12px",
    padding:"14px 20px", borderBottom:"1px solid var(--border)",
    background:"var(--surface)",
  },
  num: {
    fontFamily:"'Geist Mono',monospace", fontSize:"10px", fontWeight:"700",
    color:"var(--accent)", letterSpacing:"0.1em",
    background:"var(--accent)15", border:"1px solid var(--accent)33",
    padding:"2px 8px", borderRadius:"4px",
  },
  title: { fontSize:"13px", fontWeight:"600", color:"var(--text)", letterSpacing:"-0.01em" },
  body: { padding:"20px" },
};

const f = {
  wrap: { display:"flex", flexDirection:"column", gap:"6px" },
  label: { fontSize:"11px", fontWeight:"600", color:"var(--text2)", letterSpacing:"0.02em" },
  hint: { fontSize:"10px", color:"var(--text3)", lineHeight:"1.5" },
};

const sel = {
  el: {
    background:"var(--surface)", border:"1px solid var(--border2)",
    borderRadius:"7px", color:"var(--text)", padding:"9px 12px",
    fontSize:"12px", fontFamily:"'Geist Mono',monospace", width:"100%",
    cursor:"pointer",
  },
};

const s = {
  page: { display:"flex", flexDirection:"column", gap:"16px" },
  pageHead: { marginBottom:"4px" },
  modeTag: { fontSize:"10px", color:"var(--accent2)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.14em", fontWeight:"600", marginBottom:"8px" },
  desc: { fontSize:"13px", color:"var(--text2)", lineHeight:"1.65", maxWidth:"620px" },
  configRow: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"14px", marginBottom:"16px" },
  btn: {
    display:"inline-flex", alignItems:"center", gap:"8px",
    background:"var(--accent)", color:"white",
    border:"none", borderRadius:"8px",
    padding:"10px 20px", fontSize:"13px", fontWeight:"600",
    letterSpacing:"-0.01em", transition:"opacity 0.15s, transform 0.1s",
  },
  btnLoading: { opacity:0.7 },
  btnGreen: { background:"#16a34a" },
  arrow: { fontSize:"14px" },
  spinner: { display:"inline-block", animation:"spin 1s linear infinite", fontSize:"14px" },
  numInput: {
    background:"var(--surface)", border:"1px solid var(--border2)",
    borderRadius:"7px", color:"var(--text)", padding:"9px 12px",
    fontSize:"12px", fontFamily:"'Geist Mono',monospace", width:"100%",
  },
  error: {
    display:"flex", alignItems:"center", gap:"10px",
    background:"#f8717108", border:"1px solid #f8717133",
    borderRadius:"8px", padding:"12px 16px",
    color:"var(--red)", fontSize:"12px", fontFamily:"'Geist Mono',monospace",
  },
  errorIcon: { fontSize:"14px" },
  colPill: {
    marginTop:"10px", background:"var(--surface)", border:"1px solid var(--border)",
    borderRadius:"8px", padding:"10px 14px", display:"flex", flexDirection:"column", gap:"8px",
  },
  colPillLabel: { fontSize:"10px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.08em" },
  colList: { display:"flex", gap:"4px", flexWrap:"wrap" },
  chip: {
    fontSize:"10px", fontFamily:"'Geist Mono',monospace", color:"var(--text2)",
    background:"var(--panel)", border:"1px solid var(--border)",
    padding:"2px 8px", borderRadius:"4px",
  },
  chipMore: { fontSize:"10px", color:"var(--text3)", fontFamily:"'Geist Mono',monospace", padding:"2px 4px" },
  decoupleDesc: { fontSize:"12px", color:"var(--text2)", marginBottom:"14px", lineHeight:"1.6" },
  decoupleRow: { display:"flex", gap:"16px", alignItems:"flex-start", flexWrap:"wrap" },
};