import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { workspaceDb } from '@/lib/supabase/workspace'

type DocRow = {
  id: string
  title: string
  content: unknown
  icon: string | null
  cover_url: string | null
  parent_id: string | null
}

interface PlateTextNode {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
}

interface PlateElementNode {
  type: string
  children: Array<PlateElementNode | PlateTextNode>
  url?: string
  lang?: string
  [key: string]: unknown
}

type PlateNode = PlateElementNode | PlateTextNode

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderText(node: PlateTextNode): string {
  let t = escapeHtml(node.text ?? '')
  if (node.code) t = `<code class="inline-code">${t}</code>`
  if (node.bold) t = `<strong>${t}</strong>`
  if (node.italic) t = `<em>${t}</em>`
  if (node.underline) t = `<u>${t}</u>`
  if (node.strikethrough) t = `<s>${t}</s>`
  return t
}

function renderChildren(children: PlateNode[]): string {
  return children
    .map((c) => {
      if ('text' in c) return renderText(c as PlateTextNode)
      return renderNode(c as PlateElementNode)
    })
    .join('')
}

function renderNode(node: PlateElementNode): string {
  const c = renderChildren(node.children ?? [])
  switch (node.type) {
    case 'h1': return `<h1>${c}</h1>`
    case 'h2': return `<h2>${c}</h2>`
    case 'h3': return `<h3>${c}</h3>`
    case 'h4': return `<h4>${c}</h4>`
    case 'h5': return `<h5>${c}</h5>`
    case 'h6': return `<h6>${c}</h6>`
    case 'p': return `<p>${c}</p>`
    case 'blockquote': return `<blockquote>${c}</blockquote>`
    case 'ul': return `<ul>${c}</ul>`
    case 'ol': return `<ol>${c}</ol>`
    case 'li': return `<li>${c}</li>`
    case 'hr': return '<hr />'
    case 'code_block': return `<pre><code>${c}</code></pre>`
    case 'code_line': return `${c}\n`
    case 'callout': return `<aside class="callout">${c}</aside>`
    case 'a': return `<a href="${escapeHtml((node.url as string) ?? '#')}">${c}</a>`
    case 'img': return `<figure><img src="${escapeHtml((node.url as string) ?? '')}" alt="" /></figure>`
    case 'table': return `<table>${c}</table>`
    case 'tr': return `<tr>${c}</tr>`
    case 'td': return `<td>${c}</td>`
    case 'th': return `<th>${c}</th>`
    case 'toggle': return `<details open><summary>${c}</summary></details>`
    default: return `<div>${c}</div>`
  }
}

function renderDocBody(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .filter((n): n is PlateElementNode => typeof n === 'object' && n !== null && 'type' in n)
    .map(renderNode)
    .join('\n')
}

async function fetchSubtree(rootId: string): Promise<DocRow[]> {
  const { data, error } = await workspaceDb
    .from('workspace_documents')
    .select('id, title, content, icon, cover_url, parent_id, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error || !data) return []
  const rows = data as (DocRow & { sort_order: number; created_at: string })[]
  const result: DocRow[] = []
  const walk = (id: string) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    result.push(row)
    rows.filter((r) => r.parent_id === id).forEach((r) => walk(r.id))
  }
  walk(rootId)
  return result
}

const PAGE_CSS = `
  @page { margin: 2cm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    max-width: 780px;
    margin: 0 auto;
    padding: 40px 32px 80px;
    line-height: 1.6;
    font-size: 15px;
  }
  .doc-cover { width: 100%; height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 24px; }
  .doc-icon { font-size: 48px; line-height: 1; margin-bottom: 12px; }
  h1 { font-size: 32px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em; }
  h2 { font-size: 24px; font-weight: 700; margin: 32px 0 12px; letter-spacing: -0.01em; }
  h3 { font-size: 18px; font-weight: 600; margin: 24px 0 10px; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 12px; padding-left: 24px; }
  li { margin: 4px 0; }
  blockquote {
    border-left: 3px solid #0f172a;
    padding: 6px 0 6px 14px;
    margin: 16px 0;
    color: #475569;
    font-style: italic;
  }
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    margin: 16px 0;
  }
  .inline-code {
    background: #f1f5f9;
    padding: 1px 6px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
  }
  .callout {
    background: #fef3c7;
    border-left: 3px solid #d97706;
    padding: 12px 16px;
    border-radius: 8px;
    margin: 16px 0;
  }
  a { color: #1d4ed8; text-decoration: underline; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  figure { margin: 16px 0; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  td, th { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  hr { border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0; }
  .doc-section + .doc-section { border-top: 2px solid #e2e8f0; margin-top: 48px; padding-top: 32px; page-break-before: always; }
  .doc-path { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  @media print { body { padding: 0; } }
`

function docSectionHTML(doc: DocRow, pathLabel?: string): string {
  return `
    <section class="doc-section">
      ${doc.cover_url ? `<img class="doc-cover" src="${escapeHtml(doc.cover_url)}" alt="" />` : ''}
      ${pathLabel ? `<div class="doc-path">${escapeHtml(pathLabel)}</div>` : ''}
      ${doc.icon ? `<div class="doc-icon">${escapeHtml(doc.icon)}</div>` : ''}
      <h1>${escapeHtml(doc.title || 'Naamloos document')}</h1>
      ${renderDocBody(doc.content)}
    </section>
  `
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error: authErr } = await requireAuth()
  if (authErr) return authErr

  const { id } = await ctx.params
  const url = new URL(req.url)
  const recursive = url.searchParams.get('recursive') === 'true'
  const mode = url.searchParams.get('mode') ?? 'html' // 'html' of 'print'

  const docs = recursive ? await fetchSubtree(id) : (await workspaceDb
    .from('workspace_documents')
    .select('id, title, content, icon, cover_url, parent_id')
    .eq('id', id)
    .limit(1)
    .then(({ data }) => (data as DocRow[] | null) ?? []))

  if (docs.length === 0) {
    return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 })
  }

  const rootTitle = docs[0].title || 'Document'
  const body = docs
    .map((d, i) => docSectionHTML(d, i === 0 ? undefined : `Sub-pagina`))
    .join('\n')

  const html = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(rootTitle)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${PAGE_CSS}</style>
</head>
<body>
  ${body}
  ${mode === 'print' ? '<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250))</script>' : ''}
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...(mode === 'download'
        ? { 'Content-Disposition': `attachment; filename="${encodeURIComponent(rootTitle)}.html"` }
        : {}),
    },
  })
}
