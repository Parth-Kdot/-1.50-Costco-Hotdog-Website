import { useEffect } from 'react'
import { Hero } from './components/Hero'
import { PoleDisplay } from './components/PoleDisplay'
import { Members } from './components/Members'
import { Scanner } from './components/Scanner'
import { Receipt } from './components/Receipt'
import { Footer } from './components/Footer'
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
        <Scanner />
        <Receipt />
      </main>
      <Footer />
    </>
  )
}
