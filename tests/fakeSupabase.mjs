// Test stand-in for server/supabase.ts: the same calls the server makes,
// answered by a real Postgres (DATABASE_URL) that has the migrations applied.
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

class Query {
  constructor(table) { this.table = table; this.filters = []; this.orders = []; this.rng = null; this.one = false }
  select() { return this }
  eq(col, v) { this.filters.push([col, v]); return this }
  order(col) { this.orders.push(col); return this }
  range(a, b) { this.rng = [a, b]; return this }
  single() { this.one = true; return this }
  async run() {
    const where = this.filters.length ? ' where ' + this.filters.map(([c], i) => `${c} = $${i + 1}`).join(' and ') : ''
    const ord = this.orders.length ? ' order by ' + this.orders.join(', ') : ''
    const lim = this.rng ? ` offset ${this.rng[0]} limit ${this.rng[1] - this.rng[0] + 1}` : ''
    const { rows } = await pool.query(`select * from public.${this.table}${where}${ord}${lim}`, this.filters.map(([, v]) => v))
    return { data: this.one ? rows[0] ?? null : rows, error: null }
  }
  then(res, rej) { return this.run().then(res, rej) }
}

export const supabaseAdmin = () => ({
  from: (t) => new Query(t),
  rpc: async (fn, a) => {
    const { rows } = await pool.query(`select public.${fn}($1, $2, $3, $4) as v`, [a.p_version, JSON.stringify(a.p_counters), JSON.stringify(a.p_upserts), JSON.stringify(a.p_deletes)])
    return { data: rows[0].v === null ? null : Number(rows[0].v), error: null }
  },
})
export const supabaseSession = async () => { throw new Error('not used in tests') }
export const query = (sql, args) => pool.query(sql, args)
export const end = () => pool.end()
