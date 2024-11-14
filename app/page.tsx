// app/page.tsx
import ImprovedBeatDetectionTimeline from '@/components/ImprovedBeatDetectionTimeline'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Beat Detection Timeline</h1>
      <ImprovedBeatDetectionTimeline />
    </main>
  )
}