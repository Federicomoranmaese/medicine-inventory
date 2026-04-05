'use client';
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  current_stock: number;
}

interface MovementFormProps {
  products: Product[];
  onSubmit: (data: {
    product_id: number;
    movement_type: string;
    quantity: number;
    note: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
};

export default function MovementForm({ products, onSubmit, onCancel }: MovementFormProps) {
  const [form, setForm] = useState({
    product_id: products[0]?.id || 0,
    movement_type: 'sale',
    quantity: 1,
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Nuevo Movimiento</h2>
          <button onClick={onCancel}><X size={24} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Producto</label>
            <select
              value={form.product_id}
              onChange={e => setForm(f => ({ ...f, product_id: parseInt(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, movement_type: type }))}
                  className={`py-2 rounded-xl text-sm font-medium ${
                    form.movement_type === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Cantidad</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Nota (opcional)</label>
            <input
              type="text"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Ej: Venta a paciente..."
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
