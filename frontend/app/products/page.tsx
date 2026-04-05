'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/navbar';
import { api } from '@/lib/api';
import { getAuth } from '@/lib/auth';
import { Plus, Search, Edit2, X, Loader2, Camera, XCircle, Trash2, Package, Sparkles } from 'lucide-react';

interface Product {
  id: number; name: string; lab: string; presentation: string;
  visual_description: string; purchase_price: number; sale_price: number;
  current_stock: number; min_stock: number; active: boolean;
}

const emptyForm = {
  name: '', lab: '', presentation: '', visual_description: '',
  purchase_price: 0, sale_price: 0, current_stock: 0, min_stock: 1
};

type PhotoStep = 'idle' | 'extracting' | 'done' | 'error';

export default function ProductsPage() {
  const router = useRouter();
  const filePhotoRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoStep, setPhotoStep] = useState<PhotoStep>('idle');
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoConfidence, setPhotoConfidence] = useState<number | null>(null);
  const auth = getAuth();

  const loadProducts = async () => {
    try { const d = await api.getProducts(); setProducts(d); }
    catch { router.push('/login'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!getAuth()) { router.push('/login'); return; }
    loadProducts();
  }, [router]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.lab.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditProduct(null); setForm(emptyForm); setError('');
    setPhotoStep('idle'); setPhotoPreviews([]); setPhotoFiles([]); setPhotoConfidence(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, lab: p.lab, presentation: p.presentation,
      visual_description: p.visual_description, purchase_price: p.purchase_price,
      sale_price: p.sale_price, current_stock: p.current_stock, min_stock: p.min_stock,
    });
    setError(''); setPhotoStep('idle'); setPhotoPreviews([]); setPhotoFiles([]);
    setShowForm(true);
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    try { await api.deleteProduct(p.id); await loadProducts(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    // Combinar fotos nuevas con las existentes, máximo 5
    const combined = [...photoFiles, ...selected].slice(0, 5);
    setPhotoFiles(combined);
    setPhotoPreviews(combined.map(f => URL.createObjectURL(f)));
    setPhotoStep('idle');
    e.target.value = '';
  };

  const removePhoto = (i: number) => {
    const f = photoFiles.filter((_, idx) => idx !== i);
    setPhotoFiles(f); setPhotoPreviews(f.map(fi => URL.createObjectURL(fi)));
    if (f.length === 0) setPhotoStep('idle');
  };

  // Enviar todas las fotos a la IA para autocompletar el formulario
  const handleAnalyzePhotos = async () => {
    if (!photoFiles.length) return;
    setPhotoStep('extracting'); setError('');
    try {
      const fd = new FormData();
      photoFiles.forEach(f => fd.append('files', f));
      const result = await api.extractProductFromPhoto(fd);
      setForm(f => ({
        ...f,
        name: result.name || f.name,
        lab: result.lab || f.lab,
        presentation: result.presentation || f.presentation,
        visual_description: result.visual_description || f.visual_description,
      }));
      setPhotoConfidence(result.confidence ?? null);
      setPhotoStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al analizar'); setPhotoStep('error');
    }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (editProduct) await api.updateProduct(editProduct.id, form);
      else await api.createProduct(form);
      await loadProducts(); setShowForm(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const formFields = [
    { key: 'name', label: 'Nombre', type: 'text' },
    { key: 'lab', label: 'Laboratorio', type: 'text' },
    { key: 'presentation', label: 'Presentación', type: 'text' },
    { key: 'visual_description', label: 'Descripción visual (para AI)', type: 'textarea' },
    { key: 'purchase_price', label: 'Precio compra (MXN)', type: 'number' },
    { key: 'sale_price', label: 'Precio venta (MXN)', type: 'number' },
    { key: 'current_stock', label: 'Stock actual', type: 'number' },
    { key: 'min_stock', label: 'Stock mínimo', type: 'number' },
  ];

  return (
    <div className="min-h-screen md:ml-60 pb-24 md:pb-8">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 md:px-8 pt-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Productos</h1>
            <p className="text-slate-500 text-sm mt-0.5">{products.length} productos activos</p>
          </div>
          {auth?.role === 'admin' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={openCreate}
              className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
              <Plus size={16} /> Nuevo
            </motion.button>
          )}
        </div>

        {/* Buscador */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre o laboratorio..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-11 text-sm" />
        </div>

        {/* Lista de productos */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-slate-50" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card p-4 hover:shadow-card-hover transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-start flex-1 min-w-0">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                        <Package size={18} className="text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{p.lab} · {p.presentation}</p>
                        <div className="flex gap-4 mt-1.5">
                          <span className="text-xs text-slate-500">Compra: <span className="font-semibold text-slate-700">${p.purchase_price.toFixed(0)}</span></span>
                          <span className="text-xs text-slate-500">Venta: <span className="font-semibold text-slate-700">${p.sale_price.toFixed(0)}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                        p.current_stock === 0 ? 'bg-red-50 text-red-600' :
                        p.current_stock <= p.min_stock ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {p.current_stock}
                      </div>
                      {auth?.role === 'admin' && (
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(p)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Package size={32} className="mx-auto mb-3 opacity-30" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal del formulario */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center p-0 md:p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto">
              {/* Encabezado del modal */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex justify-between items-center rounded-t-3xl md:rounded-t-2xl">
                <h2 className="text-lg font-bold text-slate-900">{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Sección de fotos (solo para nuevo producto) */}
                {!editProduct && (
                  <div className="mb-5">
                    <input ref={filePhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                    {photoPreviews.length === 0 ? (
                      <button onClick={() => filePhotoRef.current?.click()}
                        className="w-full flex items-center gap-3 border-2 border-dashed border-slate-200 bg-slate-50 text-slate-600 py-4 px-5 rounded-2xl font-medium hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <Camera size={18} className="text-indigo-500" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm text-slate-700">Agregar fotos</p>
                          <p className="text-xs text-slate-400">La AI auto-completará el formulario</p>
                        </div>
                      </button>
                    ) : (
                      <div>
                        {/* Miniaturas de fotos seleccionadas */}
                        <div className="flex gap-2 flex-wrap mb-3">
                          {photoPreviews.map((src, i) => (
                            <div key={i} className="relative">
                              <img src={src} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                              <button onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow-sm text-red-500 hover:text-red-600">
                                <XCircle size={18} />
                              </button>
                            </div>
                          ))}
                          {photoPreviews.length < 5 && photoStep !== 'extracting' && (
                            <button onClick={() => filePhotoRef.current?.click()}
                              className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                              <Plus size={20} />
                            </button>
                          )}
                        </div>

                        {photoStep === 'idle' && (
                          <button onClick={handleAnalyzePhotos}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm">
                            <Sparkles size={16} /> Analizar {photoPreviews.length} foto{photoPreviews.length > 1 ? 's' : ''} con AI
                          </button>
                        )}
                        {photoStep === 'extracting' && (
                          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                            <Loader2 size={18} className="animate-spin text-indigo-500 flex-shrink-0" />
                            <p className="text-sm font-medium text-indigo-700">Analizando con AI...</p>
                          </div>
                        )}
                        {photoStep === 'done' && (
                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                            <p className="text-xs font-medium text-emerald-700">
                              Formulario completado · {photoConfidence ? Math.round(photoConfidence * 100) : '—'}% confianza
                            </p>
                            <button onClick={() => setPhotoStep('idle')} className="text-xs text-indigo-500 hover:text-indigo-700 underline">Re-analizar</button>
                          </div>
                        )}
                        {photoStep === 'error' && (
                          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                            <p className="text-xs text-red-600">Error — completa manualmente</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Campos del formulario */}
                <div className="flex flex-col gap-4">
                  {formFields.map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{label}</label>
                      {type === 'textarea' ? (
                        <textarea value={(form as Record<string, unknown>)[key] as string}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          className="input-field h-20 resize-none text-sm" />
                      ) : (
                        <input type={type} value={(form as Record<string, unknown>)[key] as string | number}
                          onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                          className="input-field text-sm" />
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-red-500 text-sm mt-4 p-3 bg-red-50 rounded-xl">{error}
                  </motion.p>
                )}

                <button onClick={handleSave} disabled={saving || photoStep === 'extracting'}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base mt-5">
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> : 'Guardar Producto'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
