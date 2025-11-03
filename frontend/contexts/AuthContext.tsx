"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '@/lib/api'

interface User {
  id: string
  email: string
  username: string
  github_connected: boolean
  github_username?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, username: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('crux_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.getMe()
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('crux_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password })
    const { access_token, user_id, username } = response.data
    
    localStorage.setItem('crux_token', access_token)
    
    // Fetch full user data
    const userResponse = await authAPI.getMe()
    setUser(userResponse.data)
  }

  const signup = async (email: string, password: string, username: string) => {
    const response = await authAPI.signup({ email, password, username })
    const { access_token } = response.data
    
    localStorage.setItem('crux_token', access_token)
    
    // Fetch full user data
    const userResponse = await authAPI.getMe()
    setUser(userResponse.data)
  }

  const logout = () => {
    localStorage.removeItem('crux_token')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe()
      setUser(response.data)
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
