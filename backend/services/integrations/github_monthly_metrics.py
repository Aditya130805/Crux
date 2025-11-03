"""
GitHub Monthly Metrics Service
Fetches user-specific monthly contribution metrics per repository
"""

import httpx
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


class GitHubMonthlyMetrics:
    """Fetch monthly user-specific GitHub metrics"""
    
    def __init__(self, access_token: str, username: str):
        self.access_token = access_token
        self.username = username
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    async def fetch_monthly_repo_metrics(self, repo_full_name: str, months_back: int = 12) -> Dict[str, Dict[str, Any]]:
        """
        Fetch monthly metrics for a specific repo
        Returns: Dict[month_key, metrics] where month_key is 'YYYY-MM'
        """
        end_date = datetime.now(timezone.utc)
        start_date = end_date - relativedelta(months=months_back)
        
        # Initialize monthly buckets
        monthly_data = {}
        current = start_date.replace(day=1)
        while current <= end_date:
            month_key = current.strftime('%Y-%m')
            monthly_data[month_key] = {
                'year': current.year,
                'month': current.month,
                'commits': 0,
                'additions': 0,
                'deletions': 0,
                'prs_opened': 0,
                'prs_merged': 0,
                'prs_closed': 0,
                'issues_opened': 0,
                'issues_closed': 0,
                'reviews_given': 0
            }
            current = current + relativedelta(months=1)
        
        # Fetch commits
        await self._aggregate_commits(repo_full_name, start_date, monthly_data)
        
        # Fetch PRs
        await self._aggregate_prs(repo_full_name, start_date, monthly_data)
        
        # Fetch issues
        await self._aggregate_issues(repo_full_name, start_date, monthly_data)
        
        # Fetch reviews
        await self._aggregate_reviews(repo_full_name, start_date, monthly_data)
        
        return monthly_data
    
    async def _aggregate_commits(self, repo_full_name: str, since_date: datetime, monthly_data: Dict):
        """Aggregate commits by month"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                page = 1
                while True:
                    response = await client.get(
                        f"https://api.github.com/repos/{repo_full_name}/commits",
                        headers=self.headers,
                        params={
                            "author": self.username,
                            "since": since_date.isoformat(),
                            "per_page": 100,
                            "page": page
                        }
                    )
                    
                    if response.status_code != 200:
                        break
                    
                    commits = response.json()
                    if not commits:
                        break
                    
                    for commit in commits:
                        commit_date = datetime.fromisoformat(commit['commit']['author']['date'].replace('Z', '+00:00'))
                        month_key = commit_date.strftime('%Y-%m')
                        
                        if month_key in monthly_data:
                            monthly_data[month_key]['commits'] += 1
                            
                            # Fetch detailed commit stats
                            try:
                                detail_response = await client.get(
                                    f"https://api.github.com/repos/{repo_full_name}/commits/{commit['sha']}",
                                    headers=self.headers
                                )
                                if detail_response.status_code == 200:
                                    detail = detail_response.json()
                                    stats = detail.get('stats', {})
                                    monthly_data[month_key]['additions'] += stats.get('additions', 0)
                                    monthly_data[month_key]['deletions'] += stats.get('deletions', 0)
                            except Exception as e:
                                logger.warning(f"Could not fetch commit details: {e}")
                    
                    page += 1
                    if len(commits) < 100:
                        break
        except Exception as e:
            logger.error(f"Error aggregating commits: {e}")
    
    async def _aggregate_prs(self, repo_full_name: str, since_date: datetime, monthly_data: Dict):
        """Aggregate PRs by month"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                page = 1
                while True:
                    response = await client.get(
                        f"https://api.github.com/repos/{repo_full_name}/pulls",
                        headers=self.headers,
                        params={
                            "state": "all",
                            "sort": "created",
                            "direction": "desc",
                            "per_page": 100,
                            "page": page
                        }
                    )
                    
                    if response.status_code != 200:
                        break
                    
                    prs = response.json()
                    if not prs:
                        break
                    
                    for pr in prs:
                        # Only count PRs created by this user
                        if pr['user']['login'] != self.username:
                            continue
                        
                        created_date = datetime.fromisoformat(pr['created_at'].replace('Z', '+00:00'))
                        if created_date < since_date:
                            continue
                        
                        month_key = created_date.strftime('%Y-%m')
                        if month_key in monthly_data:
                            monthly_data[month_key]['prs_opened'] += 1
                            
                            if pr['merged_at']:
                                merged_date = datetime.fromisoformat(pr['merged_at'].replace('Z', '+00:00'))
                                merged_month = merged_date.strftime('%Y-%m')
                                if merged_month in monthly_data:
                                    monthly_data[merged_month]['prs_merged'] += 1
                            elif pr['closed_at']:
                                closed_date = datetime.fromisoformat(pr['closed_at'].replace('Z', '+00:00'))
                                closed_month = closed_date.strftime('%Y-%m')
                                if closed_month in monthly_data:
                                    monthly_data[closed_month]['prs_closed'] += 1
                    
                    page += 1
                    if len(prs) < 100:
                        break
        except Exception as e:
            logger.error(f"Error aggregating PRs: {e}")
    
    async def _aggregate_issues(self, repo_full_name: str, since_date: datetime, monthly_data: Dict):
        """Aggregate issues by month"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://api.github.com/repos/{repo_full_name}/issues",
                    headers=self.headers,
                    params={
                        "creator": self.username,
                        "state": "all",
                        "since": since_date.isoformat(),
                        "per_page": 100
                    }
                )
                
                if response.status_code == 200:
                    issues = response.json()
                    for issue in issues:
                        # Skip PRs (they also appear in issues endpoint)
                        if 'pull_request' in issue:
                            continue
                        
                        created_date = datetime.fromisoformat(issue['created_at'].replace('Z', '+00:00'))
                        month_key = created_date.strftime('%Y-%m')
                        if month_key in monthly_data:
                            monthly_data[month_key]['issues_opened'] += 1
                        
                        if issue['closed_at']:
                            closed_date = datetime.fromisoformat(issue['closed_at'].replace('Z', '+00:00'))
                            closed_month = closed_date.strftime('%Y-%m')
                            if closed_month in monthly_data:
                                monthly_data[closed_month]['issues_closed'] += 1
        except Exception as e:
            logger.error(f"Error aggregating issues: {e}")
    
    async def _aggregate_reviews(self, repo_full_name: str, since_date: datetime, monthly_data: Dict):
        """Aggregate PR reviews by month"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://api.github.com/search/issues",
                    headers=self.headers,
                    params={
                        "q": f"repo:{repo_full_name} reviewed-by:{self.username} type:pr",
                        "per_page": 100
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    for pr in result.get('items', []):
                        # Get review dates
                        pr_number = pr['number']
                        reviews_response = await client.get(
                            f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}/reviews",
                            headers=self.headers
                        )
                        
                        if reviews_response.status_code == 200:
                            reviews = reviews_response.json()
                            for review in reviews:
                                if review['user']['login'] == self.username:
                                    submitted_date = datetime.fromisoformat(review['submitted_at'].replace('Z', '+00:00'))
                                    if submitted_date >= since_date:
                                        month_key = submitted_date.strftime('%Y-%m')
                                        if month_key in monthly_data:
                                            monthly_data[month_key]['reviews_given'] += 1
        except Exception as e:
            logger.error(f"Error aggregating reviews: {e}")
    
    async def fetch_all_repos_monthly_metrics(self, repos: List[Dict[str, Any]], months_back: int = 12) -> Dict[str, Dict[str, Dict[str, Any]]]:
        """
        Fetch monthly metrics for all repos
        Returns: Dict[repo_full_name, Dict[month_key, metrics]]
        """
        all_metrics = {}
        
        for repo in repos:
            repo_name = repo['full_name']
            logger.info(f"Fetching monthly metrics for {repo_name}")
            
            try:
                monthly_metrics = await self.fetch_monthly_repo_metrics(repo_name, months_back)
                all_metrics[repo_name] = monthly_metrics
            except Exception as e:
                logger.error(f"Failed to fetch monthly metrics for {repo_name}: {e}")
                continue
        
        return all_metrics
