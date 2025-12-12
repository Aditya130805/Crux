"""
Integrations router - handles external service integrations (GitHub, etc.)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx
import uuid
import logging
from typing import List
from datetime import datetime, timezone, timedelta

from database import get_db
from models import User
from schemas import GitHubAuthResponse, GitHubCallbackRequest, GitHubSyncResponse
from auth_utils import get_current_user
from config import settings
from services.integrations.github_user_metrics import GitHubUserMetrics
from services.integrations.github_storage import GitHubMetricsStorage
from services.integrations.github_monthly_metrics import GitHubMonthlyMetrics

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/github/authorize", response_model=GitHubAuthResponse)
async def github_authorize(current_user: User = Depends(get_current_user)):
    """
    Get GitHub OAuth authorization URL
    """
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
        f"&scope=read:user,read:org,repo"
        f"&state={str(current_user.id)}"
    )
    
    return GitHubAuthResponse(authorization_url=auth_url)


@router.post("/github/callback")
async def github_callback(
    callback_data: GitHubCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle GitHub OAuth callback - just connect the account, don't sync data yet
    """
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": callback_data.code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI
            },
            headers={"Accept": "application/json"}
        )
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received"
            )
        
        # Get user info
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        
        if user_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch GitHub user info"
            )
        
        github_user = user_response.json()
        github_username = github_user.get("login")
        
        # Update user in PostgreSQL
        current_user.github_connected = True
        current_user.github_username = github_username
        current_user.github_access_token = access_token  # In production, encrypt this
        db.commit()
        
        return {"success": True, "username": github_username}


@router.post("/github/sync", response_model=GitHubSyncResponse)
async def sync_github(
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger GitHub repository sync
    """
    if not current_user.github_connected or not current_user.github_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub not connected. Please authorize first."
        )
    
    return await sync_github_repos(
        current_user,
        current_user.github_access_token,
        current_user.github_username
    )


@router.get("/github/repositories")
async def get_github_repositories(
    owner: str = None,
    current_user: User = Depends(get_current_user)
):
    """Get all GitHub repositories with optional owner filter"""
    if not current_user.github_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub not connected"
        )
    
    storage = GitHubMetricsStorage(settings.DATABASE_URL)
    repos = storage.get_user_repositories(str(current_user.id), owner_filter=owner)
    return {"repositories": repos}


@router.get("/github/{username}/repositories")
async def get_github_repositories_public(
    username: str,
    owner: str = None,
    db: Session = Depends(get_db)
):
    """Get all GitHub repositories for a user (public endpoint)"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.github_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub not connected for this user"
        )
    
    storage = GitHubMetricsStorage(settings.DATABASE_URL)
    repos = storage.get_user_repositories(str(user.id), owner_filter=owner)
    return {"repositories": repos}


