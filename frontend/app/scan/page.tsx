'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/navbar';
import { api } from '@/lib/api';
import { getAuth } from '@/lib/auth';
import {
  Camera, Upload, CheckCircle, AlertCircle, Loader2,
  Check, EyeOff, ShoppingCart, Sparkles, ArrowRight
} from 'lucide-react';

interface ScanDetail {
  id: number;
  product_id: number | null;
  ai_detected_name: string;
  ai_count: number;
  ai_confidence: number;
  final_count: number;
  previous_stock: number;
  difference: number;
  user_corrected: boolean;
}

interface ScanResult {
  id: number;
  photo_filename: string;
  status: string;
  details: ScanDetail[];
}

type Step = 'select' | 'preview' | 'analyzing' | 'results' | 'confirmed' | 'error';

// Pasos visibles en la barra de progreso
const STEPS = ['Foto', 'Vista previa', 'Análisis', 'Resultados', 'Listo'];
const stepIndex: Record<Step, number> = {
  select: 0, preview: 1, analyzing: 2, results: 3, confirmed: 4, error: 2
};

// Badge de confianza de la IA
function ConfidenceBadge({ conf }: { conf: number }) {
  if (conf >= 0.8) return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Alta confianza</span>;
  if (conf >= 0.5) return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Confianza media</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Baja confianza</span>;
}

