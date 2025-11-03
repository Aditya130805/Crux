"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Network, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

const dynamicWords = ['linear', 'static', 'boring', 'hidden', 'scattered']

export default function Home() {
  const { user, loading, logout } = useAuth()
  const [wordIndex, setWordIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = dynamicWords[wordIndex]
    const typingSpeed = isDeleting ? 50 : 100
    const pauseTime = isDeleting ? 500 : 2000

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText.length < currentWord.length) {
          setDisplayText(currentWord.slice(0, displayText.length + 1))
        } else {
          // Finished typing, wait then start deleting
          setTimeout(() => setIsDeleting(true), pauseTime)
        }
      } else {
        // Deleting
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1))
        } else {
          // Finished deleting, move to next word
          setIsDeleting(false)
          setWordIndex((prev) => (prev + 1) % dynamicWords.length)
        }
      }
    }, typingSpeed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, wordIndex])

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] relative overflow-hidden">
      {/* Subtle Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--muted))]/30 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgb(var(--muted))]/20 via-transparent to-transparent" />
      
      {/* Floating Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl"
      >
        <div className="bg-[rgb(var(--card))]/80 backdrop-blur-xl border border-[rgb(var(--border))] rounded-2xl px-6 py-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-[rgb(var(--primary))] p-2 rounded-lg">
                <Network className="h-5 w-5 text-[rgb(var(--primary-foreground))]" />
              </div>
              <span className="text-xl font-bold text-[rgb(var(--foreground))]">Crux</span>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {!loading && (
                <>
                  {user ? (
                    <>
                      <Link href="/dashboard">
                        <Button variant="ghost" size="sm">
                          Dashboard
                        </Button>
                      </Link>
                      <Link href={`/${user.username}`}>
                        <Button variant="ghost" size="sm">
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
                    </>
                  ) : (
                    <>
                      <Link href="/login">
                        <Button variant="ghost" size="sm">
                          Log In
                        </Button>
                      </Link>
                      <Link href="/signup">
                        <Button size="sm" className="rounded-full">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-40 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-6xl mx-auto relative z-10"
        >
          {/* Main Headline */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif text-[rgb(var(--foreground))] mb-6 leading-[1.05] tracking-tight">
            Your career doesn't<br />have to be{' '}
            <span className="italic font-light inline-block min-w-[280px] text-left">
              {displayText}
              <span className="animate-pulse">|</span>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-2xl md:text-3xl text-[rgb(var(--foreground))] mb-8 font-light">
            Map it. Visualize it. Own it.
          </p>

          {/* Description */}
          <p className="text-lg md:text-xl text-[rgb(var(--muted-foreground))] mb-12 max-w-3xl mx-auto leading-relaxed">
            Crux transforms your professional identity into an interactive knowledge graph. 
            Connect your GitHub, projects, skills, and experience — see how everything relates in one beautiful view.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup">
              <Button size="lg" className="rounded-full h-14 px-10 text-base">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="rounded-full h-14 px-10 text-base">
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-8">
            Join professionals mapping their careers visually
          </p>
        </motion.div>
        
        {/* Decorative Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[rgb(var(--muted))]/20 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Feature 1: Map Everything */}
      <section className="relative max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif text-[rgb(var(--foreground))] mb-6 leading-tight">
              <span className="italic font-light">Map</span> everything
            </h2>
            <p className="text-lg text-[rgb(var(--muted-foreground))] mb-6">
              Connect all your professional data.
            </p>
            <p className="text-base text-[rgb(var(--muted-foreground))] leading-relaxed">
              Sync GitHub repos, projects, skills, and experience. See your career in one place — easy to find, easy to understand.
            </p>
          </motion.div>

          {/* ILLUSTRATION PLACEHOLDER 1 */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="relative h-[400px] rounded-3xl bg-[rgb(var(--muted))]/30 border border-[rgb(var(--border))] overflow-hidden"
          >
            <img 
              src="/illustrations/map.jpg"
              alt="Map everything"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Feature 2: Visualize */}
      <section className="relative max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="md:order-2"
          >
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif text-[rgb(var(--foreground))] mb-6 leading-tight">
              <span className="italic font-light">Visualize</span> relationships
            </h2>
            <p className="text-lg text-[rgb(var(--muted-foreground))] mb-6">
              See how everything connects.
            </p>
            <p className="text-base text-[rgb(var(--muted-foreground))] leading-relaxed">
              Unlike LinkedIn's chronological feed, Crux reveals patterns and expertise clusters — showing how your skills and projects interconnect.
            </p>
          </motion.div>

          {/* ILLUSTRATION PLACEHOLDER 2 */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="relative h-[400px] rounded-3xl bg-[rgb(var(--muted))]/30 border border-[rgb(var(--border))] overflow-hidden md:order-1"
          >
            <img 
              src="/illustrations/visualize.jpg"
              alt="Visualize relationships"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Feature 3: Share */}
      <section className="relative max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif text-[rgb(var(--foreground))] mb-6 leading-tight">
              <span className="italic font-light">Share</span> your story
            </h2>
            <p className="text-lg text-[rgb(var(--muted-foreground))] mb-6">
              AI-powered insights.
            </p>
            <p className="text-base text-[rgb(var(--muted-foreground))] leading-relaxed">
              Get intelligent summaries that tell your professional story. Share your unique graph with recruiters who want to understand the real you.
            </p>
          </motion.div>

          {/* ILLUSTRATION PLACEHOLDER 3 */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="relative h-[400px] rounded-3xl bg-[rgb(var(--muted))]/30 border border-[rgb(var(--border))] overflow-hidden"
          >
            <img 
              src="/illustrations/share.jpg"
              alt="Map everything"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative max-w-5xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif text-[rgb(var(--foreground))] mb-8 leading-tight">
            Start mapping your career
          </h2>
          <p className="text-lg text-[rgb(var(--muted-foreground))] mb-10">
            Join professionals who visualize their growth.
          </p>
          <Link href="/signup">
            <Button size="lg" className="rounded-full h-12 px-8">
              Get Started
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-[rgb(var(--muted-foreground))] text-sm">
          <p>© 2024 Crux. Built for professionals who think in networks.</p>
        </div>
      </footer>
    </div>
  )
}
