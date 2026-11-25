from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import init_db

# Import API Routers
from backend.app.api.auth import router as auth_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.customers import router as customers_router
from backend.app.api.invoices import router as invoices_router
from backend.app.api.payments import router as payments_router
from backend.app.api.recovery import router as recovery_router
from backend.app.api.promises import router as promises_router
from backend.app.api.tasks import router as tasks_router
from backend.app.api.disputes import router as disputes_router
from backend.app.api.communications import router as communications_router
from backend.app.api.chatbot import router as chatbot_router
from backend.app.api.import_export import router as import_export_router
from backend.app.api.settings import router as settings_router

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise AI-Powered B2B Payment Recovery SaaS Platform for Wholesalers, Distributors & Manufacturers."
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Application Startup Event
@app.on_event("startup")
def on_startup():
    init_db()

# Mount API Routers under /api
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(customers_router, prefix=settings.API_PREFIX)
app.include_router(invoices_router, prefix=settings.API_PREFIX)
app.include_router(payments_router, prefix=settings.API_PREFIX)
app.include_router(recovery_router, prefix=settings.API_PREFIX)
app.include_router(promises_router, prefix=settings.API_PREFIX)
app.include_router(tasks_router, prefix=settings.API_PREFIX)
app.include_router(disputes_router, prefix=settings.API_PREFIX)
app.include_router(communications_router, prefix=settings.API_PREFIX)
app.include_router(chatbot_router, prefix=settings.API_PREFIX)
app.include_router(import_export_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "hybrid_production_demo_ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
