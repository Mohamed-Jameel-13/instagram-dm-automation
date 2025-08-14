'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Activity, 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react'

interface OverviewData {
  summary: {
    totalDms: number
    totalComments: number
    totalAutomations: number
    totalTriggers: number
    successfulDms: number
    failedDms: number
    successRate: number
    avgResponseTime: number
    fastestResponse: number | null
    slowestResponse: number | null
  }
  dailyMetrics: Array<{
    date: string
    totalTriggers: number
    successfulDms: number
    failedDms: number
    avgResponseTime: number
    successRate: number
  }>
}

interface PostAnalytics {
  posts: Array<{
    postId: string
    totalComments: number
    dmsSent: number
    commentsReplied: number
    uniqueUsers: number
    avgResponseTime: number | null
    conversionRate: number
    lastActivity: string
    recentDms: Array<{
      recipientId: string
      responseTimeMs: number
      status: string
      sentAt: string
      messageLength: number
    }>
    recentTriggers: Array<{
      triggerType: string
      triggeredAt: string
      processingTimeMs: number | null
      responseStatus: string | null
      triggerText: string
    }>
  }>
  summary: {
    totalPosts: number
    totalComments: number
    totalDmsSent: number
    totalReplies: number
    avgConversionRate: number
    topPosts: Array<{
      postId: string
      dmsSent: number
      totalComments: number
      conversionRate: number
      avgResponseTime: number | null
    }>
  }
}

interface AutomationAnalytics {
  automations: Array<{
    automation: {
      id: string
      name: string
      active: boolean
      triggerType: string
      actionType: string
      keywords: string[]
      createdAt: string
    }
    metrics: {
      totalTriggers: number
      successfulTriggers: number
      failedTriggers: number
      totalDmsSent: number
      failedDms: number
      uniqueRecipients: number
      avgResponseTime: number
      fastestResponse: number | null
      slowestResponse: number | null
      successRate: number
      dmSuccessRate: number
    }
    recentActivity: Array<{
      triggeredAt: string
      triggerType: string
      triggerText: string
      responseStatus: string | null
      processingTimeMs: number | null
      postId: string | null
    }>
    dailyBreakdown: Array<{
      date: string
      triggers: number
      dmsSent: number
    }>
  }>
  summary: {
    totalAutomations: number
    activeAutomations: number
    totalTriggers: number
    totalDmsSent: number
    avgResponseTime: number
    topPerformer: string | null
  }
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [postAnalytics, setPostAnalytics] = useState<PostAnalytics | null>(null)
  const [automationAnalytics, setAutomationAnalytics] = useState<AutomationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [overviewRes, postsRes, automationsRes] = await Promise.all([
        fetch(`/api/analytics/overview?days=${timeRange}`),
        fetch(`/api/analytics/posts?days=${timeRange}`),
        fetch(`/api/analytics/automations?days=${timeRange}`)
      ])

      // Check if any requests failed
      if (!overviewRes.ok || !postsRes.ok || !automationsRes.ok) {
        throw new Error(`API Error: ${overviewRes.status}, ${postsRes.status}, ${automationsRes.status}`)
      }

      const [overviewData, postsData, automationsData] = await Promise.all([
        overviewRes.json(),
        postsRes.json(),
        automationsRes.json()
      ])

      // Check for API error responses
      if (overviewData.error || postsData.error || automationsData.error) {
        throw new Error(`API returned error: ${overviewData.error || postsData.error || automationsData.error}`)
      }

