"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Switch } from "@/components/ui/switch"
import { PDFViewer } from "@/components/pdf/PDFViewer"
import { CounterWidget, AddCounterForm } from "@/components/counter/CounterWidget"
import { NoteCard, NoteColorPicker } from "@/components/notes/NoteCard"
import { QuestionCard } from "@/components/qna/QuestionCard"
import { useToast } from "@/components/ui/use-toast"
import { useGuest } from "@/components/guest/GuestProvider"
import { getGuestProjects, saveGuestProject, GuestProject, generateGuestId } from "@/lib/guest-session"
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  FileText,
  StickyNote,
  Calculator,
  MessageSquare,
  Package,
  Loader2,
  Plus,
  Trash2,
  Lock,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface BBox {
  x: number
  y: number
  w: number
  h: number
}

interface Pattern {
  id: string
  source_type: "pdf" | "link"
  storage_path?: string
  original_filename?: string
  link_url?: string
  pattern_hash?: string
  last_page: number
  last_zoom: number
  signed_url?: string
}

interface Note {
  id: string
  page_number: number
  bbox?: BBox
  color: string
  text: string | null
  created_at: string
  note_photos?: { id: string; storage_path: string }[]
}

interface Counter {
  id: string
  name: string | null
  current_value: number
  target: number | null
}

interface Question {
  id: string
  title: string
  body: string
  visibility: "private" | "shared"
  page_number: number | null
  created_at: string
  user_id: string
  profiles?: { display_name: string }
  qna_answers?: any[]
  qna_accepts?: any[]
}

