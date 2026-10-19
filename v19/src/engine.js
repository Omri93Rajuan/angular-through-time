/* ES5-compatible UMD: identical source executed by Node and every browser variant. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarketEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function random(seed) { var s = seed >>> 0; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
  var sectors = ['Technology', 'Energy', 'Healthcare', 'Industrials', 'Consumer'];
  function initial() { var r = random(14022), rows = []; for (var i = 0; i < 5000; i++) { var price = 1000 + Math.floor(r() * 99000); rows.push({id:i, symbol:'M' + ('0000' + i).slice(-4), name:['Aurora','Orbit','Cedar','Nova','Atlas'][i % 5] + ' ' + ('0000' + i).slice(-4), sector:sectors[i % 5], price:price, base:price, volume:1000 + Math.floor(r() * 1000000)}); } return rows; }
  function event(tick, count) {
    if (tick < 0 || tick % 1 || [0,100,500,2000,5000].indexOf(count) < 0) throw Error('Invalid event');
    var r = random(90210 + tick), start = Math.floor(r() * 5000), changes = [];
    for (var i = 0; i < count; i++) changes.push({id:(start + i * 73) % 5000, delta:Math.floor(r() * 201) - 100});
    return {tick:tick, changes:changes};
  }
  function apply(rows, e, mode) {
    if (['mutation','records','array'].indexOf(mode) < 0) throw Error('Invalid mode');
    var out = mode === 'array' ? rows.map(function (a) { return Object.assign({}, a); }) : rows;
    e.changes.forEach(function (c) { var a = out[c.id]; if (mode === 'records') a = Object.assign({}, a); a.price = Math.max(1, a.price + c.delta); a.volume += Math.abs(c.delta); out[c.id] = a; });
    return out;
  }
  function checksum(rows) { var hash = 2166136261; rows.forEach(function (a) { [a.id,a.price,a.base,a.volume].forEach(function (v) { hash = Math.imul(hash ^ v, 16777619) >>> 0; }); }); return ('00000000' + hash.toString(16)).slice(-8); }
  return {initial:initial,event:event,apply:apply,checksum:checksum,sectors:sectors};
}));
