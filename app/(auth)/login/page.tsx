"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"
import { auth } from "@/lib/firebase"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if we should start in signup mode
    const mode = searchParams.get('mode')
    if (mode === 'signup') {
      setIsSignUp(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        action: isSignUp ? "signup" : "signin",
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: isSignUp ? "Signup Failed" : "Login Failed",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success!",
          description: isSignUp ? "Account created successfully" : "You have been logged in successfully",
        })
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Auth error:", error)
      toast({
        title: "Error",
        description: "An error occurred during authentication",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Sign in with NextAuth using the Firebase user data
      const firebaseResult = await signIn("credentials", {
        email: result.user.email,
        password: "google_oauth_user", // Special password for Google OAuth users
        action: "google_signin",
        redirect: false,
      })

      if (firebaseResult?.error) {
        toast({
          title: "Login Failed",
          description: firebaseResult.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success!",
          description: "You have been logged in with Google",
        })
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      toast({
        title: "Error",
        description: "Failed to sign in with Google",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp 
              ? "Create your account to get started" 
              : "Sign in to your account to continue"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleGoogleSignIn}
            type="button"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                placeholder="Enter your email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? (isSignUp ? "Creating Account..." : "Signing In...") 
                : (isSignUp ? "Create Account" : "Sign In")
              }
            </Button>
          </form>

          <div className="text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal"
                  onClick={() => setIsSignUp(false)}
                >
                  Sign in
                </Button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal"
                  onClick={() => setIsSignUp(true)}
                >
                  Sign up
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
