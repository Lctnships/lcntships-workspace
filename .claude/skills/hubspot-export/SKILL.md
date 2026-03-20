---
name: hubspot-export
description: Generate a HubSpot-ready CSV export from sales_leads in Supabase
disable-model-invocation: true
---

# HubSpot CSV Export

Export sales_leads from Supabase as a CSV file ready for HubSpot import.

## Steps

1. Query all leads from Supabase:
```sql
SELECT naam, telefoon, website, stad, email, instagram, categorie
FROM sales_leads
WHERE email IS NOT NULL
ORDER BY created_at DESC;
```

2. Map columns to HubSpot field names:
   - `naam` → `Company name`
   - `telefoon` → `Phone Number`
   - `website` → `Website URL`
   - `stad` → `City`
   - `email` → `Email`
   - `instagram` → `Instagram Company Page`
   - `categorie` → `Studio Type`
   - Always add `Lead Status` = `NEW`

3. Generate CSV with:
   - First row: `Company name,Phone Number,Website URL,City,Email,Instagram Company Page,Studio Type,Lead Status`
   - UTF-8 encoding
   - Comma-separated
   - Quote fields containing commas or spaces

4. Save as `lcntships-leads-[YYYY-MM-DD].csv` in the project root

## Notes
- Only include leads that have an email address
- Deduplicate by email (keep most recent)
- Strip leading/trailing whitespace from all fields
