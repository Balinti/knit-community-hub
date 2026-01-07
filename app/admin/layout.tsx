import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/supabase/server'
import { isAdminEmail, isAdminConfigured } from '@/lib/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Home, Package, ArrowLeft, Shield } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if admin is configured
  if (!isAdminConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Not Configured</h1>
          <p className="text-muted-foreground mb-4">
            Set ADMIN_EMAIL_ALLOWLIST environment variable to enable admin access.
          </p>
          <Link href="/app">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  if (!isAdminEmail(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don&apos;t have permission to access the admin area.
          </p>
          <Link href="/app">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app" className="flex items-center gap-2">
              <span className="text-2xl">🧶</span>
              <span className="font-bold text-xl">KnitFlow</span>
            </Link>
            <Badge variant="destructive">Admin</Badge>
          </div>

          <nav className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Admin Home
              </Button>
            </Link>
            <Link href="/admin/packs">
              <Button variant="ghost" size="sm">
                <Package className="h-4 w-4 mr-2" />
                Support Packs
              </Button>
            </Link>
            <Link href="/app">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to App
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-muted/30">
        {children}
      </main>
    </div>
  )
}
