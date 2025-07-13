'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, CheckCircle, Clock, Zap, Activity, TrendingUp } from 'lucide-react'

interface LoadTestResult {
  testName: string
  concurrency: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: string
  averageResponseTime: string
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  requestsPerSecond: string
  errors: string[]
  totalDuration: number
}

interface PerformanceMetric {
  requestId: string
  startTime: number
  endTime?: number
  totalDuration?: number
  phases: {
    signatureValidation?: number
    jsonParsing?: number
    messageProcessing?: number
    commentProcessing?: number
    dbQueries?: number
    apiCalls?: number
  }
  memoryUsage?: {
    heapUsed: number
    heapTotal: number
    external: number
  }
}

export default function LoadTestDashboard() {
  const [testResults, setTestResults] = useState<LoadTestResult[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [testConfig, setTestConfig] = useState({
    concurrency: 10,
    requests: 50,
    payloadType: 'comment'
  })

  // Fetch performance metrics from the webhook
  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/debug/performance-metrics')
      if (response.ok) {
        const data = await response.json()
        setPerformanceMetrics(data.metrics || [])
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error)
    }
  }

  // Run load test
  const runLoadTest = async (testType: 'single' | 'incremental') => {
    setIsRunning(true)
    setProgress(0)
    setCurrentTest(testType === 'single' ? 'Single Test' : 'Incremental Test')
    
    try {
      const response = await fetch('/api/load-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType,
          config: testConfig
        })
      })
      
      if (response.ok) {
        const results = await response.json()
        setTestResults(Array.isArray(results) ? results : [results])
        await fetchPerformanceMetrics()
      } else {
        throw new Error('Load test failed')
      }
    } catch (error) {
      console.error('Load test error:', error)
    } finally {
      setIsRunning(false)
      setProgress(100)
    }
  }

  // Calculate average performance metrics
  const calculateAverageMetrics = () => {
    if (performanceMetrics.length === 0) return null
    
    const totals = performanceMetrics.reduce((acc, metric) => {
      acc.totalDuration += metric.totalDuration || 0
      acc.signatureValidation += metric.phases.signatureValidation || 0
      acc.jsonParsing += metric.phases.jsonParsing || 0
      acc.messageProcessing += metric.phases.messageProcessing || 0
      acc.commentProcessing += metric.phases.commentProcessing || 0
      acc.heapUsed += metric.memoryUsage?.heapUsed || 0
      return acc
    }, {
      totalDuration: 0,
      signatureValidation: 0,
      jsonParsing: 0,
      messageProcessing: 0,
      commentProcessing: 0,
      heapUsed: 0
    })
    
    const count = performanceMetrics.length
    return {
      averageTotalDuration: (totals.totalDuration / count).toFixed(2),
      averageSignatureValidation: (totals.signatureValidation / count).toFixed(2),
      averageJsonParsing: (totals.jsonParsing / count).toFixed(2),
      averageMessageProcessing: (totals.messageProcessing / count).toFixed(2),
      averageCommentProcessing: (totals.commentProcessing / count).toFixed(2),
      averageHeapUsed: Math.round(totals.heapUsed / count / 1024 / 1024) // MB
    }
  }

  const averageMetrics = calculateAverageMetrics()

  useEffect(() => {
    fetchPerformanceMetrics()
  }, [])

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Load Test Dashboard</h1>
          <p className="text-muted-foreground">Test your Instagram webhook system for concurrent requests</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runLoadTest('single')}
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? 'Running...' : 'Run Single Test'}
          </Button>
          <Button
            onClick={() => runLoadTest('incremental')}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run Incremental Test'}
          </Button>
        </div>
      </div>

      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 animate-spin" />
              Running {currentTest}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Testing webhook performance...
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>Configure your load test parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="concurrency">Concurrency</Label>
                  <Input
                    id="concurrency"
                    type="number"
                    value={testConfig.concurrency}
                    onChange={(e) => setTestConfig({...testConfig, concurrency: parseInt(e.target.value)})}
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <Label htmlFor="requests">Total Requests</Label>
                  <Input
                    id="requests"
                    type="number"
                    value={testConfig.requests}
                    onChange={(e) => setTestConfig({...testConfig, requests: parseInt(e.target.value)})}
                    min="1"
                    max="1000"
                  />
                </div>
                <div>
                  <Label htmlFor="payloadType">Payload Type</Label>
                  <Select value={testConfig.payloadType} onValueChange={(value) => setTestConfig({...testConfig, payloadType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comment">Comment</SelectItem>
                      <SelectItem value="dm">Direct Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {testResults.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No test results yet. Run a load test to see results.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{result.testName}</span>
                      <Badge variant={parseFloat(result.successRate) >= 95 ? 'default' : 'destructive'}>
                        {result.successRate}% Success
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {result.concurrency} concurrent requests, {result.totalRequests} total
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{result.successfulRequests}</div>
                        <div className="text-sm text-muted-foreground">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{result.failedRequests}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.averageResponseTime}ms</div>
                        <div className="text-sm text-muted-foreground">Avg Response</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.requestsPerSecond}</div>
                        <div className="text-sm text-muted-foreground">RPS</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>P50 Response Time:</span>
                        <span>{result.p50ResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>P95 Response Time:</span>
                        <span>{result.p95ResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>P99 Response Time:</span>
                        <span>{result.p99ResponseTime}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Test Duration:</span>
                        <span>{result.totalDuration}ms</span>
                      </div>
                    </div>

                    {result.errors.length > 0 && (
                      <Alert className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Errors detected:</strong>
                          <ul className="mt-2 list-disc list-inside">
                            {result.errors.slice(0, 5).map((error, i) => (
                              <li key={i} className="text-sm">{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {averageMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Total Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageMetrics.averageTotalDuration}ms</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Signature Validation</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageMetrics.averageSignatureValidation}ms</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">JSON Parsing</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageMetrics.averageJsonParsing}ms</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Message Processing</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageMetrics.averageMessageProcessing}ms</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Comment Processing</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageMetrics.averageCommentProcessing}ms</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageMetrics.averageHeapUsed}MB</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No performance metrics available. Run a load test first.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
              <CardDescription>Recommendations based on test results</CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-muted-foreground">Run load tests to get performance analysis.</p>
              ) : (
                <div className="space-y-4">
                  {testResults.some(r => parseFloat(r.successRate) < 95) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Performance Issues Detected:</strong>
                        <ul className="mt-2 list-disc list-inside">
                          <li>Success rate below 95% threshold</li>
                          <li>Consider implementing request queuing</li>
                          <li>Add database connection pooling</li>
                          <li>Implement rate limiting</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {testResults.some(r => parseFloat(r.averageResponseTime) > 1000) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Slow Response Times:</strong>
                        <ul className="mt-2 list-disc list-inside">
                          <li>Average response time exceeds 1 second</li>
                          <li>Consider caching frequent database queries</li>
                          <li>Optimize database indexes</li>
                          <li>Implement async processing</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {testResults.every(r => parseFloat(r.successRate) >= 95 && parseFloat(r.averageResponseTime) <= 1000) && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Great Performance!</strong> Your system is handling concurrent requests well.
                        All tests passed the performance thresholds.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 