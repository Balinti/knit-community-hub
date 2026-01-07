"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Check,
  Globe,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"

interface Answer {
  id: string
  body: string
  user_id: string
  created_at: string
  profiles?: { display_name: string }
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
  qna_answers?: Answer[]
  qna_accepts?: { accepted_answer_id: string }[]
}

interface QuestionCardProps {
  question: Question
  currentUserId?: string
  onAnswer?: (questionId: string, body: string) => Promise<void>
  onAcceptAnswer?: (questionId: string, answerId: string) => Promise<void>
  onGoToPage?: (pageNumber: number) => void
}

export function QuestionCard({
  question,
  currentUserId,
  onAnswer,
  onAcceptAnswer,
  onGoToPage,
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [answerText, setAnswerText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const answers = question.qna_answers || []
  const acceptedAnswerId = question.qna_accepts?.[0]?.accepted_answer_id
  const isOwner = currentUserId === question.user_id
  const hasAcceptedAnswer = !!acceptedAnswerId

  const handleSubmitAnswer = async () => {
    if (!onAnswer || !answerText.trim()) return
    setIsSubmitting(true)
    try {
      await onAnswer(question.id, answerText.trim())
      setAnswerText("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">
              {question.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              {question.visibility === "shared" ? (
                <Badge variant="secondary" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Shared
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              )}
              {question.page_number && (
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-accent"
                  onClick={() => onGoToPage?.(question.page_number!)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Page {question.page_number}
                </Badge>
              )}
              {hasAcceptedAnswer && (
                <Badge variant="success" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Solved
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                {answers.length} answer{answers.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
          {question.body}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>
            Asked by {question.profiles?.display_name || "Unknown"}
          </span>
          <span>{formatDateTime(question.created_at)}</span>
        </div>

        {/* Toggle answers */}
        {answers.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <span>
              {isExpanded ? "Hide" : "Show"} {answers.length} answer
              {answers.length !== 1 ? "s" : ""}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Answers */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            {answers.map((answer) => {
              const isAccepted = answer.id === acceptedAnswerId
              return (
                <div
                  key={answer.id}
                  className={`p-3 rounded-lg border ${
                    isAccepted
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "bg-muted/50"
                  }`}
                >
                  {isAccepted && (
                    <Badge variant="success" className="mb-2">
                      <Check className="h-3 w-3 mr-1" />
                      Accepted Answer
                    </Badge>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{answer.body}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {answer.profiles?.display_name || "Unknown"} -{" "}
                      {formatDateTime(answer.created_at)}
                    </span>
                    {isOwner && !hasAcceptedAnswer && onAcceptAnswer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onAcceptAnswer(question.id, answer.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Answer form */}
        {onAnswer && (
          <div className="mt-4 pt-4 border-t">
            <Textarea
              placeholder="Write your answer..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={3}
            />
            <Button
              className="mt-2"
              size="sm"
              onClick={handleSubmitAnswer}
              disabled={!answerText.trim() || isSubmitting}
            >
              Post Answer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
