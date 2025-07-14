"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Zap } from "lucide-react"
import { useFirebaseAuth } from "@/components/firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { InstagramConnectionStatus } from "@/components/instagram-status"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface InstagramAccount {
  id: string
  username: string
  account_type?: string
}

interface Automation {
  id: string
  name: string
  keywords: string[]
  actionType?: string
  triggerType?: "comment" | "dm" | "follow_comment"
  active: boolean
  createdAt?: string
  updatedAt?: string
  type?: string // For display purposes
}

// Sample data for automations - will be replaced with real data
const initialAutomations: Automation[] = []

export default function AutomationsPage() {
  const router = useRouter()
  const { user, loading } = useFirebaseAuth()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isInstagramConnected, setIsInstagramConnected] = useState(false)
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user's automations
  useEffect(() => {
    const fetchAutomations = async () => {
      if (user?.uid) {
        try {
          const response = await fetch("/api/automations")
          if (response.ok) {
            const data = await response.json()
            setAutomations(data.automations || [])
          }
        } catch (error) {
          console.error("Error fetching automations:", error)
        }
      }
    }

    if (!loading && user?.uid) {
      fetchAutomations()
    }
  }, [session, status])

  // Check Instagram connection status
  useEffect(() => {
    const checkInstagramConnection = async () => {
      if (user?.uid) {
        try {
          setIsLoading(true)
          const response = await fetch("/api/instagram/status")
          if (response.ok) {
            const data = await response.json()
            setIsInstagramConnected(data.connected)
            if (data.connected) {
              setConnectedAccount(data.account)
            }
          }
        } catch (error) {
          console.error("Error checking Instagram status:", error)
          setIsInstagramConnected(false)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    if (!loading) {
      checkInstagramConnection()
    }
  }, [session, status])

  const handleCreateAutomation = async () => {
    if (!isInstagramConnected) {
      // Cannot create automation without Instagram connected
      return
    }
    
    try {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Untitled Automation",
          keywords: [],
          actionType: "message",
          triggerType: "dm",
          message: "",
          active: false,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAutomations([...automations, data.automation])
        router.push(`/automations/${data.automation.id}`)
      }
    } catch (error) {
      console.error("Error creating automation:", error)
    }
  }

  const handleToggleActive = async (id: string) => {
    if (!isInstagramConnected) {
      return
    }
    
    try {
      const automation = automations.find(a => a.id === id)
      if (!automation) return

      const response = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !automation.active,
        }),
      })

      if (response.ok) {
        setAutomations(
          automations.map((automation) =>
            automation.id === id ? { ...automation, active: !automation.active } : automation,
          ),
        )
      }
    } catch (error) {
      console.error("Error toggling automation:", error)
    }
  }

  const handleConnectionSuccess = () => {
    // Refresh the Instagram connection status when user connects
    setIsInstagramConnected(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
            <p className="text-muted-foreground mt-2">Create and manage your Instagram automations</p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground mt-2">Create and manage your Instagram automations</p>
        </div>
        <Button onClick={handleCreateAutomation} disabled={!isInstagramConnected}>
          <Plus className="mr-2 h-4 w-4" />
          Create an Automation
        </Button>
      </div>

      {!isInstagramConnected && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertTitle>Instagram Connection Required</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>You need to connect your Instagram account to create and manage automations.</p>
            <div>
              <InstagramConnectionStatus onConnected={handleConnectionSuccess} />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isInstagramConnected && connectedAccount && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertTitle>Instagram Connected</AlertTitle>
          <AlertDescription>
            Connected to @{connectedAccount.username} - Ready to create automations!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {automations.map((automation) => (
          <Card key={automation.id} className={!isInstagramConnected ? "opacity-70" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>{automation.name}</CardTitle>
                  <CardDescription>
                    {automation.updatedAt 
                      ? `Last modified: ${format(new Date(automation.updatedAt), "MMM d, yyyy")}`
                      : `Created: ${automation.createdAt ? format(new Date(automation.createdAt), "MMM d, yyyy") : 'Recently'}`
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={automation.type === "Smart AI" ? "default" : "outline"}>{automation.type}</Badge>
                  <Switch 
                    checked={automation.active} 
                    onCheckedChange={() => handleToggleActive(automation.id)}
                    disabled={!isInstagramConnected}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <div className="text-sm text-muted-foreground mr-2">Trigger keywords:</div>
                {automation.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
                {automation.keywords.length === 0 && (
                  <span className="text-sm text-muted-foreground italic">No keywords set</span>
                )}
              </div>
              <div className="mt-4">
                <Link href={`/automations/${automation.id}`}>
                  <Button variant="outline" size="sm" disabled={!isInstagramConnected}>
                    <Zap className="mr-2 h-4 w-4" />
                    Edit Automation
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {automations.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                You don&apos;t have any automations yet. Create your first automation to get started.
              </p>
              <Button className="mt-4" onClick={handleCreateAutomation} disabled={!isInstagramConnected}>
                <Plus className="mr-2 h-4 w-4" />
                Create an Automation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
