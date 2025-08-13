"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useFirebaseAuth } from "@/components/firebase-auth"

type ActivityPoint = { day: string; count: number }
type Totals = { dm: number; comments: number; automations: number; activeAutomations: number; newFollowers: number; activeConversations: number }

export default function DashboardPage() {
  const { user } = useFirebaseAuth()
  const [activity, setActivity] = useState<ActivityPoint[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!user?.uid) return
    try {
      const res = await fetch(`/api/dashboard?userId=${user.uid}`)
      if (res.ok) {
        const data = await res.json()
        setActivity(data.activity || [])
        setTotals(data.totals || null)
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.uid])

  // Lightweight auto-refresh to reflect new activity
  useEffect(() => {
    if (!user?.uid) return
    const id = setInterval(() => {
      fetchData()
    }, 15000)
    return () => clearInterval(id)
  }, [user?.uid])

  const displayName = user?.displayName || user?.email || "there"

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back{displayName ? `, ${displayName}` : ''}!</h1>
          <p className="text-muted-foreground mt-2">Loading your Instagram automation insights…</p>
        </div>
        <div className="text-muted-foreground">Loading…</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back{displayName ? `, ${displayName}` : ''}!</h1>
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
                  <LineChart data={activity && activity.length ? activity : []}>
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
            <div className="text-5xl font-bold text-primary">{totals?.comments ?? 0}</div>
            <p className="text-sm text-muted-foreground">comment interactions in the last 7 days</p>
            <MessageSquare className="h-10 w-10 text-primary/20" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Direct Messages</CardTitle>
            <CardDescription>Your DM automation performance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="text-5xl font-bold text-primary">{totals?.dm ?? 0}</div>
            <p className="text-sm text-muted-foreground">DM interactions in the last 7 days</p>
            <Sparkles className="h-10 w-10 text-primary/20" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