@router.get("/github/analytics/monthly")
async def get_monthly_analytics(
    repo_ids: str = None,  # Comma-separated repo IDs
    start_year: int = None,
    start_month: int = None,
    aggregate: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Get monthly GitHub analytics
    
    Query params:
    - repo_ids: Comma-separated list of repo IDs to filter (optional)
    - start_year: Starting year for time range (optional)
    - start_month: Starting month for time range (optional)
    - aggregate: If true, returns cumulative stats across repos (default: false)
    """
    if not current_user.github_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub not connected"
        )
    
    storage = GitHubMetricsStorage(settings.DATABASE_URL)
    
    # Parse repo_ids if provided
    repo_id_list = None
    if repo_ids:
        try:
            repo_id_list = [int(id.strip()) for id in repo_ids.split(',')]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid repo_ids format"
            )
    
    if aggregate:
        metrics = storage.get_aggregated_monthly_metrics(
            str(current_user.id),
            repo_ids=repo_id_list,
            start_year=start_year,
            start_month=start_month
        )
    else:
        metrics = storage.get_monthly_metrics(
            str(current_user.id),
            repo_ids=repo_id_list,
            start_year=start_year,
            start_month=start_month
        )
    
    return {"metrics": metrics}


@router.get("/github/{username}/analytics/monthly")
async def get_monthly_analytics_public(
    username: str,
    repo_ids: str = None,  # Comma-separated repo IDs
    start_year: int = None,
    start_month: int = None,
    aggregate: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get monthly GitHub analytics for a user (public endpoint)
    
    Query params:
    - repo_ids: Comma-separated list of repo IDs to filter (optional)
    - start_year: Starting year for time range (optional)
    - start_month: Starting month for time range (optional)
    - aggregate: If true, returns cumulative stats across repos (default: false)
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.github_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub not connected for this user"
        )
    
    storage = GitHubMetricsStorage(settings.DATABASE_URL)
    
    # Parse repo_ids if provided
    repo_id_list = None
    if repo_ids:
        try:
            repo_id_list = [int(id.strip()) for id in repo_ids.split(',')]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid repo_ids format"
            )
    
    if aggregate:
        metrics = storage.get_aggregated_monthly_metrics(
            str(user.id),
            repo_ids=repo_id_list,
            start_year=start_year,
            start_month=start_month
        )
    else:
        metrics = storage.get_monthly_metrics(
            str(user.id),
            repo_ids=repo_id_list,
            start_year=start_year,
            start_month=start_month
        )
    
    return {"metrics": metrics}


@router.post("/github/disconnect")
async def github_disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect GitHub integration and optionally remove data
    """
    if not current_user.github_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub is not connected"
        )
    
    # Clear GitHub credentials from PostgreSQL
    current_user.github_connected = False
    current_user.github_username = None
    current_user.github_access_token = None
    db.commit()
    
    return {"success": True, "message": "GitHub disconnected successfully"}


