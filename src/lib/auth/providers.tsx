"use client"

import { SessionProvider } from "next-auth/react"
import { AuthProviderProps } from "@/types/types"

export function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>
} 