/** Cyclic Latin-square positions; reverse direction on alternate complete cycles. */
export function balancedOrder(base, repetitions) {
  if (!base.length || !Number.isInteger(repetitions) || repetitions < 1) throw Error('Invalid repetition plan');
  const jobs = [];
  for (let rep = 0; rep < repetitions; rep++) {
    const sequence = Math.floor(rep / base.length) % 2 ? [...base].reverse() : base;
    const shift = rep % base.length;
    jobs.push(...sequence.slice(shift).concat(sequence.slice(0, shift)).map(job => ({...job, rep})));
  }
  return jobs;
}
