"""
Database connection management for PostgreSQL
"""

import logging
from typing import Optional
from contextlib import asynccontextmanager

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from sqlalchemy import event
import redis.asyncio as redis

from config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy setup for PostgreSQL
# Isolation level: READ COMMITTED (default for PostgreSQL)
# This prevents dirty reads while allowing non-repeatable reads and phantom reads
# Suitable for most web applications where consistency is important but strict isolation isn't required
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    isolation_level="READ COMMITTED"  # Explicit isolation level
)

# Set isolation level for all connections
@event.listens_for(engine, "connect")
def set_isolation_level(dbapi_conn, connection_record):
    """Set isolation level for each new connection"""
    # READ COMMITTED: Prevents dirty reads, allows non-repeatable reads
    # This is the default for PostgreSQL and suitable for concurrent access
    with dbapi_conn.cursor() as cursor:
        cursor.execute("SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Redis client
redis_client: Optional[redis.Redis] = None


async def init_databases():
    """Initialize database connections"""
    global redis_client
    
    # Initialize Redis
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Continuing without cache.")
        redis_client = None
    
    # Create PostgreSQL tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL tables created/verified")
    except Exception as e:
        logger.error(f"Failed to create PostgreSQL tables: {e}")
        raise


async def close_databases():
    """Close database connections"""
    global redis_client
    
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


def get_db() -> Session:
    """
    Dependency for getting PostgreSQL database session with transaction management
    Uses READ COMMITTED isolation level (default for PostgreSQL)
    
    Transaction behavior:
    - Each request gets a new session
    - Changes are committed at the end of the request (or rolled back on error)
    - Isolation level: READ COMMITTED prevents dirty reads while allowing concurrent access
    
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        # Start transaction (implicit with autocommit=False)
        yield db
        # Commit transaction if no exceptions occurred
        db.commit()
    except Exception:
        # Rollback on any exception
        db.rollback()
        raise
    finally:
        db.close()


async def get_redis():
    """
    Dependency for getting Redis client
    Usage: cache = Depends(get_redis)
    """
    if not redis_client:
        return None
    return redis_client
