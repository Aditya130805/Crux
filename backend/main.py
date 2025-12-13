"""
Crux Backend - FastAPI Application
Main entry point for the professional graph platform API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from routers import auth, users, graph, integrations, ai
from database import init_databases, close_databases
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for database connections"""
    logger.info("Starting Crux API...")
    await init_databases()
    yield
    logger.info("Shutting down Crux API...")
    await close_databases()


# Initialize FastAPI app
app = FastAPI(
    title="Crux API",
    description="Professional Graph Platform - Transform your career into an interactive knowledge graph",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
# Parse comma-separated CORS origins from environment variable
cors_origins = [
    origin.strip() 
    for origin in settings.CORS_ORIGINS.split(",") 
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(graph.router, prefix="/api", tags=["Graph"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"])
app.include_router(ai.router, prefix="/api", tags=["AI"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Crux API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
