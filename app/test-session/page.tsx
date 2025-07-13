"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

export default function TestSessionPage() {
  const { data: session, status } = useSession()
  const [clientSession, setClientSession] = useState(null)

  useEffect(() => {
    // Force session refresh
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => setClientSession(data))
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Session Test</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold">useSession Hook:</h2>
        <p><strong>Status:</strong> {status}</p>
        <pre className="mt-2 text-sm overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="bg-blue-100 p-4 rounded">
        <h2 className="font-semibold">Direct API Call:</h2>
        <pre className="mt-2 text-sm overflow-auto">
          {JSON.stringify(clientSession, null, 2)}
        </pre>
      </div>
    </div>
  )
}
