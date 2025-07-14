"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { use } from "react"
import Link from "next/link"
import { ChevronRight, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FollowerSync } from "@/components/follower-sync"
import { useFirebaseAuth } from "@/components/firebase-auth"

interface Automation {
  id: string
  name: string
  active: boolean
  keywords: string[]
  actionType?: "message" | "ai"
  triggerType?: "comment" | "dm" | "follow_comment"
  message?: string
  commentReply?: string
  aiPrompt?: string
  posts?: string[]
  dmMode?: "normal" | "smart_follower"
}

interface InstagramPost {
  id: string
  caption: string
  media_type: string
  media_url: string
  thumbnail_url?: string
  timestamp: string
}

export default function AutomationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user, loading } = useFirebaseAuth()
  
  const [automation, setAutomation] = useState<Automation>({
    id: id,
    name: "Untitled Automation",
    active: false,
    keywords: [],
  })
  const [keyword, setKeyword] = useState("")
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postsError, setPostsError] = useState("")

  // Load automation data
  useEffect(() => {
    const fetchAutomation = async () => {
      if (!user?.uid) return
      
      try {
        setIsLoading(true)
        const response = await fetch(`/api/automations/${id}?userId=${user.uid}`)
        if (response.ok) {
          const data = await response.json()
          setAutomation({
            id: data.automation.id,
            name: data.automation.name,
            active: data.automation.active,
            keywords: data.automation.keywords || [],
            actionType: data.automation.actionType,
            triggerType: data.automation.triggerType,
            message: data.automation.message,
            commentReply: data.automation.commentReply,
            aiPrompt: data.automation.aiPrompt,
            posts: data.automation.posts || [],
            dmMode: data.automation.dmMode || "normal",
          })

          // Set the appropriate step based on data
          if (data.automation.keywords?.length > 0) {
            if (data.automation.actionType) {
              if (data.automation.triggerType === "comment" && (!data.automation.posts || data.automation.posts.length === 0)) {
                setStep(3)
              } else {
                setStep(4)
              }
            } else {
              setStep(2)
            }
          } else {
            setStep(1)
          }
        }
      } catch (error) {
        console.error("Error fetching automation:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAutomation()
  }, [id, user])

  // Fetch Instagram posts
  const fetchInstagramPosts = async () => {
    if (!user?.uid) return
    
    try {
      setLoadingPosts(true)
      setPostsError("")
      const response = await fetch(`/api/instagram/posts?limit=12&userId=${user.uid}`)
      
      if (response.ok) {
        const data = await response.json()
        setInstagramPosts(data.posts || [])
      } else {
        const errorData = await response.json()
        setPostsError(errorData.error || "Failed to fetch posts")
      }
    } catch (error) {
      console.error("Error fetching Instagram posts:", error)
      setPostsError("Failed to fetch posts")
    } finally {
      setLoadingPosts(false)
    }
  }

  // Load Instagram posts when we need them (step 3 for comment triggers)
  useEffect(() => {
    if (step === 3 && automation.triggerType === "comment") {
      fetchInstagramPosts()
    }
  }, [step, automation.triggerType])

  // Auto-save function
  const saveAutomation = async (updatedAutomation: Automation) => {
    if (!user?.uid) return
    
    try {
      setIsSaving(true)
      const response = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: updatedAutomation.name,
          keywords: updatedAutomation.keywords,
          actionType: updatedAutomation.actionType,
          triggerType: updatedAutomation.triggerType,
          message: updatedAutomation.message,
          commentReply: updatedAutomation.commentReply,
          aiPrompt: updatedAutomation.aiPrompt,
          posts: updatedAutomation.posts,
          active: updatedAutomation.active,
          dmMode: updatedAutomation.dmMode,
          userId: user.uid,
        }),
      })

      if (!response.ok) {
        console.error("Failed to save automation")
      }
    } catch (error) {
      console.error("Error saving automation:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Debounced save
  useEffect(() => {
    if (!isLoading && !loading) {
      const timeoutId = setTimeout(() => {
        saveAutomation(automation)
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [automation, isLoading, loading, user])

  if (isLoading || loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading automation...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please log in to view this automation.</p>
        </div>
      </div>
    )
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutomation({ ...automation, name: e.target.value })
  }

  const handleToggleActive = () => {
    setAutomation({ ...automation, active: !automation.active })
  }

  const handleAddKeyword = () => {
    if (!keyword.trim()) return

    const keywords = automation.keywords || []
    if (!keywords.includes(keyword)) {
      setAutomation({
        ...automation,
        keywords: [...keywords, keyword],
      })
    }
    setKeyword("")
  }

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setAutomation({
      ...automation,
      keywords: automation.keywords.filter((k) => k !== keywordToRemove),
    })
  }

  const handleSetTriggerType = (type: "comment" | "dm" | "follow_comment") => {
    setAutomation({
      ...automation,
      triggerType: type,
    })
  }

  const handleSetDmMode = (mode: "normal" | "smart_follower") => {
    setAutomation({
      ...automation,
      dmMode: mode,
    })
  }

  const handleCreateTrigger = () => {
    if (automation.keywords.length === 0) return
    setStep(2)
  }

  const handleSetActionType = (type: "message" | "ai") => {
    setAutomation({
      ...automation,
      actionType: type,
      ...(type === "message" ? { message: "", commentReply: "" } : { aiPrompt: "" }),
    })
  }

  const handleSetMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAutomation({
      ...automation,
      message: e.target.value,
    })
  }

  const handleSetCommentReply = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAutomation({
      ...automation,
      commentReply: e.target.value,
    })
  }

  const handleSetAiPrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAutomation({
      ...automation,
      aiPrompt: e.target.value,
    })
  }

  const handleCreateAction = () => {
    if (
      (automation.actionType === "message" && !automation.message) ||
      (automation.actionType === "ai" && !automation.aiPrompt)
    ) {
      return
    }

    if (automation.triggerType === "comment") {
      setStep(3)
    } else {
      // For DM triggers, we skip the post attachment step
      setStep(4)
    }
  }

  const handleAttachPosts = (posts: string[]) => {
    setAutomation({
      ...automation,
      posts,
    })
    setStep(4)
  }

  return (
    <div className="space-y-8">
      {/* Improved Header with Clear Save Functionality */}
      <div className="flex flex-col space-y-4 border-b pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            <Link href="/automations" className="hover:underline">
              Automations
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span>Edit Automation</span>
          </div>
          <div className="flex items-center space-x-3">
            {isSaving && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Saving...</span>
              </div>
            )}
            {!isSaving && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span>Saved</span>
              </div>
            )}
            <Button onClick={() => saveAutomation(automation)} disabled={isSaving}>
              Save Changes
            </Button>
          </div>
        </div>
        
        {/* Clear Automation Name Editor */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Automation Name</Label>
                <Input
                  value={automation.name}
                  onChange={handleNameChange}
                  placeholder="Give your automation a descriptive name..."
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Choose a name that describes what this automation does (e.g., "Customer Support Bot", "Product Inquiry Handler")
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch checked={automation.active} onCheckedChange={handleToggleActive} />
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">
                      {automation.active ? "Active" : "Inactive"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {automation.active ? "This automation will respond to triggers" : "This automation is paused"}
                    </p>
                  </div>
                </div>
                
                {automation.active && automation.keywords.length > 0 && automation.actionType && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">✓ Ready to go!</div>
                    <div className="text-xs text-muted-foreground">All steps completed</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground mr-2">
                1
              </span>
              When...
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!automation.triggerType ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">Choose what will trigger this automation:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2"
                    onClick={() => setAutomation({ ...automation, triggerType: "comment" })}
                  >
                    <div className="font-medium">Comment Trigger</div>
                    <div className="text-sm text-muted-foreground text-left">Respond to comments on your Instagram posts</div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2"
                    onClick={() => setAutomation({ ...automation, triggerType: "dm" })}
                  >
                    <div className="font-medium">DM Trigger</div>
                    <div className="text-sm text-muted-foreground text-left">Respond to direct messages with keywords</div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2"
                    onClick={() => setAutomation({ ...automation, triggerType: "follow_comment" })}
                  >
                    <div className="font-medium">New Follower + Comment</div>
                    <div className="text-sm text-muted-foreground text-left">Respond when new followers comment with keywords</div>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <RadioGroup
                    value={automation.triggerType}
                    onValueChange={(value) => handleSetTriggerType(value as "comment" | "dm" | "follow_comment")}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="comment" id="trigger-comment" />
                      <Label htmlFor="trigger-comment">User comments on my post</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dm" id="trigger-dm" />
                      <Label htmlFor="trigger-dm">User sends me a DM with a keyword</Label>
                    </div>
                  </RadioGroup>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutomation({ ...automation, triggerType: undefined, keywords: [] })}
                  >
                    Change
                  </Button>
                </div>

                {/* DM Mode Selection - Only show for comment triggers */}
                {automation.triggerType === "comment" && (
                  <div className="space-y-4 border-l-4 border-blue-500 pl-4 bg-blue-50/50 rounded-r-lg p-4">
                    <div>
                      <Label className="text-base font-medium text-blue-900">DM Mode</Label>
                      <p className="text-sm text-blue-700 mt-1">
                        Choose how to handle DMs when users comment with your keywords
                      </p>
                    </div>
                    <RadioGroup
                      value={automation.dmMode || "normal"}
                      onValueChange={(value) => handleSetDmMode(value as "normal" | "smart_follower")}
                      className="flex flex-col space-y-3"
                    >
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="normal" id="dm-mode-normal" className="mt-0.5" />
                        <div className="space-y-1">
                          <Label htmlFor="dm-mode-normal" className="text-sm font-medium">Normal Mode</Label>
                          <p className="text-xs text-muted-foreground">
                            Send DMs to anyone who comments with the trigger keyword
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="smart_follower" id="dm-mode-smart" className="mt-0.5" />
                        <div className="space-y-1">
                          <Label htmlFor="dm-mode-smart" className="text-sm font-medium">Smart Follower Mode</Label>
                          <p className="text-xs text-muted-foreground">
                            Three-tier system: Followers get instant DMs, new users need 2 comments, then become "trusted"
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                    {automation.dmMode === "smart_follower" && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm text-amber-800">
                          <strong>⚠️ Setup Required:</strong> Smart Follower Mode uses a three-tier system. 
                          Run <code>populateFollowers.js</code> to sync existing followers first.
                        </p>
                        <div className="mt-2 text-xs text-amber-700">
                          <div>• <strong>Followers:</strong> Instant DMs</div>
                          <div>• <strong>New Users:</strong> No DM on first comment</div>
                          <div>• <strong>Trusted Users:</strong> Instant DMs after 2nd comment</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Trigger Keywords</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add words that will trigger this automation. Users need to include these words in their {automation.triggerType === "comment" ? "comments" : "messages"}.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Type a keyword and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddKeyword()
                        }
                      }}
                    />
                    <Button onClick={handleAddKeyword} disabled={!keyword.trim()}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {automation.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="flex items-center gap-1">
                        {kw}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveKeyword(kw)} />
                      </Badge>
                    ))}
                    {automation.keywords.length === 0 && (
                      <div className="text-center py-4 border-2 border-dashed border-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">No keywords added yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Add at least one keyword to continue</p>
                      </div>
                    )}
                  </div>
                </div>

                {automation.keywords.length > 0 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-green-600">✓ Trigger configured</div>
                    <Button onClick={handleCreateTrigger} variant="default">
                      Continue to Response →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={step < 2 ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground mr-2">
                2
              </span>
              Then...
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Complete the trigger setup first</p>
              </div>
            ) : !automation.actionType ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">Choose how you want to respond:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2"
                    onClick={() => handleSetActionType("message")}
                  >
                    <div className="font-medium">Send Message</div>
                    <div className="text-sm text-muted-foreground text-left">Send a pre-written message to users</div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2"
                    onClick={() => handleSetActionType("ai")}
                  >
                    <div className="font-medium">AI Response</div>
                    <div className="text-sm text-muted-foreground text-left">Let AI generate personalized responses</div>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <RadioGroup
                    value={automation.actionType}
                    onValueChange={(value) => handleSetActionType(value as "message" | "ai")}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="message" id="action-message" />
                      <Label htmlFor="action-message">Send the user a message</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ai" id="action-ai" />
                      <Label htmlFor="action-ai">Let Smart AI take over</Label>
                    </div>
                  </RadioGroup>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutomation({ ...automation, actionType: undefined, message: "", commentReply: "", aiPrompt: "" })}
                  >
                    Change
                  </Button>
                </div>

                {automation.actionType === "message" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">
                        {automation.triggerType === "comment" ? "Comment Reply" : 
                   automation.triggerType === "follow_comment" ? "New Follower Comment Reply" : "DM Response"}
                      </Label>
                      <Textarea
                        value={automation.triggerType === "comment" ? (automation.commentReply || "") : (automation.message || "")}
                        onChange={automation.triggerType === "comment" ? handleSetCommentReply : handleSetMessage}
                        placeholder={`Enter the ${automation.triggerType === "comment" ? "reply" : "message"} you want to send to users`}
                        rows={4}
                      />
                      <p className="text-sm text-muted-foreground">
                        This {automation.triggerType === "comment" ? "reply will be posted publicly under their comment" : "message will be sent privately to the user"}
                      </p>
                    </div>

                    {(automation.triggerType === "comment" || automation.triggerType === "follow_comment") && (
                      <div className="space-y-2">
                        <Label>Private Reply Message {automation.triggerType === "comment" ? "(optional)" : ""}</Label>
                        <Textarea
                          value={automation.message || ""}
                          onChange={handleSetMessage}
                          placeholder={
                            automation.triggerType === "follow_comment" 
                              ? "Enter the private message to send to new followers..."
                              : "Send an additional private message (optional)"
                          }
                          rows={2}
                        />
                        <p className="text-sm text-muted-foreground">
                          {automation.triggerType === "follow_comment" 
                            ? "Send a private reply message triggered by the comment interaction"
                            : "Also send a private reply message triggered by the comment interaction"
                          }
                        </p>
                      </div>
                    )}

                    {automation.triggerType === "dm" && (
                      <div className="space-y-2">
                        <Label>DM Response Message</Label>
                        <Textarea
                          value={automation.message || ""}
                          onChange={handleSetMessage}
                          placeholder="Enter the message to send in response to DMs..."
                          rows={2}
                        />
                        <p className="text-sm text-muted-foreground">
                          Send a response message when users DM with matching keywords
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {automation.actionType === "ai" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">AI Instructions</Label>
                      <Textarea
                        value={automation.aiPrompt || ""}
                        onChange={handleSetAiPrompt}
                        placeholder="Tell the AI how to respond. Be specific about your brand voice, products, and how you want it to interact with users."
                        rows={6}
                      />
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 font-medium mb-1">💡 Pro Tip:</p>
                        <p className="text-sm text-blue-700">
                          Be specific! Include your brand voice, common questions you receive, and how formal or casual you want the responses to be.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                                  {((automation.actionType === "message" && ((automation.triggerType === "comment" && automation.commentReply) || (automation.triggerType === "dm" && automation.message) || (automation.triggerType === "follow_comment" && automation.commentReply && automation.message))) ||
                  (automation.actionType === "ai" && automation.aiPrompt)) && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-green-600">✓ Response configured</div>
                    <Button onClick={handleCreateAction} variant="default">
                      {automation.triggerType === "comment" ? "Continue to Post Selection →" : "Finish Setup →"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {automation.triggerType === "comment" && (
          <Card className={step < 3 ? "opacity-50" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground mr-2">
                  3
                </span>
                If they comment on...
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step < 3 ? (
                <div className="text-sm text-muted-foreground">Complete the previous steps first</div>
              ) : !automation.posts || automation.posts.length === 0 ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={fetchInstagramPosts}>
                      <Plus className="mr-2 h-4 w-4" />
                      Attach a post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Select Posts</DialogTitle>
                    </DialogHeader>
                    {postsError ? (
                      <div className="text-center py-8">
                        <p className="text-red-500 mb-4">{postsError}</p>
                        <Button onClick={fetchInstagramPosts} variant="outline">
                          Try Again
                        </Button>
                      </div>
                    ) : loadingPosts ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Loading your Instagram posts...</p>
                      </div>
                    ) : instagramPosts.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No Instagram posts found</p>
                        <Button onClick={fetchInstagramPosts} variant="outline">
                          Refresh Posts
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 py-4">
                        {instagramPosts.map((post) => (
                          <div
                            key={post.id}
                            className="relative aspect-square cursor-pointer rounded-md overflow-hidden border-2 border-transparent hover:border-primary"
                            onClick={() => handleAttachPosts([post.id])}
                          >
                            <img
                              src={post.thumbnail_url || post.media_url || "/placeholder.svg"}
                              alt={post.caption ? post.caption.substring(0, 50) + "..." : "Instagram post"}
                              className="h-full w-full object-cover"
                            />
                            {post.media_type === 'VIDEO' && (
                              <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                                Video
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {automation.posts.map((postId) => {
                      const post = instagramPosts.find((p) => p.id === postId)
                      return (
                        <div key={postId} className="relative aspect-square rounded-md overflow-hidden">
                          <img
                            src={post?.thumbnail_url || post?.media_url || "/placeholder.svg?height=300&width=300&query=instagram post"}
                            alt={post?.caption ? post.caption.substring(0, 50) + "..." : "Instagram post"}
                            className="h-full w-full object-cover"
                          />
                          {post?.media_type === 'VIDEO' && (
                            <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                              Video
                            </div>
                          )}
                          <button
                            className="absolute top-2 right-2 rounded-full bg-background/80 p-1"
                            onClick={() =>
                              setAutomation({ ...automation, posts: automation.posts?.filter((p) => p !== postId) })
                            }
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 cursor-pointer">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Plus className="h-8 w-8 mb-2" />
                            <span className="text-sm">Add Post</span>
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Select Posts</DialogTitle>
                        </DialogHeader>
                        {postsError ? (
                          <div className="text-center py-8">
                            <p className="text-red-500 mb-4">{postsError}</p>
                            <Button onClick={fetchInstagramPosts} variant="outline">
                              Try Again
                            </Button>
                          </div>
                        ) : loadingPosts ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">Loading your Instagram posts...</p>
                          </div>
                        ) : instagramPosts.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">No Instagram posts found</p>
                            <Button onClick={fetchInstagramPosts} variant="outline">
                              Refresh Posts
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 py-4">
                            {instagramPosts
                              .filter((post) => !automation.posts?.includes(post.id))
                              .map((post) => (
                                <div
                                  key={post.id}
                                  className="relative aspect-square cursor-pointer rounded-md overflow-hidden border-2 border-transparent hover:border-primary"
                                  onClick={() =>
                                    setAutomation({
                                      ...automation,
                                      posts: [...(automation.posts || []), post.id],
                                    })
                                  }
                                >
                                  <img
                                    src={post.thumbnail_url || post.media_url || "/placeholder.svg"}
                                    alt={post.caption ? post.caption.substring(0, 50) + "..." : "Instagram post"}
                                    className="h-full w-full object-cover"
                                  />
                                  {post.media_type === 'VIDEO' && (
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                                      Video
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Follower Sync Component for follow_comment automations */}
        {automation.triggerType === "follow_comment" && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white mr-2">
                  ⚠️
                </span>
                Follower Sync Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  To detect new followers, you must sync your current follower list. This creates a baseline to identify users who follow you after the sync.
                </p>
              </div>
              <FollowerSync onSyncComplete={(data) => {
                console.log("Followers synced:", data)
                // You could add a toast notification here
              }} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
