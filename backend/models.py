"""
SQLAlchemy models for PostgreSQL database
Stores user authentication and metadata
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from database import Base


class User(Base):
    """User model for authentication and profile metadata"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Integration flags
    github_connected = Column(Boolean, default=False)
    github_username = Column(String(100), nullable=True)
    github_access_token = Column(String(255), nullable=True)  # Encrypted in production
    
    # Profile settings
    profile_visibility = Column(String(20), default='public')  # public, private
    
    # Relationships
    ai_summaries = relationship("AISummary", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.username}>"


class UserProfile(Base):
    """User profile information"""
    __tablename__ = "user_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Basic Information
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    gender = Column(String(50), nullable=True)
    ethnicity = Column(String(100), nullable=True)
    
    # Social Links
    linkedin_url = Column(String(500), nullable=True)
    website_url = Column(String(500), nullable=True)
    twitter_url = Column(String(500), nullable=True)
    
    # Structured data stored as JSON
    education = Column(JSON, nullable=True)  # Array of education objects
    experiences = Column(JSON, nullable=True)  # Array of experience objects
    projects = Column(JSON, nullable=True)  # Array of project objects
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="profile")
    
    def __repr__(self):
        return f"<UserProfile for user {self.user_id}>"


class AISummary(Base):
    """AI-generated profile summaries"""
    __tablename__ = "ai_summaries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    headline = Column(Text, nullable=True)
    narrative = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="ai_summaries")
    
    def __repr__(self):
        return f"<AISummary for user {self.user_id}>"
