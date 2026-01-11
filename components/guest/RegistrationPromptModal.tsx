"use client"

import { useGuest } from './GuestProvider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sparkles, Check } from 'lucide-react'
import Link from 'next/link'

export function RegistrationPromptModal() {
  const { showPrompt, dismissPrompt, isGuest } = useGuest()

  if (!isGuest || !showPrompt) {
    return null
  }

  return (
    <Dialog open={showPrompt} onOpenChange={(open) => !open && dismissPrompt()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            You&apos;re loving KnitFlow!
          </DialogTitle>
          <DialogDescription>
            Create a free account to save your projects and unlock more features.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <h4 className="font-medium mb-3">With a free account you get:</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              Save up to 3 projects permanently
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              Access your projects from any device
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              30 notes across all projects
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              3 AI-powered questions per month
            </li>
          </ul>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Upgrade to Pro</strong> for unlimited projects, notes, and AI questions!
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={dismissPrompt}>
            Continue as Guest
          </Button>
          <Link href="/login" className="w-full sm:w-auto">
            <Button className="w-full">
              Create Free Account
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
