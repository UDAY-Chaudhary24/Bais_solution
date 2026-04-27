import { useRef, useState } from "react";

export default function FileUpload({ label, accept, onFile, file }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  const handle = f => f && onFile(f);

  return (
    <div
      style={{ ...s.zone, ...(drag ? s.drag : {}), ...(file ? s.filled : {}) }}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => ref.current.click()}
    >
      <input ref={ref} type="file" accept={accept} style={{ display:"none" }} onChange={e => handle(e.target.files[0])} />
      <div style={s.icon}>{file ? "✓" : "↑"}</div>
      <div style={s.filename}>{file ? file.name : label}</div>
      <div style={s.hint}>
        {file ? `${(file.size/1024).toFixed(1)} KB · click to replace` : "Click or drag to upload"}
      </div>
    </div>
  );
}

const s = {
  zone: {
    border:"1px dashed var(--border2)", borderRadius:"10px",
    padding:"28px 20px", display:"flex", flexDirection:"column",
    alignItems:"center", gap:"6px", cursor:"pointer",
    background:"var(--surface)", transition:"all 0.15s",
  },
  drag: { borderColor:"var(--accent)", background:"var(--panel)" },
  filled: { borderStyle:"solid", borderColor:"var(--border2)" },
  icon: { fontSize:"20px", color:"var(--accent2)", fontFamily:"'Geist Mono',monospace" },
  filename: {
    fontSize:"13px", color:"var(--text)", fontWeight:"500",
    fontFamily:"'Geist Mono',monospace", wordBreak:"break-all", textAlign:"center",
  },
  hint: { fontSize:"11px", color:"var(--text3)", marginTop:"2px" },
};