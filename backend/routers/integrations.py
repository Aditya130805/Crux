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

from database import get_db, get_neo4j_session
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
    current_user: User = Depends(get_current_user),
    neo4j_session = Depends(get_neo4j_session)
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
        neo4j_session,
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
    db: Session = Depends(get_db),
    neo4j_session = Depends(get_neo4j_session)
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
    
    # Optionally: Remove GitHub-sourced data from Neo4j
    # (Uncomment if you want to delete all GitHub data on disconnect)
    # query = """
    # MATCH (u:User {id: $user_id})-[:CREATED]->(p:Project {source: 'github'})
    # DETACH DELETE p
    # """
    # await neo4j_session.run(query, user_id=str(current_user.id))
    
    return {"success": True, "message": "GitHub disconnected successfully"}


async def sync_github_repos(user: User, access_token: str, neo4j_session, github_username: str) -> GitHubSyncResponse:
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
        
        # Get GitHub user profile for comprehensive metrics
        user_query = """
        MERGE (u:User {id: $user_id})
        ON CREATE SET 
            u.username = $username,
            u.email = $email,
            u.created_at = datetime()
        """
        await neo4j_session.run(
            user_query,
            user_id=str(user.id),
            username=user.username,
            email=user.email
        )
        
        projects_added = 0
        skills_set = set()
        
        # Initialize PostgreSQL storage
        storage = GitHubMetricsStorage(settings.DATABASE_URL)
        
        for repo in repos:
            # Skip forks unless they have significant stars
            if repo.get("fork") and repo.get("stargazers_count", 0) < 10:
                continue
            
            project_id = str(uuid.uuid4())
            
            # Create project node with comprehensive metrics
            project_query = """
            MATCH (u:User {id: $user_id})
            MERGE (p:Project {url: $url})
            ON CREATE SET 
                p.id = $project_id,
                p.name = $name,
                p.description = $description,
                p.source = 'github',
                p.stars = $stars,
                p.forks = $forks,
                p.watchers = $watchers,
                p.open_issues = $open_issues,
                p.language = $language,
                p.size = $size,
                p.is_private = $is_private,
                p.is_fork = $is_fork,
                p.default_branch = $default_branch,
                p.license = $license,
                p.homepage = $homepage,
                p.created_at = datetime($created_at),
                p.updated_at = datetime($updated_at),
                p.pushed_at = datetime($pushed_at)
            MERGE (u)-[:CREATED {date: datetime($created_at)}]->(p)
            """
            
            await neo4j_session.run(
                project_query,
                user_id=str(user.id),
                project_id=project_id,
                url=repo["html_url"],
                name=repo["name"],
                description=repo.get("description", ""),
                stars=repo.get("stargazers_count", 0),
                forks=repo.get("forks_count", 0),
                watchers=repo.get("watchers_count", 0),
                open_issues=repo.get("open_issues_count", 0),
                language=repo.get("language", ""),
                size=repo.get("size", 0),
                is_private=repo.get("private", False),
                is_fork=repo.get("fork", False),
                default_branch=repo.get("default_branch", "main"),
                license=repo.get("license", {}).get("name", "") if repo.get("license") else "",
                homepage=repo.get("homepage", ""),
                created_at=repo.get("created_at"),
                updated_at=repo.get("updated_at"),
                pushed_at=repo.get("pushed_at")
            )
            
            # Store in PostgreSQL
            storage.store_repository(str(user.id), repo)
            
            projects_added += 1
            
            # Infer skills from language
            if repo.get("language"):
                language = repo["language"]
                skills_set.add(language)
                
                # Store skill in PostgreSQL
                storage.store_skill(str(user.id), language, 'language')
                
                skill_query = """
                MATCH (p:Project {id: $project_id})
                MATCH (u:User {id: $user_id})
                MERGE (s:Skill {name: $skill_name})
                ON CREATE SET 
                    s.id = $skill_id,
                    s.category = 'language'
                MERGE (p)-[:USES {confidence: 0.9}]->(s)
                MERGE (u)-[:HAS_SKILL]->(s)
                """
                
                await neo4j_session.run(
                    skill_query,
                    project_id=project_id,
                    user_id=str(user.id),
                    skill_name=language,
                    skill_id=str(uuid.uuid4())
                )
            
            # Infer skills from topics
            if repo.get("topics"):
                for topic in repo["topics"][:5]:  # Limit to 5 topics
                    skills_set.add(topic)
                    
                    # Store skill in PostgreSQL
                    storage.store_skill(str(user.id), topic, 'technology')
                    
                    topic_query = """
                    MATCH (p:Project {id: $project_id})
                    MATCH (u:User {id: $user_id})
                    MERGE (s:Skill {name: $skill_name})
                    ON CREATE SET 
                        s.id = $skill_id,
                        s.category = 'technology'
                    MERGE (p)-[:USES {confidence: 0.8}]->(s)
                    MERGE (u)-[:HAS_SKILL]->(s)
                    """
                    
                    await neo4j_session.run(
                        topic_query,
                        project_id=project_id,
                        user_id=str(user.id),
                        skill_name=topic,
                        skill_id=str(uuid.uuid4())
                    )
        
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
        
        # Create organization nodes and relationships
        for org in orgs:
            # Store in PostgreSQL
            storage.store_organization(str(user.id), org)
            
            org_query = """
            MATCH (u:User {id: $user_id})
            MERGE (o:Organization {login: $org_login})
            ON CREATE SET 
                o.id = $org_id,
                o.name = $org_name,
                o.description = $org_description,
                o.url = $org_url
            MERGE (u)-[r:MEMBER_OF]->(o)
            ON CREATE SET r.joined_at = datetime()
            """
            
            await neo4j_session.run(
                org_query,
                user_id=str(user.id),
                org_id=str(uuid.uuid4()),
                org_login=org.get("login"),
                org_name=org.get("name", org.get("login")),
                org_description=org.get("description", ""),
                org_url=org.get("html_url")
            )
        
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
        
        # Create STARRED relationships for notable repos (>1000 stars)
        for starred_repo in starred_repos:
            if starred_repo.get("stargazers_count", 0) > 1000:
                # Store in PostgreSQL
                storage.store_starred_repo(str(user.id), starred_repo)
                
                starred_query = """
                MATCH (u:User {id: $user_id})
                MERGE (p:Project {url: $url})
                ON CREATE SET 
                    p.id = $project_id,
                    p.name = $name,
                    p.description = $description,
                    p.stars = $stars,
                    p.source = 'github_starred'
                MERGE (u)-[r:STARRED]->(p)
                ON CREATE SET r.starred_at = datetime()
                """
                
                await neo4j_session.run(
                    starred_query,
                    user_id=str(user.id),
                    project_id=str(uuid.uuid4()),
                    url=starred_repo["html_url"],
                    name=starred_repo["name"],
                    description=starred_repo.get("description", ""),
                    stars=starred_repo.get("stargazers_count", 0)
                )
        
        # 5. Store user metrics on the user node
        # Store profile in PostgreSQL
        storage.store_user_profile(str(user.id), github_username, github_profile)
        
        metrics_query = """
        MATCH (u:User {id: $user_id})
        SET 
            u.github_followers = $followers,
            u.github_following = $following,
            u.github_public_repos = $public_repos,
            u.github_public_gists = $public_gists,
            u.github_created_at = datetime($created_at),
            u.github_bio = $bio,
            u.github_company = $company,
            u.github_location = $location,
            u.github_blog = $blog,
            u.recent_commits = $commits,
            u.recent_prs = $prs,
            u.recent_issues = $issues,
            u.recent_reviews = $reviews,
            u.last_synced = datetime()
        """
        
        await neo4j_session.run(
            metrics_query,
            user_id=str(user.id),
            followers=github_profile.get("followers", 0),
            following=github_profile.get("following", 0),
            public_repos=github_profile.get("public_repos", 0),
            public_gists=github_profile.get("public_gists", 0),
            created_at=github_profile.get("created_at"),
            bio=github_profile.get("bio", ""),
            company=github_profile.get("company", ""),
            location=github_profile.get("location", ""),
            blog=github_profile.get("blog", ""),
            commits=contribution_stats["commits"],
            prs=contribution_stats["pull_requests"],
            issues=contribution_stats["issues"],
            reviews=contribution_stats["reviews"]
        )
        
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
            
            # Store metrics in both Neo4j and PostgreSQL
            for repo_name, metrics in user_metrics.items():
                # Find repo_id from repos list
                repo_data = next((r for r in repos if r['full_name'] == repo_name), None)
                if not repo_data:
                    continue
                
                repo_id = repo_data['id']
                repo_short_name = repo_name.split('/')[-1]
                
                # Store in PostgreSQL (repo already stored above, just store metrics)
                storage.store_user_metrics(str(user.id), repo_id, metrics)
                
                # Store in Neo4j
                update_metrics_query = """
                MATCH (p:Project {name: $repo_name})
                WHERE p.source = 'github'
                SET 
                    p.user_commits = $commits,
                    p.user_additions = $additions,
                    p.user_deletions = $deletions,
                    p.user_prs_opened = $prs_opened,
                    p.user_prs_merged = $prs_merged,
                    p.user_issues_opened = $issues_opened,
                    p.user_reviews_given = $reviews_given
                """
                
                await neo4j_session.run(
                    update_metrics_query,
                    repo_name=repo_short_name,
                    commits=metrics.get('commits', 0),
                    additions=metrics.get('additions', 0),
                    deletions=metrics.get('deletions', 0),
                    prs_opened=metrics.get('prs_opened', 0),
                    prs_merged=metrics.get('prs_merged', 0),
                    issues_opened=metrics.get('issues_opened', 0),
                    reviews_given=metrics.get('reviews_given', 0)
                )
            
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
