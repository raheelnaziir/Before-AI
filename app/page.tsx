import type { Metadata } from 'next'
import { Backdrop } from '@/components/landing/Backdrop'
import { CalibrationSection } from '@/components/landing/CalibrationSection'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { Footer } from '@/components/landing/Footer'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { MotionProvider } from '@/components/landing/MotionProvider'
import { Navbar } from '@/components/landing/Navbar'
import { ProductDemo } from '@/components/landing/ProductDemo'
import { PromptTypes } from '@/components/landing/PromptTypes'
import { WaitingProblem } from '@/components/landing/WaitingProblem'
import { WaitOSSection } from '@/components/landing/WaitOSSection'

export const metadata: Metadata = {
  title: 'Before AI — Think before the machine does.',
  description:
    'AI is getting faster. But while it thinks, we wait. Before AI turns that waiting time into an interactive prediction about your own prompt.',
}

/**
 * The introduction page.
 *
 * A server component that composes client islands — only the sections that
 * actually animate ship JS, and the whole page renders as readable HTML before
 * any of it hydrates. The round experience itself lives at /play and is
 * untouched by this route.
 */
export default function Page() {
  return (
    <MotionProvider>
      {/* `overflow-x-clip` is the guarantee against horizontal scroll: several
          ambient layers are deliberately wider than the viewport. */}
      <div className="relative min-h-dvh overflow-x-clip">
        <Backdrop />

        <a
          href="#main"
          className="sr-only rounded-lg bg-signal px-4 py-2 text-sm font-medium text-void focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60]"
        >
          Skip to content
        </a>

        <Navbar />

        <div className="relative z-10 mx-auto w-full max-w-[76rem] px-5 sm:px-8">
          <main id="main">
            <Hero />
            <WaitingProblem />
            <ProductDemo />
            <HowItWorks />
            <PromptTypes />
            <CalibrationSection />
            <WaitOSSection />
            <FinalCTA />
          </main>

          <Footer />
        </div>
      </div>
    </MotionProvider>
  )
}
