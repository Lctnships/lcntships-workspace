'use client'

import { use, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Calendar, Clock, MapPin, User, Phone, Camera, Package, FileText, Loader2 } from 'lucide-react'

type ShotItem = { shot: string; description?: string; done?: boolean }

type PublicBrief = {
  id: string
  title: string | null
  studio_name: string | null
  description: string | null
  shoot_date: string | null
  call_time: string | null
  end_time: string | null
  contact_person: string | null
  contact_phone: string | null
  shotlist: ShotItem[]
  equipment: string[]
  deliverables: string | null
  notes: string | null
  status: string
}

function formatDate(d?: string | null) {
  if (!d) return null
  try {
    return format(parseISO(d), 'EEEE d MMMM yyyy', { locale: nl })
  } catch {
    return d
  }
}

export default function PublicBriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [brief, setBrief] = useState<PublicBrief | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/content-briefs/public/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('notfound')
        return r.json()
      })
      .then((d) => setBrief(d.brief))
      .catch(() => setErr('Deze link is ongeldig of verlopen.'))
  }, [token])

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-sm">
          <p className="text-gray-700">{err}</p>
        </div>
      </div>
    )
  }

  if (!brief) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-900 text-white px-8 py-8">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Content briefing</p>
            <h1 className="text-2xl font-bold">{brief.title ?? 'Shoot'}</h1>
            <p className="text-gray-300 text-sm mt-1">{brief.studio_name}</p>
          </div>

          <div className="p-8 space-y-5">
            {brief.shoot_date && (
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Datum" value={formatDate(brief.shoot_date)!} />
            )}
            {(brief.call_time || brief.end_time) && (
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Tijden"
                value={[brief.call_time, brief.end_time].filter(Boolean).join(' – ')}
              />
            )}
            {brief.studio_name && (
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Locatie" value={brief.studio_name} />
            )}
            {brief.contact_person && (
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Contact"
                value={brief.contact_person}
                extra={
                  brief.contact_phone ? (
                    <a
                      href={`tel:${brief.contact_phone}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <Phone className="h-3 w-3" />
                      {brief.contact_phone}
                    </a>
                  ) : null
                }
              />
            )}

            {brief.description && (
              <Block title="Omschrijving">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{brief.description}</p>
              </Block>
            )}

            {brief.shotlist && brief.shotlist.length > 0 && (
              <Block title="Shotlist" icon={<Camera className="h-4 w-4" />}>
                <ol className="space-y-3">
                  {brief.shotlist.map((s, i) => (
                    <li key={i} className="border-l-2 border-gray-200 pl-3">
                      <p className="text-sm font-semibold text-gray-900">{i + 1}. {s.shot}</p>
                      {s.description && <p className="text-xs text-gray-600 mt-0.5">{s.description}</p>}
                    </li>
                  ))}
                </ol>
              </Block>
            )}

            {brief.equipment && brief.equipment.length > 0 && (
              <Block title="Equipment" icon={<Package className="h-4 w-4" />}>
                <ul className="space-y-1">
                  {brief.equipment.map((e, i) => (
                    <li key={i} className="text-sm text-gray-700">• {e}</li>
                  ))}
                </ul>
              </Block>
            )}

            {brief.deliverables && (
              <Block title="Deliverables">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{brief.deliverables}</p>
              </Block>
            )}

            {brief.notes && (
              <Block title="Notities" icon={<FileText className="h-4 w-4" />}>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{brief.notes}</p>
              </Block>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Powered by lctnships</p>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  extra,
}: {
  icon: React.ReactNode
  label: string
  value: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value}</p>
        {extra}
      </div>
    </div>
  )
}

function Block({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pt-4 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}
