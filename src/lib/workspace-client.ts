// Browser-side client for the Workspace DB.
// Mimics a subset of supabase-js's query builder API, but proxies through
// /api/workspace/query so the browser never touches the workspace DB directly.
//
// Supported: .from(table).select/insert/update/delete/upsert chained with
//   .eq, .neq, .in, .is, .not, .gte, .lte, .ilike, .order, .limit, .single, .maybeSingle

type Filter = { col: string; op: string; val: unknown }
type Order = { col: string; ascending?: boolean }

type Result<T = unknown> = { data: T | null; error: { message: string } | null }

class WorkspaceQueryBuilder<T = unknown> implements PromiseLike<Result<T>> {
  private body: any

  constructor(table: string) {
    this.body = { table, filters: [] as Filter[] }
  }

  select(columns = '*') { this.body.op = 'select'; this.body.columns = columns; return this }
  insert(values: unknown) { this.body.op = 'insert'; this.body.values = values; return this }
  update(values: unknown) { this.body.op = 'update'; this.body.values = values; return this }
  delete() { this.body.op = 'delete'; return this }
  upsert(values: unknown) { this.body.op = 'upsert'; this.body.values = values; return this }

  eq(col: string, val: unknown)  { this.body.filters.push({ col, op: 'eq', val });  return this }
  neq(col: string, val: unknown) { this.body.filters.push({ col, op: 'neq', val }); return this }
  in(col: string, val: unknown[]) { this.body.filters.push({ col, op: 'in', val });  return this }
  is(col: string, val: unknown)  { this.body.filters.push({ col, op: 'is', val });  return this }
  not(col: string, _op: string, val: unknown) { this.body.filters.push({ col, op: 'not', val }); return this }
  gte(col: string, val: unknown) { this.body.filters.push({ col, op: 'gte', val }); return this }
  lte(col: string, val: unknown) { this.body.filters.push({ col, op: 'lte', val }); return this }
  ilike(col: string, val: string) { this.body.filters.push({ col, op: 'ilike', val }); return this }

  order(col: string, opts?: { ascending?: boolean }): this
  order(col: string, opts: { ascending?: boolean } = {}) {
    (this.body as { order?: Order }).order = { col, ascending: opts.ascending ?? true }
    return this
  }
  limit(n: number) { this.body.limit = n; return this }
  single() { this.body.single = true; return this }
  maybeSingle() { this.body.maybeSingle = true; return this }

  async then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const res = await fetch('/api/workspace/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.body),
      })
      const json = await res.json()
      const result: Result<T> = res.ok
        ? { data: (json.data as T) ?? null, error: null }
        : { data: null, error: { message: json.error || 'Request failed' } }
      return onfulfilled ? onfulfilled(result) : (result as unknown as TResult1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error'
      const result: Result<T> = { data: null, error: { message } }
      return onfulfilled ? onfulfilled(result) : (result as unknown as TResult1)
    }
  }
}

export const workspaceClient = {
  from<T = unknown>(table: string) {
    return new WorkspaceQueryBuilder<T>(table)
  },
}
