"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Github, Sparkles, LogOut, User, Network as NetworkIcon, Linkedin, Globe, Twitter, GraduationCap, Briefcase, FolderGit2, Trash2, ChevronDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import GraphVisualization from '@/components/graph/GraphVisualization'
import { useAuth } from '@/contexts/AuthContext'
import { graphAPI, integrationAPI, aiAPI, userAPI } from '@/lib/api'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useToast } from '@/hooks/useToast'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, logout, refreshUser } = useAuth()
  const toast = useToast()
  const [graphData, setGraphData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loadingGraph, setLoadingGraph] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  
  // Collapsible sections state
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true)
  const [isEducationOpen, setIsEducationOpen] = useState(true)
  const [isExperienceOpen, setIsExperienceOpen] = useState(true)
  const [isProjectsOpen, setIsProjectsOpen] = useState(true)
  
  // Profile Information State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [gender, setGender] = useState('')
  const [ethnicity, setEthnicity] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  
  
  // Education State
  const [education, setEducation] = useState([{
    university: '',
    degreeLevel: '',
    major: '',
    gpa: '',
    description: '',
    startDate: '',
    endDate: ''
  }])
  
  // Experience State
  const [experiences, setExperiences] = useState([{
    title: '',
    company: '',
    description: '',
    startDate: '',
    endDate: '',
    isPresent: false
  }])
  
  // Projects State
  const [projects, setProjects] = useState([{
    name: '',
    description: '',
    url: ''
  }])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadGraphData()
      loadSummary()
      loadProfile()
    }
  }, [user])

  // Handle GitHub OAuth callback (from URL or popup message)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const githubCode = params.get('github_code')
    const error = params.get('error')

    const processGitHubCallback = async (code: string) => {
      // Step 1: Show connecting
      toast.showToast({ title: 'Connecting to GitHub...', description: 'Authorizing your account and verifying details.', variant: 'default' })
      
      try {
        // Call backend to connect account (fast)
        await integrationAPI.githubCallback({ code })
        
        // Step 2: Show successfully connected
        toast.success('GitHub connected!', 'Your account has been linked successfully.')
        
        // Step 3: Update UI to show connected state
        await refreshUser()
        setSyncing(false)
        
        // Clear URL parameters
        window.history.replaceState({}, '', '/dashboard')
        
        // Wait a moment for user to see the connected state
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Step 4: Show fetching data
        toast.showToast({ title: 'Fetching GitHub data...', description: 'Importing your repositories and metrics (This might take a while).', variant: 'default' })
        
        // Call sync endpoint to fetch all data (slow)
        const syncResponse = await integrationAPI.githubSync()
        
        // Step 5: Show fetch complete
        toast.success('Data fetch complete!', `Successfully imported ${syncResponse.data.projects_added} repositories and comprehensive metrics.`)
        
        // Reload graph data to show new nodes
        await loadGraphData()
        
      } catch (error: any) {
        toast.error('Connection failed', error.response?.data?.detail || 'Failed to connect GitHub')
        window.history.replaceState({}, '', '/dashboard')
        setSyncing(false)
      }
    }

    // Handle callback from URL (fallback for non-popup flow)
    if (githubCode) {
      processGitHubCallback(githubCode)
    } else if (error) {
      toast.error('GitHub connection failed', decodeURIComponent(error))
      window.history.replaceState({}, '', '/dashboard')
    }

    // Listen for messages from popup window
    const handleMessage = (event: MessageEvent) => {
      // Security: verify origin if needed
      if (event.data.type === 'github_code') {
        processGitHubCallback(event.data.code)
      } else if (event.data.type === 'github_error') {
        toast.error('GitHub authorization failed', event.data.error)
        setSyncing(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])


  const loadGraphData = async () => {
    if (!user) return
    try {
      const response = await graphAPI.getGraph(user.username)
      setGraphData(response.data)
    } catch (error) {
      console.error('Failed to load graph:', error)
    } finally {
      setLoadingGraph(false)
    }
  }

  const loadSummary = async () => {
    if (!user) return
    try {
      const response = await aiAPI.getSummary(user.username)
      setSummary(response.data)
    } catch (error) {
      // Summary might not exist yet
      console.log('No summary available')
    }
  }

  const loadProfile = async () => {
    if (!user) return
    try {
      const response = await userAPI.getProfile(user.username)
      const profile = response.data
      
      // Load basic info
      setFullName(profile.full_name || '')
      setEmail(profile.email || '')
      setPhone(profile.phone || '')
      setLocation(profile.location || '')
      setGender(profile.gender || '')
      setEthnicity(profile.ethnicity || '')
      setLinkedinUrl(profile.linkedin_url || '')
      setWebsiteUrl(profile.website_url || '')
      setTwitterUrl(profile.twitter_url || '')
      
      // Load education
      if (profile.education && profile.education.length > 0) {
        setEducation(profile.education)
      }
      
      // Load experiences
      if (profile.experiences && profile.experiences.length > 0) {
        setExperiences(profile.experiences)
      }
      
      // Load projects
      if (profile.projects && profile.projects.length > 0) {
        setProjects(profile.projects)
      }
    } catch (error) {
      console.log('No profile data available')
    }
  }

  const handleGitHubSync = async () => {
    if (!user) return
    setSyncing(true)
    try {
      if (!user.github_connected) {
        const response = await integrationAPI.githubAuthorize()
        // Open in new tab (GitHub blocks iframes)
        toast.success('Opening GitHub...', 'Authorize in the new tab to connect.')
        window.open(response.data.authorization_url, '_blank')
      } else {
        // Show syncing notification
        toast.showToast({ title: 'Syncing GitHub data...', description: 'Fetching your latest repositories and metrics.', variant: 'default' })
        
        const response = await integrationAPI.githubSync()
        await loadGraphData()
        
        // Show completion notification
        toast.success('Sync complete!', `Successfully synced ${response.data.projects_added} repositories and metrics.`)
        setSyncing(false)
      }
    } catch (error: any) {
      toast.error('Sync failed', error.response?.data?.detail || 'Failed to sync GitHub repositories.')
      setSyncing(false)
    }
  }

  const handleGitHubDisconnect = async () => {
    if (!user) return
    setSyncing(true)
    try {
      await integrationAPI.githubDisconnect()
      toast.success('GitHub disconnected', 'Your GitHub integration has been removed.')
      // Refresh user state to update button
      await refreshUser()
    } catch (error: any) {
      toast.error('Disconnect failed', error.response?.data?.detail || 'Failed to disconnect GitHub.')
    } finally {
      setSyncing(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!user) return
    setGeneratingSummary(true)
    try {
      const response = await aiAPI.generateSummary(user.username)
      setSummary(response.data)
      toast.success('Summary generated!', 'Your AI summary has been created successfully.')
    } catch (error: any) {
      toast.error('Generation failed', error.response?.data?.detail || 'Failed to generate AI summary.')
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      const profileData = {
        full_name: fullName,
        email: email,
        phone: phone,
        location: location,
        gender: gender,
        ethnicity: ethnicity,
        linkedin_url: linkedinUrl,
        website_url: websiteUrl,
        twitter_url: twitterUrl,
        education: education,
        experiences: experiences,
        projects: projects
      }
      
      await userAPI.updateProfile(profileData)

      toast.success('Profile saved!', 'Your profile information has been updated successfully.')
    } catch (error: any) {
      toast.error('Failed to save profile', error.response?.data?.detail || 'An error occurred while saving your profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeletingAccount(true)
    try {
      await userAPI.deleteAccount()
      toast.success('Account deleted', 'Your account has been permanently deleted.')
      // Clear local storage and logout
      localStorage.removeItem('crux_token')
      logout()
      // Redirect to home page
      router.push('/')
    } catch (error: any) {
      toast.error('Failed to delete account', error.response?.data?.detail || 'An error occurred while deleting your account.')
      setDeletingAccount(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
        <div className="text-[rgb(var(--muted-foreground))]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] relative overflow-hidden">
      {/* Subtle Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--muted))]/30 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgb(var(--muted))]/20 via-transparent to-transparent" />
      
      {/* Floating Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-6xl"
      >
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
              <Link href={`/${user.username}`}>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                  Profile
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                className="rounded-full border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-serif text-[rgb(var(--foreground))] mb-3">
            Welcome back, <span className="italic font-light">{user.username}</span>
          </h1>
          <p className="text-xl text-[rgb(var(--muted-foreground))]">
            Manage your professional graph and connections
          </p>
        </motion.div>

        {/* Integrations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-[rgb(var(--border))]">
            <CardHeader>
              <CardTitle className="text-3xl font-serif">Integrations</CardTitle>
              <CardDescription>Connect your accounts to sync data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className={`flex-1 justify-start h-16 rounded-xl text-base relative ${
                    user.github_connected ? 'border-green-500/50 bg-green-500/5' : ''
                  }`}
                  onClick={handleGitHubSync}
                  disabled={syncing}
                >
                  <Github className="h-6 w-6 mr-4" />
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{user.github_connected ? 'Sync GitHub' : 'Connect GitHub'}</span>
                      {user.github_connected && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                            <circle cx="6" cy="6" r="6"/>
                          </svg>
                          Connected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[rgb(var(--muted-foreground))]">
                      {user.github_connected 
                        ? `@${user.github_username || 'GitHub'} • Sync your repositories and contributions` 
                        : 'Import repositories and contribution data'}
                    </div>
                  </div>
                </Button>
                {user.github_connected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-16 w-16 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={handleGitHubDisconnect}
                    disabled={syncing}
                    title="Disconnect GitHub"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/>
                      <path d="m6 6 12 12"/>
                    </svg>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Summary */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="border-[rgb(var(--border))]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    <CardTitle className="text-2xl font-serif">AI Summary</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="rounded-full"
                  >
                    Regenerate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-[rgb(var(--foreground))] mb-2">
                  {summary.headline}
                </h3>
                <p className="text-[rgb(var(--muted-foreground))]">{summary.narrative}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border-[rgb(var(--border))]">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Profile Information</CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <button
                      onClick={() => setIsBasicInfoOpen(!isBasicInfoOpen)}
                      className="flex items-center gap-2 text-lg font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))] transition-colors"
                    >
                      <User className="h-5 w-5" />
                      Basic Information
                      <ChevronDown className={`h-4 w-4 transition-transform ${isBasicInfoOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isBasicInfoOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Current Location</Label>
                        <Input
                          id="location"
                          placeholder="San Francisco, CA"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="non-binary">Non-binary</SelectItem>
                            <SelectItem value="decline">Decline to Self-Identify</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ethnicity">Ethnicity</Label>
                        <Select value={ethnicity} onValueChange={setEthnicity}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select ethnicity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="american-indian">American Indian or Alaskan Native</SelectItem>
                            <SelectItem value="asian">Asian</SelectItem>
                            <SelectItem value="black">Black or African American</SelectItem>
                            <SelectItem value="white">White</SelectItem>
                            <SelectItem value="hawaiian">Native Hawaiian or Other Pacific Islander</SelectItem>
                            <SelectItem value="two-or-more">Two or More Races</SelectItem>
                            <SelectItem value="decline">Decline to Self-Identify</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">
                          <Linkedin className="h-4 w-4 inline mr-1" />
                          LinkedIn URL
                        </Label>
                        <Input
                          id="linkedin"
                          placeholder="https://linkedin.com/in/johndoe"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">
                          <Globe className="h-4 w-4 inline mr-1" />
                          Personal Website
                        </Label>
                        <Input
                          id="website"
                          placeholder="https://johndoe.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="twitter">
                          <Twitter className="h-4 w-4 inline mr-1" />
                          Twitter URL
                        </Label>
                        <Input
                          id="twitter"
                          placeholder="https://twitter.com/johndoe"
                          value={twitterUrl}
                          onChange={(e) => setTwitterUrl(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Education */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setIsEducationOpen(!isEducationOpen)}
                        className="flex items-center gap-2 text-lg font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))] transition-colors"
                      >
                        <GraduationCap className="h-5 w-5" />
                        Education
                        <ChevronDown className={`h-4 w-4 transition-transform ${isEducationOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isEducationOpen && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEducation([...education, { university: '', degreeLevel: '', major: '', gpa: '', description: '', startDate: '', endDate: '' }])}
                          className="rounded-full"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                    <AnimatePresence>
                      {isEducationOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="space-y-4 overflow-hidden"
                        >
                          {education.map((edu, index) => (
                            <div key={index} className="p-4 rounded-xl border border-[rgb(var(--border))] space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[rgb(var(--muted-foreground))]">Education #{index + 1}</span>
                          {education.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newEdu = education.filter((_, i) => i !== index)
                                setEducation(newEdu)
                              }}
                              className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="University"
                            value={edu.university}
                            onChange={(e) => {
                              const newEdu = [...education]
                              newEdu[index].university = e.target.value
                              setEducation(newEdu)
                            }}
                            className="h-11 rounded-xl"
                          />
                          <Select 
                            value={edu.degreeLevel} 
                            onValueChange={(value) => {
                              const newEdu = [...education]
                              newEdu[index].degreeLevel = value
                              setEducation(newEdu)
                            }}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Degree Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high-school">High School Diploma</SelectItem>
                              <SelectItem value="associate">Associate's Degree</SelectItem>
                              <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                              <SelectItem value="master">Master's Degree</SelectItem>
                              <SelectItem value="phd">Ph.D.</SelectItem>
                              <SelectItem value="professional">Professional Degree</SelectItem>
                              <SelectItem value="certificate">Certificate</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Major / Field of Study"
                            value={edu.major}
                            onChange={(e) => {
                              const newEdu = [...education]
                              newEdu[index].major = e.target.value
                              setEducation(newEdu)
                            }}
                            className="h-11 rounded-xl"
                          />
                          <Input
                            placeholder="GPA (e.g., 3.8)"
                            value={edu.gpa}
                            onChange={(e) => {
                              const newEdu = [...education]
                              newEdu[index].gpa = e.target.value
                              setEducation(newEdu)
                            }}
                            className="h-11 rounded-xl"
                          />
                        </div>
                        <Textarea
                          placeholder="Description (relevant coursework, clubs, achievements, etc.)"
                          value={edu.description}
                          onChange={(e) => {
                            const newEdu = [...education]
                            newEdu[index].description = e.target.value
                            setEducation(newEdu)
                          }}
                          className="rounded-xl min-h-[80px]"
                        />
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Start Date (MM/YYYY)"
                            value={edu.startDate}
                            onChange={(e) => {
                              const newEdu = [...education]
                              newEdu[index].startDate = e.target.value
                              setEducation(newEdu)
                            }}
                            className="h-11 rounded-xl"
                          />
                          <Input
                            placeholder="End Date (MM/YYYY)"
                            value={edu.endDate}
                            onChange={(e) => {
                              const newEdu = [...education]
                              newEdu[index].endDate = e.target.value
                              setEducation(newEdu)
                            }}
                            className="h-11 rounded-xl"
                          />
                        </div>
                      </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Experience */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setIsExperienceOpen(!isExperienceOpen)}
                        className="flex items-center gap-2 text-lg font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))] transition-colors"
                      >
                        <Briefcase className="h-5 w-5" />
                        Experience
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExperienceOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isExperienceOpen && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExperiences([...experiences, { title: '', company: '', description: '', startDate: '', endDate: '', isPresent: false }])}
                          className="rounded-full"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                    <AnimatePresence>
                      {isExperienceOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="space-y-4 overflow-hidden"
                        >
                          {experiences.map((exp, index) => (
                            <div key={index} className="p-4 rounded-xl border border-[rgb(var(--border))] space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[rgb(var(--muted-foreground))]">Experience #{index + 1}</span>
                          {experiences.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newExp = experiences.filter((_, i) => i !== index)
                                setExperiences(newExp)
                              }}
                              className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Title"
                            value={exp.title}
                            onChange={(e) => {
                              const newExp = [...experiences]
                              newExp[index].title = e.target.value
                              setExperiences(newExp)
                            }}
                            className="h-11 rounded-xl"
                          />
                          <Input
                            placeholder="Company"
                            value={exp.company}
                            onChange={(e) => {
                              const newExp = [...experiences]
                              newExp[index].company = e.target.value
                              setExperiences(newExp)
                            }}
                            className="h-11 rounded-xl"
                          />
                        </div>
                        <Textarea
                          placeholder="Description"
                          value={exp.description}
                          onChange={(e) => {
                            const newExp = [...experiences]
                            newExp[index].description = e.target.value
                            setExperiences(newExp)
                          }}
                          className="rounded-xl min-h-[100px]"
                        />
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={exp.isPresent}
                                  onChange={(e) => {
                                    const newExp = [...experiences]
                                    newExp[index].isPresent = e.target.checked
                                    if (e.target.checked) {
                                      newExp[index].endDate = ''
                                    }
                                    setExperiences(newExp)
                                  }}
                                  className="peer sr-only"
                                />
                                <div className="w-11 h-6 bg-[rgb(var(--muted))] rounded-full peer-checked:bg-[rgb(var(--primary))] transition-colors"></div>
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                              </div>
                              <span className="text-sm font-medium text-[rgb(var(--foreground))]">
                                I currently work here
                              </span>
                            </label>
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <Input
                              placeholder="Start Date (MM/YYYY)"
                              value={exp.startDate}
                              onChange={(e) => {
                                const newExp = [...experiences]
                                newExp[index].startDate = e.target.value
                                setExperiences(newExp)
                              }}
                              className="h-11 rounded-xl"
                            />
                            <Input
                              placeholder={exp.isPresent ? "Present" : "End Date (MM/YYYY)"}
                              value={exp.isPresent ? '' : exp.endDate}
                              onChange={(e) => {
                                const newExp = [...experiences]
                                newExp[index].endDate = e.target.value
                                setExperiences(newExp)
                              }}
                              disabled={exp.isPresent}
                              className="h-11 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Projects */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                        className="flex items-center gap-2 text-lg font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))] transition-colors"
                      >
                        <FolderGit2 className="h-5 w-5" />
                        Projects
                        <ChevronDown className={`h-4 w-4 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isProjectsOpen && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setProjects([...projects, { name: '', description: '', url: '' }])}
                          className="rounded-full"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                    <AnimatePresence>
                      {isProjectsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="space-y-4 overflow-hidden"
                        >
                          {projects.map((project, index) => (
                            <div key={index} className="p-4 rounded-xl border border-[rgb(var(--border))] space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[rgb(var(--muted-foreground))]">Project #{index + 1}</span>
                          {projects.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newProjects = projects.filter((_, i) => i !== index)
                                setProjects(newProjects)
                              }}
                              className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Project Name"
                          value={project.name}
                          onChange={(e) => {
                            const newProjects = [...projects]
                            newProjects[index].name = e.target.value
                            setProjects(newProjects)
                          }}
                          className="h-11 rounded-xl"
                        />
                        <Textarea
                          placeholder="Description"
                          value={project.description}
                          onChange={(e) => {
                            const newProjects = [...projects]
                            newProjects[index].description = e.target.value
                            setProjects(newProjects)
                          }}
                          className="rounded-xl min-h-[100px]"
                        />
                        <Input
                          placeholder="URL (optional)"
                          value={project.url}
                          onChange={(e) => {
                            const newProjects = [...projects]
                            newProjects[index].url = e.target.value
                            setProjects(newProjects)
                          }}
                          className="h-11 rounded-xl"
                        />
                      </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <Button 
                      className="w-full h-12 rounded-xl text-base"
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                    >
                      {savingProfile ? 'Saving...' : 'Save Profile Information'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

        {/* Graph Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border-[rgb(var(--border))]">
            <CardHeader>
              <CardTitle className="text-3xl font-serif">Your Professional Graph</CardTitle>
              <CardDescription>
                Visualize the connections between your projects, skills, and experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] rounded-xl overflow-hidden bg-[rgb(var(--muted))]/30">
                {loadingGraph ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-[rgb(var(--muted-foreground))]">Loading graph...</div>
                  </div>
                ) : (
                  <GraphVisualization
                    nodes={graphData?.nodes || []}
                    edges={graphData?.edges || []}
                    interactive={true}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Deletion - Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-[rgb(var(--danger))]/20 bg-[rgb(var(--danger))]/5">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-[rgb(var(--danger))] flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-[rgb(var(--danger))]/80">
                Permanently delete your account and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-[rgb(var(--muted-foreground))]">
                  Deleting your account will permanently remove:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-[rgb(var(--muted-foreground))] ml-2">
                  <li>Your profile and all personal information</li>
                  <li>All GitHub integration data and metrics</li>
                  <li>Your professional graph and all connections</li>
                  <li>All AI-generated summaries</li>
                </ul>
                <div className="pt-4">
                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      className="w-full h-12 rounded-xl text-base"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-[rgb(var(--danger))]/10 border border-[rgb(var(--danger))]/20">
                        <p className="text-sm font-semibold text-[rgb(var(--danger))] mb-2">
                          Are you absolutely sure?
                        </p>
                        <p className="text-sm text-[rgb(var(--muted-foreground))]">
                          This action cannot be undone. All your data will be permanently deleted.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 h-12 rounded-xl"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deletingAccount}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 h-12 rounded-xl"
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                        >
                          {deletingAccount ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Yes, Delete My Account
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>

    </div>
  )
}
