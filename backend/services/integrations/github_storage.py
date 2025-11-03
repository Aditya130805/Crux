"""
GitHub Metrics Storage
Stores user-specific GitHub metrics in PostgreSQL
"""

import psycopg2
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class GitHubMetricsStorage:
    """Store GitHub metrics in PostgreSQL"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.init_tables()
    
    def init_tables(self):
        """Initialize GitHub data tables"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    # Repositories table - comprehensive repo data
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS github_repositories (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL,
                            repo_id BIGINT NOT NULL,
                            repo_name VARCHAR(255) NOT NULL,
                            repo_full_name VARCHAR(255) NOT NULL,
                            description TEXT,
                            url VARCHAR(500),
                            homepage VARCHAR(500),
                            language VARCHAR(100),
                            stars INT DEFAULT 0,
                            forks INT DEFAULT 0,
                            watchers INT DEFAULT 0,
                            open_issues INT DEFAULT 0,
                            size INT DEFAULT 0,
                            is_private BOOLEAN DEFAULT FALSE,
                            is_fork BOOLEAN DEFAULT FALSE,
                            default_branch VARCHAR(100),
                            license VARCHAR(100),
                            created_at TIMESTAMPTZ,
                            updated_at TIMESTAMPTZ,
                            pushed_at TIMESTAMPTZ,
                            last_synced_at TIMESTAMPTZ DEFAULT NOW(),
                            UNIQUE(user_id, repo_id)
                        )
                    ''')
                    
                    # User contribution metrics per repo (daily snapshots)
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS github_user_repo_metrics (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL,
                            repo_id BIGINT NOT NULL,
                            metric_date DATE NOT NULL,
                            commits INT DEFAULT 0,
                            additions INT DEFAULT 0,
                            deletions INT DEFAULT 0,
                            prs_opened INT DEFAULT 0,
                            prs_merged INT DEFAULT 0,
                            prs_closed INT DEFAULT 0,
                            issues_opened INT DEFAULT 0,
                            issues_closed INT DEFAULT 0,
                            reviews_given INT DEFAULT 0,
                            UNIQUE(user_id, repo_id, metric_date)
                        )
                    ''')
                    
                    # Monthly aggregated metrics per repo
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS github_monthly_metrics (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL,
                            repo_id BIGINT NOT NULL,
                            year INT NOT NULL,
                            month INT NOT NULL,
                            commits INT DEFAULT 0,
                            additions INT DEFAULT 0,
                            deletions INT DEFAULT 0,
                            prs_opened INT DEFAULT 0,
                            prs_merged INT DEFAULT 0,
                            prs_closed INT DEFAULT 0,
                            issues_opened INT DEFAULT 0,
                            issues_closed INT DEFAULT 0,
                            reviews_given INT DEFAULT 0,
                            created_at TIMESTAMPTZ DEFAULT NOW(),
                            UNIQUE(user_id, repo_id, year, month)
                        )
                    ''')
                    
                    # Organizations
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS github_organizations (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL,
                            org_id BIGINT NOT NULL,
                            org_login VARCHAR(255) NOT NULL,
                            org_name VARCHAR(255),
                            description TEXT,
                            url VARCHAR(500),
                            joined_at TIMESTAMPTZ DEFAULT NOW(),
                            UNIQUE(user_id, org_id)
                        )
                    ''')
                    
                    # Starred repositories
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS github_starred_repos (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL,
                            repo_id BIGINT NOT NULL,
                            repo_name VARCHAR(255) NOT NULL,
                            repo_full_name VARCHAR(255) NOT NULL,
                            description TEXT,
                            url VARCHAR(500),
                            stars INT DEFAULT 0,
                            starred_at TIMESTAMPTZ DEFAULT NOW(),
                            UNIQUE(user_id, repo_id)
                        )
                    ''')
                    
                    # User profile data
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS github_user_profiles (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL UNIQUE,
                            github_username VARCHAR(255) NOT NULL,
                            followers INT DEFAULT 0,
                            following INT DEFAULT 0,
                            public_repos INT DEFAULT 0,
                            public_gists INT DEFAULT 0,
                            bio TEXT,
                            company VARCHAR(255),
                            location VARCHAR(255),
                            blog VARCHAR(500),
                            github_created_at TIMESTAMPTZ,
                            last_synced_at TIMESTAMPTZ DEFAULT NOW()
                        )
                    ''')
                    
                    # Skills/Technologies
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS github_user_skills (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL,
                            skill_name VARCHAR(100) NOT NULL,
                            skill_type VARCHAR(50),
                            repo_count INT DEFAULT 1,
                            last_used_at TIMESTAMPTZ DEFAULT NOW(),
                            UNIQUE(user_id, skill_name)
                        )
                    ''')
                    
                    conn.commit()
                    logger.info("✅ GitHub data tables initialized")
        except Exception as e:
            logger.error(f"❌ Error initializing GitHub data tables: {e}")
            raise
    
    def store_repository(self, user_id: str, repo_data: Dict[str, Any]):
        """Store comprehensive repository data"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO github_repositories (
                            user_id, repo_id, repo_name, repo_full_name, description, url, homepage,
                            language, stars, forks, watchers, open_issues, size, is_private, is_fork,
                            default_branch, license, created_at, updated_at, pushed_at, last_synced_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (user_id, repo_id) 
                        DO UPDATE SET 
                            repo_name = EXCLUDED.repo_name,
                            repo_full_name = EXCLUDED.repo_full_name,
                            description = EXCLUDED.description,
                            stars = EXCLUDED.stars,
                            forks = EXCLUDED.forks,
                            watchers = EXCLUDED.watchers,
                            open_issues = EXCLUDED.open_issues,
                            updated_at = EXCLUDED.updated_at,
                            pushed_at = EXCLUDED.pushed_at,
                            last_synced_at = NOW()
                    ''', (
                        user_id, repo_data['id'], repo_data['name'], repo_data['full_name'],
                        repo_data.get('description', ''), repo_data['html_url'], repo_data.get('homepage', ''),
                        repo_data.get('language', ''), repo_data.get('stargazers_count', 0),
                        repo_data.get('forks_count', 0), repo_data.get('watchers_count', 0),
                        repo_data.get('open_issues_count', 0), repo_data.get('size', 0),
                        repo_data.get('private', False), repo_data.get('fork', False),
                        repo_data.get('default_branch', 'main'),
                        repo_data.get('license', {}).get('name', '') if repo_data.get('license') else '',
                        repo_data.get('created_at'), repo_data.get('updated_at'), repo_data.get('pushed_at')
                    ))
                    conn.commit()
        except Exception as e:
            logger.error(f"Error storing repository: {e}")
    
    def store_organization(self, user_id: str, org_data: Dict[str, Any]):
        """Store organization data"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO github_organizations (user_id, org_id, org_login, org_name, description, url)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, org_id) DO NOTHING
                    ''', (
                        user_id, org_data['id'], org_data['login'],
                        org_data.get('name', org_data['login']),
                        org_data.get('description', ''), org_data['html_url']
                    ))
                    conn.commit()
        except Exception as e:
            logger.error(f"Error storing organization: {e}")
    
    def store_starred_repo(self, user_id: str, repo_data: Dict[str, Any]):
        """Store starred repository"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO github_starred_repos (user_id, repo_id, repo_name, repo_full_name, description, url, stars)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, repo_id) DO NOTHING
                    ''', (
                        user_id, repo_data['id'], repo_data['name'], repo_data['full_name'],
                        repo_data.get('description', ''), repo_data['html_url'],
                        repo_data.get('stargazers_count', 0)
                    ))
                    conn.commit()
        except Exception as e:
            logger.error(f"Error storing starred repo: {e}")
    
    def store_user_profile(self, user_id: str, username: str, profile_data: Dict[str, Any]):
        """Store user profile data"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO github_user_profiles (
                            user_id, github_username, followers, following, public_repos, public_gists,
                            bio, company, location, blog, github_created_at, last_synced_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (user_id) 
                        DO UPDATE SET
                            github_username = EXCLUDED.github_username,
                            followers = EXCLUDED.followers,
                            following = EXCLUDED.following,
                            public_repos = EXCLUDED.public_repos,
                            public_gists = EXCLUDED.public_gists,
                            bio = EXCLUDED.bio,
                            company = EXCLUDED.company,
                            location = EXCLUDED.location,
                            blog = EXCLUDED.blog,
                            last_synced_at = NOW()
                    ''', (
                        user_id, username, profile_data.get('followers', 0), profile_data.get('following', 0),
                        profile_data.get('public_repos', 0), profile_data.get('public_gists', 0),
                        profile_data.get('bio', ''), profile_data.get('company', ''),
                        profile_data.get('location', ''), profile_data.get('blog', ''),
                        profile_data.get('created_at')
                    ))
                    conn.commit()
        except Exception as e:
            logger.error(f"Error storing user profile: {e}")
    
    def store_skill(self, user_id: str, skill_name: str, skill_type: str = 'language'):
        """Store or update skill"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO github_user_skills (user_id, skill_name, skill_type, repo_count, last_used_at)
                        VALUES (%s, %s, %s, 1, NOW())
                        ON CONFLICT (user_id, skill_name)
                        DO UPDATE SET
                            repo_count = github_user_skills.repo_count + 1,
                            last_used_at = NOW()
                    ''', (user_id, skill_name, skill_type))
                    conn.commit()
        except Exception as e:
            logger.error(f"Error storing skill: {e}")
    
    def store_user_metrics(self, user_id: str, repo_id: int, metrics: Dict[str, Any], metric_date: datetime = None):
        """Store user's contribution metrics for a repo"""
        if metric_date is None:
            metric_date = datetime.now().date()
        
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO github_user_repo_metrics (
                            user_id, repo_id, metric_date,
                            commits, additions, deletions,
                            prs_opened, prs_merged, prs_closed,
                            issues_opened, issues_closed, reviews_given
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, repo_id, metric_date)
                        DO UPDATE SET
                            commits = EXCLUDED.commits,
                            additions = EXCLUDED.additions,
                            deletions = EXCLUDED.deletions,
                            prs_opened = EXCLUDED.prs_opened,
                            prs_merged = EXCLUDED.prs_merged,
                            prs_closed = EXCLUDED.prs_closed,
                            issues_opened = EXCLUDED.issues_opened,
                            issues_closed = EXCLUDED.issues_closed,
                            reviews_given = EXCLUDED.reviews_given
                    ''', (
                        user_id, repo_id, metric_date,
                        metrics.get('commits', 0),
                        metrics.get('additions', 0),
                        metrics.get('deletions', 0),
                        metrics.get('prs_opened', 0),
                        metrics.get('prs_merged', 0),
                        metrics.get('prs_closed', 0),
                        metrics.get('issues_opened', 0),
                        metrics.get('issues_closed', 0),
                        metrics.get('reviews_given', 0)
                    ))
                    conn.commit()
                    logger.info(f"✅ Stored metrics for repo {repo_id}")
        except Exception as e:
            logger.error(f"❌ Error storing metrics: {e}")
    
    def store_monthly_metrics(self, user_id: str, repo_id: int, year: int, month: int, metrics: Dict[str, Any]):
        """Store monthly aggregated metrics for a repo"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO github_monthly_metrics (
                            user_id, repo_id, year, month,
                            commits, additions, deletions,
                            prs_opened, prs_merged, prs_closed,
                            issues_opened, issues_closed, reviews_given
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, repo_id, year, month)
                        DO UPDATE SET
                            commits = EXCLUDED.commits,
                            additions = EXCLUDED.additions,
                            deletions = EXCLUDED.deletions,
                            prs_opened = EXCLUDED.prs_opened,
                            prs_merged = EXCLUDED.prs_merged,
                            prs_closed = EXCLUDED.prs_closed,
                            issues_opened = EXCLUDED.issues_opened,
                            issues_closed = EXCLUDED.issues_closed,
                            reviews_given = EXCLUDED.reviews_given,
                            created_at = NOW()
                    ''', (
                        user_id, repo_id, year, month,
                        metrics.get('commits', 0),
                        metrics.get('additions', 0),
                        metrics.get('deletions', 0),
                        metrics.get('prs_opened', 0),
                        metrics.get('prs_merged', 0),
                        metrics.get('prs_closed', 0),
                        metrics.get('issues_opened', 0),
                        metrics.get('issues_closed', 0),
                        metrics.get('reviews_given', 0)
                    ))
                    conn.commit()
                    logger.info(f"✅ Stored monthly metrics for repo {repo_id} ({year}-{month:02d})")
        except Exception as e:
            logger.error(f"❌ Error storing monthly metrics: {e}")
    
    def get_user_metrics(self, user_id: str, repo_id: int = None):
        """Retrieve user's metrics"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    if repo_id:
                        cursor.execute('''
                            SELECT * FROM github_user_repo_metrics
                            WHERE user_id = %s AND repo_id = %s
                            ORDER BY metric_date DESC
                        ''', (user_id, repo_id))
                    else:
                        cursor.execute('''
                            SELECT * FROM github_user_repo_metrics
                            WHERE user_id = %s
                            ORDER BY metric_date DESC
                        ''', (user_id,))
                    
                    columns = [desc[0] for desc in cursor.description]
                    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                    return results
        except Exception as e:
            logger.error(f"Error retrieving metrics: {e}")
            return []
    
    def get_monthly_metrics(self, user_id: str, repo_ids: List[int] = None, start_year: int = None, start_month: int = None):
        """
        Retrieve monthly metrics with optional filters
        Args:
            user_id: User UUID
            repo_ids: List of repo IDs to filter by (None = all repos)
            start_year: Starting year for time range
            start_month: Starting month for time range
        """
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    query = '''
                        SELECT 
                            m.*,
                            r.repo_name,
                            r.repo_full_name,
                            r.language,
                            r.url
                        FROM github_monthly_metrics m
                        JOIN github_repositories r ON m.repo_id = r.repo_id AND m.user_id = r.user_id
                        WHERE m.user_id = %s
                    '''
                    params = [user_id]
                    
                    if repo_ids:
                        placeholders = ','.join(['%s'] * len(repo_ids))
                        query += f' AND m.repo_id IN ({placeholders})'
                        params.extend(repo_ids)
                    
                    if start_year and start_month:
                        query += ' AND (m.year > %s OR (m.year = %s AND m.month >= %s))'
                        params.extend([start_year, start_year, start_month])
                    
                    query += ' ORDER BY m.year DESC, m.month DESC, r.repo_name'
                    
                    cursor.execute(query, params)
                    columns = [desc[0] for desc in cursor.description]
                    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                    return results
        except Exception as e:
            logger.error(f"Error retrieving monthly metrics: {e}")
            return []
    
    def get_aggregated_monthly_metrics(self, user_id: str, repo_ids: List[int] = None, start_year: int = None, start_month: int = None):
        """
        Get aggregated monthly metrics across selected repos
        Returns cumulative stats per month
        """
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    query = '''
                        SELECT 
                            year,
                            month,
                            SUM(commits) as total_commits,
                            SUM(additions) as total_additions,
                            SUM(deletions) as total_deletions,
                            SUM(prs_opened) as total_prs_opened,
                            SUM(prs_merged) as total_prs_merged,
                            SUM(prs_closed) as total_prs_closed,
                            SUM(issues_opened) as total_issues_opened,
                            SUM(issues_closed) as total_issues_closed,
                            SUM(reviews_given) as total_reviews_given,
                            COUNT(DISTINCT repo_id) as active_repos
                        FROM github_monthly_metrics
                        WHERE user_id = %s
                    '''
                    params = [user_id]
                    
                    if repo_ids:
                        placeholders = ','.join(['%s'] * len(repo_ids))
                        query += f' AND repo_id IN ({placeholders})'
                        params.extend(repo_ids)
                    
                    if start_year and start_month:
                        query += ' AND (year > %s OR (year = %s AND month >= %s))'
                        params.extend([start_year, start_year, start_month])
                    
                    query += ' GROUP BY year, month ORDER BY year DESC, month DESC'
                    
                    cursor.execute(query, params)
                    columns = [desc[0] for desc in cursor.description]
                    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                    return results
        except Exception as e:
            logger.error(f"Error retrieving aggregated monthly metrics: {e}")
            return []
    
    def get_user_repositories(self, user_id: str, owner_filter: str = None):
        """Get all repositories for a user with optional owner filter"""
        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
                    query = '''
                        SELECT 
                            repo_id,
                            repo_name,
                            repo_full_name,
                            description,
                            url,
                            language,
                            stars,
                            forks,
                            is_private,
                            created_at,
                            updated_at
                        FROM github_repositories
                        WHERE user_id = %s
                    '''
                    params = [user_id]
                    
                    if owner_filter:
                        query += ' AND repo_full_name LIKE %s'
                        params.append(f'{owner_filter}/%')
                    
                    query += ' ORDER BY updated_at DESC'
                    
                    cursor.execute(query, params)
                    columns = [desc[0] for desc in cursor.description]
                    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                    return results
        except Exception as e:
            logger.error(f"Error retrieving repositories: {e}")
            return []
