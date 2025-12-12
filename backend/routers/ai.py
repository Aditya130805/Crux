"""
AI router - handles AI-powered profile summarization
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from openai import AsyncOpenAI
import json
from datetime import datetime

from database import get_db, get_redis
from models import User, AISummary
from schemas import AISummaryResponse
from auth_utils import get_current_user
from config import settings

router = APIRouter()

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def collect_user_context(user_id: str, db: Session) -> dict:
    """
    Gather all graph data for AI summarization from PostgreSQL
    """
    from models import UserProfile
    from services.integrations.github_storage import GitHubMetricsStorage
    from config import settings
    from uuid import UUID
    
    # Get user profile data (user_id is a string UUID, need to convert for query)
    try:
        user_uuid = UUID(user_id)
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
    except ValueError:
        profile = None
    
    # Get GitHub repositories
    storage = GitHubMetricsStorage(settings.DATABASE_URL)
    repos = storage.get_user_repositories(user_id)
    
    projects = []
    skills = []
    experience = []
    
    # Extract projects from GitHub repos
    for repo in repos[:10]:  # Limit to top 10
        projects.append({
            "name": repo.get("repo_name", ""),
            "description": repo.get("description", ""),
            "stars": repo.get("stars", 0)
        })
    
    # Extract skills from repos (languages)
    languages = set()
    for repo in repos:
        if repo.get("language"):
            languages.add(repo["language"])
    
    skills = [{"name": lang, "category": "language"} for lang in list(languages)[:20]]
    
    # Extract experience from user profile if available
    if profile and profile.experiences:
        for exp in profile.experiences[:5]:
            if isinstance(exp, dict):
                experience.append({
                    "organization": exp.get("company", ""),
                    "title": exp.get("title", ""),
                    "start_date": exp.get("startDate", ""),
                    "end_date": exp.get("endDate", ""),
                    "current": exp.get("isPresent", False)
                })
    
    return {
        "projects": projects,
        "skills": skills,
        "experience": experience
    }


async def generate_summary(context: dict, username: str) -> dict:
    """
    Generate headline and narrative using GPT-4
    """
    # Build context string
    projects_str = "\n".join([
        f"- {p['name']}: {p.get('description', 'No description')} ({p.get('stars', 0)} stars)"
        for p in context['projects'][:10]  # Limit to top 10
    ])
    
    skills_str = ", ".join([s['name'] for s in context['skills'][:20]])  # Limit to 20
    
    experience_str = "\n".join([
        f"- {e['title']} at {e['organization']} ({e.get('start_date', 'Unknown')} - {e.get('end_date', 'Present')})"
        for e in context['experience'][:5]  # Limit to 5
    ])
    
    prompt = f"""You are analyzing a professional's career graph for {username}. Generate:
1. A concise, compelling headline (10-15 words) capturing their expertise and professional identity
2. A 2-3 sentence narrative that tells their professional story, connecting their skills, projects, and experience

Data:
Projects:
{projects_str if projects_str else "No projects listed"}

Skills:
{skills_str if skills_str else "No skills listed"}

Experience:
{experience_str if experience_str else "No experience listed"}

Requirements:
- Be specific and concrete, not generic
- Focus on what makes them unique
- Connect the dots between their work
- Use active, engaging language
- Avoid clichés like "passionate" or "results-driven"

Format your response as JSON:
{{
  "headline": "...",
  "narrative": "..."
}}
"""
    
    try:
        response = await openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional career analyst who creates compelling, accurate professional summaries."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        summary_data = json.loads(content.strip())
        return summary_data
    
    except Exception as e:
        # Fallback to generic summary
        return {
            "headline": f"Professional with expertise in {', '.join([s['name'] for s in context['skills'][:3]])}",
            "narrative": f"{username} has worked on {len(context['projects'])} projects and has experience in {len(context['skills'])} different technologies."
        }


@router.post("/users/{username}/summarize", response_model=AISummaryResponse)
async def create_ai_summary(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    cache = Depends(get_redis)
):
    """
    Generate AI summary for user's profile
    """
    if current_user.username != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only generate summaries for your own profile"
        )
    
    # Check cache first
    cache_key = f"ai_summary:{current_user.id}"
    if cache:
        cached_summary = await cache.get(cache_key)
        if cached_summary:
            cached_data = json.loads(cached_summary)
            return AISummaryResponse(**cached_data)
    
    # Collect user context from PostgreSQL
    context = await collect_user_context(str(current_user.id), db)
    
    # Check if user has enough data
    if not context["projects"] and not context["skills"] and not context["experience"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough data to generate summary. Please add projects, skills, or experience first."
        )
    
    # Generate summary
    summary_data = await generate_summary(context, username)
    
    # Save to database
    ai_summary = AISummary(
        user_id=current_user.id,
        headline=summary_data["headline"],
        narrative=summary_data["narrative"]
    )
    db.add(ai_summary)
    db.commit()
    db.refresh(ai_summary)
    
    # Cache for 1 hour
    if cache:
        cache_data = {
            "headline": ai_summary.headline,
            "narrative": ai_summary.narrative,
            "generated_at": ai_summary.generated_at.isoformat()
        }
        await cache.setex(cache_key, 3600, json.dumps(cache_data))
    
    return ai_summary


@router.get("/users/{username}/summary", response_model=AISummaryResponse)
async def get_ai_summary(
    username: str,
    db: Session = Depends(get_db)
):
    """
    Get the latest AI summary for a user (public endpoint)
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.profile_visibility == "private":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This profile is private"
        )
    
    # Get latest summary
    summary = db.query(AISummary).filter(
        AISummary.user_id == user.id
    ).order_by(AISummary.generated_at.desc()).first()
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No summary available for this user"
        )
    
    return summary
