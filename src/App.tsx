import { useEffect } from 'react'
import { Hero } from './components/Hero'
import { PoleDisplay } from './components/PoleDisplay'
import { Members } from './components/Members'
import { startSmoothScroll } from './lib/scroll'

export default function App() {
  useEffect(() => {
    startSmoothScroll()
  }, [])

  return (
    <>
      <PoleDisplay />
      <main>
        <Hero />
        <Members />
        <div style={{ height: '100vh' }} />
      </main>
    </>
  )
}
