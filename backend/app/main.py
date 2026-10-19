"""
Main FastAPI Application Entrypoint
Configures CORS, rate limiting, request tracing, global error handling,
background lifespan tasks, and router assembly.
"""

import uuid
import time
import logging
from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.jobs.scheduler import scheduler

# Import Routers
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.client import router as client_router
from app.routers.supplier import router as supplier_router
from app.routers.predictions import router as predictions_router
from app.routers.ml import router as ml_router
from app.routers.orders import router as orders_router
from app.routers.rma import router as rma_router
from app.routers.reports import router as reports_router
from app.routers.chat import router as chat_router
from app.routers.notifications import router as notifications_router
from app.routers.extensions import router as extensions_router
from app.routers.analytics import router as analytics_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app.main")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT != "test":
        logger.info("Initializing application services and background scheduler...")
        await scheduler.start()
    yield
    if settings.ENVIRONMENT != "test":
        logger.info("Shutting down background scheduler...")
        await scheduler.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Multi-Tenant Predictive Vendor & Restocking Platform API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# -------------------------------------------------------------
# Middlewares
# -------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def request_tracing_middleware(request: Request, call_next: Callable):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()

    response: Response = await call_next(request)

    process_time = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(process_time)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"

    logger.debug(f"{request.method} {request.url.path} [{response.status_code}] {process_time}ms (req_id: {request_id})")
    return response

# -------------------------------------------------------------
# Global Structured Error Handlers (Section 7 & 11)
# -------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    detail = exc.detail
    if isinstance(detail, dict):
        code = detail.get("code", f"HTTP_{exc.status_code}")
        message = detail.get("message", "An error occurred")
    else:
        code = f"HTTP_{exc.status_code}"
        message = str(detail)

    return JSONResponse(
        status_code=exc.status_code,
        content={"code": code, "message": message, "request_id": req_id}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    err_msgs = [f"{'.'.join(str(l) for l in err['loc'])}: {err['msg']}" for err in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Invalid request parameters or payload constraints",
            "details": err_msgs,
            "request_id": req_id
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(f"Unhandled exception [req_id: {req_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred. Please quote request ID for support.",
            "request_id": req_id
        }
    )

# -------------------------------------------------------------
# Mount Routers under API v1
# -------------------------------------------------------------
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(client_router, prefix="/api/v1")
app.include_router(supplier_router, prefix="/api/v1")
app.include_router(predictions_router, prefix="/api/v1")
app.include_router(ml_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(rma_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(extensions_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
