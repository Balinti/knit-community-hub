"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Loader2, FolderOpen, AlertCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useGuest } from "@/components/guest/GuestProvider"
import { getGuestProjects, GuestProject } from "@/lib/guest-session"

interface Project {
  id: string
  name: string
  craft_type: string
  status: string
  created_at: string
  updated_at: string
  patterns?: {
    id: string
    source_type: string
    original_filename?: string
    link_url?: string
  }[]
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const { isGuest } = useGuest()

  useEffect(() => {
    if (isGuest) {
      // Load guest projects from localStorage
      const guestProjects = getGuestProjects()
      setProjects(guestProjects.map(p => ({
        id: p.id,
        name: p.name,
        craft_type: p.craft_type,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        patterns: []
      })))
      setLoading(false)
    } else {
      fetchProjects()
    }
  }, [isGuest])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      const data = await response.json()
      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
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
      {/* Guest Mode Banner */}
      {isGuest && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-200">Guest Mode</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Your projects are saved locally in this browser.
              <Link href="/login" className="underline font-medium ml-1">
                Create a free account
              </Link> to save them permanently and access from any device.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your knitting and crochet projects
          </p>
        </div>
        <Link href="/app/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to get started
            </p>
            <Link href="/app/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/app/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription>
                        {project.craft_type.charAt(0).toUpperCase() + project.craft_type.slice(1)}
                      </CardDescription>
                    </div>
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
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {project.patterns?.[0] ? (
                      <>
                        <FileText className="h-4 w-4" />
                        <span>
                          {project.patterns[0].source_type === "pdf"
                            ? project.patterns[0].original_filename
                            : "External link"}
                        </span>
                      </>
                    ) : (
                      <span className="italic">No pattern attached</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {formatDate(project.updated_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
