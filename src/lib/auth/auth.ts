import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { ExtendedJWT } from "@/types/types"

async function refreshAccessToken(token: ExtendedJWT): Promise<ExtendedJWT> {
  try {
    if (!token.refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const url = "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      })

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    }
  } catch {
    return {
      ...token,
      error: "RefreshAccessTokenError",
      accessToken: undefined,
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email", 
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.labels"
          ].join(" "),
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      const extendedToken = token as ExtendedJWT

      if (account && user) {
        return {
          ...extendedToken,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          user,
          error: undefined,
        } as ExtendedJWT
      }

      // If token has error, return it to trigger re-authentication
      if (extendedToken.error) {
        return extendedToken as ExtendedJWT
      }

      // If token is still valid, return it
      if (extendedToken.accessTokenExpires && Date.now() < extendedToken.accessTokenExpires) {
        return extendedToken as ExtendedJWT
      }

      // Try to refresh the token
      const refreshedToken = await refreshAccessToken(extendedToken)
      return refreshedToken as ExtendedJWT
    },
    async session({ session, token }) {
      const extendedToken = token as ExtendedJWT
      
      // If token has error, don't provide access token to trigger re-auth
      if (extendedToken.error) {
        session.accessToken = undefined
        session.error = extendedToken.error
      } else {
        session.accessToken = extendedToken.accessToken
        session.error = undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },
} 