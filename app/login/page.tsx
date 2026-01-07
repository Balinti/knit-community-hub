import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { AuthForm } from '@/components/auth/AuthForm'

export default async function LoginPage() {
  const user = await getUser()

  if (user) {
    redirect('/app')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <AuthForm />
    </div>
  )
}
