"use client"

import { useSession } from "next-auth/react"
import { AuthButton } from "@/components/auth/auth-button"
import { Dashboard } from "@/components/dashboard/dashboard"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return <Dashboard />
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              AI Mail
            </h1>
            <p className="text-muted-foreground mb-8">
              Your intelligent email assistant
            </p>
          </div>
          <AuthButton />
        </div>
      </div>
    </div>
  );
}
