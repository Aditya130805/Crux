"""
Graph router - handles graph data operations
Note: Graph visualization feature coming soon - currently returns empty graph data
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import GraphData
from auth_utils import get_current_user

router = APIRouter()


@router.get("/users/{username}/graph", response_model=GraphData)
async def get_user_graph(
    username: str,
    db: Session = Depends(get_db)
):
    """
    Get complete graph data for a user (public endpoint)
    Note: Graph visualization feature coming soon - currently returns empty graph data
    """
    # Get user from PostgreSQL
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
    
    # Graph visualization feature coming soon
    # For now, return empty graph data
    return GraphData(nodes=[], edges=[])


# Graph creation endpoints removed - graph functionality simplified
# Projects, skills, and experience are now managed through user profiles
