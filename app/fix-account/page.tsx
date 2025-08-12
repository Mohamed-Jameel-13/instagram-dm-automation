"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FixAccountPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFix = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/fix-account-id-mismatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error:", error)
      setResult({ 
        success: false, 
        error: "Failed to run fix", 
        details: error instanceof Error ? error.message : String(error) 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Fix Account ID Mismatch</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Instagram Account ID Mismatch Fix</CardTitle>
          <CardDescription>
            This will update your stored Instagram account ID to match the webhook ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">The Problem:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Stored account ID: <code>24695355950081100</code> (from Basic Display API)</li>
              <li>• Webhook account ID: <code>17841473518392752</code> (from Business API)</li>
              <li>• Same Instagram account (@writesparkai) but different IDs</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">The Fix:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Update stored ID to match webhook ID</li>
              <li>• Keep your access token unchanged</li>
              <li>• Enable automation to work properly</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleFix} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Fixing..." : "Fix Account ID Mismatch"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.success ? "✅ Fix Applied Successfully!" : "❌ Fix Failed"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
            
            {result.success && result.nextSteps && (
              <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded">
                <h3 className="font-bold text-green-800 mb-2">Next Steps:</h3>
                <ol className="text-sm text-green-700 space-y-1">
                  {result.nextSteps.map((step: string, index: number) => (
                    <li key={index}>
                      <strong>{index + 1}.</strong> {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {result.success && (
              <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded">
                <h3 className="font-bold text-blue-800 mb-2">Test Your Fix:</h3>
                <p className="text-sm text-blue-700">
                  Now comment "hi" on your @writesparkai Instagram post from any other account. 
                  You should receive a private reply/DM automatically!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
