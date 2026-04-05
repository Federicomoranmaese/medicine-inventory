'use client';
import { Edit2 } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  lab: string;
  presentation: string;
  purchase_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
  active: boolean;
}

interface ProductCardProps {
  product: Product;
  isAdmin: boolean;
  onEdit?: (product: Product) => void;
}

export default function ProductCard({ product, isAdmin, onEdit }: ProductCardProps) {
  const stockStatus =
    product.current_stock === 0
      ? 'bg-red-100 text-red-700'
      : product.current_stock <= product.min_stock
      ? 'bg-amber-100 text-amber-700'
      : 'bg-green-100 text-green-700';

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{product.name}</p>
          <p className="text-xs text-gray-500">
            {product.lab} · {product.presentation}
          </p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-gray-500">
              Compra: <span className="font-medium">${product.purchase_price.toFixed(2)}</span>
            </span>
            <span className="text-xs text-gray-500">
              Venta: <span className="font-medium">${product.sale_price.toFixed(2)}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div className={`text-sm font-bold px-3 py-1 rounded-full ${stockStatus}`}>
            {product.current_stock}
          </div>
          {isAdmin && onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="p-2 text-gray-400 hover:text-blue-500"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
