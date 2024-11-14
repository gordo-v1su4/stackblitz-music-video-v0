'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const THUMBNAIL_COUNT = 5

export default function ImprovedBeatDetectionTimeline() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0)
  const [beatDetected, setBeatDetected] = useState(false)
  const [beatCount, setBeatCount] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    if (audioFile) {
      const audio = audioRef.current
      if (audio) {
        audio.src = URL.createObjectURL(audioFile)
        audio.onloadedmetadata = () => {
          setDuration(audio.duration)
        }

        // Set up Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioContext
        const sourceNode = audioContext.createMediaElementSource(audio)
        sourceNodeRef.current = sourceNode
        const analyser = audioContext.createAnalyser()
        analyserRef.current = analyser
        sourceNode.connect(analyser)
        analyser.connect(audioContext.destination)

        // Set up beat detection
        analyser.fftSize = 256
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        let lastBeatTime = 0
        const detectBeat = () => {
          analyser.getByteFrequencyData(dataArray)
          const currentTime = audioContext.currentTime
          
          // Focus on lower frequencies for beat detection
          const bassEnergy = dataArray.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10
          
          if (bassEnergy > 200 && currentTime - lastBeatTime > 0.3) { // Adjusted threshold
            setBeatDetected(true)
            setBeatCount(prev => prev + 1)
            setCurrentThumbnailIndex(prev => (prev + 1) % THUMBNAIL_COUNT)
            lastBeatTime = currentTime
            setTimeout(() => setBeatDetected(false), 100)
          }

          requestAnimationFrame(detectBeat)
        }

        detectBeat()
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [audioFile])

  useEffect(() => {
    const drawWaveform = () => {
      const canvas = canvasRef.current
      const audio = audioRef.current
      if (!canvas || !audio || !audioFile) return

      const context = canvas.getContext('2d')
      if (!context) return

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const reader = new FileReader()

      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const data = audioBuffer.getChannelData(0)
        
        const step = Math.ceil(data.length / canvas.width)
        const amp = canvas.height / 2

        context.clearRect(0, 0, canvas.width, canvas.height)
        context.beginPath()
        context.moveTo(0, amp)

        for (let i = 0; i < canvas.width; i++) {
          let min = 1.0
          let max = -1.0
          for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j]
            if (datum < min) min = datum
            if (datum > max) max = datum
          }
          context.lineTo(i, (1 + min) * amp)
        }

        context.strokeStyle = '#22c55e'
        context.stroke()
      }

      reader.readAsArrayBuffer(audioFile)
    }

    drawWaveform()
  }, [audioFile])

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setAudioFile(file)
      setBeatCount(0)
      setCurrentThumbnailIndex(0)
    }
  }

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (audio) {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (newTime: number[]) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = newTime[0]
      setCurrentTime(newTime[0])
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-xl">
      <div className="mb-6">
        <input
          type="file"
          accept="audio/*"
          onChange={handleAudioUpload}
          className="hidden"
          id="audio-upload"
        />
        <label htmlFor="audio-upload">
          <Button variant="outline" asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              Upload Audio
            </span>
          </Button>
        </label>
      </div>

      <div className="relative mb-4 bg-gray-800 rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width={600} height={150} className="w-full" />
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <Button variant="outline" size="icon" onClick={togglePlayPause}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-grow"
        />
        <span className="text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {[...Array(THUMBNAIL_COUNT)].map((_, index) => (
          <div 
            key={index} 
            className={`aspect-video bg-gray-700 rounded-md flex items-center justify-center relative ${
              index === currentThumbnailIndex ? 'ring-2 ring-neon-green ring-opacity-75' : ''
            }`}
          >
            <span className="text-xs text-gray-400">Thumbnail {index + 1}</span>
            {index === currentThumbnailIndex && (
              <div className="absolute inset-0 border-2 border-neon-green rounded-md animate-pulse" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Current Viewer</h3>
        <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl text-gray-400">
              Thumbnail {currentThumbnailIndex + 1}
            </span>
          </div>
          <div className={`absolute inset-0 border-4 rounded-lg transition-colors duration-100 ${
            beatDetected ? 'border-red-500' : 'border-neon-green'
          }`} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm">Beat Detected:</span>
        <div className={`w-4 h-4 rounded-full ${beatDetected ? 'bg-red-500' : 'bg-gray-500'}`} />
      </div>

      <div className="mt-2 text-center">
        <span className="text-lg font-semibold">Total Beats Detected: {beatCount}</span>
      </div>

      <audio 
        ref={audioRef} 
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  )
}