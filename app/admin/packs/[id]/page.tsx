"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Plus, Loader2, FileText, AlertCircle, Video, HelpCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface PackItem {
  id: string
  kind: "faq" | "errata" | "video"
  title: string
  body: string | null
  url: string | null
  page_number: number | null
  bbox: any | null
  created_at: string
}

interface SupportPack {
  id: string
  name: string
  description: string | null
  pattern_hash: string
  active: boolean
  price_stripe_product_id: string | null
  price_stripe_price_id: string | null
  created_at: string
}

export default function AdminPackDetailPage() {
  const params = useParams()
  const packId = params.id as string
  const { toast } = useToast()

  const [pack, setPack] = useState<SupportPack | null>(null)
  const [items, setItems] = useState<PackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)

  // Item form state
  const [itemKind, setItemKind] = useState<"faq" | "errata" | "video">("faq")
  const [itemTitle, setItemTitle] = useState("")
  const [itemBody, setItemBody] = useState("")
  const [itemUrl, setItemUrl] = useState("")
  const [itemPage, setItemPage] = useState("")

  useEffect(() => {
    fetchPackDetails()
  }, [packId])

  const fetchPackDetails = async () => {
    try {
      // Note: We'd need a specific API endpoint for this
      // For now, we'll just show the pack ID
      // In a full implementation, add GET /api/admin/packs/[id]
      setLoading(false)
      toast({
        title: "Loading pack details",
        description: "Pack detail view - implement GET /api/admin/packs/[id] endpoint",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pack details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!itemTitle.trim()) {
      toast({
        title: "Validation error",
        description: "Title is required",
        variant: "destructive",
      })
      return
    }

    setIsAddingItem(true)

    try {
      const response = await fetch("/api/admin/packs/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pack_id: packId,
          kind: itemKind,
          title: itemTitle.trim(),
          body: itemBody.trim() || null,
          url: itemUrl.trim() || null,
          page_number: itemPage ? parseInt(itemPage, 10) : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add item")
      }

      toast({ title: "Item added", description: "Pack item has been added" })
      setShowAddItemDialog(false)
      resetItemForm()
      fetchPackDetails()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive",
      })
    } finally {
      setIsAddingItem(false)
    }
  }

  const resetItemForm = () => {
    setItemKind("faq")
    setItemTitle("")
    setItemBody("")
    setItemUrl("")
    setItemPage("")
  }

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case "faq":
        return <HelpCircle className="h-4 w-4" />
      case "errata":
        return <AlertCircle className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
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
      <Link
        href="/admin/packs"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Packs
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Support Pack</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            ID: {packId}
          </p>
        </div>
        <Button onClick={() => setShowAddItemDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Pack Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pack Items</CardTitle>
          <CardDescription>
            FAQs, errata, and video tutorials included in this pack
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No items yet</p>
              <Button onClick={() => setShowAddItemDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="p-2 bg-muted rounded">
                    {getKindIcon(item.kind)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{item.kind}</Badge>
                      {item.page_number && (
                        <Badge variant="secondary">Page {item.page_number}</Badge>
                      )}
                    </div>
                    <h4 className="font-medium">{item.title}</h4>
                    {item.body && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.body}
                      </p>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-1 block"
                      >
                        {item.url}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Pack Item</DialogTitle>
            <DialogDescription>
              Add an FAQ, errata, or video to this support pack
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type *</Label>
              <Select value={itemKind} onValueChange={(v: any) => setItemKind(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faq">FAQ</SelectItem>
                  <SelectItem value="errata">Errata</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g., How do I cast on?"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                placeholder="Detailed answer or description..."
                value={itemBody}
                onChange={(e) => setItemBody(e.target.value)}
                rows={4}
              />
            </div>
            {itemKind === "video" && (
              <div>
                <Label>URL</Label>
                <Input
                  placeholder="https://youtube.com/..."
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Page Number (optional)</Label>
              <Input
                type="number"
                placeholder="Link to specific page"
                value={itemPage}
                onChange={(e) => setItemPage(e.target.value)}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddItemDialog(false)
                resetItemForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={isAddingItem}>
              {isAddingItem ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