      setOverview(overviewData)
      setPostAnalytics(postsData)
      setAutomationAnalytics(automationsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      // Set empty data instead of null to prevent undefined errors
      setOverview({
        summary: {
          totalDms: 0,
          totalComments: 0,
          totalAutomations: 0,
          totalTriggers: 0,
          successfulDms: 0,
          failedDms: 0,
          successRate: 0,
          avgResponseTime: 0,
          fastestResponse: null,
          slowestResponse: null
        },
        dailyMetrics: []
      })
      setPostAnalytics({
        posts: [],
        summary: {
          totalPosts: 0,
          totalComments: 0,
          totalDmsSent: 0,
          totalReplies: 0,
          avgConversionRate: 0,
          topPosts: []
        }
      })
      setAutomationAnalytics({
        automations: [],
        summary: {
          totalAutomations: 0,
          activeAutomations: 0,
          totalTriggers: 0,
          totalDmsSent: 0,
          avgResponseTime: 0,
          topPerformer: null
        }
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="text-center">Loading analytics...</div>
      </div>
    )
  }

  if (!overview || !postAnalytics || !automationAnalytics) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Analytics Not Available</h2>
          <p className="text-muted-foreground">
            Analytics data will appear here once your automations start processing messages.
          </p>
          <p className="text-sm text-muted-foreground">
            Make sure you have:
            <br />• Active automations configured
            <br />• Instagram account connected
            <br />• Recent DM or comment activity
          </p>
        </div>
      </div>
    )
  }

  // Provide safe defaults for undefined data
  const safeOverview = {
    summary: {
      totalDms: overview?.summary?.totalDms || 0,
      totalComments: overview?.summary?.totalComments || 0,
      totalAutomations: overview?.summary?.totalAutomations || 0,
      totalTriggers: overview?.summary?.totalTriggers || 0,
      successfulDms: overview?.summary?.successfulDms || 0,
      failedDms: overview?.summary?.failedDms || 0,
      successRate: overview?.summary?.successRate || 0,
      avgResponseTime: overview?.summary?.avgResponseTime || 0,
      fastestResponse: overview?.summary?.fastestResponse || 0,
      slowestResponse: overview?.summary?.slowestResponse || 0
    },
    dailyMetrics: overview?.dailyMetrics || []
  }

  const safePostAnalytics = {
    posts: postAnalytics?.posts || [],
    summary: {
      totalPosts: postAnalytics?.summary?.totalPosts || 0,
      totalComments: postAnalytics?.summary?.totalComments || 0,
      totalDmsSent: postAnalytics?.summary?.totalDmsSent || 0,
      totalReplies: postAnalytics?.summary?.totalReplies || 0,
      avgConversionRate: postAnalytics?.summary?.avgConversionRate || 0,
      topPosts: postAnalytics?.summary?.topPosts || []
    }
  }

  const safeAutomationAnalytics = {
    automations: automationAnalytics?.automations || [],
    summary: {
      totalAutomations: automationAnalytics?.summary?.totalAutomations || 0,
      activeAutomations: automationAnalytics?.summary?.activeAutomations || 0,
      totalTriggers: automationAnalytics?.summary?.totalTriggers || 0,
      totalDmsSent: automationAnalytics?.summary?.totalDmsSent || 0,
      avgResponseTime: automationAnalytics?.summary?.avgResponseTime || 0,
      topPerformer: automationAnalytics?.summary?.topPerformer || 'None'
    }
  }

  // Check if there's any meaningful data (after all safe objects are declared)
  const hasData = safeOverview.summary.totalTriggers > 0 || safePostAnalytics.summary.totalPosts > 0 || safeAutomationAnalytics.summary.totalAutomations > 0

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe']

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your automation performance and engagement</p>
        </div>
        <div className="flex gap-2">
          {['7', '30', '90'].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>

      {/* No Data Message */}
      {!hasData && (
        <Card className="w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-6xl">📊</div>
            <div>
              <h3 className="text-lg font-semibold">No Analytics Data Yet</h3>
              <p className="text-muted-foreground mt-2">
                Analytics will appear here once your automations start processing Instagram messages and comments.
              </p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>To get started:</strong></p>
              <p>1. Set up active automations in the Automations tab</p>
              <p>2. Connect your Instagram account</p>
              <p>3. Wait for users to comment or send DMs</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total DMs Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeOverview.summary.totalDms.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={safeOverview.summary.successRate > 90 ? 'default' : 'secondary'}>
                {safeOverview.summary.successRate}% success
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeOverview.summary.avgResponseTime < 1000 
                ? `${safeOverview.summary.avgResponseTime}ms`
                : `${(safeOverview.summary.avgResponseTime / 1000).toFixed(1)}s`
              }
            </div>
            <div className="text-sm text-muted-foreground">
              {safeOverview.summary.fastestResponse > 0 && (
                <span>Fastest: {safeOverview.summary.fastestResponse}ms</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Triggers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeOverview.summary.totalTriggers.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              {safeOverview.summary.totalComments} comments processed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeAutomationAnalytics.summary.activeAutomations}</div>
            <div className="text-sm text-muted-foreground">
              of {safeAutomationAnalytics.summary.totalAutomations} total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Daily Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>Triggers and response times over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={safeOverview.dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="totalTriggers" fill="#8884d8" name="Triggers" />
                    <Line yAxisId="right" type="monotone" dataKey="avgResponseTime" stroke="#82ca9d" name="Avg Response (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Success vs Failed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Success Rate Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Successful', value: safeOverview.summary.successfulDms, color: '#22c55e' },
                          { name: 'Failed', value: safeOverview.summary.failedDms, color: '#ef4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Successful', value: safeOverview.summary.successfulDms, color: '#22c55e' },
                          { name: 'Failed', value: safeOverview.summary.failedDms, color: '#ef4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Success Rate</span>
                  <Badge variant={safeOverview.summary.successRate > 90 ? 'default' : 'secondary'}>
                    {safeOverview.summary.successRate}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Fastest Response</span>
                  <span className="text-sm">{safeOverview.summary.fastestResponse}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Slowest Response</span>
                  <span className="text-sm">{safeOverview.summary.slowestResponse}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Triggers</span>
                  <span className="text-sm font-semibold">{safeOverview.summary.totalTriggers}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          {/* Top Posts Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
              <CardDescription>Posts with highest DM conversion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={safePostAnalytics.summary.topPosts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="postId" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="dmsSent" fill="#8884d8" name="DMs Sent" />
                    <Bar dataKey="totalComments" fill="#82ca9d" name="Total Comments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Posts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Post Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {safePostAnalytics.posts.slice(0, 10).map((post) => (
                  <div key={post.postId} className="border rounded-lg p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <p className="font-medium text-sm">Post ID: {post.postId}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline">{post.totalComments} comments</Badge>
                          <Badge variant="outline">{post.dmsSent} DMs sent</Badge>
                          <Badge variant={post.conversionRate > 50 ? 'default' : 'secondary'}>
                            {post.conversionRate}% conversion
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Avg: {post.avgResponseTime}ms</p>
                        <p>{new Date(post.lastActivity).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          {/* Automation Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {safeAutomationAnalytics.automations.slice(0, 6).map((automation) => (
              <Card key={automation.automation.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{automation.automation.name}</CardTitle>
                      <CardDescription>
                        {automation.automation.triggerType} • {automation.automation.actionType}
                      </CardDescription>
                    </div>
                    <Badge variant={automation.automation.active ? 'default' : 'secondary'}>
                      {automation.automation.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Triggers</p>
                      <p className="font-semibold">{automation.metrics.totalTriggers}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">DMs Sent</p>
                      <p className="font-semibold">{automation.metrics.totalDmsSent}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Success Rate</p>
                      <p className="font-semibold">{automation.metrics.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Response</p>
                      <p className="font-semibold">{automation.metrics.avgResponseTime}ms</p>
                    </div>
                  </div>

                  {/* Mini chart for daily breakdown */}
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={automation.dailyBreakdown}>
                        <Line type="monotone" dataKey="dmsSent" stroke="#8884d8" strokeWidth={2} dot={false} />
                        <Tooltip />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Keywords */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {automation.automation.keywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {automation.automation.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{automation.automation.keywords.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
