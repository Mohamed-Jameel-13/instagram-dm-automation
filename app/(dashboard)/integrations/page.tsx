"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { InstagramConnectionStatus } from '@/components/instagram-status'

export default function IntegrationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
      <Card>
        <CardHeader>
          <CardTitle>Instagram</CardTitle>
          <CardDescription>
            Connect using your Instagram access token (no OAuth). Supports Business (DM/comments) and Basic Display.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstagramConnectionStatus showCard className="max-w-xl w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
