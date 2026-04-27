"""
modes/mode3.py
Full Pipeline — deferred. Stub for MVP.
Combines Mode 1 (post-training) + Mode 2 (pre-training) into one flow.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/status")
async def mode3_status():
    return JSONResponse({
        "status": "deferred",
        "message": "Mode 3 (Full Pipeline) is planned for post-MVP. "
                   "Use Mode 1 for post-training analysis and Mode 2 for pre-training audit.",
    })