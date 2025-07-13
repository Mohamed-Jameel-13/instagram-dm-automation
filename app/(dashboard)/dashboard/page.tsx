"use client"

import Link from "next/link"
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Sample data for the chart
const activityData = [
  { day: "Mon", count: 4 },
  { day: "Tue", count: 7 },
  { day: "Wed", count: 5 },
  { day: "Thu", count: 8 },
  { day: "Fri", count: 12 },
  { day: "Sat", count: 9 },
  { day: "Sun", count: 6 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, John!</h1>
        <p className="text-muted-foreground mt-2">Here&apos;s what&apos;s happening with your Instagram automations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Set-up Auto Replies</CardTitle>
            <CardDescription>Deliver your product lineup via Instagram DM</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/automations">
              <Button variant="ghost" className="p-0 h-auto">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Answer Questions with AI</CardTitle>
            <CardDescription>Identify and respond to queries with AI</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/automations">
              <Button variant="ghost" className="p-0 h-auto">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Automatic Intent Detection</CardTitle>
            <CardDescription>Let AI understand what your followers want</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/automations">
              <Button variant="ghost" className="p-0 h-auto">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Automated Activity</CardTitle>
            <CardDescription>Your automation activity over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  count: {
                    label: "Interactions",
                    color: "hsl(var(--primary))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
            <CardDescription>Your comment automation performance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="text-5xl font-bold text-primary">100%</div>
            <p className="text-sm text-muted-foreground">24 out of 24 comments replied</p>
            <MessageSquare className="h-10 w-10 text-primary/20" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Direct Messages</CardTitle>
            <CardDescription>Your DM automation performance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="text-5xl font-bold text-primary">100%</div>
            <p className="text-sm text-muted-foreground">36 out of 36 DMs replied</p>
            <Sparkles className="h-10 w-10 text-primary/20" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
