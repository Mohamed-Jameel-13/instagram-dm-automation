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
  Zap,
  Bot,
  MessageCircle,
  Image,
  RefreshCw
} from 'lucide-react'

interface OverviewData {
  summary: {
    totalDms: number
    totalAiDms: number
    totalRegularDms: number
    successfulAiDms: number
    successfulRegularDms: number
    totalComments: number
    totalAutomations: number
    totalTriggers: number
    successfulDms: number
    failedDms: number
    successRate: number
    avgAiResponseTime: number
    avgRegularResponseTime: number
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
    postThumbnail?: string
    postCaption?: string
    shortCaption: string
    postType?: string
    totalComments: number
    dmsSent: number
    aiDmsSent: number
    regularDmsSent: number
    commentsReplied: number
    uniqueUsers: number
    avgResponseTime: number | null
    avgAiResponseTime: number | null
    avgRegularResponseTime: number | null
    conversionRate: number
    lastActivity: string
    createdAt?: string
    recentDms: Array<{
      recipientId: string
      responseTimeMs: number
      status: string
      sentAt: string
      messageLength: number
      triggerType: string
      aiPrompt?: string
    }>
    aiDms: Array<{
      recipientId: string
      responseTimeMs: number
      status: string
      sentAt: string
      messageLength: number
      triggerType: string
      aiPrompt?: string
    }>
    regularDms: Array<{
      recipientId: string
      responseTimeMs: number
      status: string
      sentAt: string
      messageLength: number
      triggerType: string
      aiPrompt?: string
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
      shortCaption: string
      postThumbnail?: string
      postType?: string
      dmsSent: number
      aiDmsSent: number
      regularDmsSent: number
      totalComments: number
      conversionRate: number
      avgAiResponseTime: number | null
      avgRegularResponseTime: number | null
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
  const [refreshingPosts, setRefreshingPosts] = useState(false)
  const [backfillingMetrics, setBackfillingMetrics] = useState(false)
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
          totalAiDms: 0,
          totalRegularDms: 0,
          successfulAiDms: 0,
          successfulRegularDms: 0,
          totalComments: 0,
          totalAutomations: 0,
          totalTriggers: 0,
          successfulDms: 0,
          failedDms: 0,
          successRate: 0,
          avgAiResponseTime: 0,
          avgRegularResponseTime: 0,
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

  const refreshPostData = async () => {
    try {
      setRefreshingPosts(true)
      console.log('🔄 Refreshing post data...')
      
      const response = await fetch('/api/analytics/refresh-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Refreshed ${result.enriched} posts`)
        // Refetch analytics data to show updated information
        await fetchAnalytics()
        // Show success message (you could add a toast notification here)
        alert(`Successfully refreshed ${result.enriched} posts with thumbnails and captions!`)
      } else {
        console.error('Failed to refresh posts:', result.error)
        alert(`Error refreshing posts: ${result.error}`)
      }
    } catch (error) {
      console.error('Error refreshing post data:', error)
      alert('Failed to refresh post data. Please try again.')
    } finally {
      setRefreshingPosts(false)
    }
  }

  const backfillMetrics = async () => {
    try {
      setBackfillingMetrics(true)
      console.log('🔄 Backfilling performance metrics...')
      
      const response = await fetch(`/api/analytics/backfill-metrics?days=${timeRange}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Backfilled ${result.updated} metrics`)
        // Refetch analytics data to show updated information
        await fetchAnalytics()
        alert(`Successfully backfilled ${result.updated} performance metrics with response times!`)
      } else {
        console.error('Failed to backfill metrics:', result.error)
        alert(`Error backfilling metrics: ${result.error}`)
      }
    } catch (error) {
      console.error('Error backfilling metrics:', error)
      alert('Failed to backfill metrics. Please try again.')
    } finally {
      setBackfillingMetrics(false)
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
      totalAiDms: overview?.summary?.totalAiDms || 0,
      totalRegularDms: overview?.summary?.totalRegularDms || 0,
      successfulAiDms: overview?.summary?.successfulAiDms || 0,
      successfulRegularDms: overview?.summary?.successfulRegularDms || 0,
      totalComments: overview?.summary?.totalComments || 0,
      totalAutomations: overview?.summary?.totalAutomations || 0,
      totalTriggers: overview?.summary?.totalTriggers || 0,
      successfulDms: overview?.summary?.successfulDms || 0,
      failedDms: overview?.summary?.failedDms || 0,
      successRate: overview?.summary?.successRate || 0,
      avgAiResponseTime: overview?.summary?.avgAiResponseTime || 0,
      avgRegularResponseTime: overview?.summary?.avgRegularResponseTime || 0,
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
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your automation performance and engagement</p>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {['7', '30', '90'].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? 'default' : 'outline'}
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-3"
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
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Total DMs Sent</CardTitle>
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{safeOverview.summary.totalDms.toLocaleString()}</div>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
              <Badge variant={safeOverview.summary.successRate > 90 ? 'default' : 'secondary'} className="text-xs px-1 sm:px-2">
                {safeOverview.summary.successRate}% success
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">AI DMs Sent</CardTitle>
            <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{safeOverview.summary.totalAiDms || 0}</div>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
              <Badge variant="outline" className="text-xs px-1 sm:px-2">AI-generated</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Regular DMs</CardTitle>
            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{safeOverview.summary.totalRegularDms || 0}</div>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
              <Badge variant="outline" className="text-xs px-1 sm:px-2">Template-based</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">AI Response Time</CardTitle>
            <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-700">
              {safeOverview.summary.avgAiResponseTime > 0
                ? safeOverview.summary.avgAiResponseTime < 1000 
                  ? `${Math.round(safeOverview.summary.avgAiResponseTime)}ms`
                  : `${(safeOverview.summary.avgAiResponseTime / 1000).toFixed(1)}s`
                : safeOverview.summary.totalAiDms > 0 
                  ? 'Calculating...'
                  : 'No AI DMs'
              }
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              AI-generated DMs avg time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Regular Response Time</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700">
              {safeOverview.summary.avgRegularResponseTime > 0
                ? safeOverview.summary.avgRegularResponseTime < 1000 
                  ? `${Math.round(safeOverview.summary.avgRegularResponseTime)}ms`
                  : `${(safeOverview.summary.avgRegularResponseTime / 1000).toFixed(1)}s`
                : safeOverview.summary.totalRegularDms > 0 
                  ? 'Calculating...'
                  : 'No Regular DMs'
              }
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Template-based DMs avg time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Total Triggers</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{safeOverview.summary.totalTriggers.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              {safeOverview.summary.totalComments} comments processed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Active Automations</CardTitle>
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{safeAutomationAnalytics.summary.activeAutomations}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              of {safeAutomationAnalytics.summary.totalAutomations} total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 sm:p-2">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4">Overview</TabsTrigger>
          <TabsTrigger value="posts" className="text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4">Posts</TabsTrigger>
          <TabsTrigger value="automations" className="text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4">Automations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 sm:space-y-4">
          {/* Response Time Fix Button */}
          {(safeOverview.summary.avgAiResponseTime === 0 || safeOverview.summary.avgRegularResponseTime === 0) && 
           (safeOverview.summary.totalAiDms > 0 || safeOverview.summary.totalRegularDms > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800 text-sm sm:text-base">Response Time Data Missing</h4>
                  <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                    We found DMs but response times aren't showing. Click to recalculate from existing data.
                  </p>
                </div>
                <Button 
                  onClick={backfillMetrics} 
                  disabled={backfillingMetrics}
                  variant="outline"
                  size="sm"
                  className="border-yellow-300 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 flex items-center gap-2 text-xs sm:text-sm flex-shrink-0"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${backfillingMetrics ? 'animate-spin' : ''}`} />
                  {backfillingMetrics ? 'Fixing...' : 'Fix Response Times'}
                </Button>
              </div>
            </div>
          )}

      {/* Debug Button - Remove after testing */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-800 text-sm sm:text-base">Debug DM Analytics</h4>
            <p className="text-xs sm:text-sm text-gray-600">Check what data is in the database</p>
          </div>
          <Button 
            onClick={() => window.open(`/api/debug/dm-analytics?days=${timeRange}`, '_blank')} 
            variant="outline"
            size="sm"
            className="text-gray-700 text-xs sm:text-sm flex-shrink-0"
          >
            View Debug Data
          </Button>
        </div>
      </div>

          {/* Daily Performance Chart */}
          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Daily Performance</CardTitle>
              <CardDescription className="text-sm">Triggers and response times over time</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="h-[250px] sm:h-[300px] md:h-[400px] -mx-2 sm:mx-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={safeOverview.dailyMetrics} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: '#d0d0d0' }}
                      tickLine={{ stroke: '#d0d0d0' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      yAxisId="left" 
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: '#d0d0d0' }}
                      tickLine={{ stroke: '#d0d0d0' }}
                      width={30}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: '#d0d0d0' }}
                      tickLine={{ stroke: '#d0d0d0' }}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{
                        fontSize: '12px',
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar yAxisId="left" dataKey="totalTriggers" fill="#8884d8" name="Triggers" />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="avgResponseTime" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Avg Response (ms)" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Success vs Failed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Success Rate Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="h-[200px] sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Successful', value: safeOverview.summary.successfulDms, color: '#22c55e' },
                          { name: 'Failed', value: safeOverview.summary.failedDms, color: '#ef4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
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
                      <Tooltip 
                        contentStyle={{
                          fontSize: '12px',
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs sm:text-sm font-medium">Success Rate</span>
                  <Badge variant={safeOverview.summary.successRate > 90 ? 'default' : 'secondary'} className="text-xs">
                    {safeOverview.summary.successRate}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs sm:text-sm font-medium">Fastest Response</span>
                  <span className="text-xs sm:text-sm font-semibold">{safeOverview.summary.fastestResponse}ms</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs sm:text-sm font-medium">Slowest Response</span>
                  <span className="text-xs sm:text-sm font-semibold">{safeOverview.summary.slowestResponse}ms</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs sm:text-sm font-medium">Total Triggers</span>
                  <span className="text-xs sm:text-sm font-semibold">{safeOverview.summary.totalTriggers}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-3 sm:space-y-4">
          {/* Refresh Posts Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold">Post Analytics</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Track post performance and engagement</p>
            </div>
            <Button 
              onClick={refreshPostData} 
              disabled={refreshingPosts}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingPosts ? 'animate-spin' : ''}`} />
              {refreshingPosts ? 'Refreshing...' : 'Refresh Post Data'}
            </Button>
          </div>

          {/* Top Posts Performance */}
          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Top Performing Posts</CardTitle>
              <CardDescription className="text-sm">Posts with highest DM conversion rates</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="h-[250px] sm:h-[300px] md:h-[400px] -mx-2 sm:mx-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={safePostAnalytics.summary.topPosts.map(post => ({
                      ...post,
                      shortPostId: post.postId.slice(-8) + '...'
                    }))}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="shortPostId" 
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: '#d0d0d0' }}
                      tickLine={{ stroke: '#d0d0d0' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: '#d0d0d0' }}
                      tickLine={{ stroke: '#d0d0d0' }}
                      width={30}
                    />
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(label) => {
                        const post = safePostAnalytics.summary.topPosts.find(p => p.postId.slice(-8) + '...' === label)
                        return post ? post.shortCaption : label
                      }}
                      contentStyle={{
                        fontSize: '12px',
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar dataKey="regularDmsSent" fill="#3b82f6" name="Regular DMs" />
                    <Bar dataKey="aiDmsSent" fill="#8b5cf6" name="AI DMs" />
                    <Bar dataKey="totalComments" fill="#10b981" name="Total Comments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Post Thumbnails Row */}
              {safePostAnalytics.summary.topPosts.length > 0 && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                  <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-center">Post Previews</p>
                  <div className="flex justify-center gap-3 sm:gap-6 overflow-x-auto pb-2">
                    {safePostAnalytics.summary.topPosts.slice(0, 3).map((post, index) => (
                      <div key={post.postId} className="flex flex-col items-center text-center flex-shrink-0">
                        {/* Circular Thumbnail with Enhanced Fallback */}
                        <div className="relative group">
                          {post.postThumbnail ? (
                            <img 
                              src={post.postThumbnail} 
                              alt={`Post ${index + 1}`}
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-3 border-primary shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                              title={post.shortCaption || `Post ${index + 1}`}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                                if (nextElement) {
                                  nextElement.style.display = 'flex'
                                }
                              }}
                            />
                          ) : null}
                          
                          {/* Enhanced Fallback with Post Info */}
                          <div 
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 sm:border-3 border-primary shadow-lg flex flex-col items-center justify-center text-white font-bold text-xs"
                            style={{ display: post.postThumbnail ? 'none' : 'flex' }}
                          >
                            <div className="text-[8px] sm:text-[10px] opacity-80">
                              {post.postType === 'REELS' ? '🎬' : 
                               post.postType === 'VIDEO' ? '🎥' : 
                               post.postType === 'CAROUSEL_ALBUM' ? '📸' : '🖼️'}
                            </div>
                            <div className="text-[6px] sm:text-[8px] font-bold">
                              #{index + 1}
                            </div>
                          </div>
                          {/* Post Type Badge */}
                          {post.postType && (
                            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-primary text-primary-foreground text-xs px-1 sm:px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium">
                              {post.postType === 'CAROUSEL_ALBUM' ? 'ALBUM' : post.postType}
                            </div>
                          )}
                        </div>
                        
                        {/* Enhanced Post Info */}
                        <div className="mt-1 sm:mt-2 max-w-[80px] sm:max-w-[120px] text-center">
                          <div className="text-[10px] sm:text-xs font-medium truncate mb-1">
                            {post.shortCaption || `${post.postType || 'Post'} #${index + 1}`}
                          </div>
                          
                          {/* Stats Row */}
                          <div className="flex justify-center gap-1 sm:gap-2 text-[8px] sm:text-[10px] mb-1">
                            <div className="bg-blue-100 text-blue-800 px-1 sm:px-1.5 py-0.5 rounded-full">
                              {post.dmsSent} DMs
                            </div>
                            {post.aiDmsSent > 0 && (
                              <div className="bg-purple-100 text-purple-800 px-1 sm:px-1.5 py-0.5 rounded-full">
                                {post.aiDmsSent} AI
                              </div>
                            )}
                          </div>
                          
                          {/* Post ID for Reference */}
                          <div className="text-[7px] sm:text-[9px] text-muted-foreground font-mono">
                            ...{post.postId.slice(-8)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posts Table */}
          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Detailed Post Analytics</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {safePostAnalytics.posts.slice(0, 10).map((post) => (
                  <div key={post.postId} className="border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {/* Post Header with Thumbnail and Caption */}
                    <div className="flex gap-2 sm:gap-3">
                      {post.postThumbnail ? (
                        <div className="flex-shrink-0">
                          <img 
                            src={post.postThumbnail} 
                            alt="Post thumbnail"
                            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-cover rounded-lg border"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Image className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <Badge variant="outline" className="text-xs w-fit">
                            {post.postType || 'Unknown'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Created: {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Last activity: {new Date(post.lastActivity).toLocaleDateString()}
                        </div>
                        <p className="font-medium text-xs sm:text-sm leading-tight line-clamp-2">
                          {post.shortCaption}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          ID: {post.postId.slice(-8)}...
                        </p>
                      </div>
                    </div>

                    {/* Stats and Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm sm:text-lg font-semibold">{post.totalComments}</div>
                        <div className="text-xs text-muted-foreground">Comments</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="text-sm sm:text-lg font-semibold text-blue-700">{post.dmsSent}</div>
                        <div className="text-xs text-muted-foreground">Total DMs</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <div className="text-sm sm:text-lg font-semibold text-purple-700">{post.aiDmsSent}</div>
                        <div className="text-xs text-muted-foreground">AI DMs</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-sm sm:text-lg font-semibold text-green-700">{post.conversionRate}%</div>
                        <div className="text-xs text-muted-foreground">Conversion</div>
                      </div>
                    </div>

                    {/* Response Times */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <div className="p-2 border border-purple-200 bg-purple-50 rounded">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="text-xs font-medium text-purple-700">🤖 AI Response Time</span>
                          <span className="text-xs sm:text-sm font-semibold text-purple-700">
                            {post.avgAiResponseTime 
                              ? post.avgAiResponseTime < 1000 
                                ? `${post.avgAiResponseTime}ms`
                                : `${(post.avgAiResponseTime / 1000).toFixed(1)}s`
                              : 'No data'
                            }
                          </span>
                        </div>
                      </div>
                      <div className="p-2 border border-blue-200 bg-blue-50 rounded">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="text-xs font-medium text-blue-700">💬 Regular Response Time</span>
                          <span className="text-xs sm:text-sm font-semibold text-blue-700">
                            {post.avgRegularResponseTime 
                              ? post.avgRegularResponseTime < 1000 
                                ? `${post.avgRegularResponseTime}ms`
                                : `${(post.avgRegularResponseTime / 1000).toFixed(1)}s`
                              : 'No data'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="space-y-3 sm:space-y-4">
          {/* Automation Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {safeAutomationAnalytics.automations.slice(0, 6).map((automation) => (
              <Card key={automation.automation.id}>
                <CardHeader className="pb-2 sm:pb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg leading-tight">{automation.automation.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {automation.automation.triggerType} • {automation.automation.actionType}
                      </CardDescription>
                    </div>
                    <Badge variant={automation.automation.active ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                      {automation.automation.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="text-center sm:text-left">
                      <p className="text-muted-foreground">Triggers</p>
                      <p className="font-semibold">{automation.metrics.totalTriggers}</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-muted-foreground">DMs Sent</p>
                      <p className="font-semibold">{automation.metrics.totalDmsSent}</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-muted-foreground">Success Rate</p>
                      <p className="font-semibold">{automation.metrics.successRate}%</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-muted-foreground">Avg Response</p>
                      <p className="font-semibold">{automation.metrics.avgResponseTime}ms</p>
                    </div>
                  </div>

                  {/* Mini chart for daily breakdown */}
                  <div className="h-[80px] sm:h-[100px] -mx-1 sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={automation.dailyBreakdown} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <Line 
                          type="monotone" 
                          dataKey="dmsSent" 
                          stroke="#8884d8" 
                          strokeWidth={2} 
                          dot={false} 
                        />
                        <Tooltip 
                          contentStyle={{
                            fontSize: '11px',
                            padding: '6px',
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Keywords */}
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {automation.automation.keywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-1 sm:px-2 py-0.5">
                          {keyword}
                        </Badge>
                      ))}
                      {automation.automation.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1 sm:px-2 py-0.5">
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
