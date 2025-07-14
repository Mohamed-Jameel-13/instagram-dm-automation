import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
                <p>
                  We collect information you provide directly to us, such as when you create an account, connect your Instagram account, or configure automation settings.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
                <p>
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to outside parties except as described in this privacy policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
                <p>
                  We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Instagram Data</h2>
                <p>
                  We only access Instagram data necessary for the automation features you enable. We comply with Instagram's Data Policy and API Terms of Use.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
                <p>
                  You have the right to access, update, or delete your personal information. You can manage your data preferences in your account settings.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us through our support channels.
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