async def sync_github_repos(user: User, access_token: str, github_username: str) -> GitHubSyncResponse:
    """
    Fetch and import comprehensive GitHub data for the user:
    - Repositories (owned and contributed to)
    - Contribution stats (commits, PRs, issues)
    - Organizations and membership dates
    - Starred repositories
    - Followers/Following
    - Account milestones
    """
    async with httpx.AsyncClient() as client:
        # Fetch user's repositories
        repos_response = await client.get(
            "https://api.github.com/user/repos",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={
                "per_page": 100, 
                "sort": "updated",
                "affiliation": "owner,collaborator"  # Only repos user owns or is a collaborator on
            }
        )
        
        if repos_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch repositories"
            )
        
        repos = repos_response.json()
        
        # Filter to only repos where user has actually contributed
        # Include: owned repos, org repos with push access, and repos with commits
        filtered_repos = []
        for repo in repos:
            owner_login = repo['owner']['login']
            permissions = repo.get('permissions', {})
            
            # Include if:
            # 1. User owns it
            # 2. User has push access (collaborator or org member with write)
            # 3. It's an org repo and user has admin/push permissions
            if (owner_login == github_username or 
                permissions.get('push', False) or 
                permissions.get('admin', False)):
                filtered_repos.append(repo)
        
        repos = filtered_repos
        
        projects_added = 0
        skills_set = set()
        
        # Initialize PostgreSQL storage
        storage = GitHubMetricsStorage(settings.DATABASE_URL)
        
        for repo in repos:
            # Skip forks unless they have significant stars
            if repo.get("fork") and repo.get("stargazers_count", 0) < 10:
                continue
            
            # Store in PostgreSQL
            storage.store_repository(str(user.id), repo)
            
            projects_added += 1
            
            # Infer skills from language
            if repo.get("language"):
                language = repo["language"]
                skills_set.add(language)
                
                # Store skill in PostgreSQL
                storage.store_skill(str(user.id), language, 'language')
            
            # Infer skills from topics
            if repo.get("topics"):
                for topic in repo["topics"][:5]:  # Limit to 5 topics
                    skills_set.add(topic)
                    
                    # Store skill in PostgreSQL
                    storage.store_skill(str(user.id), topic, 'technology')
        
        # ===== FETCH COMPREHENSIVE USER METRICS =====
        
        # 1. Get user's GitHub profile details
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        github_profile = user_response.json() if user_response.status_code == 200 else {}
        
        # 2. Get user's organizations and join dates
        orgs_response = await client.get(
            "https://api.github.com/user/orgs",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        orgs = orgs_response.json() if orgs_response.status_code == 200 else []
        
        # Store organizations in PostgreSQL
        for org in orgs:
            storage.store_organization(str(user.id), org)
        
        # 3. Get contribution stats from user events
        events_response = await client.get(
            f"https://api.github.com/users/{user.github_username}/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={"per_page": 100}
        )
        events = events_response.json() if events_response.status_code == 200 else []
        
        # Count contribution types
        contribution_stats = {
            "commits": 0,
            "pull_requests": 0,
            "issues": 0,
            "reviews": 0
        }
        
        for event in events:
            event_type = event.get("type")
            if event_type == "PushEvent":
                contribution_stats["commits"] += len(event.get("payload", {}).get("commits", []))
            elif event_type == "PullRequestEvent":
                contribution_stats["pull_requests"] += 1
            elif event_type == "IssuesEvent":
                contribution_stats["issues"] += 1
            elif event_type == "PullRequestReviewEvent":
                contribution_stats["reviews"] += 1
        
        # 4. Get starred repositories (popular ones)
        starred_response = await client.get(
            "https://api.github.com/user/starred",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={"per_page": 50, "sort": "created"}
        )
        starred_repos = starred_response.json() if starred_response.status_code == 200 else []
        
        # Store starred repositories in PostgreSQL
        for starred_repo in starred_repos:
            if starred_repo.get("stargazers_count", 0) > 1000:
                storage.store_starred_repo(str(user.id), starred_repo)
        
        # Store user profile in PostgreSQL
        storage.store_user_profile(str(user.id), github_username, github_profile)
        
        # 6. Fetch user-specific contribution metrics for each repo
        try:
            metrics_service = GitHubUserMetrics(access_token, github_username)
            monthly_metrics_service = GitHubMonthlyMetrics(access_token, github_username)
            storage = GitHubMetricsStorage(settings.DATABASE_URL)
            since_date = datetime.now(timezone.utc) - timedelta(days=365)  # Last year
            
            # Fetch current snapshot metrics for all user's repos
            user_metrics = await metrics_service.fetch_all_user_repos_metrics(repos, since_date)
            
            # Fetch monthly historical metrics for all repos (last 12 months)
            logger.info("Fetching monthly metrics for all repositories...")
            monthly_metrics = await monthly_metrics_service.fetch_all_repos_monthly_metrics(repos, months_back=12)
            
            # Store metrics in PostgreSQL
            for repo_name, metrics in user_metrics.items():
                # Find repo_id from repos list
                repo_data = next((r for r in repos if r['full_name'] == repo_name), None)
                if not repo_data:
                    continue
                
                repo_id = repo_data['id']
                repo_short_name = repo_name.split('/')[-1]
                
                # Store in PostgreSQL (repo already stored above, just store metrics)
                storage.store_user_metrics(str(user.id), repo_id, metrics)
            
            # Store monthly metrics in PostgreSQL
            logger.info("Storing monthly metrics...")
            for repo_name, months_data in monthly_metrics.items():
                repo_data = next((r for r in repos if r['full_name'] == repo_name), None)
                if not repo_data:
                    continue
                
                repo_id = repo_data['id']
                for month_key, month_metrics in months_data.items():
                    year = month_metrics['year']
                    month = month_metrics['month']
                    storage.store_monthly_metrics(str(user.id), repo_id, year, month, month_metrics)
            
            logger.info("✅ Monthly metrics stored successfully")
        except Exception as e:
            # Don't fail if metrics fetch fails
            print(f"Warning: Failed to fetch user-specific metrics: {e}")
        
        return GitHubSyncResponse(
            success=True,
            projects_added=projects_added,
            skills_inferred=list(skills_set),
            message=f"Successfully imported {projects_added} repositories, {len(orgs)} organizations, and user-specific contribution metrics"
        )
