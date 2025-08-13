'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function TokenTester() {
  const [token, setToken] = useState('')
  const [cleanedToken, setCleanedToken] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const cleanToken = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/clean-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
      
      const data = await response.json()
      setCleanedToken(data.cleanedToken)
      setAnalysis(data.analysis)
    } catch (error) {
      console.error('Error cleaning token:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const testToken = async () => {
    setLoading(true)
    try {
      const tokenToTest = cleanedToken || token
      const response = await fetch(`/api/test-token?token=${encodeURIComponent(tokenToTest)}`)
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Error testing token:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Instagram Token Tester</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Clean Your Token</CardTitle>
            <CardDescription>
              Paste your token below and clean it to remove any whitespace, line breaks, or special characters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="token">Raw Token</Label>
                <Textarea 
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your token here..."
                  rows={4}
                />
              </div>
              
              <Button onClick={cleanToken} disabled={loading || !token}>
                {loading ? 'Processing...' : 'Clean Token'}
              </Button>
              
              {cleanedToken && (
                <div className="mt-4">
                  <Label htmlFor="cleanedToken">Cleaned Token</Label>
                  <Textarea
                    id="cleanedToken"
                    value={cleanedToken}
                    readOnly
                    rows={4}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Copy this cleaned token for connection
                  </p>
                </div>
              )}
              
              {analysis && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">Token Analysis</h3>
                  <ul className="space-y-1 text-sm">
                    <li>Original Length: {analysis.originalLength}</li>
                    <li>Cleaned Length: {analysis.cleanedLength}</li>
                    <li>Prefix: {analysis.prefix}</li>
                    <li>Contains Line Breaks: {analysis.containsLineBreaks ? 'Yes ⚠️' : 'No ✅'}</li>
                    <li>Contains Spaces: {analysis.containsSpaces ? 'Yes ⚠️' : 'No ✅'}</li>
                    <li>Contains Quotes: {analysis.containsQuotes ? 'Yes ⚠️' : 'No ✅'}</li>
                    <li>Starts with EAF: {analysis.startsWithEAF ? 'Yes ✅' : 'No'}</li>
                    <li>Starts with EAAC: {analysis.startsWithEAAC ? 'Yes ✅' : 'No'}</li>
                    <li>Starts with IG: {analysis.startsWithIG ? 'Yes ✅' : 'No'}</li>
                    <li>Starts with IGQVJ: {analysis.startsWithIGQVJ ? 'Yes ✅' : 'No'}</li>
                    <li>Likely Valid Format: {analysis.isLikelyValid ? 'Yes ✅' : 'No ⚠️'}</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Test Token with API</CardTitle>
            <CardDescription>
              Test your token against various Instagram API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testToken} 
              disabled={loading || (!token && !cleanedToken)}
              className="mb-4"
            >
              {loading ? 'Testing...' : 'Test Token'}
            </Button>
            
            {testResults && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">Overall Result</h3>
                  <p className={testResults.token_valid ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    Token is {testResults.token_valid ? 'Valid ✅' : 'Invalid ❌'}
                  </p>
                </div>
                
                {testResults.results.tests.map((test: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-md">
                    <h3 className="font-medium mb-2">{test.name}</h3>
                    <p className={test.success ? "text-green-600 mb-2" : "text-red-600 mb-2"}>
                      {test.success ? 'Success ✅' : 'Failed ❌'} 
                      {test.status && ` (Status: ${test.status})`}
                    </p>
                    
                    {test.data && (
                      <div className="mt-2">
                        <Label>Response Data</Label>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                          {test.data}
                        </pre>
                      </div>
                    )}
                    
                    {test.error && (
                      <div className="mt-2">
                        <Label>Error</Label>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                          {test.error}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
