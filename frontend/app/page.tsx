'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Navbar from '@/components/navbar';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Camera, TrendingDown, Clock, Package,
  ArrowUpRight, AlertTriangle, ShoppingCart
} from 'lucide-react';

interface DashboardData {
  total_products: number;
  low_stock_count: number;
  pending_scans: number;
  products_summary: Array<{
    id: number; name: string; current_stock: number;
    min_stock: number; is_low: boolean; sale_price: number;
  }>;
  low_stock_alerts: Array<{ id: number; name: string; current_stock: number; min_stock: number }>;
  recent_movements: Array<{
    id: number; product_id: number; movement_type: string;
    quantity: number; approved: boolean; created_at: string;
  }>;
}

// Skeleton de carga para las tarjetas de estadísticas
function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-1/2 mb-3" />
      <div className="h-8 bg-slate-100 rounded w-1/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-3/4" />
    </div>
  );
}

const MOV_LABELS: Record<string, string> = {
  sale: 'Venta', purchase: 'Compra', adjustment: 'Ajuste', scan_update: 'Scan'
};

// Variantes de animación escalonada para las tarjetas
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuth()) { router.push('/login'); return; }
    api.getDashboard()
      .then(setData)
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // Datos para el gráfico de área (stock por producto)
  const trendData = data?.products_summary.slice(0, 3).map(p => ({
    name: p.name.split(' ')[0],
    stock: p.current_stock,
    value: p.current_stock * p.sale_price,
  })) ?? [];

  // Datos para el gráfico de barras (valor de inventario)
  const inventoryValue = data?.products_summary.map(p => ({
    name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
    valor: Math.round(p.current_stock * p.sale_price),
  })) ?? [];

  const stats = data ? [
    {
      label: 'Productos', value: data.total_products, icon: Package,
      color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 'activos',
    },
    {
      label: 'Stock bajo', value: data.low_stock_count, icon: AlertTriangle,
      color: data.low_stock_count > 0 ? 'text-amber-600' : 'text-slate-400',
      bg: data.low_stock_count > 0 ? 'bg-amber-50' : 'bg-slate-50', trend: 'requieren reorden',
    },
    {
      label: 'Pendientes', value: data.pending_scans, icon: Clock,
      color: data.pending_scans > 0 ? 'text-orange-600' : 'text-slate-400',
      bg: data.pending_scans > 0 ? 'bg-orange-50' : 'bg-slate-50', trend: 'sin confirmar',
    },
  ] : [];

  return (
    <div className="min-h-screen md:ml-60 pb-24 md:pb-8">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 md:px-8 pt-6">
        {/* Encabezado */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-3 gap-3 md:gap-5 mb-6">
          {loading ? [0, 1, 2].map(i => <SkeletonCard key={i} />) :
            stats.map((s, i) => (
              <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <div className="card p-4 md:p-5 hover:shadow-card-hover transition-shadow">
                  <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <s.icon size={18} className={s.color} />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              </motion.div>
            ))
          }
        </div>

        {/* CTA de escaneo */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="mb-6">
          <Link href="/scan">
            <div className="gradient-primary rounded-2xl p-5 md:p-6 flex items-center justify-between group cursor-pointer hover:opacity-95 transition-opacity">
              <div>
                <p className="text-white font-bold text-lg">Escanear Inventario</p>
                <p className="text-indigo-200 text-sm mt-0.5">Toma una foto y la AI hace el resto</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Camera size={24} className="text-white" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Gráficas */}
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          {/* Gráfico de barras: valor de inventario */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Valor de Inventario</p>
                  <p className="text-xs text-slate-400">Por producto (MXN)</p>
                </div>
                <ShoppingCart size={16} className="text-slate-300" />
              </div>
              {loading ? (
                <div className="h-36 bg-slate-50 rounded-xl animate-pulse" />
              ) : inventoryValue.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={inventoryValue} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, 'Valor']}
                    />
                    <Bar dataKey="valor" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-36 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
              )}
            </div>
          </motion.div>

          {/* Gráfico de área: stock actual */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Stock Actual</p>
                  <p className="text-xs text-slate-400">Unidades por producto</p>
                </div>
                <TrendingDown size={16} className="text-slate-300" />
              </div>
              {loading ? (
                <div className="h-36 bg-slate-50 rounded-xl animate-pulse" />
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [v, 'Unidades']}
                    />
                    <Area type="monotone" dataKey="stock" stroke="#6366f1" strokeWidth={2}
                      fill="url(#areaGradient)" dot={{ fill: '#6366f1', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-36 flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Lista de productos */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show" className="mb-5">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-slate-900 text-sm">Productos</p>
              <Link href="/products" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                Ver todos <ArrowUpRight size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {data?.products_summary.map(p => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400">${p.sale_price.toFixed(2)} MXN</p>
                    </div>
                    <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                      p.current_stock === 0 ? 'bg-red-50 text-red-600' :
                      p.is_low ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {p.current_stock} uds
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Movimientos recientes */}
        {!loading && data && data.recent_movements.length > 0 && (
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="font-semibold text-slate-900 text-sm">Movimientos Recientes</p>
                <Link href="/movements" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  Ver todos <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {data.recent_movements.map(m => (
                  <div key={m.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        m.movement_type === 'sale' ? 'bg-blue-50' :
                        m.movement_type === 'purchase' ? 'bg-emerald-50' : 'bg-slate-100'
                      }`}>
                        <ShoppingCart size={14} className={
                          m.movement_type === 'sale' ? 'text-blue-500' :
                          m.movement_type === 'purchase' ? 'text-emerald-500' : 'text-slate-400'
                        } />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{MOV_LABELS[m.movement_type] || m.movement_type}</p>
                        {!m.approved && <span className="text-xs text-amber-500">Pendiente aprobación</span>}
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${m.quantity >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {m.quantity >= 0 ? '+' : ''}{m.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
