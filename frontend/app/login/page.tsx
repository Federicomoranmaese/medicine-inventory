'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PinPad from '@/components/pin-pad';
import { api } from '@/lib/api';
import { saveAuth, getAuth } from '@/lib/auth';
import { Pill, ArrowLeft, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'pin' | 'admin'>('pin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAuth()) router.push('/');
  }, [router]);

  const handleLogin = async (data: { pin?: string; password?: string }) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.login(data);
      saveAuth({ id: res.user_id, name: res.user_name, role: res.user_role, token: res.access_token });
      router.push('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Panel izquierdo — solo escritorio */}
      <div className="hidden md:flex w-1/2 gradient-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Pill size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">MediStock</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Control de inventario<br />inteligente
          </h1>
          <p className="text-indigo-200 text-lg">
            Toma una foto y la AI actualiza<br />tu inventario automáticamente.
          </p>
        </div>
        <div className="relative flex gap-6">
          {[['3', 'Productos activos'], ['AI', 'Vision powered'], ['100%', 'Precisión']].map(([val, label]) => (
            <div key={label}>
              <p className="text-2xl font-bold text-white">{val}</p>
              <p className="text-indigo-200 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Logo móvil */}
        <div className="md:hidden mb-10 text-center">
          <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Pill size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MediStock</h1>
          <p className="text-slate-500 text-sm mt-1">Inventario con AI Vision</p>
        </div>

        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {mode === 'pin' ? (
              <motion.div
                key="pin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Bienvenido</h2>
                <p className="text-slate-500 text-sm mb-8">Ingresa tu PIN de 4 dígitos</p>
                <PinPad onComplete={(pin) => handleLogin({ pin })} loading={loading} />
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 mt-6 text-indigo-600">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm font-medium">Verificando...</span>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="admin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <button onClick={() => { setMode('pin'); setError(''); }}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors">
                  <ArrowLeft size={15} /> Volver
                </button>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Acceso Admin</h2>
                <p className="text-slate-500 text-sm mb-8">Ingresa tu contraseña de administrador</p>
                <form onSubmit={(e) => { e.preventDefault(); handleLogin({ password }); }}
                  className="flex flex-col gap-4">
                  <input type="password" placeholder="Contraseña" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field text-base" autoFocus />
                  <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 py-3.5">
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Entrando...</> : 'Entrar'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {mode === 'pin' && (
            <button onClick={() => { setMode('admin'); setError(''); }}
              className="w-full mt-6 text-sm text-slate-400 hover:text-indigo-600 transition-colors py-2">
              Acceso administrador →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
