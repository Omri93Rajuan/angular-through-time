import fs from 'node:fs';
// Independent of MarketEngine and all application selectors: start from the frozen fixture.
const fixture = JSON.parse(fs.readFileSync(new URL('../../packages/market-fixtures/initial.json', import.meta.url)));
export class Oracle {
  constructor() { this.rows = structuredClone(fixture); this.tick = 0; this.history = [100]; }
  apply(event) {
    if (event.tick !== this.tick) throw Error('Oracle event order');
    const seen = new Set();
    for (const {id, delta} of event.changes) {
      if (!Number.isInteger(id) || !this.rows[id] || seen.has(id) || !Number.isInteger(delta)) throw Error('Invalid change');
      seen.add(id); const row = this.rows[id];
      row.price = Math.max(1, row.price + delta); row.volume += Math.abs(delta);
    }
    this.tick++; this.history.push(this.index); if (this.history.length > 60) this.history.shift();
  }
  get index() { let total = 0; for (const row of this.rows) total += row.price / row.base; return total / 50; }
  get advancing() { let count = 0; for (const row of this.rows) if (row.price > row.base) count++; return count; }
  get chart() {
    const lower = Math.min(...this.history) - .01, upper = Math.max(...this.history) + .01;
    return this.history.map((v, i) => [300 * i / Math.max(1, this.history.length - 1), 110 - 100 * (v - lower) / (upper - lower)]);
  }
  visible({query = '', sector = '', onlyWatch = false, watch = [], sortKey = 'symbol', ascending = true} = {}) {
    const selected = this.rows.filter(r => `${r.symbol} ${r.name}`.toLowerCase().includes(query.toLowerCase()) && (!sector || r.sector === sector) && (!onlyWatch || watch.includes(r.id)));
    return selected.sort((a,b) => (a[sortKey] < b[sortKey] ? -1 : a[sortKey] > b[sortKey] ? 1 : 0) * (ascending ? 1 : -1) || a.id - b.id);
  }
}
export const decimal = (n, digits = 2) => (Math.abs(n) < .5 * 10 ** -digits ? 0 : n).toLocaleString('en-US', {minimumFractionDigits:digits, maximumFractionDigits:digits});
