import { useEffect } from 'react'
import { Hero } from './components/Hero'
import { PoleDisplay } from './components/PoleDisplay'
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
        <div style={{ height: '200vh' }} />
      </main>
    </>
  )
}
