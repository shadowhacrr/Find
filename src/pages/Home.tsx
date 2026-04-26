import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Shield, Smartphone, Volume2, Battery, Search, ArrowRight } from 'lucide-react'

const API_URL = ''

export default function Home() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('device_auth')
    if (saved) {
      try {
        const auth = JSON.parse(saved)
        if (auth.username && auth.pin) {
          navigate(`/device/${auth.username}`)
        }
      } catch { /* ignore */ }
    }
  }, [navigate])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          pin: pin.trim(),
          telegramChatId: telegramChatId.trim() || undefined,
          userAgent: navigator.userAgent,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      localStorage.setItem('device_auth', JSON.stringify({ username: username.trim(), pin: pin.trim() }))
      navigate(`/device/${username.trim()}`)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <AnimatedBackground />
      
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <motion.nav 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-between mb-16"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-8 w-8 text-purple-400" />
              <motion.div
                className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Find Your <span className="text-purple-400">Lost Device</span>
            </h1>
          </div>
          <div className="text-sm text-slate-400">Secure Device Tracking</div>
        </motion.nav>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <h2 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Never Lose Your{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Phone Again
              </span>
            </h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Register your device, and if it ever goes missing, simply open your Telegram bot 
              to track its location, check battery status, or make it ring loudly.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: MapPin, text: 'Live Location Tracking' },
                { icon: Battery, text: 'Battery Monitoring' },
                { icon: Volume2, text: 'Remote Ringing' },
                { icon: Shield, text: 'Owner-Only Access' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.15 }}
                  className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10"
                >
                  <item.icon className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-sm font-medium">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
              >
                Register Your Device <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative"
          >
            <div className="relative mx-auto w-72 h-[500px]">
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-pink-500/20 rounded-[3rem] blur-xl"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <div className="relative bg-slate-900 border-4 border-slate-700 rounded-[2.5rem] h-full overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-800 rounded-b-xl" />
                <div className="p-6 pt-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <Smartphone className="h-6 w-6 text-purple-400" />
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      <div className="h-2 w-2 rounded-full bg-yellow-400" />
                    </div>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center gap-3 mb-2">
                        <MapPin className="h-5 w-5 text-green-400" />
                        <span className="text-sm font-semibold">Location Active</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-green-400 rounded-full" 
                          initial={{ width: '0%' }}
                          animate={{ width: '85%' }}
                          transition={{ duration: 1.5, delay: 1 }}
                        />
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center gap-3 mb-2">
                        <Battery className="h-5 w-5 text-yellow-400" />
                        <span className="text-sm font-semibold">Battery: 78%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-yellow-400 rounded-full" 
                          initial={{ width: '0%' }}
                          animate={{ width: '78%' }}
                          transition={{ duration: 1.5, delay: 1.2 }}
                        />
                      </div>
                    </div>
                    <motion.div 
                      className="bg-red-500/20 border border-red-500/30 rounded-xl p-4"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="flex items-center gap-3">
                        <Volume2 className="h-5 w-5 text-red-400" />
                        <span className="text-sm font-semibold text-red-300">Ringing...</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-md bg-slate-900/90 border-purple-500/30 backdrop-blur-xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-center text-white">Register Your Device</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">Device Username</label>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. MyPhone123"
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        required
                        minLength={3}
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">Secret PIN</label>
                      <Input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="4-10 digit PIN"
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        required
                        minLength={4}
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">Telegram Chat ID (optional)</label>
                      <Input
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="Your Telegram Chat ID"
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Send /start to @userinfobot on Telegram to get your Chat ID
                      </p>
                    </div>
                    {error && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm text-center"
                      >
                        {error}
                      </motion.p>
                    )}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-5 rounded-xl"
                    >
                      {loading ? 'Registering...' : 'Register Device'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const particles: { x: number; y: number; r: number; dx: number; dy: number; color: string }[] = []
    const colors = ['rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.3)', 'rgba(99, 102, 241, 0.3)']

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animId: number
    function animate() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x += p.dx
        p.y += p.dy

        if (p.x < 0 || p.x > width) p.dx *= -1
        if (p.y < 0 || p.y > height) p.dy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 * (1 - dist / 150)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0" />
}
