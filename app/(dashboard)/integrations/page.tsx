"use client"

import { Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { InstagramConnectionStatus } from "@/components/instagram-status"

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">Connect your accounts to enable automations</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <InstagramConnectionStatus showCard />

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Salesforce</CardTitle>
                <CardDescription>Connect Salesforce to sync customer data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connecting Salesforce allows you to automatically sync customer data from Instagram interactions to your
              CRM.
            </p>
          </CardContent>
          <CardFooter>
            <Button>Connect Salesforce</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
