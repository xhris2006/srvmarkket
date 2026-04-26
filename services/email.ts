// ─── EMAIL SERVICE ────────────────────────────────────────────────────────────
// Transactional emails via Nodemailer (SMTP) with HTML templates
// In production, consider SendGrid, Resend, or Postmark

import nodemailer from 'nodemailer'

// Create transporter (lazy init to avoid cold-start issues)
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return transporter
}

interface EmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Sends a transactional email.
 * Silently fails in development if SMTP is not configured.
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[Email] Would send to ${to}: ${subject} (SMTP not configured)`)
    return false
  }

  try {
    await getTransporter().sendMail({
      from: `"ServMarket" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error('[Email] Failed to send:', err)
    return false
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9f5ff; padding: 40px 20px;
`

const cardStyles = `
  background: white; border-radius: 16px; padding: 32px;
  max-width: 520px; margin: 0 auto; box-shadow: 0 2px 8px rgba(124,58,237,0.08);
`

const buttonStyles = `
  display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none;
  font-weight: 600; font-size: 15px; margin: 20px 0;
`

/**
 * Welcome email sent after registration
 */
export function welcomeEmail(name: string): string {
  return `
    <div style="${baseStyles}">
      <div style="${cardStyles}">
        <h1 style="color:#7c3aed;margin:0 0 8px">Welcome to ServMarket! 🎉</h1>
        <p style="color:#6b7280">Hi ${name},</p>
        <p style="color:#374151;line-height:1.6">
          You're now part of the ServMarket community — where trusted service providers
          and clients connect every day.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/search" style="${buttonStyles}">
          Explore Services
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          You received this email because you created a ServMarket account.
        </p>
      </div>
    </div>
  `
}

/**
 * Booking request notification for providers
 */
export function bookingRequestEmail(providerName: string, clientName: string, serviceName: string, bookingId: string): string {
  return `
    <div style="${baseStyles}">
      <div style="${cardStyles}">
        <h1 style="color:#7c3aed;margin:0 0 8px">New Booking Request 📋</h1>
        <p style="color:#6b7280">Hi ${providerName},</p>
        <p style="color:#374151;line-height:1.6">
          <strong>${clientName}</strong> wants to book your service: <strong>${serviceName}</strong>
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingId}" style="${buttonStyles}">
          View Booking Request
        </a>
        <p style="color:#6b7280;font-size:13px">
          Accept or decline within 24 hours to maintain your response rate.
        </p>
      </div>
    </div>
  `
}

/**
 * Payment confirmation email for clients
 */
export function paymentConfirmationEmail(clientName: string, serviceName: string, amount: number, bookingId: string): string {
  return `
    <div style="${baseStyles}">
      <div style="${cardStyles}">
        <h1 style="color:#059669;margin:0 0 8px">Payment Confirmed ✅</h1>
        <p style="color:#6b7280">Hi ${clientName},</p>
        <p style="color:#374151;line-height:1.6">
          Your payment of <strong>$${amount.toFixed(2)}</strong> for <strong>${serviceName}</strong> has been processed successfully.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0">
          <p style="color:#065f46;margin:0;font-size:14px">🔒 Payment secured by Stripe</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingId}" style="${buttonStyles}">
          View Booking
        </a>
      </div>
    </div>
  `
}

/**
 * Booking status update email
 */
export function bookingStatusEmail(userName: string, serviceName: string, status: string, bookingId: string): string {
  const statusMessages: Record<string, { emoji: string; title: string; body: string }> = {
    ACCEPTED: { emoji: '✅', title: 'Booking Accepted', body: 'Great news! Your booking has been accepted.' },
    REJECTED: { emoji: '❌', title: 'Booking Declined', body: 'Unfortunately, this booking was not accepted.' },
    COMPLETED: { emoji: '🎉', title: 'Service Completed', body: 'Your service has been completed!' },
    CANCELLED: { emoji: '🚫', title: 'Booking Cancelled', body: 'This booking has been cancelled.' },
  }

  const info = statusMessages[status] || { emoji: '📋', title: `Booking ${status}`, body: `Your booking status has been updated.` }

  return `
    <div style="${baseStyles}">
      <div style="${cardStyles}">
        <h1 style="color:#7c3aed;margin:0 0 8px">${info.emoji} ${info.title}</h1>
        <p style="color:#6b7280">Hi ${userName},</p>
        <p style="color:#374151;line-height:1.6">
          ${info.body}<br>Service: <strong>${serviceName}</strong>
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingId}" style="${buttonStyles}">
          View Details
        </a>
      </div>
    </div>
  `
}
