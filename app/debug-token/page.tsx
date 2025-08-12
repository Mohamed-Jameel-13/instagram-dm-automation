"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DebugTokenPage() {
  const [token, setToken] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    if (!token.trim()) {
      alert("Please enter a token")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/identify-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: token.trim()
        }),
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error:", error)
      setResults({ error: "Failed to test token" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Debug Instagram Token</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Your Instagram Access Token</CardTitle>
          <CardDescription>
            This will identify which Instagram account your token belongs to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="token">Instagram Access Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="IGAAR2zUZBc... or EAAC..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleTest} 
            disabled={loading || !token.trim()}
            className="w-full"
          >
            {loading ? "Testing..." : "Test Token"}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
            
            {results.analysis && (
              <div className="mt-4 p-4 border rounded">
                <h3 className="font-bold mb-2">Analysis</h3>
                <p className="text-sm"><strong>Webhook Account:</strong> 17841473518392752</p>
                <p className="text-sm"><strong>Currently Stored:</strong> 24695355950081100</p>
                <p className="text-sm"><strong>Matches Webhook:</strong> {results.analysis.matchesWebhook ? "✅ Yes" : "❌ No"}</p>
                <p className="text-sm"><strong>Matches Stored:</strong> {results.analysis.matchesStored ? "✅ Yes" : "❌ No"}</p>
                <div className="mt-2 p-2 bg-blue-50 rounded">
                  <p className="text-sm"><strong>Recommendation:</strong> {results.analysis.recommendation}</p>
                </div>
              </div>
            )}

            {results.results?.accounts && results.results.accounts.length > 0 && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">Accounts Found:</h3>
                {results.results.accounts.map((account: any, index: number) => (
                  <div key={index} className="border p-2 rounded mb-2">
                    <p className="text-sm"><strong>ID:</strong> {account.id}</p>
                    <p className="text-sm"><strong>Username:</strong> @{account.username}</p>
                    <p className="text-sm"><strong>Type:</strong> {account.account_type}</p>
                    <p className="text-sm"><strong>Source:</strong> {account.source}</p>
                    <p className="text-xs text-gray-600">{account.note}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
