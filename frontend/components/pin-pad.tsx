'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface PinPadProps {
  onComplete: (pin: string) => void;
  loading?: boolean;
}

export default function PinPad({ onComplete, loading }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 4 || loading) return;
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === 4) {
      onComplete(newPin);
      setTimeout(() => setPin(''), 600);
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setPin(p => p.slice(0, -1));
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Indicadores de PIN */}
      <div className="flex gap-4">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={{
              scale: i < pin.length ? 1.2 : 1,
              backgroundColor: i < pin.length ? '#4f46e5' : 'transparent',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="w-3.5 h-3.5 rounded-full border-2 border-indigo-300"
          />
        ))}
      </div>

      {/* Teclado */}
      <motion.div
        animate={shake ? { x: [-6, 6, -6, 6, 0] } : {}}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-3 gap-3 w-64"
      >
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === '⌫') return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.92 }}
              onClick={handleDelete}
              disabled={loading}
              className="h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-40"
            >
              <Delete size={19} />
            </motion.button>
          );
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleDigit(d)}
              disabled={loading}
              className="h-14 rounded-2xl bg-slate-100 text-slate-800 text-xl font-semibold hover:bg-indigo-50 hover:text-indigo-700 transition-colors disabled:opacity-40"
            >
              {d}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