// Variantes de transición entre pasos
const pageVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('select');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  // Decisiones del usuario para productos no detectados por la IA
  const [missingDecisions, setMissingDecisions] = useState<Record<number, 'unseen' | 'sold'>>({});
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!getAuth()) router.push('/login');
  }, [router]);

  // Detecta productos no vistos en la foto (confianza=0 y count=0 pero existe en inventario)
  const isMissing = (d: ScanDetail) => d.product_id !== null && d.ai_confidence === 0 && d.ai_count === 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setStep('preview');
    setError('');
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setStep('analyzing');
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      const result = await api.createScan(formData);
      setScan(result);
      // Inicializar conteos con los valores sugeridos por la IA
      const initial: Record<number, number> = {};
      result.details.forEach((d: ScanDetail) => { initial[d.id] = d.final_count; });
      setCounts(initial);
      setStep('results');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al analizar la imagen');
      setStep('error');
    }
  };

  const handleCountChange = async (detail: ScanDetail, newCount: number) => {
    if (!scan) return;
    setCounts(c => ({ ...c, [detail.id]: newCount }));
    try { await api.updateScanDetail(scan.id, detail.id, newCount); } catch {}
  };

  const handleMissingDecision = async (detail: ScanDetail, decision: 'unseen' | 'sold') => {
    setMissingDecisions(m => ({ ...m, [detail.id]: decision }));
    // unseen = mantener stock; sold = poner en 0
    const newCount = decision === 'sold' ? 0 : detail.previous_stock;
    setCounts(c => ({ ...c, [detail.id]: newCount }));
    try { await api.updateScanDetail(scan!.id, detail.id, newCount); } catch {}
  };

  const handleConfirm = async () => {
    if (!scan) return;
    setConfirming(true);
    try {
      await api.confirmScan(scan.id);
      setStep('confirmed');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al confirmar');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setStep('select'); setImageUrl(null); setImageFile(null);
    setScan(null); setCounts({}); setMissingDecisions({}); setError('');
  };

  const currentStepIndex = stepIndex[step];

  return (
    <div className="min-h-screen md:ml-60 pb-24 md:pb-8">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 md:px-6 pt-6">
        {/* Encabezado + barra de progreso */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Escanear Inventario</h1>
          {step !== 'confirmed' && (
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300 ${
                    i < currentStepIndex ? 'bg-indigo-600 text-white' :
                    i === currentStepIndex ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {i < currentStepIndex ? <Check size={12} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    i === currentStepIndex ? 'text-indigo-600' : 'text-slate-400'
                  }`}>{s}</span>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 w-6 transition-colors duration-300 ${i < currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Paso 1: Seleccionar imagen */}
          {step === 'select' && (
            <motion.div key="select" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
              className="flex flex-col gap-4">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => fileRef.current?.click()}
                className="w-full gradient-primary text-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-lg-soft">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Camera size={32} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">Tomar Foto</p>
                  <p className="text-indigo-200 text-sm mt-1">Abre la cámara trasera</p>
                </div>
              </motion.button>
              <label className="w-full cursor-pointer">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="card p-6 flex flex-col items-center gap-3 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Upload size={22} className="text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700">Subir desde Galería</p>
                    <p className="text-slate-400 text-sm">JPG, PNG, WEBP</p>
                  </div>
                </motion.div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <p className="text-center text-xs text-slate-400 mt-1">
                Asegúrate de que las etiquetas sean legibles
              </p>
            </motion.div>
          )}

          {/* Paso 2: Vista previa */}
          {step === 'preview' && imageUrl && (
            <motion.div key="preview" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
              className="flex flex-col gap-4">
              <div className="card overflow-hidden">
                <img src={imageUrl} alt="Vista previa" className="w-full object-contain max-h-80" />
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze}
                className="btn-primary flex items-center justify-center gap-2.5 py-4 text-base">
                <Sparkles size={18} /> Analizar con IA
              </motion.button>
              <button onClick={reset} className="btn-secondary text-center py-3">Cancelar</button>
            </motion.div>
          )}

          {/* Paso 3: Analizando */}
          {step === 'analyzing' && (
            <motion.div key="analyzing" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
              className="flex flex-col items-center py-12 gap-6">
              <div className="relative">
                <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-lg-soft">
                  <Sparkles size={34} className="text-white" />
                </div>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-2 border-2 border-indigo-200 rounded-3xl border-t-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">Analizando medicamentos</p>
                <p className="text-slate-500 text-sm mt-2">Claude está identificando los productos...</p>
              </div>
              {imageUrl && <img src={imageUrl} alt="" className="w-40 rounded-2xl opacity-40 shadow-md" />}
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 bg-indigo-400 rounded-full" />
                ))}
              </div>
            </motion.div>
          )}

          {/* Paso 4: Resultados */}
          {step === 'results' && scan && (() => {
            const detected = scan.details.filter(d => !isMissing(d));
            const missing = scan.details.filter(d => isMissing(d));
            const pending = missing.filter(d => !missingDecisions[d.id]);

            return (
              <motion.div key="results" variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
                className="flex flex-col gap-4">
                {/* Miniatura del scan */}
                <div className="card overflow-hidden">
                  <img src={`${API_URL}/images/${scan.photo_filename}`} alt="Imagen analizada" className="w-full object-contain max-h-48" />
                </div>

                {/* Sección: Detectados */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Detectados · {detected.length}
                  </p>
                  {detected.length === 0 && (
                    <div className="card p-4 text-center text-sm text-slate-500">
                      No se detectaron productos. Ajusta manualmente.
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    {detected.map((detail, i) => {
                      const current = counts[detail.id] ?? detail.final_count;
                      const diff = current - detail.previous_stock;
                      return (
                        <motion.div key={detail.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="card p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <ConfidenceBadge conf={detail.ai_confidence} />
                                {!detail.product_id && (
                                  <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">Nuevo</span>
                                )}
                              </div>
                              <p className="font-semibold text-slate-900">{detail.ai_detected_name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                IA detectó: {detail.ai_count} unidad{detail.ai_count !== 1 ? 'es' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600 font-medium">Cantidad:</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleCountChange(detail, Math.max(0, current - 1))}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-lg font-bold flex items-center justify-center transition-colors">-</button>
                              <input type="number" value={current} min={0}
                                onChange={e => handleCountChange(detail, parseInt(e.target.value) || 0)}
                                className="w-16 h-9 text-center border border-slate-200 rounded-xl text-base font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                              <button onClick={() => handleCountChange(detail, current + 1)}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-lg font-bold flex items-center justify-center transition-colors">+</button>
                            </div>
                            {detail.product_id && (
                              <span className={`text-xs font-semibold ml-auto ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {diff >= 0 ? '+' : ''}{diff}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Sección: No detectados */}
                {missing.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">No detectados · {missing.length}</p>
                      {pending.length > 0 && (
                        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {pending.length} sin resolver
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      {missing.map((detail, i) => {
                        const decision = missingDecisions[detail.id];
                        return (
                          <motion.div key={detail.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (detected.length + i) * 0.07 }}
                            className={`card p-4 border-2 ${
                              decision === 'sold' ? 'border-red-200 bg-red-50/50' :
                              decision === 'unseen' ? 'border-blue-200 bg-blue-50/50' :
                              'border-amber-200 bg-amber-50/50'
                            }`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <EyeOff size={14} className="text-amber-500" />
                              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">No detectado</span>
                            </div>
                            <p className="font-semibold text-slate-900 mb-0.5">{detail.ai_detected_name}</p>
                            <p className="text-xs text-slate-400 mb-3">Stock actual: {detail.previous_stock} unidades</p>

                            {!decision ? (
                              <>
                                <p className="text-sm font-medium text-slate-700 mb-2">¿Qué pasó con este producto?</p>
                                <div className="flex gap-2">
                                  <motion.button whileTap={{ scale: 0.96 }}
                                    onClick={() => handleMissingDecision(detail, 'unseen')}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold">
                                    <EyeOff size={14} /> AI no lo vio
                                  </motion.button>
                                  <motion.button whileTap={{ scale: 0.96 }}
                                    onClick={() => handleMissingDecision(detail, 'sold')}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold">
                                    <ShoppingCart size={14} /> Ya no está
                                  </motion.button>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${decision === 'sold' ? 'text-red-600' : 'text-blue-600'}`}>
                                  {decision === 'sold' ? '→ Stock a 0' : `→ Mantener ${detail.previous_stock}`}
                                </span>
                                <button onClick={() => setMissingDecisions(m => { const n = { ...m }; delete n[detail.id]; return n; })}
                                  className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors">cambiar</button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Aviso si hay decisiones pendientes */}
                {pending.length > 0 && (
                  <div className="card p-4 bg-amber-50 border-amber-200 border text-sm text-amber-700">
                    Responde qué pasó con los {pending.length} producto(s) no detectado(s) antes de confirmar.
                  </div>
                )}

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={confirming || pending.length > 0}
                  className="btn-primary flex items-center justify-center gap-2.5 py-4 text-base mt-2">
                  {confirming ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> :
                    <><Check size={18} /> Confirmar Inventario</>}
                </motion.button>
                <button onClick={reset} className="btn-secondary text-center py-3">Cancelar</button>
              </motion.div>
            );
          })()}

          {/* Paso 5: Confirmado */}
          {step === 'confirmed' && (
            <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center py-10 gap-5">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle size={44} className="text-emerald-500" />
              </motion.div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">¡Inventario Actualizado!</h2>
                <p className="text-slate-500 mt-2">Los cambios se guardaron correctamente.</p>
              </div>
              <div className="flex flex-col gap-3 w-full mt-4">
                <button onClick={() => router.push('/')} className="btn-primary flex items-center justify-center gap-2 py-4 text-base">
                  <ArrowRight size={18} /> Ir al Dashboard
                </button>
                <button onClick={reset} className="btn-secondary text-center py-3">Nuevo Scan</button>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {step === 'error' && (
            <motion.div key="error" variants={pageVariants} initial="enter" animate="center" exit="exit"
              className="flex flex-col items-center py-10 gap-5">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">Error en el análisis</p>
                <p className="text-sm text-red-500 mt-2">{error}</p>
              </div>
              <button onClick={() => setStep('preview')} className="btn-primary py-3.5 px-8">Reintentar</button>
              <button onClick={reset} className="btn-secondary py-3 px-8">Nueva Foto</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
