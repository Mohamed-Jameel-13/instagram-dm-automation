import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import InstagramProvider from "next-auth/providers/instagram"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { getEnv } from "./env-server"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Instagram OAuth Provider (only if credentials are available)
    ...(getEnv().INSTAGRAM_CLIENT_ID && getEnv().INSTAGRAM_CLIENT_SECRET ? [
      InstagramProvider({
        clientId: getEnv().INSTAGRAM_CLIENT_ID,
        clientSecret: getEnv().INSTAGRAM_CLIENT_SECRET,
      })
    ] : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" }, // "signin" or "signup"
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        try {
          let firebaseUser

          if (credentials.action === "google_signin") {
            // For Google OAuth users, we don't need to authenticate with Firebase again
            // The user is already authenticated via Firebase popup
            // Just find or create the user in our database
          } else if (credentials.action === "signup") {
            // Create new user in Firebase
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              credentials.email,
              credentials.password
            )
            firebaseUser = userCredential.user
          } else {
            // Sign in existing user
            const userCredential = await signInWithEmailAndPassword(
              auth,
              credentials.email,
              credentials.password
            )
            firebaseUser = userCredential.user
          }

          // Create or update user in our database
          let user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                name: firebaseUser?.displayName || credentials.email.split('@')[0],
                image: firebaseUser?.photoURL,
              }
            })
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error: any) {
          console.error("Firebase auth error:", error)
          throw new Error(error.message || "Authentication failed")
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: getEnv().NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.sub || token.id) as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  debug: process.env.NODE_ENV === "development",
}
