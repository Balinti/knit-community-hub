"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Check, Loader2, CreditCard, Crown, ExternalLink } from "lucide-react"
import { FREE_LIMITS } from "@/lib/limits"

interface Profile {
  id: string
  email: string
  display_name: string
  plan: "free" | "pro"
  stripe_customer_id: string | null
}

interface Entitlement {
  id: string
  kind: string
  status: string
  ends_at: string | null
}

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [proUpgradeAvailable, setProUpgradeAvailable] = useState(false)
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    fetchStripeConfig()
  }, [])

  const fetchStripeConfig = async () => {
    try {
      const response = await fetch("/api/stripe/config")
      const data = await response.json()
      setStripeConfigured(data.configured)
      setProUpgradeAvailable(data.proUpgradeAvailable)
    } catch (error) {
      console.error("Error fetching Stripe config:", error)
    }
  }

  useEffect(() => {
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")

    if (success === "true") {
      toast({
        title: "Payment successful",
        description: "Your subscription has been activated. It may take a moment to update.",
      })
      // Refresh data after a short delay
      setTimeout(fetchData, 2000)
    } else if (canceled === "true") {
      toast({
        title: "Payment canceled",
        description: "Your payment was canceled.",
        variant: "destructive",
      })
    }
  }, [searchParams])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      const { data: entitlementsData } = await supabase
        .from("entitlements")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")

      if (entitlementsData) {
        setEntitlements(entitlementsData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    setIsUpgrading(true)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pro" }),
      })

      const data = await response.json()

      if (response.status === 501) {
        setStripeConfigured(false)
        toast({
          title: "Payments not configured",
          description: "Payment processing is not available at this time.",
          variant: "destructive",
        })
        return
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      })
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleManageBilling = async () => {
    setIsManaging(true)

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create portal session")
      }

      window.location.href = data.url
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      })
    } finally {
      setIsManaging(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isPro = entitlements.some((e) => e.kind === "pro" && e.status === "active")
  const proEntitlement = entitlements.find((e) => e.kind === "pro")

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Billing</h1>
      <p className="text-muted-foreground mb-8">
        Manage your subscription and billing
      </p>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Pro" : "Free"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {isPro
                  ? proEntitlement?.ends_at
                    ? `Renews on ${new Date(proEntitlement.ends_at).toLocaleDateString()}`
                    : "Active subscription"
                  : "Upgrade to unlock more features"}
              </CardDescription>
            </div>
            {isPro && profile?.stripe_customer_id && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={isManaging}
              >
                {isManaging ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Manage Billing
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Free Plan */}
        <Card className={!isPro ? "border-primary" : ""}>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>For casual knitters</CardDescription>
            <div className="text-3xl font-bold">$0</div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Up to {FREE_LIMITS.maxProjects} projects
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Up to {FREE_LIMITS.maxNotes} notes total
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {FREE_LIMITS.maxPhotosPerProject} photo per project
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {FREE_LIMITS.maxQuestionsPerMonth} questions per month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Row counters
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                PDF viewer
              </li>
            </ul>
            {!isPro && (
              <div className="mt-6">
                <Badge variant="outline" className="w-full justify-center py-2">
                  Current Plan
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={isPro ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <CardTitle>Pro</CardTitle>
            </div>
            <CardDescription>For dedicated crafters</CardDescription>
            <div className="text-3xl font-bold">
              $9.99<span className="text-base font-normal">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <strong>Unlimited</strong> projects
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <strong>Unlimited</strong> notes
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <strong>Unlimited</strong> photos
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <strong>Unlimited</strong> questions
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Early access to new features
              </li>
            </ul>
            <div className="mt-6">
              {isPro ? (
                <Badge className="w-full justify-center py-2">Current Plan</Badge>
              ) : proUpgradeAvailable ? (
                <Button
                  className="w-full"
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Upgrade to Pro
                </Button>
              ) : stripeConfigured ? (
                <Button className="w-full" disabled variant="outline">
                  Pro plan coming soon
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Packs */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Official Support Packs</CardTitle>
          <CardDescription>
            Purchase official support packs for patterns with extra FAQs, errata, and video tutorials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Support packs are available for select patterns. When you upload a pattern that has an official support pack available, you&apos;ll see an option to purchase it in the project view.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
