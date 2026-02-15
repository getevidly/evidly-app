import { UtensilsCrossed } from 'lucide-react';

export default function KitchenManagerDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <UtensilsCrossed size={24} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-700 mb-1">Kitchen Manager Dashboard</h2>
      <p className="text-sm text-gray-400">Coming in Dashboard Prompt 4</p>
    </div>
  );
}
