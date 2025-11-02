// Normalización min/max segura
function minmax(vals) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = (max - min) || 1;
  return { min, max, range };
}

// Construye normalizadores por categoría para comparar intra-familia
export function buildCategoryNormalizers(products) {
  const byCat = {};
  for (const p of products) {
    const c = p.category || "_";
    byCat[c] ||= { price: [], co2: [], health: [], social: [] };
    byCat[c].price.push(p.price ?? 0);
    byCat[c].co2.push(p.co2_kg ?? 0);
    byCat[c].health.push(p.health_score ?? 0);
    byCat[c].social.push(p.social_score ?? 0);
  }
  const norms = {};
  for (const c of Object.keys(byCat)) {
    const b = byCat[c];
    norms[c] = {
      price:  minmax(b.price),
      co2:    minmax(b.co2),
      health: minmax(b.health),
      social: minmax(b.social),
    };
  }
  return norms;
}

// Calcula score compuesto y ratio (score por peso $)
export function sustainabilityScore(p, weights, normsForCat) {
  const N = normsForCat || {
    price: {min:0,range:1},
    co2:   {min:0,range:1},
    health:{min:0,range:1},
    social:{min:0,range:1},
  };

  const pN = ((p.price ?? 0)      - N.price.min) / N.price.range;            // minimizar
  const cN = ((p.co2_kg ?? 0)     - N.co2.min)   / N.co2.range;              // minimizar
  const hN = 1 - (((p.health_score ?? 0) - N.health.min) / N.health.range);  // maximizar
  const sN = 1 - (((p.social_score ?? 0) - N.social.min) / N.social.range);  // maximizar

  const score = (weights.price  * pN) +
                (weights.co2    * cN) +
                (weights.health * hN) +
                (weights.social * sN);

  const ratio = score / Math.max(p.price ?? 1, 1);
  return { score, ratio };
}
