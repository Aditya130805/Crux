"""
GitHub User-Specific Metrics
Fetches contribution metrics for a specific GitHub user only
"""

import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class GitHubUserMetrics:
    """Fetch GitHub metrics for a specific user only"""
    
    def __init__(self, access_token: str, username: str):
        self.access_token = access_token
        self.username = username
        self.base_url = "https://api.github.com"
        
    async def fetch_user_repo_metrics(self, repo_full_name: str, since_date: datetime) -> Dict[str, Any]:
        """
        Fetch metrics for a specific user's contributions to a repo
        
        Returns:
        {
            'commits': int,
            'additions': int,
            'deletions': int,
            'prs_opened': int,
            'prs_merged': int,
            'prs_closed': int,
            'issues_opened': int,
            'issues_closed': int,
            'reviews_given': int
        }
        """
        metrics = {
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
        
        async with httpx.AsyncClient() as client:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            # 1. Fetch user's commits
            try:
                commits_url = f"{self.base_url}/repos/{repo_full_name}/commits"
                params = {
                    'author': self.username,
                    'since': since_date.isoformat(),
                    'per_page': 100
                }
                
                response = await client.get(commits_url, headers=headers, params=params)
                if response.status_code == 200:
                    commits = response.json()
                    metrics['commits'] = len(commits)
                    
                    # Get additions/deletions for each commit
                    for commit in commits[:50]:  # Limit to 50 to avoid rate limits
                        commit_sha = commit['sha']
                        commit_detail_url = f"{self.base_url}/repos/{repo_full_name}/commits/{commit_sha}"
                        detail_response = await client.get(commit_detail_url, headers=headers)
                        if detail_response.status_code == 200:
                            stats = detail_response.json().get('stats', {})
                            metrics['additions'] += stats.get('additions', 0)
                            metrics['deletions'] += stats.get('deletions', 0)
            except Exception as e:
                logger.error(f"Error fetching commits for {repo_full_name}: {e}")
            
            # 2. Fetch user's PRs
            try:
                prs_url = f"{self.base_url}/repos/{repo_full_name}/pulls"
                params = {
                    'state': 'all',
                    'per_page': 100,
                    'sort': 'created',
                    'direction': 'desc'
                }
                
                response = await client.get(prs_url, headers=headers, params=params)
                if response.status_code == 200:
                    prs = response.json()
                    for pr in prs:
                        # Only count PRs created by this user
                        if pr['user']['login'] == self.username:
                            created_at = datetime.fromisoformat(pr['created_at'].replace('Z', '+00:00'))
                            if created_at >= since_date:
                                metrics['prs_opened'] += 1
                                if pr['merged_at']:
                                    metrics['prs_merged'] += 1
                                elif pr['state'] == 'closed':
                                    metrics['prs_closed'] += 1
            except Exception as e:
                logger.error(f"Error fetching PRs for {repo_full_name}: {e}")
            
            # 3. Fetch user's issues
            try:
                issues_url = f"{self.base_url}/repos/{repo_full_name}/issues"
                params = {
                    'creator': self.username,
                    'state': 'all',
                    'per_page': 100,
                    'since': since_date.isoformat()
                }
                
                response = await client.get(issues_url, headers=headers, params=params)
                if response.status_code == 200:
                    issues = response.json()
                    for issue in issues:
                        # Skip PRs (they show up in issues endpoint too)
                        if 'pull_request' not in issue:
                            metrics['issues_opened'] += 1
                            if issue['state'] == 'closed':
                                metrics['issues_closed'] += 1
            except Exception as e:
                logger.error(f"Error fetching issues for {repo_full_name}: {e}")
            
            # 4. Fetch user's PR reviews
            try:
                # Search for reviews by this user
                search_url = f"{self.base_url}/search/issues"
                params = {
                    'q': f'repo:{repo_full_name} reviewed-by:{self.username} type:pr',
                    'per_page': 100
                }
                
                response = await client.get(search_url, headers=headers, params=params)
                if response.status_code == 200:
                    results = response.json()
                    metrics['reviews_given'] = results.get('total_count', 0)
            except Exception as e:
                logger.error(f"Error fetching reviews for {repo_full_name}: {e}")
        
        return metrics
    
    async def fetch_all_user_repos_metrics(self, repos: List[Dict[str, Any]], since_date: datetime) -> Dict[str, Dict[str, Any]]:
        """
        Fetch metrics for all repos the user has contributed to
        
        Returns: Dict[repo_full_name, metrics]
        """
        all_metrics = {}
        
        for repo in repos:
            repo_name = repo['full_name']
            logger.info(f"Fetching metrics for {repo_name}")
            
            try:
                metrics = await self.fetch_user_repo_metrics(repo_name, since_date)
                all_metrics[repo_name] = metrics
            except Exception as e:
                logger.error(f"Failed to fetch metrics for {repo_name}: {e}")
                continue
        
        return all_metrics
