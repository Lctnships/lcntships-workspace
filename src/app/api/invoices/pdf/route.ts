import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && serviceKey 
  ? createClient(supabaseUrl, serviceKey)
  : null

// Escape HTML to prevent XSS injection in PDF (OWASP A03)
function escapeHtml(str: unknown): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Invoice HTML template
function generateInvoiceHTML(invoice: any) {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('nl-NL')
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factuur ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4f46e5;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: bold;
      color: #111;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta p {
      margin: 4px 0;
      color: #666;
    }
    .addresses {
      display: flex;
      gap: 60px;
      margin-bottom: 40px;
    }
    .address-block h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .address-block p {
      margin: 2px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    .items-table th {
      text-align: left;
      padding: 12px 8px;
      border-bottom: 2px solid #e5e7eb;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
    }
    .items-table td {
      padding: 12px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table .text-right {
      text-align: right;
    }
    .totals {
      width: 300px;
      margin-left: auto;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row.total {
      font-size: 18px;
      font-weight: bold;
      border-bottom: 2px solid #111;
      margin-top: 8px;
    }
    .notes {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .notes h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .status-paid {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">lcntships</div>
      <div class="invoice-title">Factuur</div>
    </div>
    <div class="invoice-meta">
      <p><strong>Factuurnummer:</strong> ${invoice.invoice_number}</p>
      <p><strong>Factuurdatum:</strong> ${formatDate(invoice.issue_date)}</p>
      <p><strong>Vervaldatum:</strong> ${formatDate(invoice.due_date)}</p>
      ${invoice.status === 'paid' ? '<span class="status-paid">BETAALD</span>' : ''}
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Van</h3>
      <p><strong>lcntships B.V.</strong></p>
      <p>Herengracht 123</p>
      <p>1015 BW Amsterdam</p>
      <p>info@lcntships.com</p>
      <p>KVK: 12345678</p>
      <p>BTW: NL123456789B01</p>
    </div>
    <div class="address-block">
      <h3>Aan</h3>
      <p><strong>${escapeHtml(invoice.customer_name)}</strong></p>
      ${invoice.customer_company ? `<p>${escapeHtml(invoice.customer_company)}</p>` : ''}
      ${invoice.customer_address ? invoice.customer_address.split('\n').map((line: string) => `<p>${escapeHtml(line)}</p>`).join('') : ''}
      <p>${escapeHtml(invoice.customer_email)}</p>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Omschrijving</th>
        <th class="text-right">Aantal</th>
        <th class="text-right">Prijs</th>
        <th class="text-right">Totaal</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items?.map((item: any) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td class="text-right">${escapeHtml(item.quantity)}</td>
          <td class="text-right">${formatCurrency(item.unit_price)}</td>
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotaal</span>
      <span>${formatCurrency(invoice.subtotal)}</span>
    </div>
    <div class="totals-row">
      <span>BTW (${invoice.tax_rate}%)</span>
      <span>${formatCurrency(invoice.tax_amount)}</span>
    </div>
    <div class="totals-row total">
      <span>Totaal</span>
      <span>${formatCurrency(invoice.total)}</span>
    </div>
  </div>

  ${invoice.notes ? `
    <div class="notes">
      <h3>Opmerkingen</h3>
      <p>${invoice.notes}</p>
    </div>
  ` : ''}

  <div class="footer">
    <p>lcntships B.V. | IBAN: NL00BANK0123456789 | BIC: BANKNL2A</p>
    <p>Bedankt voor je zakelijke vertrouwen!</p>
  </div>
</body>
</html>
  `
}

export async function GET(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('id')

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // Get invoice from database
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Generate HTML
    const html = generateInvoiceHTML(invoice)

    // Launch browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    // Create PDF
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    })

    await browser.close()

    // Upload to Supabase Storage
    const fileName = `invoice-${invoice.invoice_number}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('invoices')
      .upload(fileName, pdf, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
    } else {
      // Update invoice with PDF URL
      const { data: { publicUrl } } = supabaseAdmin
        .storage
        .from('invoices')
        .getPublicUrl(fileName)

      await supabaseAdmin
        .from('invoices')
        .update({ pdf_url: publicUrl })
        .eq('id', invoiceId)
    }

    // Return PDF
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { error: __authError } = await requireAuth()
  if (__authError) return __authError

  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }
    
    const { invoiceId } = await request.json()

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // Get invoice from database
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Generate HTML
    const html = generateInvoiceHTML(invoice)

    // Launch browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    // Create PDF
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    })

    await browser.close()

    // Upload to Supabase Storage
    const fileName = `invoice-${invoice.invoice_number}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('invoices')
      .upload(fileName, pdf, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload PDF' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('invoices')
      .getPublicUrl(fileName)

    // Update invoice with PDF URL
    await supabaseAdmin
      .from('invoices')
      .update({ pdf_url: publicUrl })
      .eq('id', invoiceId)

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
