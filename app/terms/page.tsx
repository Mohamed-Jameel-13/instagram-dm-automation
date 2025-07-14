import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Terms of Service
            </CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
                <p>
                  By accessing and using this Instagram DM Automation service, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
                <p>
                  Permission is granted to temporarily use this service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Disclaimer</h2>
                <p>
                  The materials on this service are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Limitations</h2>
                <p>
                  In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use this service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Instagram Compliance</h2>
                <p>
                  You agree to use this service in compliance with Instagram's Terms of Service and Community Guidelines. Any violation may result in termination of your access to this service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Contact Information</h2>
                <p>
                  If you have any questions about these Terms of Service, please contact us through our support channels.
                </p>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t text-center">
              <Link href="/signup">
                <Button className="mr-4">
                  Back to Sign Up
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 