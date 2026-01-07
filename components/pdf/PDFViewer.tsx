"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import * as pdfjsLib from "pdfjs-dist"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react"

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface BBox {
  x: number
  y: number
  w: number
  h: number
}

interface Highlight {
  id: string
  page_number: number
  bbox: BBox
  color: string
  text?: string
}

interface PDFViewerProps {
  url: string
  initialPage?: number
  initialZoom?: number
  highlights?: Highlight[]
  onPageChange?: (page: number) => void
  onZoomChange?: (zoom: number) => void
  onHighlightCreate?: (pageNumber: number, bbox: BBox) => void
  onHighlightClick?: (highlight: Highlight) => void
  isCreatingHighlight?: boolean
}

export function PDFViewer({
  url,
  initialPage = 1,
  initialZoom = 1.0,
  highlights = [],
  onPageChange,
  onZoomChange,
  onHighlightCreate,
  onHighlightClick,
  isCreatingHighlight = false,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [zoom, setZoom] = useState(initialZoom)
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageInput, setPageInput] = useState(String(initialPage))
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 })

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true)
        setError(null)
        const loadingTask = pdfjsLib.getDocument(url)
        const pdfDoc = await loadingTask.promise
        setPdf(pdfDoc)
        setNumPages(pdfDoc.numPages)
      } catch (err) {
        setError("Failed to load PDF")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadPDF()
  }, [url])

  // Render page
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return

    try {
      const page = await pdf.getPage(currentPage)
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")
      if (!context) return

      const viewport = page.getViewport({ scale: zoom })
      canvas.height = viewport.height
      canvas.width = viewport.width
      setPageDimensions({ width: viewport.width, height: viewport.height })

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise
    } catch (err) {
      console.error("Error rendering page:", err)
    }
  }, [pdf, currentPage, zoom])

  useEffect(() => {
    renderPage()
  }, [renderPage])

  // Navigation
  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, numPages))
    setCurrentPage(newPage)
    setPageInput(String(newPage))
    onPageChange?.(newPage)
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value)
  }

  const handlePageInputBlur = () => {
    const page = parseInt(pageInput, 10)
    if (!isNaN(page)) {
      goToPage(page)
    } else {
      setPageInput(String(currentPage))
    }
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePageInputBlur()
    }
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.25, 3)
    setZoom(newZoom)
    onZoomChange?.(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.25, 0.5)
    setZoom(newZoom)
    onZoomChange?.(newZoom)
  }

  // Drawing highlights
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCreatingHighlight || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / pageDimensions.width
    const y = (e.clientY - rect.top) / pageDimensions.height

    setIsDrawing(true)
    setDrawStart({ x, y })
    setDrawCurrent({ x, y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / pageDimensions.width
    const y = (e.clientY - rect.top) / pageDimensions.height

    setDrawCurrent({ x, y })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return

    const bbox: BBox = {
      x: Math.min(drawStart.x, drawCurrent.x),
      y: Math.min(drawStart.y, drawCurrent.y),
      w: Math.abs(drawCurrent.x - drawStart.x),
      h: Math.abs(drawCurrent.y - drawStart.y),
    }

    // Only create if it's a meaningful selection
    if (bbox.w > 0.01 && bbox.h > 0.01) {
      onHighlightCreate?.(currentPage, bbox)
    }

    setIsDrawing(false)
    setDrawStart(null)
    setDrawCurrent(null)
  }

  // Get highlights for current page
  const currentHighlights = highlights.filter((h) => h.page_number === currentPage)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1">
          <Input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            onBlur={handlePageInputBlur}
            onKeyDown={handlePageInputKeyDown}
            className="w-16 text-center"
          />
          <span className="text-sm text-muted-foreground">/ {numPages}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= numPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button variant="outline" size="icon" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="outline" size="icon" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/30 p-4"
      >
        <div
          className="relative mx-auto pdf-page"
          style={{ width: pageDimensions.width, height: pageDimensions.height }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className="block" />

          {/* Highlight overlay */}
          <div className="highlight-overlay" style={{ width: "100%", height: "100%", top: 0, left: 0 }}>
            {currentHighlights.map((highlight) => (
              <div
                key={highlight.id}
                className="highlight-box cursor-pointer"
                style={{
                  left: `${highlight.bbox.x * 100}%`,
                  top: `${highlight.bbox.y * 100}%`,
                  width: `${highlight.bbox.w * 100}%`,
                  height: `${highlight.bbox.h * 100}%`,
                  backgroundColor: `${highlight.color}50`,
                  borderColor: highlight.color,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onHighlightClick?.(highlight)
                }}
                title={highlight.text || "Click to view note"}
              />
            ))}

            {/* Drawing preview */}
            {isDrawing && drawStart && drawCurrent && (
              <div
                className="absolute border-2 border-primary bg-primary/20"
                style={{
                  left: `${Math.min(drawStart.x, drawCurrent.x) * 100}%`,
                  top: `${Math.min(drawStart.y, drawCurrent.y) * 100}%`,
                  width: `${Math.abs(drawCurrent.x - drawStart.x) * 100}%`,
                  height: `${Math.abs(drawCurrent.y - drawStart.y) * 100}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
