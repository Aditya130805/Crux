"use client"

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { integrationAPI } from '@/lib/api'

function GitHubCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      // Check for OAuth errors
      if (error) {
        router.push(`/dashboard?error=${encodeURIComponent('GitHub authorization failed')}`)
        return
      }

      // Validate code
      if (!code) {
        router.push('/dashboard?error=no_code')
        return
      }

      // Check if user is authenticated
      const token = localStorage.getItem('crux_token')
      if (!token) {
        router.push('/login?error=not_authenticated')
        return
      }

      try {
        // Call backend with the code (runs in background)
        await integrationAPI.githubCallback({ code })
        
        // Redirect immediately to dashboard
        router.push('/dashboard?github_synced=true&refresh=true')
      } catch (error: any) {
        console.error('GitHub callback error:', error)
        router.push(`/dashboard?error=${encodeURIComponent(error.response?.data?.detail || 'Failed to connect GitHub')}`)
      }
    }

    handleCallback()
  }, [searchParams, router])

  // Show nothing - just redirect
  return null
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GitHubCallbackHandler />
    </Suspense>
  )
}
