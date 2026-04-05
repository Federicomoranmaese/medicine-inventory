'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/navbar';
import { api } from '@/lib/api';
import { getAuth } from '@/lib/auth';
import { Plus, Check, Clock, Loader2, X, ArrowLeftRight, ShoppingCart, TrendingUp, SlidersHorizontal } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  current_stock: number;
}

interface Movement {
  id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  note: string | null;
  approved: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  scan_update: 'Scan',
};

// Icono y color según el tipo de movimiento
const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; iconColor: string }> = {
  sale: { icon: ShoppingCart, bg: 'bg-blue-50', iconColor: 'text-blue-500' },
  purchase: { icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  adjustment: { icon: SlidersHorizontal, bg: 'bg-violet-50', iconColor: 'text-violet-500' },
  scan_update: { icon: ArrowLeftRight, bg: 'bg-slate-100', iconColor: 'text-slate-400' },
};

// Variante de animación para cada fila de movimiento
const rowVariant = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function MovementsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product_id: 0,
    movement_type: 'sale',
    quantity: 1,
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const auth = getAuth();

  const load = async () => {
    try {
      const [prods, movs] = await Promise.all([api.getProducts(), api.getMovements()]);
      setProducts(prods);
      setMovements(movs);
      // Preseleccionar el primer producto al abrir el formulario
      if (prods.length > 0 && form.product_id === 0) {
        setForm(f => ({ ...f, product_id: prods[0].id }));
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAuth()) { router.push('/login'); return; }
    load();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Las ventas se registran con cantidad negativa
      const qty = form.movement_type === 'sale' ? -Math.abs(form.quantity) : Math.abs(form.quantity);
      await api.createMovement({ ...form, quantity: qty });
      await load();
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.approveMovement(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al aprobar');
    }
  };

  return (
    <div className="min-h-screen md:ml-60 pb-24 md:pb-8">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 md:px-8 pt-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Movimientos</h1>
            <p className="text-slate-500 text-sm mt-0.5">{movements.length} registros</p>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
            <Plus size={16} /> Nuevo
          </motion.button>
        </div>

        {/* Lista de movimientos */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="card p-4 h-16 animate-pulse bg-slate-50" />
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            {movements.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <ArrowLeftRight size={32} className="mb-3 opacity-30" />
                <p>No hay movimientos registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {movements.map((m, i) => {
                  const product = products.find(p => p.id === m.product_id);
                  const cfg = TYPE_CONFIG[m.movement_type] || TYPE_CONFIG.adjustment;
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={m.id} custom={i} variants={rowVariant} initial="hidden" animate="show"
                      className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Icono de tipo */}
                        <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon size={16} className={cfg.iconColor} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-900">
                              {product?.name || `Producto #${m.product_id}`}
                            </p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              m.approved
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}>
                              {m.approved ? 'Aprobado' : 'Pendiente'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {TYPE_LABELS[m.movement_type] || m.movement_type}
                            </span>
                            {m.note && (
                              <span className="text-xs text-slate-400">· {m.note}</span>
                            )}
                            <span className="text-xs text-slate-300">
                              {new Date(m.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Cantidad + botón de aprobar */}
                      <div className="flex items-center gap-3 ml-3">
                        <span className={`text-base font-bold ${m.quantity >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {m.quantity >= 0 ? '+' : ''}{m.quantity}
                        </span>
                        {!m.approved && auth?.role === 'admin' && (
                          <motion.button whileTap={{ scale: 0.95 }}
                            onClick={() => handleApprove(m.id)}
                            className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                            <Check size={12} /> Aprobar
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal para nuevo movimiento */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center p-0 md:p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md">
              {/* Encabezado del modal */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Nuevo Movimiento</h2>
                <button onClick={() => { setShowForm(false); setError(''); }}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5">
                {/* Selector de producto */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Producto</label>
                  <select value={form.product_id}
                    onChange={e => setForm(f => ({ ...f, product_id: parseInt(e.target.value) }))}
                    className="input-field text-sm">
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (stock: {p.current_stock})</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de movimiento */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Tipo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['sale', 'purchase', 'adjustment'].map(t => (
                      <motion.button key={t} whileTap={{ scale: 0.96 }}
                        onClick={() => setForm(f => ({ ...f, movement_type: t }))}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          form.movement_type === t
                            ? 'gradient-primary text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {TYPE_LABELS[t]}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Cantidad</label>
                  <input type="number" min={1} value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                    className="input-field text-sm" />
                </div>

                {/* Nota */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Nota (opcional)</label>
                  <input type="text" value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Ej: Venta a paciente..."
                    className="input-field text-sm" />
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}
                  </motion.p>
                )}

                {/* Acciones */}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setShowForm(false); setError(''); }}
                    className="btn-secondary flex-1 text-center py-3">
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
