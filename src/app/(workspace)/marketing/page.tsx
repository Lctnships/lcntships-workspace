'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Calendar,
  Clock,
  Edit,
  Trash2,
  MoreHorizontal,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  CalendarDays,
  TrendingUp,
  Heart,
  Eye,
  MessageCircle,
  Share2,
  Repeat,
  MousePointer,
  BarChart3,
  Send,
  FileEdit,
  X,
  Image as ImageIcon,
  Bold,
  Italic,
  Link2,
  Smile,
  Sparkles,
  Copy,
  ExternalLink,
  Sun,
  Moon,
  Sunrise,
  Info,
  Check,
  Facebook,
  Loader2,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { marketingApi, type MarketingPost } from '@/lib/supabase'

// Types
type ViewMode = 'list' | 'calendar' | 'drafts'
type PostStatus = 'draft' | 'scheduled' | 'published'
type Platform = 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'facebook'

const platformConfig: Record<Platform, { icon: typeof Instagram; color: string; bgColor: string; name: string }> = {
  instagram: { icon: Instagram, color: 'text-pink-600', bgColor: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600', name: 'Instagram' },
  twitter: { icon: Twitter, color: 'text-gray-900', bgColor: 'bg-black', name: 'Twitter / X' },
  linkedin: { icon: Linkedin, color: 'text-blue-700', bgColor: 'bg-[#0077b5]', name: 'LinkedIn' },
  youtube: { icon: Youtube, color: 'text-red-600', bgColor: 'bg-red-600', name: 'YouTube' },
  facebook: { icon: Facebook, color: 'text-blue-600', bgColor: 'bg-[#1877f2]', name: 'Facebook' },
}

const statusConfig: Record<PostStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  scheduled: { label: 'Scheduled', color: 'bg-gray-100 text-gray-900 border-gray-300' },
  published: { label: 'Published', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
}

// Components
function PlatformIcon({ platform, size = 'md' }: { platform: string; size?: 'sm' | 'md' | 'lg' }) {
  const config = platformConfig[platform as Platform]
  if (!config) return null
  const Icon = config.icon
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white', config.bgColor, sizeClasses[size])}>
      <Icon className={iconSizes[size]} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as PostStatus] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border', config.color)}>
      {config.label}
    </span>
  )
}

