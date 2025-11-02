import express from "express";
import cors from "cors";
import { Pool } from "pg";

// === RUTAS DEL CARRO ===
import { recommendForProduct } from "./recommend.js"; // este sí lo usas más abajo
import { buildCategoryNormalizers, sustainabilityScore } from "./sustainability.js";


const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 10
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/products?page=1&pageSize=12&q=texto
 * Devuelve { items, total, page, pageSize }
 */

/**
 * GET /api/products/by-ids?ids=p1,p2,p3
 */
app.get("/api/products/by-ids", async (req, res) => {
  const ids = (req.query.ids || "").toString().split(",").map(s => s.trim()).filter(Boolean);
  if (!ids.length) return res.json([]);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const sql = `
    SELECT id, barcode, name, brand, category, unit, pack_size AS "packSize",
           price, co2_kg AS "co2_kg", health_score AS "health_score", social_score AS "social_score"
    FROM products
    WHERE id IN (${placeholders})
  `;
  try {
    const { rows } = await pool.query(sql, ids);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// backend/src/index.js (dentro del mismo archivo)
app.get("/api/products", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "12", 10), 1), 50);

  const q = (req.query.q || "").toString().trim();
  const category = (req.query.category || "").toString().trim();

  const where = [];
  const params = [];
  // texto (name/brand/category LIKE/FTS)
  if (q) {
    params.push(q, q, q);
    where.push(
      "(to_tsvector('spanish', name) @@ plainto_tsquery('spanish', $1) OR " +
      " to_tsvector('spanish', brand) @@ plainto_tsquery('spanish', $2) OR " +
      " category ILIKE '%' || $3 || '%')"
    );
  }
  // categoría exacta
  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalSql = `SELECT COUNT(*)::int AS total FROM products ${whereSQL}`;
  const offset = (page - 1) * pageSize;

  try {
    const totalRow = await pool.query(totalSql, params);
    const total = totalRow.rows[0]?.total || 0;

    const itemsSql = `
      SELECT id, barcode, name, brand, category, unit, pack_size AS "packSize",
             price, co2_kg AS "co2_kg", health_score AS "health_score", social_score AS "social_score"
      FROM products
      ${whereSQL}
      ORDER BY name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const items = (await pool.query(itemsSql, [...params, pageSize, offset])).rows;

    res.json({ items, total, page, pageSize });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// backend/src/index.js (agrega esto)
app.get("/api/categories", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM products
      WHERE category IS NOT NULL AND category <> ''
      GROUP BY category
      ORDER BY category ASC
    `);
    res.json(rows); // [{category, count}]
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Detalle de producto
app.get("/api/products/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, barcode, name, brand, category, unit,
             pack_size AS "packSize", price, co2_kg, health_score, social_score, description
      FROM products
      WHERE id = $1
      LIMIT 1
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get("/api/products/:id/recommendations", async (req, res) => {
  const w = {
    price:  Number(req.query.w_price ?? 0.4),
    co2:    Number(req.query.w_co2 ?? 0.3),
    health: Number(req.query.w_health ?? 0.2),
    social: Number(req.query.w_social ?? 0.1),
  };
  const sum = (w.price+w.co2+w.health+w.social) || 1;
  const weights = {
    price:  w.price/sum, co2: w.co2/sum, health: w.health/sum, social: w.social/sum
  };

  try {
    // producto base
    const { rows: baseRows } = await pool.query(`
      SELECT id, barcode, name, brand, category, unit,
             pack_size AS "packSize", price, co2_kg, health_score, social_score
      FROM products
      WHERE id = $1
      LIMIT 1
    `, [req.params.id]);
    if (!baseRows.length) return res.status(404).json({ error: "Producto no encontrado" });
    const target = baseRows[0];

    // candidatos similares (misma categoría/unidad, ±30% packSize)
    c// candidatos similares (estricto)
const { rows: candsStrict } = await pool.query(`
  SELECT id, barcode, name, brand, category, unit,
         pack_size AS "packSize", price, co2_kg, health_score, social_score
  FROM products
  WHERE id <> $1
    AND LOWER(TRIM(category)) = LOWER(TRIM($2))
    AND LOWER(TRIM(unit)) = LOWER(TRIM($3))
    AND (
      (pack_size IS NULL OR $4::numeric IS NULL) OR
      (pack_size BETWEEN $4 * 0.7 AND $4 * 1.3)
    )
  LIMIT 200
`, [target.id, target.category, target.unit, target.packSize ?? null]);

let cands = candsStrict;

// Fallback #1: misma categoría, ignorar unit, tolerancia 50%
if (cands.length === 0) {
  const { rows } = await pool.query(`
    SELECT id, barcode, name, brand, category, unit,
           pack_size AS "packSize", price, co2_kg, health_score, social_score
    FROM products
    WHERE id <> $1
      AND LOWER(TRIM(category)) = LOWER(TRIM($2))
      AND (
        (pack_size IS NULL OR $3::numeric IS NULL) OR
        (pack_size BETWEEN $3 * 0.5 AND $3 * 1.5)
      )
    LIMIT 200
  `, [target.id, target.category, target.packSize ?? null]);
  cands = rows;
}

// Fallback #2: solo categoría (sin pack ni unit)
if (cands.length === 0) {
  const { rows } = await pool.query(`
    SELECT id, barcode, name, brand, category, unit,
           pack_size AS "packSize", price, co2_kg, health_score, social_score
    FROM products
    WHERE id <> $1
      AND LOWER(TRIM(category)) = LOWER(TRIM($2))
    LIMIT 200
  `, [target.id, target.category]);
  cands = rows;
}

const suggestions = recommendForProduct({
  target, candidates: cands, weights, k: 6,
});

res.json({ targetId: target.id, suggestions });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});





// === LOOKUP de productos del carrito ===
// body: { items: [{ id, qty }] }
app.post("/api/cart/lookup", async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.json({ items: [], total: { price: 0, co2: 0 } });

    const ids = items.map(it => it.id);
    const { rows } = await pool.query(`
      SELECT id, barcode, name, brand, category, unit,
             pack_size AS "packSize", price, co2_kg, health_score, social_score
      FROM products
      WHERE id = ANY($1::text[])
    `, [ids]);

    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    const enriched = items.map(it => ({
      ...byId[it.id],
      qty: Number(it.qty || 1),
      subtotal: (byId[it.id]?.price || 0) * Number(it.qty || 1),
      co2_total: Number(byId[it.id]?.co2_kg || 0) * Number(it.qty || 1)
    })).filter(Boolean);

    const total = enriched.reduce((acc, p) => {
      acc.price += p.subtotal;
      acc.co2 += p.co2_total;
      acc.health += (p.health_score || 0) * p.qty;
      acc.social += (p.social_score || 0) * p.qty;
      return acc;
    }, { price: 0, co2: 0, health: 0, social: 0 });

    res.json({ items: enriched, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === SUGERENCIAS para el carrito ===
// body: { items:[{id, qty}], mode: "ambiente"|"ahorro" }
app.post("/api/cart/suggest", async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const mode = (req.body?.mode || "ambiente").toLowerCase();

    if (!items.length) {
      return res.json({
        suggestions: {},
        currentTotals: { price: 0, co2: 0, health: 0, social: 0 },
        suggestedTotals: { price: 0, co2: 0, health: 0, social: 0 }
      });
    }

    // Presets de pesos
    const presets = {
      ahorro:   { price: 0.7, co2: 0.15, health: 0.1, social: 0.05 },
      ambiente: { price: 0.2, co2:  0.6, health: 0.15, social: 0.05 },
    };
    const w0 = presets[mode] || presets.ambiente;
    const wsum = w0.price + w0.co2 + w0.health + w0.social || 1;
    const weights = {
      price:  w0.price  / wsum,
      co2:    w0.co2    / wsum,
      health: w0.health / wsum,
      social: w0.social / wsum,
    };

    // Traemos todos los productos necesarios de una
    const ids = items.map(x => x.id);
    const { rows: baseRows } = await pool.query(`
      SELECT id, barcode, name, brand, category, unit,
             pack_size AS "packSize", price, co2_kg, health_score, social_score
      FROM products
      WHERE id = ANY($1::text[])
    `, [ids]);
    const baseById = Object.fromEntries(baseRows.map(r => [r.id, r]));

    // Totales actuales
    const currentTotals = items.reduce((acc, it) => {
      const p = baseById[it.id];
      const q = Number(it.qty || 1);
      acc.price  += (p?.price || 0) * q;
      acc.co2    += Number(p?.co2_kg || 0) * q;
      acc.health += Number(p?.health_score || 0) * q;
      acc.social += Number(p?.social_score || 0) * q;
      return acc;
    }, { price: 0, co2: 0, health: 0, social: 0 });

    // Por cada producto del carrito, buscamos "similares"
    const suggestions = {};
    const chosenForAlt = []; // para recomputar totales sugeridos

    for (const it of items) {
      const target = baseById[it.id];
      if (!target) continue;

      // Similares por categoría/unidad y tamaño ±30%
      // Similares (estricto)
const { rows: candsStrict } = await pool.query(`
  SELECT id, barcode, name, brand, category, unit,
         pack_size AS "packSize", price, co2_kg, health_score, social_score
  FROM products
  WHERE id <> $1
    AND LOWER(TRIM(category)) = LOWER(TRIM($2))
    AND LOWER(TRIM(unit)) = LOWER(TRIM($3))
    AND (
      (pack_size IS NULL OR $4::numeric IS NULL) OR
      (pack_size BETWEEN $4 * 0.7 AND $4 * 1.3)
    )
  LIMIT 200
`, [target.id, target.category, target.unit, target.packSize ?? null]);

let cands = candsStrict;

// Fallback #1: misma categoría, ignorar unit, tolerancia 50%
if (cands.length === 0) {
  const { rows } = await pool.query(`
    SELECT id, barcode, name, brand, category, unit,
           pack_size AS "packSize", price, co2_kg, health_score, social_score
    FROM products
    WHERE id <> $1
      AND LOWER(TRIM(category)) = LOWER(TRIM($2))
      AND (
        (pack_size IS NULL OR $3::numeric IS NULL) OR
        (pack_size BETWEEN $3 * 0.5 AND $3 * 1.5)
      )
    LIMIT 200
  `, [target.id, target.category, target.packSize ?? null]);
  cands = rows;
}

// Fallback #2: solo categoría
if (cands.length === 0) {
  const { rows } = await pool.query(`
    SELECT id, barcode, name, brand, category, unit,
           pack_size AS "packSize", price, co2_kg, health_score, social_score
    FROM products
    WHERE id <> $1
      AND LOWER(TRIM(category)) = LOWER(TRIM($2))
    LIMIT 200
  `, [target.id, target.category]);
  cands = rows;
}

// Scoring y filtro (usa recommendForProduct)
const alts = recommendForProduct({
  target,
  candidates: cands,
  weights,
  k: 3,
});

suggestions[it.id] = alts;

      // Para totales sugeridos: si hay alternativa, tomamos la mejor; si no, el original
      const pick = alts[0] || target;
      chosenForAlt.push({ pick, qty: Number(it.qty || 1) });
    }

    // Totales "sugeridos"
    const suggestedTotals = chosenForAlt.reduce((acc, obj) => {
      const p = obj.pick;
      const q = obj.qty;
      acc.price  += (p?.price || 0) * q;
      acc.co2    += Number(p?.co2_kg || 0) * q;
      acc.health += Number(p?.health_score || 0) * q;
      acc.social += Number(p?.social_score || 0) * q;
      return acc;
    }, { price: 0, co2: 0, health: 0, social: 0 });

    res.json({ suggestions, currentTotals, suggestedTotals, weights, mode });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/cart/optimize
// body: { items:[{id, qty}], budget:number, mode?: "ambiente"|"ahorro"|"balanceado" }
// POST /api/cart/optimize
// body: { items:[{id, qty}], budget:number, mode?: "ambiente"|"ahorro"|"balanceado" }
app.post("/api/cart/optimize", async (req, res) => {
  try {
    const { items = [], budget, mode = "balanceado" } = req.body || {};
    if (!Array.isArray(items) || typeof budget !== "number" || budget <= 0) {
      return res.status(400).json({ error: "Payload inválido. Esperado { items:[{id,qty}], budget:number>0 }" });
    }

    // 1) Materializar productos del carrito
    const ids = items.map(i => i.id);
    if (!ids.length) {
      return res.json({
        optimizedItems: [],
        totals: { price: 0, co2: 0, health: 0, social: 0 },
        mode, budget
      });
    }

    const inParams = ids.map((_, i) => `$${i + 1}`).join(",");
    const { rows: baseProds } = await pool.query(
      `SELECT id, barcode, name, brand, category, unit, pack_size AS "packSize",
              price, co2_kg, health_score, social_score
         FROM products
        WHERE id IN (${inParams})`, ids
    );
    const byId = Object.fromEntries(baseProds.map(p => [p.id, p]));

    // 2) Pool de candidatos: originales + alternativas similares
    const { rows: allProds } = await pool.query(
      `SELECT id, barcode, name, brand, category, unit, pack_size AS "packSize",
              price, co2_kg, health_score, social_score
         FROM products`
    );
    const normsByCat = buildCategoryNormalizers(allProds);

    // pesos según modo
    const presets = {
      ahorro:     { price: 0.7, co2: 0.1, health: 0.1, social: 0.1 },
      ambiente:   { price: 0.2, co2: 0.5, health: 0.2, social: 0.1 },
      balanceado: { price: 0.4, co2: 0.3, health: 0.2, social: 0.1 },
    };
    const W = presets[mode] || presets.balanceado;
    const wsum = W.price + W.co2 + W.health + W.social;
    const weights = { price: W.price/wsum, co2: W.co2/wsum, health: W.health/wsum, social: W.social/wsum };

    // similitud
    const isSimilar = (a, b, tol = 0.3) => {
      if ((a.category||"") !== (b.category||"")) return false;
      if ((a.unit||"") !== (b.unit||"")) return false;
      const pa = Number(a.packSize||0), pb = Number(b.packSize||0);
      if (!(pa>0 && pb>0)) return true;
      return pb >= pa*(1-tol) && pb <= pa*(1+tol);
    };

    // 2b) construir pool
    const K = 4;
    const poolCands = [];
    for (const { id, qty } of items) {
      const original = byId[id];
      if (!original || qty <= 0) continue;

      const candidates = allProds
        .filter(p => p.id !== id && isSimilar(original, p))
        .map(p => {
          const s = sustainabilityScore(p, weights, normsByCat[p.category||"_"]);
          return { ...p, _score: s.score, _ratio: s.ratio };
        })
        .sort((a,b) => a._ratio - b._ratio)
        .slice(0, K);

      const s0 = sustainabilityScore(original, weights, normsByCat[original.category||"_"]);
      const withOriginal = [{ ...original, _score: s0.score, _ratio: s0.ratio }, ...candidates];

      for (let i = 0; i < qty; i++) poolCands.push(...withOriginal);
    }

    if (poolCands.length === 0) {
      return res.json({
        optimizedItems: [],
        totals: { price: 0, co2: 0, health: 0, social: 0 },
        mode, budget
      });
    }

    // 3) Greedy global por ratio
    poolCands.sort((a,b) => a._ratio - b._ratio);

    const chosen = [];
    let spent = 0;
    for (const cand of poolCands) {
      const price = Number(cand.price||0);
      if (price <= 0) continue;
      if (spent + price > budget) continue;
      chosen.push(cand);
      spent += price;
    }

    // 4) Consolidar por producto
    const map = new Map();
    for (const c of chosen) {
      const cur = map.get(c.id) || { ...c, qty: 0 };
      cur.qty += 1;
      map.set(c.id, cur);
    }
    const optimizedItems = Array.from(map.values()).map(p => ({
      id: p.id, name: p.name, brand: p.brand, category: p.category,
      unit: p.unit, packSize: p.packSize, price: p.price,
      co2_kg: p.co2_kg, health_score: p.health_score, social_score: p.social_score,
      qty: p.qty
    }));

    const totals = optimizedItems.reduce((acc, p) => {
      acc.price  += (p.price||0) * p.qty;
      acc.co2    += (p.co2_kg||0) * p.qty;
      acc.health += (p.health_score||0) * p.qty;
      acc.social += (p.social_score||0) * p.qty;
      return acc;
    }, { price:0, co2:0, health:0, social:0 });

    res.json({ optimizedItems, totals, mode, budget });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo optimizar el carrito" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API http://0.0.0.0:${PORT}`));
