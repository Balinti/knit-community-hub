import { z } from 'zod'

// Project validators
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  craft_type: z.enum(['knitting', 'crochet', 'other']).default('knitting'),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  craft_type: z.enum(['knitting', 'crochet', 'other']).optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
})

// Pattern validators
export const patternLinkSchema = z.object({
  link_url: z.string().url('Invalid URL'),
})

// Note validators
export const createNoteSchema = z.object({
  project_id: z.string().uuid(),
  pattern_id: z.string().uuid().optional(),
  page_number: z.number().int().min(1),
  bbox: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
  }).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  text: z.string().max(5000).optional(),
})

export const updateNoteSchema = z.object({
  text: z.string().max(5000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

// Counter validators
export const createCounterSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().max(50).optional().nullable(),
  current_value: z.number().int().min(0).default(0),
  target: z.number().int().min(1).optional().nullable(),
})

export const updateCounterSchema = z.object({
  current_value: z.number().int().min(0).optional(),
  target: z.number().int().min(1).optional().nullable(),
  name: z.string().max(50).optional().nullable(),
})

// Q&A validators
export const createQuestionSchema = z.object({
  project_id: z.string().uuid().optional(),
  pattern_hash: z.string().optional(),
  note_id: z.string().uuid().optional(),
  page_number: z.number().int().min(1).optional(),
  bbox: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
  }).optional(),
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(10000),
  visibility: z.enum(['private', 'shared']).default('private'),
})

export const createAnswerSchema = z.object({
  question_id: z.string().uuid(),
  body: z.string().min(1, 'Answer is required').max(10000),
})

// Support pack validators (admin)
export const createSupportPackSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  pattern_hash: z.string().min(64).max(64),
  price_stripe_product_id: z.string().optional(),
  price_stripe_price_id: z.string().optional(),
  active: z.boolean().default(true),
})

export const createPackItemSchema = z.object({
  pack_id: z.string().uuid(),
  kind: z.enum(['faq', 'errata', 'video']),
  title: z.string().min(1).max(200),
  body: z.string().max(10000).optional(),
  url: z.string().url().optional(),
  page_number: z.number().int().min(1).optional(),
  bbox: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
  }).optional(),
})

// Stripe checkout validator
export const checkoutSchema = z.object({
  type: z.enum(['pro', 'support_pack']),
  pack_id: z.string().uuid().optional(), // Required if type is support_pack
})

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type PatternLinkInput = z.infer<typeof patternLinkSchema>
export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
export type CreateCounterInput = z.infer<typeof createCounterSchema>
export type UpdateCounterInput = z.infer<typeof updateCounterSchema>
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>
export type CreateAnswerInput = z.infer<typeof createAnswerSchema>
export type CreateSupportPackInput = z.infer<typeof createSupportPackSchema>
export type CreatePackItemInput = z.infer<typeof createPackItemSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