// Stats Card
function StatCard({ icon: Icon, label, value, change, iconBg }: {
  icon: typeof TrendingUp
  label: string
  value: string
  change?: string
  iconBg: string
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-3 hover:border-gray-300 transition-colors">
      <div className="flex justify-between items-start">
        <div className={cn('p-2.5 rounded-xl', iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
            <TrendingUp className="h-3 w-3 mr-1" />
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  )
}

// Create Post Modal
function CreatePostModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram'])
  const [content, setContent] = useState('')
  const [scheduleNow, setScheduleNow] = useState(false)

  if (!isOpen) return null

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[1100px] max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 shrink-0">
          <h2 className="text-gray-900 text-xl font-bold">Create New Post</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          {/* Left: Editor */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
            {/* Platform Selector */}
            <div className="space-y-3">
              <label className="text-gray-900 text-sm font-semibold">Select Platforms</label>
              <div className="flex gap-3 flex-wrap">
                {(Object.keys(platformConfig) as Platform[]).map((platform) => {
                  const config = platformConfig[platform]
                  const isSelected = selectedPlatforms.includes(platform)
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        'group flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all',
                        isSelected
                          ? 'border-gray-900 bg-gray-100'
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <PlatformIcon platform={platform} size="sm" />
                      <span className={cn('font-medium text-sm', isSelected ? 'text-gray-900' : 'text-gray-700')}>
                        {config.name}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-gray-900" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content Editor */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-gray-900 text-sm font-semibold">Post Content</label>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 hover:from-violet-200 hover:to-fuchsia-200 transition-colors text-xs font-medium">
                  <Sparkles className="h-4 w-4" />
                  Generate Caption
                </button>
              </div>
              <div className="border border-gray-200 rounded-xl bg-gray-50 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-300 transition-all overflow-hidden">
                <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-white">
                  <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                    <Bold className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                    <Italic className="h-4 w-4" />
                  </button>
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                    <Link2 className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                    <Smile className="h-4 w-4" />
                  </button>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-400 font-medium px-2">{content.length} / 2200</span>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-transparent p-4 min-h-[160px] border-none focus:ring-0 resize-none text-base"
                />
              </div>
            </div>

            {/* Media Upload */}
            <div className="space-y-3">
              <label className="text-gray-900 text-sm font-semibold">Media</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 hover:border-gray-600 transition-colors cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 group-hover:scale-110 transition-transform">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-gray-900 font-medium text-sm">Drag & drop photos or videos here</p>
                  <p className="text-gray-500 text-xs mt-1">or <span className="text-gray-900 underline">Browse files</span></p>
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-gray-500" />
                  <h3 className="text-gray-900 font-semibold text-sm">Scheduling</h3>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <span className="mr-3 text-sm font-medium text-gray-600">Post Immediately</span>
                  <button
                    onClick={() => setScheduleNow(!scheduleNow)}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      scheduleNow ? 'bg-gray-900' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                        scheduleNow ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </label>
              </div>
              {!scheduleNow && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Date</label>
                    <Input type="date" className="rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Time</label>
                    <Input type="time" className="rounded-lg" />
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-start gap-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <Info className="h-4 w-4 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Best time to post</p>
                  <p className="text-xs text-emerald-600/80 mt-0.5">Tomorrow at 10:30 AM will reach ~20% more followers.</p>
                </div>
                <button className="text-xs font-semibold text-emerald-700 underline ml-auto">Apply</button>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="w-full lg:w-[380px] bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-500">Live Preview</span>
              <div className="flex bg-gray-200 p-1 rounded-lg">
                <button className="p-1.5 rounded bg-white shadow-sm text-gray-800">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="5" y="2" width="14" height="20" rx="2" strokeWidth="2" />
                  </svg>
                </button>
                <button className="p-1.5 rounded text-gray-500 hover:text-gray-800">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 flex items-center justify-center overflow-hidden">
              <div className="w-[280px] bg-white rounded-[2rem] shadow-xl border-4 border-gray-200 overflow-hidden">
                <div className="h-6 bg-white flex justify-between items-center px-4 text-[10px] font-bold text-gray-800">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 bg-gray-800 rounded-sm" />
                  </div>
                </div>
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                  <span className="font-bold text-sm text-gray-900">Instagram</span>
                  <MoreHorizontal className="h-4 w-4 text-gray-900" />
                </div>
                <div className="bg-white">
                  <div className="flex items-center gap-2 p-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-900 to-purple-400 p-[2px]">
                      <div className="w-full h-full rounded-full bg-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900">lcntships_workspace</span>
                      <span className="text-[10px] text-gray-500">Suggested for you</span>
                    </div>
                  </div>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-300" />
                  </div>
                  <div className="px-3 py-2 flex justify-between items-center">
                    <div className="flex gap-3">
                      <Heart className="h-5 w-5 text-gray-900" />
                      <MessageCircle className="h-5 w-5 text-gray-900" />
                      <Send className="h-5 w-5 text-gray-900" />
                    </div>
                  </div>
                  <div className="px-3 pb-4">
                    <p className="text-xs font-bold text-gray-900 mb-1">0 likes</p>
                    <p className="text-xs text-gray-800">
                      <span className="font-bold mr-1">lcntships_workspace</span>
                      {content || 'Your caption will appear here...'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 px-8 py-5 flex items-center justify-between shrink-0">
          <div className="text-sm text-gray-500 hidden sm:block">
            Auto-saved at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex gap-3 ml-auto">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Save as Draft
            </Button>
            <Button className="rounded-xl shadow-lg shadow-gray-300">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Post Detail Sidebar
function PostDetailSidebar({ post, isOpen, onClose }: { post: MarketingPost | null; isOpen: boolean; onClose: () => void }) {
  if (!isOpen || !post) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.08)] rounded-l-2xl border-l border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 rounded-tl-2xl">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Post Details</h2>
          <StatusBadge status={post.status} />
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Meta Info */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <PlatformIcon platform={post.platform || ''} size="lg" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">{platformConfig[post.platform as Platform]?.name || post.platform || 'Unknown'}</span>
              <span className="text-xs text-gray-500">{post.status === 'published' ? 'Published' : 'Scheduled'}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {post.status === 'published' ? 'Published On' : 'Scheduled For'}
            </span>
            <span className="block text-sm font-medium text-gray-900">
              {post.published_at ? new Date(post.published_at).toLocaleDateString() : post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString() : '-'}
            </span>
          </div>
        </div>

        {/* Content Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Content Preview</h3>
            <button className="text-gray-900 hover:text-gray-800 text-sm font-medium flex items-center gap-1 transition-colors">
              View live post
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5">
              <h4 className="font-bold text-gray-900 mb-2">{post.title}</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{post.content}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-100 bg-white p-6 rounded-bl-2xl">
        <div className="flex flex-col gap-3">
          <Button className="w-full rounded-xl h-12">
            <Edit className="h-4 w-4 mr-2" />
            Edit Post
          </Button>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" size="sm" className="rounded-xl">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// AI Content Assistant
function AIContentAssistant({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('')
  const [ideas, setIdeas] = useState([
    { id: 1, content: 'Video tour of the new studio layout with team intro.', type: 'Reel / TikTok' },
    { id: 2, content: '5 quick tips for better lighting in product photos.', type: 'Carousel' },
    { id: 3, content: 'Interview clip with Sarah about her favorite project.', type: 'Story' },
  ])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-200 text-gray-900">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">AI Content Ideas</h2>
              <p className="text-xs text-gray-500 font-medium">lcntships Workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-8">
          {/* Input Section */}
          <div className="flex flex-col gap-6">
            <div className="space-y-1">
              <h3 className="text-gray-900 text-[17px] font-bold leading-tight">Generate post ideas based on...</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Tell us your topic and let the AI draft engaging concepts for your calendar.</p>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Topic or Theme</label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Launching our Summer Sale for the new sneaker collection..."
                  className="min-h-[96px] rounded-xl bg-gray-50 border-gray-200 focus:border-gray-900 focus:ring-gray-300"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] text-gray-900 focus:border-gray-900 focus:ring-gray-300"
                >
                  <option value="">Select content type</option>
                  <option value="spotlight">Studio spotlight</option>
                  <option value="bts">Behind the scenes</option>
                  <option value="testimonial">Customer testimonial</option>
                  <option value="tips">Tips & tricks</option>
                </select>
              </div>
            </div>

            <Button className="w-full rounded-xl h-12 shadow-lg shadow-gray-300">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Ideas
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium text-gray-400">Results</span>
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-4">
            {ideas.map((idea, index) => (
              <div
                key={idea.id}
                className="group flex flex-row items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-600 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
                <div className="flex flex-col flex-grow gap-3">
                  <p className="text-[15px] text-gray-700 font-medium leading-relaxed">{idea.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400 font-medium">{idea.type}</span>
                    <Button size="sm" variant="ghost" className="text-gray-900 hover:text-white hover:bg-gray-900 rounded-lg">
                      <Plus className="h-4 w-4 mr-1" />
                      Use This
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// List View Component
function ListView({ posts, onPostClick }: { posts: MarketingPost[]; onPostClick: (post: MarketingPost) => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold w-32">Status</th>
              <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold w-40">Platform</th>
              <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold min-w-[300px]">Content Preview</th>
              <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold w-48">Date</th>
              <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-500 font-semibold text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map((post) => (
              <tr
                key={post.id}
                onClick={() => onPostClick(post)}
                className="group hover:bg-gray-100/50 transition-colors cursor-pointer"
              >
                <td className="py-4 px-6 align-middle">
                  <StatusBadge status={post.status} />
                </td>
                <td className="py-4 px-6 align-middle">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={post.platform || ''} />
                    <span className="text-sm font-medium text-gray-700">{platformConfig[post.platform as Platform]?.name || post.platform || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-6 align-middle">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                      <FileEdit className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex flex-col max-w-[240px]">
                      <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                      <p className="text-xs text-gray-500 truncate">{post.content}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 align-middle">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString() : post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 align-middle text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="invisible group-hover:visible w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 transition-all"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100">
        <span className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-900">1-{posts.length}</span> of <span className="font-medium text-gray-900">{posts.length}</span> posts
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled className="rounded-lg">Previous</Button>
          <Button variant="outline" size="sm" className="rounded-lg">Next</Button>
        </div>
      </div>
    </div>
  )
}

// Calendar View Component
function CalendarView({ posts, onPostClick }: { posts: MarketingPost[]; onPostClick: (post: MarketingPost) => void }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dates = [23, 24, 25, 26, 27, 28, 29]
  const timeSlots = [
    { label: 'Morning', icon: Sunrise, color: 'text-orange-400' },
    { label: 'Afternoon', icon: Sun, color: 'text-yellow-500' },
    { label: 'Evening', icon: Moon, color: 'text-gray-700' },
  ]

  const getPostForSlot = (date: number, slot: string): MarketingPost | undefined => {
    const slotHours: Record<string, [number, number]> = {
      Morning: [6, 12],
      Afternoon: [12, 17],
      Evening: [17, 24],
    }
    return posts.find(p => {
      if (!p.scheduled_at) return false
      const d = new Date(p.scheduled_at)
      const postDate = d.getDate()
      const postHour = d.getHours()
      const [start, end] = slotHours[slot] || [0, 0]
      return postDate === date && postHour >= start && postHour < end
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      {/* Calendar Header */}
      <div className="grid grid-cols-8 border-b border-gray-200">
        <div className="p-4 border-r border-gray-200 bg-gray-50/50" />
        {days.map((day, index) => (
          <div
            key={day}
            className={cn(
              'p-4 text-center border-r border-gray-100 last:border-r-0',
              index === 1 && 'bg-gray-100 relative'
            )}
          >
            {index === 1 && <div className="absolute top-0 left-0 w-full h-1 bg-gray-900" />}
            <span className={cn('block text-xs font-medium uppercase', index === 1 ? 'text-gray-900 font-bold' : 'text-gray-500')}>
              {day}
            </span>
            <span className={cn('block text-lg font-bold', index === 1 ? 'text-gray-900' : 'text-gray-900')}>
              {dates[index]}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-y-auto">
        {timeSlots.map(({ label, icon: Icon, color }) => (
          <div key={label} className="grid grid-cols-8 min-h-[160px] border-b border-gray-100 last:border-b-0">
            <div className="p-4 border-r border-gray-200 bg-gray-50/50 flex flex-col justify-center items-center">
              <Icon className={cn('h-5 w-5 mb-1', color)} />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
            </div>
            {dates.map((date, dayIndex) => {
              const post = getPostForSlot(date, label)
              const isToday = dayIndex === 1
              const isWeekend = dayIndex >= 5
              return (
                <div
                  key={`${date}-${label}`}
                  className={cn(
                    'border-r border-gray-100 last:border-r-0 p-2 transition-colors',
                    isToday && 'bg-gray-100 hover:bg-gray-200',
                    isWeekend && !isToday && 'bg-gray-50/30',
                    !isToday && !isWeekend && 'hover:bg-gray-50'
                  )}
                >
                  {post ? (
                    <div
                      onClick={() => onPostClick(post)}
                      className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <PlatformIcon platform={post.platform || ''} size="sm" />
                        <span className={cn(
                          'w-2 h-2 rounded-full',
                          post.status === 'published' && 'bg-emerald-500',
                          post.status === 'scheduled' && 'bg-emerald-500',
                          post.status === 'draft' && 'bg-gray-300'
                        )} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">{post.title}</h4>
                        <span className="text-[10px] font-medium text-gray-400">
                          {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  ) : isToday && label === 'Evening' ? (
                    <button className="w-full h-full rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center gap-1 text-gray-900 hover:bg-white/50 hover:border-gray-900 hover:text-gray-900 transition-all group">
                      <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold">Schedule</span>
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Drafts View Component
function DraftsView({ posts, onPostClick }: { posts: MarketingPost[]; onPostClick: (post: MarketingPost) => void }) {
  const drafts = posts.filter(p => p.status === 'draft')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all')

  const filteredDrafts = selectedPlatform === 'all' ? drafts : drafts.filter(p => p.platform === selectedPlatform)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedPlatform('all')}
          className={cn(
            'flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-xl pl-3 pr-4 transition-colors',
            selectedPlatform === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-600 hover:text-gray-900'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="text-sm font-medium">All Platforms</span>
        </button>
        {(Object.keys(platformConfig) as Platform[]).slice(0, 3).map((platform) => {
          const config = platformConfig[platform]
          const Icon = config.icon
          return (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={cn(
                'flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-xl pl-3 pr-4 transition-colors',
                selectedPlatform === platform
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{config.name}</span>
            </button>
          )
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrafts.map((post) => (
          <div
            key={post.id}
            onClick={() => onPostClick(post)}
            className="group flex flex-col bg-white rounded-2xl p-3 shadow-sm hover:shadow-xl hover:shadow-gray-200 border border-transparent hover:border-gray-300 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
          >
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-3">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center p-6">
                <div className="text-center text-white">
                  <FileEdit className="h-10 w-10 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-lg leading-snug">{post.title}</p>
                </div>
              </div>
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                <PlatformIcon platform={post.platform || ''} size="sm" />
                <span className="text-xs font-bold text-gray-800">{platformConfig[post.platform as Platform]?.name || post.platform || 'Unknown'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 px-1 pb-1">
              <div className="flex justify-between items-start">
                <h3 className="text-gray-900 font-bold text-lg leading-tight truncate">{post.title}</h3>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md shrink-0 ml-2">Draft</span>
              </div>
              <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{post.content}</p>
              <div className="mt-2 flex gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" variant="ghost" className="flex-1 rounded-lg bg-gray-100 hover:bg-gray-900 text-gray-900 hover:text-white">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Create New Draft Card */}
        <div className="group flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-300 hover:border-gray-700 hover:bg-white transition-all cursor-pointer min-h-[340px]">
          <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
            <Plus className="h-8 w-8 text-gray-900" />
          </div>
          <h3 className="text-gray-900 font-bold text-lg text-center">Create New Draft</h3>
          <p className="text-gray-500 text-sm text-center mt-1">Start writing for any platform</p>
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function MarketingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<MarketingPost | null>(null)
  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(false)
  const [posts, setPosts] = useState<MarketingPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPosts() {
      try {
        const data = await marketingApi.getAll()
        setPosts(data || [])
      } catch (error) {
        console.error('Error loading posts:', error)
        setPosts([])
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [])

  const handlePostClick = (post: MarketingPost) => {
    setSelectedPost(post)
    setIsDetailSidebarOpen(true)
  }

  const scheduledCount = posts.filter(p => p.status === 'scheduled').length
  const draftCount = posts.filter(p => p.status === 'draft').length
  const publishedCount = posts.filter(p => p.status === 'published').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
          <p className="text-gray-500 text-sm font-medium">Marketing posts laden...</p>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Marketing</h1>
            <p className="text-gray-500 mt-1">Manage social media content and campaigns</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAIAssistantOpen(true)}
              className="rounded-xl"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Ideas
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl shadow-lg shadow-gray-300">
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-4 rounded-full bg-gray-100 mb-4">
            <Inbox className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Nog geen marketing posts</h2>
          <p className="text-gray-500 text-sm mb-6">Maak je eerste post aan</p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl shadow-lg shadow-gray-300">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>

        <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        <AIContentAssistant isOpen={isAIAssistantOpen} onClose={() => setIsAIAssistantOpen(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Marketing</h1>
          <p className="text-gray-500 mt-1">Manage social media content and campaigns</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsAIAssistantOpen(true)}
            className="rounded-xl"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Ideas
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl shadow-lg shadow-gray-300">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Send}
          label="Scheduled"
          value={`${scheduledCount} Posts`}
          iconBg="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={Check}
          label="Published"
          value={`${publishedCount} Posts`}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={FileEdit}
          label="Drafts"
          value={`${draftCount} Posts`}
          iconBg="bg-pink-50 text-pink-600"
        />
      </div>

      {/* View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-1">
        <div className="flex gap-8">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-2 border-b-[3px] pb-3 px-1 transition-colors',
              viewMode === 'list'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <List className="h-5 w-5" />
            <span className="text-sm font-bold">List</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-2 border-b-[3px] pb-3 px-1 transition-colors',
              viewMode === 'calendar'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-sm font-bold">Calendar</span>
          </button>
          <button
            onClick={() => setViewMode('drafts')}
            className={cn(
              'flex items-center gap-2 border-b-[3px] pb-3 px-1 transition-colors',
              viewMode === 'drafts'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <FileEdit className="h-5 w-5" />
            <span className="text-sm font-bold">Drafts ({draftCount})</span>
          </button>
        </div>

        {viewMode === 'list' && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-lg">
              <Filter className="h-4 w-4 mr-2" />
              Platform
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg">
              <Filter className="h-4 w-4 mr-2" />
              Status
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="flex items-center gap-4 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Day</button>
              <button className="px-4 py-1.5 rounded-md text-sm font-bold bg-white text-gray-900 shadow-sm">Week</button>
              <button className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Month</button>
            </div>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <div className="flex items-center gap-1 px-2">
              <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button className="px-2 text-sm font-semibold text-gray-900">Today</button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' && <ListView posts={posts} onPostClick={handlePostClick} />}
      {viewMode === 'calendar' && <CalendarView posts={posts} onPostClick={handlePostClick} />}
      {viewMode === 'drafts' && <DraftsView posts={posts} onPostClick={handlePostClick} />}

      {/* Modals & Sidebars */}
      <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <AIContentAssistant isOpen={isAIAssistantOpen} onClose={() => setIsAIAssistantOpen(false)} />
      <PostDetailSidebar
        post={selectedPost}
        isOpen={isDetailSidebarOpen}
        onClose={() => {
          setIsDetailSidebarOpen(false)
          setSelectedPost(null)
        }}
      />

      {/* Backdrop for sidebar */}
      {isDetailSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 z-40"
          onClick={() => {
            setIsDetailSidebarOpen(false)
            setSelectedPost(null)
          }}
        />
      )}
    </div>
  )
}
