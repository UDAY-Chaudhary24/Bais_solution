from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from modes import mode1, mode2, mode3

app = FastAPI(
    title="AI Bias Detection Tool",
    description="Detect and mitigate bias in ML datasets and trained models.",
    version="1.0.0",
)

# ✅ CORS middleware BEFORE routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mode1.router, prefix="/mode1", tags=["Mode 1 — Post-Training"])
app.include_router(mode2.router, prefix="/mode2", tags=["Mode 2 — Pre-Training"])
app.include_router(mode3.router, prefix="/mode3", tags=["Mode 3 — Full Pipeline (stub)"])

@app.head("/health")
async def health_head():
    return Response(status_code=200)

@app.get("/health")
async def health():
    return {"status": "ok"}
