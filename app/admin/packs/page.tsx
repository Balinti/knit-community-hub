"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Package, Loader2, Hash, ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface SupportPack {
  id: string
  name: string
  description: string | null
  pattern_hash: string
  active: boolean
  price_stripe_product_id: string | null
  price_stripe_price_id: string | null
  created_at: string
  support_pack_items?: { count: number }[]
}

export default function AdminPacksPage() {
  const [packs, setPacks] = useState<SupportPack[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [patternHash, setPatternHash] = useState("")
  const [stripePriceId, setStripePriceId] = useState("")
  const [stripeProductId, setStripeProductId] = useState("")
  const [active, setActive] = useState(true)

  useEffect(() => {
    fetchPacks()
  }, [])

  const fetchPacks = async () => {
    try {
      const response = await fetch("/api/admin/packs")
      if (!response.ok) {
        if (response.status === 501) {
          toast({
            title: "Service not configured",
            description: "Admin features require service role key.",
            variant: "destructive",
          })
          return
        }
        throw new Error("Failed to fetch packs")
      }
      const data = await response.json()
      setPacks(data.packs || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load support packs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim() || !patternHash.trim()) {
      toast({
        title: "Validation error",
        description: "Name and pattern hash are required",
        variant: "destructive",
      })
      return
    }

    if (patternHash.length !== 64) {
      toast({
        title: "Validation error",
        description: "Pattern hash must be 64 characters (SHA-256)",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/admin/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          pattern_hash: patternHash.trim(),
          price_stripe_product_id: stripeProductId.trim() || null,
          price_stripe_price_id: stripePriceId.trim() || null,
          active,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create pack")
      }

      toast({ title: "Pack created", description: "Support pack has been created" })
      setShowCreateDialog(false)
      resetForm()
      fetchPacks()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create pack",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setPatternHash("")
    setStripePriceId("")
    setStripeProductId("")
    setActive(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Support Packs</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage official support packs for patterns
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Pack
        </Button>
      </div>

      {packs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No support packs yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first support pack to provide official help for patterns
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Pack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <Link key={pack.id} href={`/admin/packs/${pack.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{pack.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {pack.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant={pack.active ? "default" : "secondary"}>
                      {pack.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      <span className="font-mono text-xs truncate">
                        {pack.pattern_hash.slice(0, 16)}...
                      </span>
                    </div>
                    {pack.price_stripe_price_id && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ExternalLink className="h-4 w-4" />
                        <span>Stripe configured</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(pack.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Support Pack</DialogTitle>
            <DialogDescription>
              Create a new official support pack for a pattern
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Cozy Sweater Support Pack"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Description of what's included..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Pattern Hash (SHA-256) *</Label>
              <Input
                placeholder="64 character hex string"
                value={patternHash}
                onChange={(e) => setPatternHash(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The SHA-256 hash of the pattern PDF file
              </p>
            </div>
            <div>
              <Label>Stripe Product ID</Label>
              <Input
                placeholder="prod_xxx (optional)"
                value={stripeProductId}
                onChange={(e) => setStripeProductId(e.target.value)}
              />
            </div>
            <div>
              <Label>Stripe Price ID</Label>
              <Input
                placeholder="price_xxx (optional)"
                value={stripePriceId}
                onChange={(e) => setStripePriceId(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
