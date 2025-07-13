import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and subscription</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Your Current Plan</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden border-primary">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
              Active
            </div>
            <CardHeader>
              <CardTitle>Smart AI Plan</CardTitle>
              <CardDescription>$99/month</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
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
            </CardContent>
            <CardFooter>
              <Link href="#" className="w-full">
                <Button variant="outline" className="w-full">
                  Downgrade to Free
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Free Plan</CardTitle>
              <CardDescription>$0/month</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {["Boost engagement", "Automate comment replies", "Turn followers into customers"].map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
