"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronRight
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Note {
  id: string
  page_number: number
  text: string | null
  color: string
  created_at: string
  note_photos?: { id: string; storage_path: string }[]
}

interface NoteCardProps {
  note: Note
  onUpdate?: (id: string, text: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onGoToPage?: (pageNumber: number) => void
  onAddPhoto?: (noteId: string) => void
  compact?: boolean
}

export function NoteCard({
  note,
  onUpdate,
  onDelete,
  onGoToPage,
  onAddPhoto,
  compact = false,
}: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(note.text || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate(note.id, editText)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditText(note.text || "")
    setIsEditing(false)
  }

  const photoCount = note.note_photos?.length || 0

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => onGoToPage?.(note.page_number)}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: note.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">
            {note.text || "No text"}
          </p>
          <p className="text-xs text-muted-foreground">
            Page {note.page_number}
          </p>
        </div>
        {photoCount > 0 && (
          <Badge variant="secondary" className="flex-shrink-0">
            <ImageIcon className="h-3 w-3 mr-1" />
            {photoCount}
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: note.color }} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Page {note.page_number}</Badge>
            {photoCount > 0 && (
              <Badge variant="secondary">
                <ImageIcon className="h-3 w-3 mr-1" />
                {photoCount} photo{photoCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && onUpdate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(note.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Add note text..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">
              {note.text || <span className="text-muted-foreground italic">No text</span>}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatDate(note.created_at)}</span>
              <div className="flex gap-2">
                {onAddPhoto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onAddPhoto(note.id)}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Add Photo
                  </Button>
                )}
                {onGoToPage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onGoToPage(note.page_number)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Go to Page
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const NOTE_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Purple", value: "#ddd6fe" },
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function NoteColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2">
      {NOTE_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            value === color.value
              ? "border-foreground scale-110"
              : "border-transparent hover:scale-105"
          }`}
          style={{ backgroundColor: color.value }}
          onClick={() => onChange(color.value)}
          title={color.name}
        />
      ))}
    </div>
  )
}
