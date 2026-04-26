// ─── /api/admin/reports ────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

// GET all pending reports
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING'
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 20

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: { status: status as never },
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        message: {
          include: { sender: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.report.count({ where: { status: status as never } }),
  ])

  return apiSuccess({ items: reports, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}, ['ADMIN'])

// PATCH resolve / dismiss report
const resolveSchema = z.object({
  reportId: z.string(),
  action: z.enum(['resolve', 'dismiss', 'delete_message']),
})

export const PATCH = withAuth(async (req) => {
  const body = await req.json()
  const parsed = resolveSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { reportId, action } = parsed.data

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { message: true },
  })

  if (!report) return apiError('Report not found', 404)

  if (action === 'delete_message' && report.messageId) {
    await prisma.message.update({
      where: { id: report.messageId },
      data: { isDeleted: true },
    })
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: action === 'dismiss' ? 'DISMISSED' : 'RESOLVED',
    },
  })

  return apiSuccess(updated)
}, ['ADMIN'])
