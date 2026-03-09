'use client'

import { useState } from 'react'
import { CampaignSelectLeads, CampaignWriteEmail, CampaignReviewSend } from '@/components/email-campaign'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type SalesLead } from '@/lib/supabase'

type CampaignStep = 'select' | 'write' | 'review' | 'success'

export default function CampaignPage() {
  const [step, setStep] = useState<CampaignStep>('select')
  const [selectedLeads, setSelectedLeads] = useState<SalesLead[]>([])
  const [emailData, setEmailData] = useState<{ subject: string; body: string } | null>(null)

  const handleSelectLeads = (leads: SalesLead[]) => {
    setSelectedLeads(leads)
    setStep('write')
  }

  const handleWriteEmail = (data: { subject: string; body: string }) => {
    setEmailData(data)
    setStep('review')
  }

  const handleSaveDraft = (data?: { subject: string; body: string }) => {
    // In a real app, this would save to the database
    console.log('Saving draft:', data || emailData)
  }

  const handleSend = () => {
    setStep('success')
  }

  const handleCancel = () => {
    // Navigate back to sales page
    window.location.href = '/sales'
  }

  // Success modal
  if (step === 'success') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Campagne Verstuurd!
          </h2>
          <p className="text-gray-500 mb-6">
            Je campagne is succesvol verstuurd naar {selectedLeads.length} leads. 
            Je ontvangt een rapportage zodra de emails zijn afgeleverd.
          </p>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => window.location.href = '/sales'}
              className="w-full"
            >
              Naar Sales Pipeline
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setStep('select')
                setSelectedLeads([])
                setEmailData(null)
              }}
              className="w-full"
            >
              Nieuwe Campagne Starten
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] -m-6">
      {step === 'select' && (
        <div className="h-full flex items-center justify-center p-4">
          <CampaignSelectLeads
            onNext={handleSelectLeads}
            onCancel={handleCancel}
          />
        </div>
      )}

      {step === 'write' && (
        <div className="h-full flex items-center justify-center p-4">
          <CampaignWriteEmail
            selectedLeads={selectedLeads}
            onNext={handleWriteEmail}
            onBack={() => setStep('select')}
            onSaveDraft={handleSaveDraft}
          />
        </div>
      )}

      {step === 'review' && emailData && (
        <div className="h-full flex items-center justify-center p-4">
          <CampaignReviewSend
            selectedLeads={selectedLeads}
            emailData={emailData}
            onBack={() => setStep('write')}
            onSend={handleSend}
            onSaveDraft={() => handleSaveDraft()}
          />
        </div>
      )}
    </div>
  )
}
