import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-2xl font-bold">Slide</div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-20">
          <div className="container flex flex-col items-center text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Transform Your Instagram Engagement with Slide
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
              Automate your Instagram DMs and comments to boost engagement, save time, and turn followers into
              customers.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link href="#pricing">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square rounded-full bg-muted overflow-hidden">
                  <img
                    src={
                      i === 1
                        ? "/social-media-dashboard.png"
                        : i === 2
                          ? "/instagram-automation.png"
                          : i === 3
                            ? "/digital-marketing.png"
                            : "/vibrant-market-scene.png"
                    }
                    alt={`Brand example ${i}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="pricing" className="py-20 bg-muted/50">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">Choose the Right Plan for You</h2>
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              <div className="rounded-lg border bg-card p-8">
                <h3 className="text-2xl font-bold">Free Plan</h3>
                <div className="mt-4 text-4xl font-bold">
                  $0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {["Boost engagement", "Automate comment replies", "Turn followers into customers"].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="mr-2 h-5 w-5 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-8 block">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
              <div className="rounded-lg border bg-card p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
                  Popular
                </div>
                <h3 className="text-2xl font-bold">Smart AI Plan</h3>
                <div className="mt-4 text-4xl font-bold">
                  $99<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {[
                    "All features from Free",
                    "AI-powered response generation",
                    "Advanced analytics",
                    "Priority support",
                    "Custom branding",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="mr-2 h-5 w-5 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-8 block">
                  <Button className="w-full">Upgrade Now</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Slide. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:underline">
              Terms
            </Link>
            <Link href="#" className="hover:underline">
              Privacy
            </Link>
            <Link href="#" className="hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
