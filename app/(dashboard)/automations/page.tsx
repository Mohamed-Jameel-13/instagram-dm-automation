"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Plus, Zap, Trash2 } from "lucide-react"
import { useFirebaseAuth } from "@/components/firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { InstagramConnectionStatus } from "@/components/instagram-status"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useCachedFetch } from "@/hooks/use-cached-fetch"

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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, loading } = useFirebaseAuth()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [search, setSearch] = useState<string>("")
  const [isInstagramConnected, setIsInstagramConnected] = useState(false)
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const initializedRef = useRef(false)

  const automationsUrl = user?.uid ? `/api/automations?userId=${user.uid}` : null
  const { data: automationsResponse, loading: loadingAutomations, refresh: refreshAutomations } = useCachedFetch<{ automations: Automation[] }>(automationsUrl, { ttlMs: 30000 })

  // Seed local state from cache without flicker
  useEffect(() => {
    if (automationsResponse?.automations) {
      setAutomations(automationsResponse.automations)
    }
  }, [automationsResponse])

  // Sync search param to state
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
  }, [searchParams])

  // Check Instagram connection status with cache
  const igStatusUrl = user?.uid ? `/api/instagram/status?userId=${user.uid}` : null
  const { data: igStatus, loading: loadingIgStatus, refresh: refreshIgStatus } = useCachedFetch<any>(igStatusUrl, { ttlMs: 30000 })

  useEffect(() => {
    if (igStatus) {
      setIsInstagramConnected(!!igStatus.connected)
      setConnectedAccount(igStatus.connected ? igStatus.account : null)
    }
  }, [igStatus])

  // Initial loading state resolution
  useEffect(() => {
    if (initializedRef.current) return
    if (!loading && !loadingAutomations && !loadingIgStatus) {
      setIsLoading(false)
      initializedRef.current = true
    }
  }, [loading, loadingAutomations, loadingIgStatus])

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
          userId: user?.uid, // Send the Firebase Auth user ID
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAutomations([...automations, data.automation])
        refreshAutomations()
        router.push(`/automations/${data.automation.id}`)
      }
    } catch (error) {
      console.error("Error creating automation:", error)
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      const automation = automations.find(a => a.id === id)
      if (!automation) return

      // Allow deactivation even if not connected; block activation when disconnected
      if (!isInstagramConnected && !automation.active) {
        return
      }

      const response = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !automation.active,
          userId: user?.uid,
        }),
      })

      if (response.ok) {
        setAutomations(
          automations.map((automationItem) =>
            automationItem.id === id ? { ...automationItem, active: !automationItem.active } : automationItem,
          ),
        )
        refreshAutomations()
      }
    } catch (error) {
      console.error("Error toggling automation:", error)
    }
  }

  const handleDeleteAutomation = async (id: string) => {
    if (!user?.uid) return
    try {
      setDeletingId(id)
      const response = await fetch(`/api/automations/${id}?userId=${user.uid}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setAutomations((prev) => prev.filter((a) => a.id !== id))
        refreshAutomations()
      } else {
        console.error("Failed to delete automation", await response.text())
      }
    } catch (error) {
      console.error("Error deleting automation:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleConnectionSuccess = () => {
    // Refresh the Instagram connection status when user connects
      setIsInstagramConnected(true)
    // Also refresh the automations list
    if (user?.uid) {
        refreshIgStatus()
        refreshAutomations()
    }
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

  const filtered = automations.filter(a => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const name = a.name?.toLowerCase() || ''
    const type = (a.type || a.actionType || '').toLowerCase()
    const keywords = (a.keywords || []).join(' ').toLowerCase()
    return name.includes(q) || type.includes(q) || keywords.includes(q)
  })

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
        {filtered.map((automation) => (
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
                    disabled={!isInstagramConnected && !automation.active}
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
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/automations/${automation.id}`}>
                  <Button variant="outline" size="sm" disabled={!isInstagramConnected}>
                    <Zap className="mr-2 h-4 w-4" />
                    Edit Automation
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this automation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the automation and remove it from your account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteAutomation(automation.id)} disabled={deletingId === automation.id}>
                        {deletingId === automation.id ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
