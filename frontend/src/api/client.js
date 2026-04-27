const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function post(path, formData) {
  const res = await fetch(`${BASE}${path}`, { method:"POST", body:formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function postStream(path, formData) {
  const res = await fetch(`${BASE}${path}`, { method:"POST", body:formData });
  if (!res.ok) throw new Error(res.statusText);
  return res;
}

export async function suggestColumns(datasetFile) {
  const fd = new FormData();
  fd.append("dataset", datasetFile);
  return post("/mode1/suggest", fd);
}

export async function runAnalysis(datasetFile, modelFile, protectedCol, targetCol) {
  const fd = new FormData();
  fd.append("dataset", datasetFile);
  fd.append("model_file", modelFile);
  fd.append("protected_col", protectedCol);
  fd.append("target_col", targetCol);
  return post("/mode1/analyze", fd);
}

export async function getColumns(datasetFile) {
  const fd = new FormData();
  fd.append("dataset", datasetFile);
  return post("/mode2/columns", fd);
}

export async function runAudit(datasetFile, protectedCol, targetCol, threshold=1.0) {
  const fd = new FormData();
  fd.append("dataset", datasetFile);
  fd.append("protected_col", protectedCol);
  fd.append("target_col", targetCol);
  fd.append("threshold", threshold);
  return post("/mode2/audit", fd);
}

export async function runDecouple(datasetFile, protectedCol, targetCol, annotations, clusters, method="residualize") {
  const fd = new FormData();
  fd.append("dataset", datasetFile);
  fd.append("protected_col", protectedCol);
  fd.append("target_col", targetCol);
  fd.append("annotations_json", JSON.stringify(annotations));
  fd.append("clusters_json", JSON.stringify(clusters));
  fd.append("method", method);
  return postStream("/mode2/decouple", fd);
}
