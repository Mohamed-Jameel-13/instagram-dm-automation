"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DebugPage() {
  const [automations, setAutomations] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [commentText, setCommentText] = useState("test keyword")
  const [postId, setPostId] = useState("")
  const [commenterId, setCommenterId] = useState("")
  const [testResult, setTestResult] = useState<any>(null)

  const checkAutomations = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch('/api/debug/automations')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setAutomations(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testWebhook = async () => {
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      })
      const data = await response.json()
      alert(`Webhook test: ${response.ok ? 'SUCCESS' : 'FAILED'}\n${JSON.stringify(data, null, 2)}`)
    } catch (err: any) {
      alert(`Webhook test failed: ${err.message}`)
    }
  }

  const testCommentAutomation = async () => {
    if (!commentText.trim()) {
      alert('Please enter comment text')
      return
    }
    
    try {
      setTestResult(null)
      const response = await fetch('/api/test/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: commentText.trim(),
          postId: postId.trim() || 'test_post_123',
          commenterId: commenterId.trim() || 'test_commenter_456'
        })
      })
      const data = await response.json()
      setTestResult({
        success: response.ok,
        data: data
      })
    } catch (err: any) {
      setTestResult({
        success: false,
        data: { error: err.message }
      })
    }
  }

  const checkInstagramStatus = async () => {
    try {
      const response = await fetch('/api/instagram/status')
      const data = await response.json()
      alert(`Instagram Status:\n${JSON.stringify(data, null, 2)}`)
    } catch (err: any) {
      alert(`Instagram status check failed: ${err.message}`)
    }
  }

  const getIssues = () => {
    if (!automations) return []
    
    const issues = []
    
    if (!automations.instagramAccount) {
      issues.push('❌ No Instagram account connected')
    } else if (!automations.instagramAccount.hasAccessToken) {
      issues.push('❌ Instagram access token missing or invalid')
    } else {
      issues.push('✅ Instagram account connected')
    }
    
    const activeCommentAutomations = automations.automations?.filter((a: any) => a.active && a.triggerType === 'comment') || []
    if (activeCommentAutomations.length === 0) {
      issues.push('❌ No active comment automations found')
    } else {
      issues.push(`✅ Found ${activeCommentAutomations.length} active comment automation(s)`)
      
      activeCommentAutomations.forEach((automation: any, index: number) => {
        if (!automation.keywords || automation.keywords.length === 0) {
          issues.push(`❌ Automation "${automation.name}" has no keywords`)
        }
        if (!automation.message && !automation.commentReply) {
          issues.push(`❌ Automation "${automation.name}" has no response message`)
        }
        if (automation.posts && automation.posts.length > 0) {
          issues.push(`ℹ️ Automation "${automation.name}" is limited to ${automation.posts.length} specific post(s)`)
        } else {
          issues.push(`ℹ️ Automation "${automation.name}" will trigger on any post`)
        }
      })
    }
    
    return issues
  }

  const generateWebhookInstructions = () => {
    if (!automations?.instagramAccount?.providerAccountId) {
      return "Connect Instagram account first to get webhook instructions"
    }
    
    return `
1. Go to Meta for Developers (developers.facebook.com)
2. Select your Instagram app
3. Go to Webhooks section
4. Add webhook with these settings:
   - Callback URL: ${window.location.origin}/api/webhooks/instagram
   - Verify Token: Check your .env.local file for INSTAGRAM_WEBHOOK_VERIFY_TOKEN
   - Subscribe to: comments, messages
   
5. Your Instagram Account ID: ${automations.instagramAccount.providerAccountId}
   
6. Test by commenting on your Instagram posts with your automation keywords
    `
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Instagram Automation Debug Tool</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Check Your Automation Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={checkAutomations} disabled={loading}>
              {loading ? "Loading..." : "Check Automations"}
            </Button>
            <Button onClick={checkInstagramStatus} variant="outline">
              Check Instagram Status
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>Error: {error}</AlertDescription>
            </Alert>
          )}
          
          {automations && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Issues Found:</h3>
                <ul className="space-y-1">
                  {getIssues().map((issue, index) => (
                    <li key={index} className="text-sm">{issue}</li>
                  ))}
                </ul>
              </div>
              
              <details className="border rounded p-4">
                <summary className="cursor-pointer font-medium">View Raw Configuration</summary>
                <pre className="mt-2 text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                  {JSON.stringify(automations, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Test Webhook Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testWebhook}>Test Webhook</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 3: Test Comment Automation Logic</CardTitle>
          <p className="text-sm text-muted-foreground">
            This tests your automation logic without needing a real Instagram comment
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Comment Text</label>
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter text with your keywords"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Post ID (optional)</label>
              <Input
                value={postId}
                onChange={(e) => setPostId(e.target.value)}
                placeholder="Leave empty for test"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Commenter ID (optional)</label>
              <Input
                value={commenterId}
                onChange={(e) => setCommenterId(e.target.value)}
                placeholder="Leave empty for test"
              />
            </div>
          </div>
          
          <Button onClick={testCommentAutomation}>
            Test Comment Automation
          </Button>
          
          {testResult && (
            <div className={`p-4 rounded border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h4 className="font-medium mb-2">
                {testResult.success ? '✅ Test Result' : '❌ Test Failed'}
              </h4>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 4: Webhook Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm whitespace-pre-wrap bg-gray-100 p-4 rounded">
            {generateWebhookInstructions()}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 5: Webhook Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Watch your terminal for these logs when you comment on Instagram:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>=== INSTAGRAM WEBHOOK RECEIVED ===</code></li>
              <li><code>Processing Instagram comment:</code></li>
              <li><code>Found X active comment automations</code></li>
            </ul>
            <p className="mt-4"><strong>If you don't see these logs, the issue is:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Webhook not configured in Meta Developer Console</li>
              <li>Wrong webhook URL or verify token</li>
              <li>Instagram not sending webhook events</li>
            </ul>
            <p className="mt-4"><strong>If you see logs but no response:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check if automation keywords match your comment</li>
              <li>Verify automation is active</li>
              <li>Check if comment is on a post you selected (if post filtering is enabled)</li>
              <li>Verify Instagram access token is valid</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
