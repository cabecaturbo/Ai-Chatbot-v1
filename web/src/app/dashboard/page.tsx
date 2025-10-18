'use client'

import { useStackAuth } from '@stackframe/stack-react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function DashboardContent() {
  const { user } = useStackAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Netia AI Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Hello, {user?.displayName || user?.email}!
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Role: {user?.additionalFields?.role || 'customer'}
          </p>
          
          {user?.additionalFields?.role === 'admin' && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Admin Panel</h2>
              <p className="mt-2 text-gray-600">
                You have admin access to manage all tenants and system settings.
              </p>
            </div>
          )}
          
          {user?.additionalFields?.role === 'customer' && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Customer Portal</h2>
              <p className="mt-2 text-gray-600">
                Manage your chatbot configuration and view analytics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
