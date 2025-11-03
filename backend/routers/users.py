"""
Users router - handles user profile management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserProfile
from schemas import UserResponse, UserUpdate, UserProfileUpdate, UserProfileResponse
from auth_utils import get_current_user

router = APIRouter()


@router.get("/{username}", response_model=UserResponse)
async def get_user_by_username(username: str, db: Session = Depends(get_db)):
    """
    Get user profile by username (public endpoint)
    """
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if profile is private
    if user.profile_visibility == "private":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This profile is private"
        )
    
    return user


@router.patch("/{username}", response_model=UserResponse)
async def update_user(
    username: str,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile settings (authenticated)
    """
    # Check if user is updating their own profile
    if current_user.username != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    
    # Update fields
    if user_update.profile_visibility is not None:
        if user_update.profile_visibility not in ["public", "private"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid profile visibility value"
            )
        current_user.profile_visibility = user_update.profile_visibility
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/{username}/profile", response_model=UserProfileResponse)
async def get_user_profile(username: str, db: Session = Depends(get_db)):
    """
    Get user profile information (public endpoint)
    """
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return profile


@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create or update user profile information (authenticated)
    """
    # Check if profile exists
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create new profile
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    
    # Update fields
    update_data = profile_data.model_dump(exclude_unset=True)
    
    # Convert Pydantic models to dicts for JSON fields
    if 'education' in update_data and update_data['education'] is not None:
        update_data['education'] = [edu.model_dump() if hasattr(edu, 'model_dump') else edu for edu in update_data['education']]
    
    if 'experiences' in update_data and update_data['experiences'] is not None:
        update_data['experiences'] = [exp.model_dump() if hasattr(exp, 'model_dump') else exp for exp in update_data['experiences']]
    
    if 'projects' in update_data and update_data['projects'] is not None:
        update_data['projects'] = [proj.model_dump() if hasattr(proj, 'model_dump') else proj for proj in update_data['projects']]
    
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    return profile
