'use client';

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

interface ScanResultsProps {
  details: ScanDetail[];
  counts: Record<number, number>;
  onCountChange: (detail: ScanDetail, newCount: number) => void;
}

function confidenceIndicator(conf: number) {
  if (conf >= 0.8) return { emoji: '🟢', label: 'Alta confianza', cls: 'border-green-200 bg-green-50' };
  if (conf >= 0.5) return { emoji: '🟡', label: 'Confianza media', cls: 'border-amber-200 bg-amber-50' };
  return { emoji: '🔴', label: 'Baja confianza', cls: 'border-red-200 bg-red-50' };
}

export default function ScanResults({ details, counts, onCountChange }: ScanResultsProps) {
  if (details.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-700">
        No se detectaron productos. Intenta con mejor iluminación.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {details.map(detail => {
        const { emoji, label, cls } = confidenceIndicator(detail.ai_confidence);
        const currentCount = counts[detail.id] ?? detail.final_count;
        const diff = currentCount - detail.previous_stock;

        return (
          <div key={detail.id} className={`border rounded-2xl p-4 ${cls}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span title={label}>{emoji}</span>
                  {!detail.product_id && (
                    <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                      Nuevo
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-800">{detail.ai_detected_name}</p>
                <p className="text-xs text-gray-500">
                  AI detectó: {detail.ai_count} | Confianza: {Math.round(detail.ai_confidence * 100)}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 font-medium">Cantidad final:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCountChange(detail, Math.max(0, currentCount - 1))}
                  className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-lg font-bold flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  value={currentCount}
                  min={0}
                  onChange={e => onCountChange(detail, parseInt(e.target.value) || 0)}
                  className="w-16 h-9 text-center border border-gray-300 rounded-lg text-base font-semibold bg-white"
                />
                <button
                  onClick={() => onCountChange(detail, currentCount + 1)}
                  className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-lg font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {detail.product_id && (
              <div className="mt-2 text-xs">
                <span className="text-gray-500">Stock anterior: {detail.previous_stock} → </span>
                <span
                  className={`font-semibold ${
                    diff === 0 ? 'text-gray-600' : diff > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {currentCount} ({diff >= 0 ? '+' : ''}{diff})
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
