'use client'

import { StackAuthProvider } from '@stackframe/stack-react'
import { stackAuth } from '@/lib/auth'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <StackAuthProvider stackAuth={stackAuth}>
      {children}
    </StackAuthProvider>
  )
}