interface Project {
  id: string
  name: string
  craft_type: string
  status: string
  created_at: string
  patterns?: Pattern[]
  notes?: Note[]
  counters?: Counter[]
  qna_questions?: Question[]
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { isGuest } = useGuest()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [guestProject, setGuestProject] = useState<GuestProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pattern")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")

  // Pattern states
  const [isUploadingPattern, setIsUploadingPattern] = useState(false)
  const [patternLink, setPatternLink] = useState("")
  const [showLinkDialog, setShowLinkDialog] = useState(false)

  // Note states
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [pendingHighlight, setPendingHighlight] = useState<{ page: number; bbox: BBox } | null>(null)
  const [noteText, setNoteText] = useState("")
  const [noteColor, setNoteColor] = useState("#fef08a")

  // Q&A states
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [questionTitle, setQuestionTitle] = useState("")
  const [questionBody, setQuestionBody] = useState("")
  const [questionVisibility, setQuestionVisibility] = useState<"private" | "shared">("private")

  // Guest counter states
  const [showAddCounterDialog, setShowAddCounterDialog] = useState(false)
  const [newCounterName, setNewCounterName] = useState("")
  const [newCounterTarget, setNewCounterTarget] = useState("")

  useEffect(() => {
    if (isGuest) {
      loadGuestProject()
    } else {
      fetchProject()
      getCurrentUser()
    }
  }, [projectId, isGuest])

  const loadGuestProject = () => {
    const projects = getGuestProjects()
    const found = projects.find(p => p.id === projectId)
    if (found) {
      setGuestProject(found)
      // Convert to Project format for display
      setProject({
        id: found.id,
        name: found.name,
        craft_type: found.craft_type,
        status: found.status,
        created_at: found.created_at,
        patterns: [],
        notes: found.notes.map(n => ({
          id: n.id,
          page_number: n.page_number || 1,
          color: "#fef08a",
          text: n.content,
          created_at: n.created_at
        })),
        counters: found.counters.map(c => ({
          id: c.id,
          name: c.name,
          current_value: c.current_value,
          target: c.target_value || null
        })),
        qna_questions: []
      })
    } else {
      toast({
        title: "Error",
        description: "Project not found",
        variant: "destructive",
      })
      router.push("/app")
    }
    setLoading(false)
  }

  const updateGuestProject = (updates: Partial<GuestProject>) => {
    if (!guestProject) return
    const updated = { ...guestProject, ...updates, updated_at: new Date().toISOString() }
    saveGuestProject(updated)
    setGuestProject(updated)
  }

  const getCurrentUser = async () => {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error("Project not found")
      }
      const data = await response.json()
      setProject(data.project)

      // Fetch PDF URL if pattern exists
      if (data.project.patterns?.[0]?.source_type === "pdf") {
        const patternResponse = await fetch(`/api/projects/${projectId}/pattern`)
        if (patternResponse.ok) {
          const patternData = await patternResponse.json()
          setPdfUrl(patternData.pattern?.signed_url)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive",
      })
      router.push("/app")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGuest) {
      toast({
        title: "Sign in required",
        description: "Create a free account to upload PDF patterns",
        variant: "destructive",
      })
      return
    }

    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file",
        variant: "destructive",
      })
      return
    }

    setIsUploadingPattern(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(`/api/projects/${projectId}/pattern/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload pattern")
      }

      toast({ title: "Pattern uploaded", description: "Your pattern has been uploaded successfully" })
      fetchProject()
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload pattern",
        variant: "destructive",
      })
    } finally {
      setIsUploadingPattern(false)
    }
  }

  const handleSaveLink = async () => {
    if (!patternLink.trim()) return

    if (isGuest) {
      toast({
        title: "Sign in required",
        description: "Create a free account to save pattern links",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/pattern/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_url: patternLink }),
      })

      if (!response.ok) {
        throw new Error("Failed to save link")
      }

      toast({ title: "Link saved", description: "Pattern link has been saved" })
      setShowLinkDialog(false)
      setPatternLink("")
      fetchProject()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save link",
        variant: "destructive",
      })
    }
  }

  const handleHighlightCreate = (page: number, bbox: BBox) => {
    setPendingHighlight({ page, bbox })
    setShowNoteDialog(true)
  }

  const handleSaveNote = async () => {
    if (!pendingHighlight) return

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          pattern_id: project?.patterns?.[0]?.id,
          page_number: pendingHighlight.page,
          bbox: pendingHighlight.bbox,
          color: noteColor,
          text: noteText || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === "LIMIT_EXCEEDED") {
          toast({
            title: "Note limit reached",
            description: data.error,
            variant: "destructive",
          })
        } else {
          throw new Error(data.error)
        }
        return
      }

      toast({ title: "Note created", description: "Your note has been saved" })
      setShowNoteDialog(false)
      setPendingHighlight(null)
      setNoteText("")
      setIsCreatingHighlight(false)
      fetchProject()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save note",
        variant: "destructive",
      })
    }
  }

  const handleUpdateNote = async (noteId: string, text: string) => {
    if (isGuest && guestProject) {
      const notes = guestProject.notes.map(n =>
        n.id === noteId ? { ...n, content: text } : n
      )
      updateGuestProject({ notes })
      setProject(prev => prev ? {
        ...prev,
        notes: prev.notes?.map(n => n.id === noteId ? { ...n, text } : n)
      } : null)
      return
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) throw new Error("Failed to update note")
      fetchProject()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (isGuest && guestProject) {
      const notes = guestProject.notes.filter(n => n.id !== noteId)
      updateGuestProject({ notes })
      setProject(prev => prev ? {
        ...prev,
        notes: prev.notes?.filter(n => n.id !== noteId)
      } : null)
      toast({ title: "Note deleted" })
      return
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete note")
      toast({ title: "Note deleted" })
      fetchProject()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      })
    }
  }

  const handleUpdateCounter = async (counterId: string, value: number) => {
    if (isGuest && guestProject) {
      const counters = guestProject.counters.map(c =>
        c.id === counterId ? { ...c, current_value: value } : c
      )
      updateGuestProject({ counters })
      setProject(prev => prev ? {
        ...prev,
        counters: prev.counters?.map(c => c.id === counterId ? { ...c, current_value: value } : c)
      } : null)
      return
    }

    try {
      const response = await fetch(`/api/counters/${counterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_value: value }),
      })

      if (!response.ok) throw new Error("Failed to update counter")
      fetchProject()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update counter",
        variant: "destructive",
      })
    }
  }

  const handleAddCounter = async (name: string, target?: number) => {
    if (isGuest && guestProject) {
      const newCounter = {
        id: generateGuestId(),
        name,
        current_value: 0,
        target_value: target
      }
      const counters = [...guestProject.counters, newCounter]
      updateGuestProject({ counters })
      setProject(prev => prev ? {
        ...prev,
        counters: [...(prev.counters || []), { id: newCounter.id, name, current_value: 0, target: target || null }]
      } : null)
      toast({ title: "Counter added" })
      return
    }

    try {
      const response = await fetch("/api/counters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          name,
          target: target || null,
        }),
      })

      if (!response.ok) throw new Error("Failed to add counter")
      toast({ title: "Counter added" })
      fetchProject()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add counter",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCounter = async (counterId: string) => {
    if (isGuest && guestProject) {
      const counters = guestProject.counters.filter(c => c.id !== counterId)
      updateGuestProject({ counters })
      setProject(prev => prev ? {
        ...prev,
        counters: prev.counters?.filter(c => c.id !== counterId)
      } : null)
      toast({ title: "Counter deleted" })
      return
    }

    try {
      const response = await fetch(`/api/counters/${counterId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete counter")
      toast({ title: "Counter deleted" })
      fetchProject()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete counter",
        variant: "destructive",
      })
    }
  }

  const handleAskQuestion = async () => {
    if (isGuest) {
      toast({
        title: "Sign in required",
        description: "Create a free account to ask questions",
        variant: "destructive",
      })
      return
    }

    if (!questionTitle.trim() || !questionBody.trim()) return

    try {
      const response = await fetch("/api/qna/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          pattern_hash: project?.patterns?.[0]?.pattern_hash,
          title: questionTitle,
          body: questionBody,
          visibility: questionVisibility,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === "LIMIT_EXCEEDED") {
          toast({
            title: "Question limit reached",
            description: data.error,
            variant: "destructive",
          })
        } else {
          throw new Error(data.error)
        }
        return
      }

      toast({ title: "Question posted" })
      setShowQuestionDialog(false)
      setQuestionTitle("")
      setQuestionBody("")
      fetchProject()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post question",
        variant: "destructive",
      })
    }
  }

  const handleAnswer = async (questionId: string, body: string) => {
    try {
      const response = await fetch("/api/qna/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, body }),
      })

      if (!response.ok) throw new Error("Failed to post answer")
      toast({ title: "Answer posted" })
      fetchProject()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post answer",
        variant: "destructive",
      })
    }
  }

  const handleAcceptAnswer = async (questionId: string, answerId: string) => {
    try {
      const response = await fetch(`/api/qna/answers/${answerId}/accept`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to accept answer")
      toast({ title: "Answer accepted" })
      fetchProject()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept answer",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  const pattern = project.patterns?.[0]
  const notes = project.notes || []
  const counters = project.counters || []
  const questions = project.qna_questions || []
  const mainCounter = counters.find((c) => c.name === null)
  const sectionCounters = counters.filter((c) => c.name !== null)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Project Header */}
      <div className="border-b bg-background p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.craft_type} - {formatDate(project.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGuest && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Guest
              </Badge>
            )}
            <Badge
              variant={
                project.status === "active"
                  ? "default"
                  : project.status === "completed"
                  ? "success"
                  : "secondary"
              }
            >
              {project.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b bg-muted/30">
          <div className="container mx-auto">
            <TabsList className="h-12">
              <TabsTrigger value="pattern" className="gap-2">
                <FileText className="h-4 w-4" />
                Pattern
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <StickyNote className="h-4 w-4" />
                Notes ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="counter" className="gap-2">
                <Calculator className="h-4 w-4" />
                Counter
              </TabsTrigger>
              <TabsTrigger value="qna" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Q&A ({questions.length})
              </TabsTrigger>
              <TabsTrigger value="official" className="gap-2">
                <Package className="h-4 w-4" />
                Official
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Pattern Tab */}
        <TabsContent value="pattern" className="flex-1 mt-0">
          {!pattern ? (
            <div className="container mx-auto p-8 max-w-lg">
              <Card>
                <CardHeader>
                  <CardTitle>Add Your Pattern</CardTitle>
                  <CardDescription>
                    {isGuest
                      ? "Create a free account to upload PDF patterns"
                      : "Upload a PDF or add a link to your pattern"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGuest ? (
                    <div className="text-center py-8">
                      <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        PDF upload requires a free account
                      </p>
                      <Link href="/login">
                        <Button>Create Free Account</Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="pdf-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                            {isUploadingPattern ? (
                              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                            ) : (
                              <>
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="font-medium">Upload PDF</p>
                                <p className="text-sm text-muted-foreground">
                                  Click to select or drag and drop
                                </p>
                              </>
                            )}
                          </div>
                        </Label>
                        <Input
                          id="pdf-upload"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isUploadingPattern}
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowLinkDialog(true)}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Add Pattern Link
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : pattern.source_type === "pdf" && pdfUrl ? (
            <div className="flex-1 flex flex-col h-full">
              <div className="p-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {pattern.original_filename}
                </span>
                <Button
                  variant={isCreatingHighlight ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsCreatingHighlight(!isCreatingHighlight)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isCreatingHighlight ? "Creating Note..." : "Add Note"}
                </Button>
              </div>
              <div className="flex-1">
                <PDFViewer
                  url={pdfUrl}
                  initialPage={pattern.last_page}
                  initialZoom={pattern.last_zoom}
                  highlights={notes.map((n) => ({
                    id: n.id,
                    page_number: n.page_number,
                    bbox: n.bbox || { x: 0, y: 0, w: 0, h: 0 },
                    color: n.color,
                    text: n.text || undefined,
                  }))}
                  isCreatingHighlight={isCreatingHighlight}
                  onHighlightCreate={handleHighlightCreate}
                  onHighlightClick={(h) => {
                    const note = notes.find((n) => n.id === h.id)
                    if (note) {
                      // Switch to notes tab and highlight the note
                      setActiveTab("notes")
                    }
                  }}
                />
              </div>
            </div>
          ) : pattern.source_type === "link" ? (
            <div className="container mx-auto p-8 max-w-lg">
              <Card>
                <CardHeader>
                  <CardTitle>External Pattern Link</CardTitle>
                  <CardDescription>
                    Your pattern is stored externally
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href={pattern.link_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {pattern.link_url}
                  </a>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="flex-1 mt-0 overflow-auto">
          <div className="container mx-auto p-4 max-w-3xl">
            {notes.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {isGuest
                      ? "Create a free account to add notes to PDF patterns"
                      : "Go to the Pattern tab to add highlights and notes"}
                  </p>
                  {!isGuest && (
                    <Button onClick={() => setActiveTab("pattern")}>
                      Go to Pattern
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                    onGoToPage={(page) => {
                      setActiveTab("pattern")
                      // PDF viewer will scroll to the page
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Counter Tab */}
        <TabsContent value="counter" className="flex-1 mt-0 overflow-auto">
          <div className="container mx-auto p-4 max-w-3xl">
            <div className="grid gap-4 md:grid-cols-2">
              {mainCounter && (
                <div className="md:col-span-2">
                  <CounterWidget
                    counter={mainCounter}
                    onUpdate={handleUpdateCounter}
                    isMain
                  />
                </div>
              )}

              {sectionCounters.map((counter) => (
                <CounterWidget
                  key={counter.id}
                  counter={counter}
                  onUpdate={handleUpdateCounter}
                  onDelete={handleDeleteCounter}
                />
              ))}

              <AddCounterForm onAdd={handleAddCounter} />
            </div>
          </div>
        </TabsContent>

        {/* Q&A Tab */}
        <TabsContent value="qna" className="flex-1 mt-0 overflow-auto">
          <div className="container mx-auto p-4 max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Questions & Answers</h2>
              <Button onClick={() => {
                if (isGuest) {
                  toast({
                    title: "Sign in required",
                    description: "Create a free account to ask questions",
                    variant: "destructive",
                  })
                } else {
                  setShowQuestionDialog(true)
                }
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Ask Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {isGuest
                      ? "Create a free account to ask questions about patterns"
                      : "Ask a question about this pattern"}
                  </p>
                  {!isGuest && (
                    <Button onClick={() => setShowQuestionDialog(true)}>
                      Ask Question
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    currentUserId={currentUserId}
                    onAnswer={handleAnswer}
                    onAcceptAnswer={handleAcceptAnswer}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Official Tab */}
        <TabsContent value="official" className="flex-1 mt-0 overflow-auto">
          <div className="container mx-auto p-4 max-w-3xl">
            <Card className="text-center py-12">
              <CardContent>
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Official Support Pack</h3>
                <p className="text-muted-foreground mb-4">
                  {pattern?.pattern_hash
                    ? "No official support pack available for this pattern yet."
                    : "Upload a PDF pattern to check for official support packs."}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pattern Link</DialogTitle>
            <DialogDescription>
              Enter the URL to your pattern
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="https://example.com/pattern"
              value={patternLink}
              onChange={(e) => setPatternLink(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLink} disabled={!patternLink.trim()}>
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note to your highlight on page {pendingHighlight?.page}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Color</Label>
              <div className="mt-2">
                <NoteColorPicker value={noteColor} onChange={setNoteColor} />
              </div>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                placeholder="Add your note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteDialog(false)
                setPendingHighlight(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask a Question</DialogTitle>
            <DialogDescription>
              Ask about this pattern
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="What's your question?"
                value={questionTitle}
                onChange={(e) => setQuestionTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Details</Label>
              <Textarea
                placeholder="Provide more details..."
                value={questionBody}
                onChange={(e) => setQuestionBody(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={questionVisibility === "shared"}
                  onCheckedChange={(checked) =>
                    setQuestionVisibility(checked ? "shared" : "private")
                  }
                />
                <Label>Share with others who have this pattern</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAskQuestion}
              disabled={!questionTitle.trim() || !questionBody.trim()}
            >
              Post Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
