import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground mt-2">Find answers to common questions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Browse our most common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I create my first automation?</AccordionTrigger>
              <AccordionContent>
                To create your first automation, go to the Automations page and click on the "Create an Automation"
                button. Follow the step-by-step guide to set up your trigger, action, and (if applicable) attach posts.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How do I connect my Instagram account?</AccordionTrigger>
              <AccordionContent>
                Visit the Integrations page and click on "Connect Instagram". You'll be guided through the Instagram
                OAuth process to authorize Slide to interact with your account.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>What's the difference between Standard and Smart AI automations?</AccordionTrigger>
              <AccordionContent>
                Standard automations send predefined messages when triggered. Smart AI automations use artificial
                intelligence to generate personalized responses based on the context and your provided prompt.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>How do I upgrade my plan?</AccordionTrigger>
              <AccordionContent>
                Go to the Settings page to view your current plan and available upgrade options. Click on the "Upgrade
                Now" button to proceed with the payment process.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>Contact our support team</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            If you couldn't find the answer to your question, please contact our support team at{" "}
            <span className="text-primary">support@slidedm.com</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
