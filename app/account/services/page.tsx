'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Edit3, Loader2, DollarSign, Clock, Tag } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { CATEGORY_OPTIONS, EMPTY_STATE_ICON, getCategoryLabel } from '@/lib/icon-maps'

const CATEGORIES = CATEGORY_OPTIONS

interface Service {
  id: string
  title: string
  description: string
  category: string
  price: number
  priceType: string
  duration?: number | null
  isActive: boolean
  createdAt: string
}

interface ServiceForm {
  title: string
  description: string
  category: string
  price: number | ''
  priceType: 'FIXED' | 'HOURLY' | 'NEGOTIABLE'
  duration: number | ''
}

const emptyForm: ServiceForm = {
  title: '',
  description: '',
  category: '',
  price: '',
  priceType: 'FIXED',
  duration: '',
}

export default function ManageServicesPage() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const { success, error: toastError } = useToast()

  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    await fetch('/api/services?providerId=me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setServices(d.data) })
      .finally(() => setIsLoading(false))
  }, [accessToken])

  useEffect(() => {
    void fetchServices()
  }, [fetchServices])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (svc: Service) => {
    setEditingId(svc.id)
    setForm({
      title: svc.title,
      description: svc.description,
      category: svc.category,
      price: svc.price,
      priceType: svc.priceType as ServiceForm['priceType'],
      duration: svc.duration || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!accessToken) return
    if (!form.title || !form.category || !form.price || !form.description) {
      toastError('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      const url = editingId ? `/api/services/${editingId}` : '/api/services'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          duration: form.duration ? Number(form.duration) : undefined,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        toastError(data.error || 'Failed to save service')
        return
      }

      await fetchServices()
      success(editingId ? 'Service updated!' : 'Service created!')
      setShowModal(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!accessToken || !confirm('Delete this service?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (data.success) {
        setServices((prev) => prev.filter((s) => s.id !== id))
        success('Service deleted')
      } else {
        toastError(data.error || 'Failed to delete')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (svc: Service) => {
    if (!accessToken) return
    const res = await fetch(`/api/services/${svc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ isActive: !svc.isActive }),
    })
    const data = await res.json()
    if (data.success) {
      await fetchServices()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900 flex-1">My Services</h1>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Service
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20">
            <EMPTY_STATE_ICON className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services yet</h3>
            <p className="text-gray-500 text-sm mb-6">Add your first service to start receiving bookings</p>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Your First Service
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((svc) => (
              <div key={svc.id} className="bg-white rounded-2xl p-4 card-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{svc.title}</h3>
                      <Badge variant={svc.isActive ? 'success' : 'default'} size="sm">
                        {svc.isActive ? 'Active' : 'Hidden'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{svc.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-green-500" />
                    <strong>${svc.price}</strong>
                    <span className="text-xs text-gray-400">/ {svc.priceType.toLowerCase()}</span>
                  </span>
                  {svc.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-500" />
                      {svc.duration} min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-blue-500" />
                    {getCategoryLabel(svc.category)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(svc)}
                    className={`flex-1 text-xs font-medium py-2 rounded-xl transition-colors ${
                      svc.isActive
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {svc.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEdit(svc)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    disabled={deletingId === svc.id}
                    className="px-3 py-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
                  >
                    {deletingId === svc.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Service' : 'Add Service'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Deep House Cleaning"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what's included in this service..."
              rows={3}
              maxLength={1000}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : '' })}
                  placeholder="0"
                  min={1}
                  className="w-full pl-7 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price Type</label>
              <select
                value={form.priceType}
                onChange={(e) => setForm({ ...form, priceType: e.target.value as ServiceForm['priceType'] })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
              >
                <option value="FIXED">Fixed price</option>
                <option value="HOURLY">Per hour</option>
                <option value="NEGOTIABLE">Negotiable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Duration (minutes, optional)
            </label>
            <input
              type="number"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value ? Number(e.target.value) : '' })}
              placeholder="e.g. 120"
              min={15}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isSaving} className="flex-1">
              {editingId ? 'Save Changes' : 'Create Service'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
