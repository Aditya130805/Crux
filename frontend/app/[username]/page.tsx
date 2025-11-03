"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Share2, Github, Mail, Network as NetworkIcon, Sparkles, Linkedin, Globe, Twitter, GraduationCap, Briefcase, FolderGit2, ExternalLink, MapPin, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import GraphVisualization from '@/components/graph/GraphVisualization'
import GitHubAnalytics from '@/components/github/GitHubAnalytics'
import { ThemeToggle } from '@/components/ThemeToggle'
import { userAPI, graphAPI, aiAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { user: currentUser } = useAuth()
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [graphData, setGraphData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [username])

  const loadProfile = async () => {
    try {
      const [userRes, graphRes] = await Promise.all([
        userAPI.getByUsername(username),
        graphAPI.getGraph(username)
      ])
      
      setUser(userRes.data)
      setGraphData(graphRes.data)

      // Try to load profile data
      try {
        const profileRes = await userAPI.getProfile(username)
        setProfile(profileRes.data)
      } catch (err) {
        // Profile might not exist
      }

      // Try to load summary
      try {
        const summaryRes = await aiAPI.getSummary(username)
        setSummary(summaryRes.data)
      } catch (err) {
        // Summary might not exist
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Profile not found')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({
        title: `${username}'s Professional Graph`,
        url: url
      })
    } else {
      navigator.clipboard.writeText(url)
      alert('Profile URL copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--muted))]/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgb(var(--muted))]/20 via-transparent to-transparent" />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[rgb(var(--primary))]/20 mb-6">
              <NetworkIcon className="h-10 w-10 text-[rgb(var(--primary))] animate-pulse" />
            </div>
            <p className="text-[rgb(var(--foreground))] font-medium text-lg">Loading profile...</p>
            <p className="text-[rgb(var(--muted-foreground))] text-sm mt-2">Fetching professional graph data</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--muted))]/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgb(var(--muted))]/20 via-transparent to-transparent" />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[rgb(var(--muted))] mb-6">
              <NetworkIcon className="h-10 w-10 text-[rgb(var(--muted-foreground))]" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-[rgb(var(--foreground))] mb-3">Profile Not Found</h1>
            <p className="text-[rgb(var(--muted-foreground))] mb-8 text-lg">{error}</p>
            <Link href="/">
              <Button size="lg" className="rounded-xl">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] relative overflow-hidden">
      {/* Subtle Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--muted))]/30 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgb(var(--muted))]/20 via-transparent to-transparent" />
      
      {/* Floating Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-6xl">
        <div className="bg-[rgb(var(--card))]/80 backdrop-blur-xl border border-[rgb(var(--border))] rounded-2xl px-6 py-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-[rgb(var(--primary))] p-2 rounded-lg">
                <NetworkIcon className="h-5 w-5 text-[rgb(var(--primary-foreground))]" />
              </div>
              <span className="text-xl font-bold text-[rgb(var(--foreground))]">Crux</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              {currentUser ? (
                <Link href="/dashboard">
                  <Button size="sm" className="rounded-xl">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/signup">
                  <Button size="sm" className="rounded-xl">
                    Create Your Graph
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-12">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Card className="border-[rgb(var(--border))] mb-8">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-5xl font-serif font-bold text-[rgb(var(--foreground))] mb-4">
                  {username}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-4 text-[rgb(var(--muted-foreground))]">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  {user.github_connected && (
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      <span>{user.github_username}</span>
                    </div>
                  )}
                  {profile?.linkedin_url && (
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-[rgb(var(--primary))] transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {profile?.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-[rgb(var(--primary))] transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Website</span>
                    </a>
                  )}
                  {profile?.twitter_url && (
                    <a
                      href={profile.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-[rgb(var(--primary))] transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                      <span>Twitter</span>
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          {summary && (
            <Card className="border-[rgb(var(--border))]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-[rgb(var(--primary))]" />
                  <span className="text-sm text-[rgb(var(--muted-foreground))] font-semibold">AI-Generated Summary</span>
                </div>
                <h2 className="text-2xl font-serif font-bold text-[rgb(var(--foreground))] mb-4">
                  {summary.headline}
                </h2>
                <p className="text-lg text-[rgb(var(--muted-foreground))] leading-relaxed">
                  {summary.narrative}
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Education, Experience, Projects */}
        {profile && (profile.education || profile.experiences || profile.projects) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 space-y-6"
          >
            {/* Education */}
            {profile.education && (
              <Card className="border-[rgb(var(--border))]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-5 w-5 text-[rgb(var(--primary))]" />
                    <h3 className="text-lg font-serif font-semibold text-[rgb(var(--foreground))]">Education</h3>
                  </div>
                  {profile.education.length > 0 ? (
                    <div className="space-y-4">
                      {profile.education.map((edu: any, index: number) => (
                        <div key={index} className="border-l-2 border-[rgb(var(--border))] pl-4">
                          <h4 className="font-semibold text-[rgb(var(--foreground))]">
                            {edu.degreeLevel.charAt(0).toUpperCase() + edu.degreeLevel.slice(1)} in {edu.major}
                          </h4>
                          <p className="text-sm text-[rgb(var(--muted-foreground))]">{edu.university}</p>
                          {(edu.startDate || edu.endDate) && (
                            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1 flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {edu.startDate} - {edu.endDate}
                            </p>
                          )}
                          {edu.gpa && (
                            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
                              GPA: {edu.gpa}
                            </p>
                          )}
                          {edu.description && (
                            <p className="text-sm text-[rgb(var(--muted-foreground))] mt-2 leading-relaxed">
                              {edu.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[rgb(var(--muted-foreground))] italic">No education information available</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Experience */}
            {profile.experiences && (
              <Card className="border-[rgb(var(--border))]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5 text-[rgb(var(--primary))]" />
                    <h3 className="text-lg font-serif font-semibold text-[rgb(var(--foreground))]">Experience</h3>
                  </div>
                  {profile.experiences.length > 0 ? (
                    <div className="space-y-6">
                      {profile.experiences.map((exp: any, index: number) => (
                        <div key={index} className="border-l-2 border-[rgb(var(--border))] pl-4">
                          <h4 className="font-semibold text-[rgb(var(--foreground))]">{exp.title}</h4>
                          <p className="text-sm text-[rgb(var(--muted-foreground))]">{exp.company}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                            {(exp.startDate || exp.endDate) && (
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                <span>
                                  {exp.startDate} - {exp.isPresent ? 'Present' : exp.endDate}
                                </span>
                              </div>
                            )}
                            {exp.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{exp.location}</span>
                              </div>
                            )}
                          </div>
                          {exp.description && (
                            <p className="text-sm text-[rgb(var(--muted-foreground))] mt-2 leading-relaxed">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[rgb(var(--muted-foreground))] italic">No work experience available</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Projects */}
            {profile.projects && (
              <Card className="border-[rgb(var(--border))]">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FolderGit2 className="h-5 w-5 text-[rgb(var(--primary))]" />
                    <h3 className="text-lg font-serif font-semibold text-[rgb(var(--foreground))]">Projects</h3>
                  </div>
                  {profile.projects.length > 0 ? (
                    <div className="space-y-4">
                      {profile.projects.map((project: any, index: number) => (
                        <div key={index} className="border-l-2 border-[rgb(var(--border))] pl-4">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-[rgb(var(--foreground))]">{project.name}</h4>
                            {project.url && (
                              <a
                                href={project.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[rgb(var(--primary))] hover:opacity-70 transition-opacity"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">{project.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[rgb(var(--muted-foreground))] italic">No projects available</p>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Graph Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <Card className="border-[rgb(var(--border))]">
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <NetworkIcon className="h-5 w-5 text-[rgb(var(--primary))]" />
                  <h2 className="text-2xl font-serif font-bold text-[rgb(var(--foreground))]">
                    Professional Graph
                  </h2>
                </div>
                <p className="text-[rgb(var(--muted-foreground))] ml-8">
                  Explore the connections between projects, skills, and experience
                </p>
              </div>
              <div className="h-[700px] rounded-xl overflow-hidden bg-[rgb(var(--muted))]/30">
                <GraphVisualization
                  nodes={graphData?.nodes || []}
                  edges={graphData?.edges || []}
                  interactive={true}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 mt-8"
        >
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <div className="text-4xl font-serif font-bold text-[rgb(var(--foreground))] mb-2">
                {graphData?.nodes?.filter((n: any) => n.data.type === 'Project').length || 0}
              </div>
              <div className="text-[rgb(var(--muted-foreground))] font-medium">Projects</div>
            </CardContent>
          </Card>
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <div className="text-4xl font-serif font-bold text-[rgb(var(--foreground))] mb-2">
                {graphData?.nodes?.filter((n: any) => n.data.type === 'Skill').length || 0}
              </div>
              <div className="text-[rgb(var(--muted-foreground))] font-medium">Skills</div>
            </CardContent>
          </Card>
          <Card className="border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/40 transition-all">
            <CardContent className="pt-6">
              <div className="text-4xl font-serif font-bold text-[rgb(var(--foreground))] mb-2">
                {graphData?.nodes?.filter((n: any) => n.data.type === 'Organization').length || 0}
              </div>
              <div className="text-[rgb(var(--muted-foreground))] font-medium">Organizations</div>
              <p className="text-xs text-[rgb(var(--muted-foreground))] mt-2 opacity-70">
                Note: Organizations may restrict access to sensitive data
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* GitHub Analytics Section */}
        {user?.github_connected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <GitHubAnalytics username={username} />
          </motion.div>
        ) : user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <Card className="border-[rgb(var(--border))]">
              <CardContent className="py-16">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[rgb(var(--muted))] mb-6">
                    <Github className="h-10 w-10 text-[rgb(var(--muted-foreground))]" />
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-[rgb(var(--foreground))] mb-4">
                    No GitHub Analytics
                  </h3>
                  <p className="text-[rgb(var(--muted-foreground))] text-lg mb-8 leading-relaxed">
                    This user hasn't connected their GitHub account yet. GitHub analytics include detailed contribution metrics, monthly stats, and repository insights.
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2 text-[rgb(var(--muted-foreground))]">
                      <div className="w-2 h-2 rounded-full bg-[rgb(var(--primary))]"></div>
                      <span className="text-sm">Monthly Metrics</span>
                    </div>
                    <div className="flex items-center gap-2 text-[rgb(var(--muted-foreground))]">
                      <div className="w-2 h-2 rounded-full bg-[rgb(var(--primary))]"></div>
                      <span className="text-sm">Contribution Stats</span>
                    </div>
                    <div className="flex items-center gap-2 text-[rgb(var(--muted-foreground))]">
                      <div className="w-2 h-2 rounded-full bg-[rgb(var(--primary))]"></div>
                      <span className="text-sm">Repository Insights</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[rgb(var(--border))] py-16 mt-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="bg-[rgb(var(--primary))] p-2 rounded-lg">
                <NetworkIcon className="h-5 w-5 text-[rgb(var(--primary-foreground))]" />
              </div>
              <span className="text-xl font-bold text-[rgb(var(--foreground))]">Crux</span>
            </div>
          </div>
          {currentUser ? (
            <>
              <p className="text-[rgb(var(--muted-foreground))] mb-6 text-lg">
                Manage your professional graph
              </p>
              <Link href="/dashboard">
                <Button size="lg" className="rounded-xl">
                  Go to Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-[rgb(var(--muted-foreground))] mb-6 text-lg">
                Want to create your own professional graph?
              </p>
              <Link href="/signup">
                <Button size="lg" className="rounded-xl">
                  Get Started with Crux
                </Button>
              </Link>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
