"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { integrationAPI } from '@/lib/api'
import { 
  BarChart3, 
  GitCommit, 
  GitPullRequest, 
  GitBranch, 
  MessageSquare, 
  Eye,
  Calendar,
  Filter,
  TrendingUp,
  Github
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface Repository {
  repo_id: number
  repo_name: string
  repo_full_name: string
  language: string
  stars: number
  url: string
}

interface MonthlyMetric {
  year: number
  month: number
  commits: number
  additions: number
  deletions: number
  prs_opened: number
  prs_merged: number
  issues_opened: number
  reviews_given: number
  repo_name?: string
}

interface GitHubAnalyticsProps {
  username: string
}

export default function GitHubAnalytics({ username }: GitHubAnalyticsProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [selectedRepos, setSelectedRepos] = useState<number[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [ownerFilter, setOwnerFilter] = useState<string>('')
  const [owners, setOwners] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState(12) // months
  const [loading, setLoading] = useState(true)
  const [themeColors, setThemeColors] = useState({
    primary: '',
    border: '',
    mutedForeground: '',
    card: '',
    foreground: ''
  })

  useEffect(() => {
    loadRepositories()
  }, [ownerFilter])

  useEffect(() => {
    if (selectedRepos.length > 0) {
      loadMetrics()
    } else {
      // Clear metrics when no repos are selected
      setMetrics([])
    }
  }, [selectedRepos, timeRange])

  useEffect(() => {
    const updateThemeColors = () => {
      const styles = getComputedStyle(document.documentElement)
      setThemeColors({
        primary: `rgb(${styles.getPropertyValue('--primary')})`,
        border: `rgb(${styles.getPropertyValue('--border')})`,
        mutedForeground: `rgb(${styles.getPropertyValue('--muted-foreground')})`,
        card: `rgb(${styles.getPropertyValue('--card')})`,
        foreground: `rgb(${styles.getPropertyValue('--foreground')})`
      })
    }

    // Update on mount
    updateThemeColors()

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateThemeColors()
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  const loadRepositories = async () => {
    try {
      const response = await integrationAPI.getGitHubRepositories(username, ownerFilter || undefined)
      const repos = response.data.repositories
      setRepositories(repos)
      
      // Extract unique owners
      const uniqueOwners = Array.from(new Set(
        repos.map((r: Repository) => r.repo_full_name.split('/')[0])
      )) as string[]
      setOwners(uniqueOwners)
      
      // Get the repo IDs from the filtered list
      const filteredRepoIds = repos.map((r: Repository) => r.repo_id)
      
      // Auto-select all repos if none selected, or filter existing selection
      if (selectedRepos.length === 0 && repos.length > 0) {
        // First load - select all
        setSelectedRepos(filteredRepoIds)
      } else if (repos.length > 0) {
        // Filter changed - keep only repos that are in the filtered list
        const updatedSelection = selectedRepos.filter(id => filteredRepoIds.includes(id))
        
        // If no repos remain selected after filtering, select all from the filtered list
        if (updatedSelection.length === 0) {
          setSelectedRepos(filteredRepoIds)
        } else {
          setSelectedRepos(updatedSelection)
        }
      }
    } catch (error) {
      console.error('Failed to load repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async () => {
    try {
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - timeRange, 1)
      
      const response = await integrationAPI.getGitHubMonthlyAnalytics(username, {
        repo_ids: selectedRepos.join(','),
        start_year: startDate.getFullYear(),
        start_month: startDate.getMonth() + 1,
        aggregate: true
      })
      
      const data = response.data.metrics
      
      // Format data for charts (data is already aggregated by month from backend)
      const formattedData = data.map((m: any) => ({
        ...m,
        monthLabel: `${m.year}-${String(m.month).padStart(2, '0')}`,
        total_commits: m.total_commits ?? m.commits ?? 0,
        total_additions: m.total_additions ?? m.additions ?? 0,
        total_deletions: m.total_deletions ?? m.deletions ?? 0,
        total_prs: (m.total_prs_opened ?? m.prs_opened ?? 0) + (m.total_prs_merged ?? m.prs_merged ?? 0),
        total_issues: m.total_issues_opened ?? m.issues_opened ?? 0,
        total_reviews: m.total_reviews_given ?? m.reviews_given ?? 0
      })).reverse() // Reverse to show chronological order
      
      setMetrics(formattedData)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    }
  }

  const toggleRepo = (repoId: number) => {
    setSelectedRepos(prev =>
      prev.includes(repoId)
        ? prev.filter(id => id !== repoId)
        : [...prev, repoId]
    )
  }

  const selectAllRepos = () => {
    setSelectedRepos(repositories.map(r => r.repo_id))
  }

  const clearSelection = () => {
    setSelectedRepos([])
  }

  // Calculate totals
  const totals = metrics.reduce((acc, m) => ({
    commits: acc.commits + (m.total_commits || 0),
    additions: acc.additions + (m.total_additions || 0),
    deletions: acc.deletions + (m.total_deletions || 0),
    prs: acc.prs + (m.total_prs || 0),
    issues: acc.issues + (m.total_issues || 0),
    reviews: acc.reviews + (m.total_reviews || 0)
  }), { commits: 0, additions: 0, deletions: 0, prs: 0, issues: 0, reviews: 0 })

  if (loading) {
    return (
      <Card className="border-[rgb(var(--border))]">
        <CardContent className="py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(var(--primary))]/20 mb-4">
              <BarChart3 className="h-8 w-8 text-[rgb(var(--primary))] animate-pulse" />
            </div>
            <p className="text-[rgb(var(--foreground))] font-medium">Loading GitHub analytics...</p>
            <p className="text-[rgb(var(--muted-foreground))] text-sm mt-2">Fetching your contribution data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (repositories.length === 0) {
    return (
      <Card className="border-[rgb(var(--border))]">
        <CardContent className="py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(var(--muted))] mb-4">
              <BarChart3 className="h-8 w-8 text-[rgb(var(--muted-foreground))]" />
            </div>
            <p className="text-[rgb(var(--foreground))] font-medium mb-2">No GitHub repositories found</p>
            <p className="text-[rgb(var(--muted-foreground))] text-sm">Connect GitHub to see your analytics and contribution metrics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="h-6 w-6 text-[rgb(var(--primary))]" />
            <div>
              <h2 className="text-3xl font-serif font-bold text-[rgb(var(--foreground))]">GitHub Analytics</h2>
              <p className="text-[rgb(var(--muted-foreground))] mt-1">Your monthly contribution metrics across selected repositories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-[rgb(var(--border))]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="h-5 w-5 text-[rgb(var(--primary))]" />
            <h3 className="text-lg font-serif font-semibold text-[rgb(var(--foreground))]">Filters & Selection</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Owner Filter */}
            <div>
              <label className="text-sm font-medium text-[rgb(var(--foreground))] mb-2 block flex items-center gap-2">
                <Github className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
                Filter by Owner
              </label>
              <Select value={ownerFilter || "all"} onValueChange={(value) => setOwnerFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners.map(owner => (
                    <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div>
              <label className="text-sm font-medium text-[rgb(var(--foreground))] mb-2 block flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
                Time Range
              </label>
              <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(Number(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Last 3 months</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Repository Selection */}
            <div>
              <label className="text-sm font-medium text-[rgb(var(--foreground))] mb-2 block flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
                Repositories ({selectedRepos.length}/{repositories.length})
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllRepos}
                  className="flex-1 rounded-xl"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="flex-1 rounded-xl"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Repository List */}
          <div className="mt-6">
            <div className="text-sm font-medium text-[rgb(var(--foreground))] mb-3">Select Repositories</div>
            <div className="max-h-64 overflow-y-auto bg-[rgb(var(--muted))]/30 rounded-xl p-4 border border-[rgb(var(--border))]">
              <div className="grid md:grid-cols-3 gap-2">
                {repositories.map(repo => (
                  <label
                    key={repo.repo_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[rgb(var(--muted))]/50 cursor-pointer transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRepos.includes(repo.repo_id)}
                      onChange={() => toggleRepo(repo.repo_id)}
                      className="rounded border-[rgb(var(--border))] text-[rgb(var(--primary))] focus:ring-[rgb(var(--primary))]/50"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[rgb(var(--foreground))] truncate block transition-colors">
                        {repo.repo_name}
                      </span>
                      {repo.language && (
                        <span className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5 block">{repo.language}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <GitCommit className="h-8 w-8 text-[rgb(var(--primary))] mb-3" />
              <div className="text-3xl font-serif font-bold text-[rgb(var(--foreground))] mb-1">{totals.commits}</div>
              <div className="text-sm text-[rgb(var(--muted-foreground))] font-medium">Commits</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-[rgb(var(--primary))] mb-3" />
              <div className="text-3xl font-serif font-bold text-[rgb(var(--foreground))] mb-1">{totals.additions.toLocaleString()}</div>
              <div className="text-sm text-[rgb(var(--muted-foreground))] font-medium">Additions</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-[rgb(var(--primary))] mb-3 rotate-180" />
              <div className="text-3xl font-serif font-bold text-[rgb(var(--foreground))] mb-1">{totals.deletions.toLocaleString()}</div>
              <div className="text-sm text-[rgb(var(--muted-foreground))] font-medium">Deletions</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <GitPullRequest className="h-8 w-8 text-[rgb(var(--primary))] mb-3" />
              <div className="text-3xl font-serif font-bold text-[rgb(var(--foreground))] mb-1">{totals.prs}</div>
              <div className="text-sm text-[rgb(var(--muted-foreground))] font-medium">Pull Requests</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <MessageSquare className="h-8 w-8 text-[rgb(var(--primary))] mb-3" />
              <div className="text-3xl font-serif font-bold text-[rgb(var(--foreground))] mb-1">{totals.issues}</div>
              <div className="text-sm text-[rgb(var(--muted-foreground))] font-medium">Issues</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <Eye className="h-8 w-8 text-[rgb(var(--primary))] mb-3" />
              <div className="text-3xl font-serif font-bold text-[rgb(var(--foreground))] mb-1">{totals.reviews}</div>
              <div className="text-sm text-[rgb(var(--muted-foreground))] font-medium">Reviews</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      {metrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Commits & PRs Chart */}
          <Card className="border-[rgb(var(--border))]">
            <CardHeader>
              <CardTitle className="text-lg font-serif text-[rgb(var(--foreground))]">Commits & Pull Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPRs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke={themeColors.mutedForeground}
                    fontSize={12}
                    tick={{ fill: themeColors.mutedForeground }}
                  />
                  <YAxis 
                    stroke={themeColors.mutedForeground}
                    fontSize={12}
                    tick={{ fill: themeColors.mutedForeground }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: themeColors.card,
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '12px',
                      color: themeColors.foreground
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      color: themeColors.foreground
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total_commits" 
                    stroke={themeColors.primary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCommits)"
                    name="Commits"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total_prs" 
                    stroke={themeColors.primary}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#colorPRs)"
                    name="Pull Requests"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Code Changes Chart */}
          <Card className="border-[rgb(var(--border))]">
            <CardHeader>
              <CardTitle className="text-lg font-serif text-[rgb(var(--foreground))]">Code Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke={themeColors.mutedForeground}
                    fontSize={12}
                    tick={{ fill: themeColors.mutedForeground }}
                  />
                  <YAxis 
                    stroke={themeColors.mutedForeground}
                    fontSize={12}
                    tick={{ fill: themeColors.mutedForeground }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: themeColors.card,
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '12px',
                      color: themeColors.foreground
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      color: themeColors.foreground
                    }}
                  />
                  <Bar dataKey="total_additions" fill={themeColors.primary} name="Additions" opacity={0.8} />
                  <Bar dataKey="total_deletions" fill={themeColors.primary} name="Deletions" opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Overview Chart */}
          <Card className="border-[rgb(var(--border))] md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-serif text-[rgb(var(--foreground))]">Overall Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke={themeColors.mutedForeground}
                    fontSize={12}
                    tick={{ fill: themeColors.mutedForeground }}
                  />
                  <YAxis 
                    stroke={themeColors.mutedForeground}
                    fontSize={12}
                    tick={{ fill: themeColors.mutedForeground }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: themeColors.card,
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '12px',
                      color: themeColors.foreground
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      color: themeColors.foreground
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_commits" 
                    stroke={themeColors.primary}
                    strokeWidth={2.5}
                    name="Commits"
                    dot={{ fill: themeColors.primary }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_prs" 
                    stroke={themeColors.primary}
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    name="Pull Requests"
                    dot={{ fill: themeColors.primary }}
                    opacity={0.7}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_issues" 
                    stroke={themeColors.primary}
                    strokeWidth={2.5}
                    strokeDasharray="3 3"
                    name="Issues"
                    dot={{ fill: themeColors.primary }}
                    opacity={0.5}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_reviews" 
                    stroke={themeColors.primary}
                    strokeWidth={2.5}
                    strokeDasharray="1 3"
                    name="Reviews"
                    dot={{ fill: themeColors.primary }}
                    opacity={0.3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Monthly Data Table */}
      {metrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-[rgb(var(--border))]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[rgb(var(--primary))]" />
                <CardTitle className="text-[rgb(var(--foreground))] text-xl font-serif">Monthly Breakdown</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border))]">
                      <th className="text-left py-4 px-6 text-[rgb(var(--muted-foreground))] font-semibold">Month</th>
                      <th className="text-right py-4 px-6 text-[rgb(var(--muted-foreground))] font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <GitCommit className="h-4 w-4" />
                          Commits
                        </div>
                      </th>
                      <th className="text-right py-4 px-6 text-[rgb(var(--muted-foreground))] font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Additions
                        </div>
                      </th>
                      <th className="text-right py-4 px-6 text-[rgb(var(--muted-foreground))] font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <TrendingUp className="h-4 w-4 rotate-180" />
                          Deletions
                        </div>
                      </th>
                      <th className="text-right py-4 px-6 text-[rgb(var(--muted-foreground))] font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <GitPullRequest className="h-4 w-4" />
                          PRs
                        </div>
                      </th>
                      <th className="text-right py-4 px-6 text-[rgb(var(--muted-foreground))] font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Issues
                        </div>
                      </th>
                      <th className="text-right py-4 px-6 text-[rgb(var(--muted-foreground))] font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <Eye className="h-4 w-4" />
                          Reviews
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m, idx) => (
                      <tr key={idx} className="border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]/30 transition-colors">
                        <td className="py-4 px-6 text-[rgb(var(--foreground))] font-medium">{m.monthLabel}</td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-[rgb(var(--foreground))] font-semibold">{m.total_commits}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-[rgb(var(--foreground))] font-semibold">+{m.total_additions.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-[rgb(var(--foreground))] font-semibold">-{m.total_deletions.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-[rgb(var(--foreground))] font-semibold">{m.total_prs}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-[rgb(var(--foreground))] font-semibold">{m.total_issues}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-[rgb(var(--foreground))] font-semibold">{m.total_reviews}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
