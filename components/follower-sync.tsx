"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, RefreshCw } from "lucide-react"

interface FollowerSyncProps {
  onSyncComplete?: (data: { totalFollowers: number; newFollowersCount: number }) => void
}

export function FollowerSync({ onSyncComplete }: FollowerSyncProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<{
    totalFollowers: number
    newFollowers: number
    recentCommenters: number
  } | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Load stats on component mount
  useEffect(() => {
    loadStats()
  }, [])

  const syncFollowers = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch("/api/followers/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to sync followers")
      }

      const data = await response.json()
      
      if (data.success) {
        setLastSync(new Date())
        await loadStats()
        onSyncComplete?.(data.data)
      } else {
        throw new Error(data.error || "Failed to sync followers")
      }
    } catch (error) {
      console.error("Error syncing followers:", error)
      alert("Failed to sync followers. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch("/api/followers/sync")
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }
      }
    } catch (error) {
      console.error("Error loading follower stats:", error)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Follower Sync
        </CardTitle>
        <CardDescription>
          Sync your Instagram followers to enable new follower detection for automations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-blue-50">
              Total: {stats.totalFollowers}
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              New: {stats.newFollowers}
            </Badge>
            <Badge variant="outline" className="bg-purple-50">
              Recent Comments: {stats.recentCommenters}
            </Badge>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Button
            onClick={syncFollowers}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? "Syncing..." : "Sync Followers"}
          </Button>

          {lastSync && (
            <p className="text-sm text-muted-foreground">
              Last synced: {lastSync.toLocaleString()}
            </p>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> Follower sync is required for "New Follower + Comment" automations to work properly. 
            New followers are detected by comparing your current follower list with the previously synced list.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 