"use client"

import { useSession } from "next-auth/react"
import { AuthButton } from "@/components/auth/auth-button"
import { Dashboard } from "@/components/dashboard/dashboard"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return <Dashboard />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Mail
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Your intelligent email assistant
          </p>
        </div>
        <AuthButton />
      </div>
    </div>
  );
}
