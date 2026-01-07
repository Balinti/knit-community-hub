"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Minus, RotateCcw, Target, Pencil, Trash2 } from "lucide-react"

interface Counter {
  id: string
  name: string | null
  current_value: number
  target: number | null
}

interface CounterWidgetProps {
  counter: Counter
  onUpdate: (id: string, value: number) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  isMain?: boolean
}

export function CounterWidget({
  counter,
  onUpdate,
  onDelete,
  isMain = false,
}: CounterWidgetProps) {
  const [value, setValue] = useState(counter.current_value)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(counter.current_value))

  const handleUpdate = async (newValue: number) => {
    const clampedValue = Math.max(0, newValue)
    setValue(clampedValue)
    setIsUpdating(true)
    try {
      await onUpdate(counter.id, clampedValue)
    } catch (error) {
      setValue(counter.current_value)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleIncrement = () => handleUpdate(value + 1)
  const handleDecrement = () => handleUpdate(value - 1)
  const handleReset = () => handleUpdate(0)

  const handleEditSubmit = () => {
    const newValue = parseInt(editValue, 10)
    if (!isNaN(newValue)) {
      handleUpdate(newValue)
    }
    setIsEditing(false)
  }

  const progress = counter.target
    ? Math.min((value / counter.target) * 100, 100)
    : 0

  return (
    <Card className={isMain ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {counter.name || "Row Counter"}
            {isMain && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (Main)
              </span>
            )}
          </CardTitle>
          {!isMain && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(counter.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Counter Display */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleDecrement}
            disabled={isUpdating || value <= 0}
          >
            <Minus className="h-6 w-6" />
          </Button>

          {isEditing ? (
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleEditSubmit()}
              className="w-24 text-center text-3xl font-bold h-16"
              autoFocus
            />
          ) : (
            <button
              className="text-5xl font-bold min-w-[100px] text-center cursor-pointer hover:text-primary transition-colors"
              onClick={() => {
                setEditValue(String(value))
                setIsEditing(true)
              }}
            >
              {value}
            </button>
          )}

          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleIncrement}
            disabled={isUpdating}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Target Progress */}
        {counter.target && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Target: {counter.target}</span>
              </div>
              <span className="text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Reset Button */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isUpdating || value === 0}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface AddCounterFormProps {
  onAdd: (name: string, target?: number) => Promise<void>
}

export function AddCounterForm({ onAdd }: AddCounterFormProps) {
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsAdding(true)
    try {
      await onAdd(name.trim(), target ? parseInt(target, 10) : undefined)
      setName("")
      setTarget("")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add Section Counter</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Counter name (e.g., Ribbing)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Input
              type="number"
              placeholder="Target (optional)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              min={1}
            />
          </div>
          <Button type="submit" disabled={!name.trim() || isAdding} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Counter
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
