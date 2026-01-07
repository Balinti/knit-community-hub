import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient, hasServiceRole } from '@/lib/supabase/service'
import { computeFileHash } from '@/lib/pdfHash'

// POST /api/projects/[id]/pattern/upload - Upload PDF pattern
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Compute SHA-256 hash
    const patternHash = computeFileHash(buffer)

    // Generate storage path
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const storagePath = `${user.id}/${projectId}/${fileName}`

    // Upload to Supabase Storage
    // Use service role if available for reliable uploads
    const storageClient = hasServiceRole() ? createServiceClient() : supabase

    const { error: uploadError } = await storageClient.storage
      .from('patterns')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Check if there's an existing pattern for this project
    const { data: existingPattern } = await supabase
      .from('patterns')
      .select('id, storage_path')
      .eq('project_id', projectId)
      .single()

    if (existingPattern) {
      // Delete old pattern file
      if (existingPattern.storage_path) {
        await storageClient.storage
          .from('patterns')
          .remove([existingPattern.storage_path])
      }

      // Update existing pattern record
      const { data: pattern, error: updateError } = await supabase
        .from('patterns')
        .update({
          source_type: 'pdf',
          storage_path: storagePath,
          original_filename: file.name,
          link_url: null,
          pattern_hash: patternHash,
          last_page: 1,
          last_zoom: 1.0,
        })
        .eq('id', existingPattern.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ pattern })
    }

    // Create new pattern record
    const { data: pattern, error: patternError } = await supabase
      .from('patterns')
      .insert({
        project_id: projectId,
        user_id: user.id,
        source_type: 'pdf',
        storage_path: storagePath,
        original_filename: file.name,
        pattern_hash: patternHash,
        last_page: 1,
        last_zoom: 1.0,
      })
      .select()
      .single()

    if (patternError) {
      return NextResponse.json({ error: patternError.message }, { status: 500 })
    }

    return NextResponse.json({ pattern }, { status: 201 })
  } catch (error) {
    console.error('Error uploading pattern:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
