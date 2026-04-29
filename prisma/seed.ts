// ─── DATABASE SEED SCRIPT ─────────────────────────────────────────────────────
// Run with: npx tsx prisma/seed.ts
// Creates starter admin, providers, services, bookings, reviews

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── ADMIN USER ───────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin1234!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@servmarket.com' },
    update: {},
    create: {
      email: 'admin@servmarket.com',
      passwordHash: adminHash,
      name: 'Admin User',
      role: 'ADMIN',
      isVerified: true,
    },
  })
  console.log('✅ Admin created:', admin.email)

  // ─── CLIENT USER ─────────────────────────────────────────────────────────
  const clientHash = await bcrypt.hash('Client123!', 12)
  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      passwordHash: clientHash,
      name: 'Alice Johnson',
      role: 'CLIENT',
      isVerified: true,
      latitude: 40.7128,
      longitude: -74.006,
      city: 'New York',
      country: 'US',
    },
  })
  console.log('✅ Client created:', client.email)

  // ─── PROVIDER USERS ───────────────────────────────────────────────────────
  const providerData = [
    {
      email: 'cleaner@example.com',
      name: 'Maria Santos',
      city: 'New York',
      country: 'US',
      lat: 40.7282,
      lng: -73.7949,
      tagline: 'Professional house cleaning specialist',
      bio: 'Over 8 years of experience in residential and commercial cleaning. I use eco-friendly products and pay attention to every detail.',
      rating: 4.8,
      reviews: 127,
      jobs: 215,
      services: [
        { title: 'Standard House Cleaning', desc: 'Complete home cleaning including all rooms, kitchen, and bathrooms', price: 89, category: 'CLEANING', duration: 180 },
        { title: 'Deep Cleaning Service', desc: 'Thorough deep clean including inside appliances, cabinets, and hard-to-reach areas', price: 159, category: 'CLEANING', duration: 360 },
      ],
    },
    {
      email: 'plumber@example.com',
      name: 'James Wilson',
      city: 'Brooklyn',
      country: 'US',
      lat: 40.6782,
      lng: -73.9442,
      tagline: 'Licensed plumber, 15+ years experience',
      bio: 'Fully licensed and insured plumber available for emergency and scheduled repairs. No job too big or too small.',
      rating: 4.9,
      reviews: 203,
      jobs: 380,
      services: [
        { title: 'Pipe Repair & Installation', desc: 'Fix leaks, install new pipes, and handle all plumbing repairs', price: 120, category: 'PLUMBING', duration: 120 },
        { title: 'Emergency Plumbing', desc: '24/7 emergency plumbing service for urgent issues', price: 200, category: 'PLUMBING', duration: 90 },
      ],
    },
    {
      email: 'painter@example.com',
      name: 'Carlos Rivera',
      city: 'Manhattan',
      country: 'US',
      lat: 40.7831,
      lng: -73.9712,
      tagline: 'Interior & exterior painting pro',
      bio: 'Skilled painter with an eye for detail. I transform spaces with precision and quality materials.',
      rating: 4.7,
      reviews: 89,
      jobs: 142,
      services: [
        { title: 'Interior Wall Painting', desc: 'Professional interior painting with premium paint and clean finish', price: 299, category: 'PAINTING', duration: 480 },
        { title: 'Exterior House Painting', desc: 'Full exterior painting including prep, primer, and topcoat', price: 799, category: 'PAINTING', duration: 960 },
      ],
    },
    {
      email: 'electrician@example.com',
      name: 'Sarah Thompson',
      city: 'Queens',
      country: 'US',
      lat: 40.7282,
      lng: -73.7949,
      tagline: 'Certified master electrician',
      bio: 'Master electrician with 12 years of experience in residential and light commercial electrical work.',
      rating: 4.9,
      reviews: 156,
      jobs: 298,
      services: [
        { title: 'Electrical Installation', desc: 'Install outlets, switches, lighting fixtures and more', price: 150, category: 'ELECTRICAL', duration: 120 },
        { title: 'Electrical Panel Upgrade', desc: 'Upgrade your electrical panel for modern power demands', price: 450, category: 'ELECTRICAL', duration: 240 },
      ],
    },
    {
      email: 'mover@example.com',
      name: 'Michael Brown',
      city: 'Bronx',
      country: 'US',
      lat: 40.8448,
      lng: -73.8648,
      tagline: 'Reliable moving services since 2015',
      bio: 'Professional moving team with proper equipment. We handle your belongings with care.',
      rating: 4.6,
      reviews: 74,
      jobs: 120,
      services: [
        { title: 'Local Moving', desc: 'Full-service local move with packing, loading, transport, and unloading', price: 350, category: 'MOVING', duration: 480 },
        { title: 'Furniture Moving', desc: 'Move furniture within your home or to storage', price: 150, category: 'MOVING', duration: 180 },
      ],
    },
  ]

  for (const data of providerData) {
    const hash = await bcrypt.hash('Provider123!', 12)

    const providerUser = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: hash,
        name: data.name,
        role: 'PROVIDER',
        isVerified: true,
        latitude: data.lat,
        longitude: data.lng,
        city: data.city,
        country: data.country,
      },
    })

    // Create or update provider profile
    const existingProfile = await prisma.providerProfile.findUnique({ where: { userId: providerUser.id } })

    let profile
    if (existingProfile) {
      profile = await prisma.providerProfile.update({
        where: { userId: providerUser.id },
        data: {
          bio: data.bio,
          tagline: data.tagline,
          isAvailable: true,
          isVerifiedBadge: true,
          rating: data.rating,
          totalReviews: data.reviews,
          completedJobs: data.jobs,
        },
      })
    } else {
      profile = await prisma.providerProfile.create({
        data: {
          userId: providerUser.id,
          bio: data.bio,
          tagline: data.tagline,
          isAvailable: true,
          isVerifiedBadge: true,
          rating: data.rating,
          totalReviews: data.reviews,
          completedJobs: data.jobs,
        },
      })
    }

    // Create services
    for (const svc of data.services) {
      const existing = await prisma.service.findFirst({
        where: { providerId: profile.id, title: svc.title },
      })
      if (!existing) {
        await prisma.service.create({
          data: {
            providerId: profile.id,
            title: svc.title,
            description: svc.desc,
            price: svc.price,
            category: svc.category as never,
            duration: svc.duration,
            isActive: true,
          },
        })
      }
    }

    console.log(`✅ Provider created: ${data.name}`)
  }

  console.log('\nSeed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
