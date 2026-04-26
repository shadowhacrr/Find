import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Battery, Volume2, Shield, Wifi, WifiOff, LogOut, Bell } from 'lucide-react'

const API_URL = ''
const UPDATE_INTERVAL = 5000 // 5 seconds

interface DeviceStatus {
  isRinging: boolean
  lastSeen: string
  location?: {
    latitude: number
    longitude: number
    accuracy?: number
    timestamp: string
  }
  battery?: {
    level: number
    charging: boolean
    timestamp: string
  }
}

export default function DevicePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [auth, setAuth] = useState<{ username: string; pin: string } | null>(null)
  const [status, setStatus] = useState<DeviceStatus | null>(null)
  const [connected, setConnected] = useState(false)
  const [isRinging, setIsRinging] = useState(false)
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [batteryInfo, setBatteryInfo] = useState<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ringIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('device_auth')
    if (!saved) {
      navigate('/')
      return
    }
    try {
      const parsed = JSON.parse(saved)
      if (parsed.username !== username) {
        navigate('/')
        return
      }
      setAuth(parsed)
    } catch {
      navigate('/')
    }
  }, [username, navigate])

  // Get battery info
  useEffect(() => {
    const getBattery = async () => {
      try {
        // @ts-ignore - Battery API is not in all browsers
        const battery = await navigator.getBattery?.()
        if (battery) {
          setBatteryInfo({
            level: battery.level,
            charging: battery.charging,
          })
          battery.addEventListener('levelchange', () => {
            setBatteryInfo({
              level: battery.level,
              charging: battery.charging,
            })
          })
        }
      } catch {
        // Battery API not supported
      }
    }
    getBattery()
  }, [])

  // Get location
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation(pos),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Send updates and check for ring command
  useEffect(() => {
    if (!auth) return

    const sendUpdate = async () => {
      try {
        const body: any = {
          username: auth.username,
          pin: auth.pin,
          lastSeen: new Date().toISOString(),
        }

        if (location) {
          body.location = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          }
        }

        if (batteryInfo) {
          body.battery = {
            level: batteryInfo.level,
            charging: batteryInfo.charging,
          }
        }

        const res = await fetch(`${API_URL}/api/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (res.ok) {
          const data = await res.json()
          setConnected(true)
          setStatus(data)
          if (data.isRinging && !isRinging) {
            startRinging()
          } else if (!data.isRinging && isRinging) {
            stopRinging()
          }
        }
      } catch {
        setConnected(false)
      }
    }

    sendUpdate()
    const interval = setInterval(sendUpdate, UPDATE_INTERVAL)
    return () => clearInterval(interval)
  }, [auth, location, batteryInfo, isRinging])

  const startRinging = useCallback(() => {
    setIsRinging(true)
    
    // Create and play audio
    const audio = new Audio()
    audio.loop = true
    audio.volume = 1.0
    // Use a data URI for a loud beep sound
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE'
    // Actually let's use a more reliable method - oscillators
    audioRef.current = audio
    
    // Use Web Audio API for a loud alarm
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      gain.gain.setValueAtTime(1.0, ctx.currentTime)
      osc.start()
      
      // Modulate for alarm effect
      const interval = window.setInterval(() => {
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        setTimeout(() => {
          osc.frequency.setValueAtTime(600, ctx.currentTime)
        }, 200)
      }, 400)
      
      ringIntervalRef.current = interval
      
      // Store stop function
      ;(audioRef.current as any).stopRing = () => {
        clearInterval(interval)
        osc.stop()
        ctx.close()
      }
    } catch {
      // Fallback: try to play a simple beep
      try {
        audio.play().catch(() => {})
      } catch {}
    }
  }, [])

  const stopRinging = useCallback(() => {
    setIsRinging(false)
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current)
      ringIntervalRef.current = null
    }
    if ((audioRef.current as any)?.stopRing) {
      ;(audioRef.current as any).stopRing()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('device_auth')
    stopRinging()
    navigate('/')
  }

  const handleManualStopRing = async () => {
    if (!auth) return
    try {
      await fetch(`${API_URL}/api/stop-ring/${auth.username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: auth.username, pin: auth.pin }),
      })
    } catch {}
    stopRinging()
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <AnimatePresence>
        {isRinging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-red-500/90 flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="mb-8"
            >
              <Volume2 className="h-24 w-24 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold mb-4">DEVICE IS RINGING!</h1>
            <p className="text-xl mb-8">Your device is being located</p>
            <Button
              onClick={handleManualStopRing}
              className="bg-white text-red-500 hover:bg-gray-100 px-8 py-6 text-lg rounded-xl font-bold"
            >
              Stop Ringing
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold">{auth.username}</h1>
              <div className="flex items-center gap-2 text-sm">
                {connected ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <Wifi className="h-4 w-4" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <WifiOff className="h-4 w-4" /> Offline
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
            <LogOut className="h-5 w-5" />
          </Button>
        </motion.div>

        <div className="grid gap-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-slate-900/80 border-purple-500/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-400" /> Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {location ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-mono">
                      {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                    </p>
                    <p className="text-sm text-slate-400">
                      Accuracy: {Math.round(location.coords.accuracy || 0)} meters
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-purple-400 hover:text-purple-300 text-sm"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-500">Getting location...</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-slate-900/80 border-purple-500/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Battery className="h-5 w-5 text-yellow-400" /> Battery
                </CardTitle>
              </CardHeader>
              <CardContent>
                {batteryInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold">{Math.round(batteryInfo.level * 100)}%</span>
                      <span className={batteryInfo.charging ? 'text-green-400' : 'text-slate-400'}>
                        {batteryInfo.charging ? 'Charging' : 'Discharging'}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          batteryInfo.level > 0.5 ? 'bg-green-400' : batteryInfo.level > 0.2 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${batteryInfo.level * 100}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">Battery info not available on this device</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-slate-900/80 border-purple-500/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-pink-400" /> Device Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Status</span>
                    <span className={`font-semibold ${connected ? 'text-green-400' : 'text-red-400'}`}>
                      {connected ? 'Active & Reporting' : 'Connection Lost'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Last Update</span>
                    <span className="text-slate-400">{status ? new Date(status.lastSeen).toLocaleTimeString() : 'Never'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Ring Status</span>
                    <span className={`font-semibold ${isRinging ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                      {isRinging ? 'RINGING!' : 'Idle'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 pt-2">
                    Keep this page open on your device. If you lose it, open Telegram bot and select &quot;{auth.username}&quot; to locate it.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={handleManualStopRing}
              variant="outline"
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 py-5"
            >
              <Volume2 className="mr-2 h-4 w-4" /> Test Ring Sound
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
