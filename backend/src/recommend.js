import { buildCategoryNormalizers, sustainabilityScore } from "./sustainability.js";

export function recommendForProduct({ target, candidates, weights, k = 6 }) {
  const norms = buildCategoryNormalizers([target, ...candidates]);
  const t = sustainabilityScore(target, weights, norms);

  const scored = candidates.map(p => {
    const s = sustainabilityScore(p, weights, norms);
    return { ...p, _score: s.score, _ratio: s.ratio };
  });

  // Regla: mejorar en precio o CO2 o ratio
  const filtered = scored.filter(p =>
    (p.price ?? Infinity) <= (target.price ?? Infinity) ||
    (p.co2_kg ?? Infinity) <= (target.co2_kg ?? Infinity) ||
    p._ratio < t.ratio
  );

  filtered.sort((a, b) => a._ratio - b._ratio || a.price - b.price);
  return filtered.slice(0, k).map(p => ({
    id: p.id, name: p.name, brand: p.brand, category: p.category,
    unit: p.unit, packSize: p.packSize, price: p.price,
    co2_kg: p.co2_kg, health_score: p.health_score, social_score: p.social_score,
    sustainability_score: Number(p._score.toFixed(4)),
    ratio: Number(p._ratio.toFixed(8)),
  }));
}





function isSimilar(a, b, { packTolerance = 0.3 } = {}) {
  if ((a.category || "") !== (b.category || "")) return false;
  if ((a.unit || "") !== (b.unit || "")) return false;

  const pa = Number(a.packSize ?? 0), pb = Number(b.packSize ?? 0);
  if (!(pa > 0 && pb > 0)) return true; // si no hay dato, no bloquear
  const low = pa * (1 - packTolerance);
  const high = pa * (1 + packTolerance);
  return pb >= low && pb <= high;
}


export function recommendAlternatives({
  desiredIds = [],
  weights,
  products = [],
  kPerItem = 3,
  cheaperOrGreenerOnly = true,
}) {
  const byId = Object.fromEntries(products.map(p => [p.id, p]));
  const chosen = desiredIds.map(id => byId[id]).filter(Boolean);

  const normsByCat = buildCategoryNormalizers(products);
  const results = {};

  for (const target of chosen) {
    const catNorms = normsByCat[target.category || "_"];
    const targetScore = sustainabilityScore(target, weights, catNorms);

    const candidates = products
      .filter(p => p.id !== target.id && !desiredIds.includes(p.id))
      .filter(p => isSimilar(target, p))
      .map(p => {
        const s = sustainabilityScore(p, weights, normsByCat[p.category || "_"]);
        return { ...p, _score: s.score, _ratio: s.ratio };
      });

    const filtered = cheaperOrGreenerOnly
      ? candidates.filter(p =>
          (p.price ?? Infinity) <= (target.price ?? Infinity) ||
          (p.co2_kg ?? Infinity) <= (target.co2_kg ?? Infinity) ||
          p._ratio < targetScore.ratio
        )
      : candidates;

    filtered.sort((a, b) => a._ratio - b._ratio);

    results[target.id] = filtered.slice(0, kPerItem).map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      co2_kg: p.co2_kg,
      health_score: p.health_score,
      social_score: p.social_score,
      sustainability_score: Number(p._score.toFixed(4)),
      ratio: Number(p._ratio.toFixed(8)),
    }));
  }

  return { byProduct: results };
}
