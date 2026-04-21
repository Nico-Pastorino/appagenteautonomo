import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id || account?.provider !== 'google' || !account.access_token) return

      await Promise.all([
        prisma.integration.upsert({
          where: { userId_provider: { userId: user.id, provider: 'GOOGLE_CALENDAR' } },
          update: {
            status: 'CONNECTED',
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scopes: account.scope?.split(' ') ?? [],
          },
          create: {
            userId: user.id,
            provider: 'GOOGLE_CALENDAR',
            status: 'CONNECTED',
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scopes: account.scope?.split(' ') ?? [],
          },
        }),
        prisma.userPreference.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        }),
      ])
    },
  },
  pages: {
    signIn: '/login',
  },
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }
}
