"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Network, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const { login, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Auth Form */}
      <div className="relative bg-[rgb(var(--background))] flex items-center justify-center p-6 lg:p-12">
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Home</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <div className="bg-[rgb(var(--primary))] p-2 rounded-lg">
              <Network className="h-6 w-6 text-[rgb(var(--primary-foreground))]" />
            </div>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-serif text-[rgb(var(--foreground))] mb-3">
              Welcome back
            </h1>
            <p className="text-[rgb(var(--muted-foreground))]">
              Log in to your professional graph
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </Button>

            <p className="text-center text-sm text-[rgb(var(--muted-foreground))]">
              Don't have an account?{' '}
              <Link href="/signup" className="text-[rgb(var(--foreground))] hover:opacity-70 font-medium underline">
                Sign up
              </Link>
            </p>
          </form>
        </motion.div>
      </div>

      {/* Right Side - Hero Content */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 items-center justify-center p-12 overflow-hidden">
        {/* Starry Background Effect */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(2px 2px at 20% 30%, white, transparent), radial-gradient(2px 2px at 60% 70%, white, transparent), radial-gradient(1px 1px at 50% 50%, white, transparent), radial-gradient(1px 1px at 80% 10%, white, transparent), radial-gradient(2px 2px at 90% 60%, white, transparent), radial-gradient(1px 1px at 33% 80%, white, transparent)',
            backgroundSize: '200px 200px, 300px 300px, 250px 250px, 350px 350px, 400px 400px, 180px 180px'
          }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 text-center max-w-lg"
        >
          <h2 className="text-5xl md:text-6xl font-serif text-white mb-6 leading-tight">
            Your graph is<br />
            <span className="italic font-light">growing</span> every day.
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Keep building connections. Keep mapping your journey.
          </p>
          
          {/* Decorative Element */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 border-2 border-slate-900" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-slate-900" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 border-2 border-slate-900" />
            </div>
            <span className="text-sm text-slate-300">Trusted by professionals</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
