'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/navbar';
import { api } from '@/lib/api';
import { getAuth } from '@/lib/auth';
import { CheckCircle, Clock, XCircle, ChevronDown, History, Sparkles } from 'lucide-react';

interface ScanDetailSummary {
  id: number;
  ai_detected_name: string;
  final_count: number;
  ai_confidence: number;
}

interface Scan {
  id: number;
  photo_filename: string;
  scanned_at: string;
  status: string;
  details: ScanDetailSummary[];
}

// Configuración de estado: ícono, etiqueta, y clases de color
const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; pill: string; iconColor: string }> = {
  pending_review: {
    label: 'Pendiente',
    icon: Clock,
    pill: 'bg-amber-50 text-amber-600',
    iconColor: 'text-amber-500',
  },
  confirmed: {
    label: 'Confirmado',
    icon: CheckCircle,
    pill: 'bg-emerald-50 text-emerald-600',
    iconColor: 'text-emerald-500',
  },
  rejected: {
    label: 'Rechazado',
    icon: XCircle,
    pill: 'bg-red-50 text-red-600',
    iconColor: 'text-red-500',
  },
};

// Variante para entrada escalonada de las tarjetas
const cardVariant = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

export default function HistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!getAuth()) { router.push('/login'); return; }
    api.getScans()
      .then(setScans)
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen md:ml-60 pb-24 md:pb-8">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 md:px-8 pt-6">
        {/* Encabezado */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Historial de Scans</h1>
          <p className="text-slate-500 text-sm mt-0.5">{scans.length} escaneos registrados</p>
        </motion.div>

        {/* Skeleton de carga */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="card p-4 h-20 animate-pulse bg-slate-50" />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <History size={32} className="mb-3 opacity-30" />
            <p>No hay scans registrados aún</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {scans.map((scan, i) => {
              const st = STATUS_CONFIG[scan.status] || STATUS_CONFIG.pending_review;
              const Icon = st.icon;
              const isOpen = selected === scan.id;

              return (
                <motion.div key={scan.id} custom={i} variants={cardVariant} initial="hidden" animate="show">
                  <div className="card overflow-hidden">
                    {/* Fila principal — clickeable para expandir */}
                    <button
                      onClick={() => setSelected(isOpen ? null : scan.id)}
                      className="w-full px-4 py-4 flex gap-3 items-start hover:bg-slate-50/60 transition-colors text-left">
                      {/* Miniatura del scan */}
                      <img
                        src={`${API_URL}/images/${scan.photo_filename}`}
                        alt="Scan"
                        className="w-14 h-14 rounded-xl object-cover bg-slate-100 flex-shrink-0 border border-slate-200/60"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          {/* Badge de estado */}
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.pill}`}>
                            <Icon size={11} className={st.iconColor} />
                            {st.label}
                          </span>
                          <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={16} className="text-slate-300" />
                          </motion.div>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(scan.scanned_at).toLocaleString('es-MX', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        <p className="text-xs text-slate-700 font-medium mt-0.5">
                          {scan.details.length} producto{scan.details.length !== 1 ? 's' : ''} detectado{scan.details.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>

                    {/* Sección expandida con detalle de productos */}
                    <AnimatePresence>
                      {isOpen && scan.details.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Sparkles size={11} /> Productos detectados
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {scan.details.map(d => {
                                // Badge de confianza para cada producto
                                const confColor = d.ai_confidence >= 0.8
                                  ? 'text-emerald-600'
                                  : d.ai_confidence >= 0.5
                                  ? 'text-amber-600'
                                  : 'text-red-500';
                                return (
                                  <div key={d.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-xl">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800 truncate">{d.ai_detected_name}</p>
                                      {d.ai_confidence > 0 && (
                                        <p className={`text-xs ${confColor}`}>
                                          {Math.round(d.ai_confidence * 100)}% confianza
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 ml-3">
                                      x{d.final_count}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
