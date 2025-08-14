"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function Dashboard() {
  const { data: session } = useSession()

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Mail
              </h1>
              <Badge variant="secondary">Beta</Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                <AvatarFallback>
                  {session.user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {session.user?.name}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Welcome back, {session.user?.name?.split(' ')[0]}!</CardTitle>
              <CardDescription>
                Your AI-powered email assistant is ready to help you manage your inbox efficiently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                  <AvatarFallback>
                    {session.user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{session.user?.name}</p>
                  <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/emails'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">View Emails</CardTitle>
              <Badge variant="secondary">📧</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Inbox</div>
              <p className="text-xs text-muted-foreground">
                Click to view your emails
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Smart replies ready
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productivity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">
                Inbox zero achieved
              </p>
            </CardContent>
          </Card>

          {/* Features Coming Soon */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Features Coming Soon</CardTitle>
              <CardDescription>
                We&apos;re working on these exciting features to enhance your email experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">📧 Smart Email Management</h4>
                  <p className="text-sm text-muted-foreground">
                    AI-powered email categorization and priority sorting
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">🤖 Intelligent Replies</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate context-aware email responses automatically
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">📊 Analytics Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Track your email productivity and response times
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">🔍 Smart Search</h4>
                  <p className="text-sm text-muted-foreground">
                    Natural language email search and filtering
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 