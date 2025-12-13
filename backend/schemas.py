"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# ============= Authentication Schemas =============

class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    username: str = Field(..., min_length=3, max_length=50)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


class TokenData(BaseModel):
    user_id: Optional[str] = None


# ============= User Schemas =============

class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    github_connected: bool
    github_username: Optional[str] = None
    profile_visibility: str


class UserUpdate(BaseModel):
    profile_visibility: Optional[str] = None


# ============= Graph Node Schemas =============

class NodeBase(BaseModel):
    type: str  # User, Project, Skill, Organization, Education
    data: Dict[str, Any]


class NodeCreate(NodeBase):
    pass


class NodeResponse(NodeBase):
    id: str


class EdgeBase(BaseModel):
    source_id: str
    target_id: str
    relationship: str  # CREATED, USES, WORKED_AT, etc.
    metadata: Optional[Dict[str, Any]] = None


class EdgeCreate(EdgeBase):
    pass


class EdgeResponse(EdgeBase):
    id: str


class GraphData(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


# ============= Project Schemas =============

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    url: Optional[str] = None
    source: str = "manual"  # manual or github
    stars: Optional[int] = None
    technologies: Optional[List[str]] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    url: Optional[str]
    source: str
    created_at: Optional[str]
    stars: Optional[int]


# ============= Skill Schemas =============

class SkillCreate(BaseModel):
    name: str
    category: str  # language, framework, tool, domain
    proficiency: Optional[str] = "intermediate"  # beginner, intermediate, expert


class SkillResponse(BaseModel):
    id: str
    name: str
    category: str
    proficiency: str


# ============= Organization/Experience Schemas =============

class ExperienceCreate(BaseModel):
    organization_name: str
    organization_type: str = "company"  # company, university, nonprofit
    title: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    current: bool = False
    description: Optional[str] = None


class ExperienceResponse(BaseModel):
    id: str
    organization_name: str
    title: str
    start_date: str
    end_date: Optional[str]
    current: bool


# ============= Education Schemas =============

class EducationCreate(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    location: Optional[str] = None


class EducationResponse(BaseModel):
    id: str
    institution: str
    degree: str
    start_date: str
    end_date: Optional[str]


# ============= AI Summary Schemas =============

class AISummaryResponse(BaseModel):
    headline: str
    narrative: str
    generated_at: datetime


class ProfileResponse(BaseModel):
    user: UserResponse
    graph: GraphData
    summary: Optional[AISummaryResponse] = None


# ============= GitHub Integration Schemas =============

class GitHubAuthResponse(BaseModel):
    authorization_url: str


class GitHubCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None
    frontend_url: Optional[str] = None  # Frontend URL used in authorize request


class GitHubSyncResponse(BaseModel):
    success: bool
    projects_added: int
    skills_inferred: List[str]
    message: str


# ============= User Profile Schemas =============

class EducationItem(BaseModel):
    university: str
    degreeLevel: str
    major: str
    gpa: Optional[str] = None
    description: Optional[str] = None
    startDate: str
    endDate: str


class ExperienceItem(BaseModel):
    title: str
    company: str
    description: Optional[str] = None
    startDate: str
    endDate: str
    isPresent: Optional[bool] = False


class ProjectItem(BaseModel):
    name: str
    description: Optional[str] = None
    url: Optional[str] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    twitter_url: Optional[str] = None
    education: Optional[List[EducationItem]] = None
    experiences: Optional[List[ExperienceItem]] = None
    projects: Optional[List[ProjectItem]] = None


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    twitter_url: Optional[str] = None
    education: Optional[List[Dict[str, Any]]] = None
    experiences: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
