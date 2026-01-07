import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser, getUserProfile } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Home, CreditCard, LogOut, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

async function signOut() {
  'use server'
  const { createServerSupabaseClient } = await import('@/lib/supabase/server')
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getUserProfile()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <span className="text-2xl">🧶</span>
            <span className="font-bold text-xl">KnitFlow</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/app">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/app/billing">
              <Button variant="ghost" size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Billing
              </Button>
            </Link>
            <div className="flex items-center gap-2 pl-4 border-l">
              <span className="text-sm text-muted-foreground">
                {profile?.display_name || user.email}
              </span>
              <Badge variant={profile?.plan === 'pro' ? 'default' : 'secondary'}>
                {profile?.plan === 'pro' ? 'Pro' : 'Free'}
              </Badge>
              <form action={signOut}>
                <Button variant="ghost" size="icon" type="submit">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
