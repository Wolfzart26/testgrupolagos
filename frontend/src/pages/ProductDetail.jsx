import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { addToCart, getProduct, getRecommendations } from "../api.js";

function Toast({ open, kind="success", message="", onClose }) {
  if (!open) return null;
  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg text-white
      ${kind==="success"?"bg-emerald-600":"bg-rose-600"}`}>
      <div className="flex items-center gap-3">
        <span className="font-semibold">{kind==="success"?"✅":"⚠️"}</span>
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="ml-2 font-bold">×</button>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({open:false, kind:"success", message:""});

  const show = (kind, msg) => {
    setToast({open:true, kind, message:msg});
    setTimeout(()=>setToast(t=>({...t, open:false})), 2500);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const prod = await getProduct(id);
        if (!mounted) return;
        setP(prod);

        // usa pesos por defecto o guárdalos en un estado global si tienes
        const { suggestions } = await getRecommendations(id);
        if (!mounted) return;
        setRecs(suggestions || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const add = () => {
    const qn = parseInt(qty, 10);
    if (!Number.isFinite(qn) || qn < 1) {
      show("error", "No se pudo agregar al carro todavía.");
      return;
    }
    addToCart(id, qn);
    show("success", `${p?.name || "Producto"} agregado al carro de compras.`);
  };

  const priceFmt = useMemo(() => (v)=>`$${v}`, []);

  if (loading) return <div className="p-4">Cargando…</div>;
  if (!p) return <div className="p-4">Producto no encontrado</div>;

  return (
    <div className="w-full">
      <div className="mb-3">
        <Link to="/productos" className="text-sm text-primary hover:underline">← Volver a productos</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Izquierda: datos */}
        <div className="card">
          <h1 className="text-2xl font-bold mb-2">{p.name}</h1>
          <div className="text-sm text-gray-600 mb-3">{p.brand} · {p.category} · {p.unit}{p.packSize?` ${p.packSize}`:""}</div>
          {p.description && <p className="text-gray-700 mb-3">{p.description}</p>}

          <div className="text-lg font-bold text-primary mb-3">{priceFmt(p.price)}</div>
          <div className="text-sm text-gray-500 mb-4">
            CO₂: {p.co2_kg ?? "-"} kg · Salud: {p.health_score ?? "-"} · Social: {p.social_score ?? "-"}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number" min="1" step="1"
              value={qty}
              onChange={e=>setQty(Math.max(1, parseInt(e.target.value||"1",10)))}
              className="w-20 border border-gray-300 rounded-md px-2 py-1 text-center"
            />
            <button onClick={add} className="bg-primary hover:bg-cyan-500 text-white font-semibold rounded-md px-4 py-2">
              Agregar al carro
            </button>
          </div>
        </div>

        {/* Derecha: sugerencias */}
        <div className="card">
          <h2 className="text-xl font-bold mb-3">Sugerencias sostenibles</h2>
          {!recs.length && <div className="text-sm text-gray-500">No hay alternativas más sostenibles para este producto.</div>}
          <div className="grid gap-3">
            {recs.map(r => (
              <Link key={r.id} to={`/producto/${r.id}`} className="block border border-gray-200 rounded-lg p-3 hover:shadow-sm transition">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.brand} · {r.category}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      CO₂: {r.co2_kg ?? "-"} kg · Salud: {r.health_score ?? "-"} · Social: {r.social_score ?? "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{priceFmt(r.price)}</div>
                    <div className="text-[11px] text-gray-500">Score: {r.sustainability_score}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Toast open={toast.open} kind={toast.kind} message={toast.message} onClose={()=>setToast(t=>({...t,open:false}))}/>
    </div>
  );
}
