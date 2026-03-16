import React, { useState, useMemo } from 'react';
import { FileText, Send, Calculator } from 'lucide-react';
import { useGenerateQuote, useSendQuote } from '@/hooks/api/useLeads';

const SERVICES = [
  { id: 'kec', label: 'Kitchen Exhaust Cleaning (KEC)', basePrice: 450 },
  { id: 'fpm', label: 'Fire Prevention Maintenance (FPM)', basePrice: 350 },
  { id: 'gfx', label: 'Grease Filter Exchange (GFX)', basePrice: 150 },
  { id: 'rgc', label: 'Rooftop Grease Containment (RGC)', basePrice: 275 },
  { id: 'fs', label: 'Fire Suppression Service (FS)', basePrice: 500 },
] as const;

const FREQUENCIES = ['Monthly', 'Bi-Monthly', 'Quarterly', 'Semi-Annual', 'Annual'] as const;

export function QuoteGeneratorPage() {
  const generateQuote = useGenerateQuote();
  const sendQuote = useSendQuote();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('Quarterly');
  const [discount, setDiscount] = useState(0);
  const [equipmentNotes, setEquipmentNotes] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const toggleService = (id: string) => {
    setSelectedServices((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const subtotal = useMemo(() => {
    return SERVICES.filter((s) => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.basePrice, 0);
  }, [selectedServices]);

  const total = useMemo(() => Math.max(0, subtotal - (subtotal * discount / 100)), [subtotal, discount]);
  const fmtCurrency = (v: number) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">Quote Generator</h1>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-[#1e4d6b]" /> Build a quick quote for your customer.</h2>
        <div className="space-y-6">
          <div><h3 className="text-sm font-medium text-[#0B1628] mb-3">Select Services</h3>
            <div className="space-y-2">
              {SERVICES.map((service) => (
                <label key={service.id} className="flex items-center justify-between p-3 rounded-lg border border-[#D1D9E6] hover:bg-[#F4F6FA] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedServices.includes(service.id)} onChange={() => toggleService(service.id)} className="h-4 w-4 rounded border-[#D1D9E6] text-[#1e4d6b]" />
                    <span className="text-sm text-[#0B1628]">{service.label}</span>
                  </div>
                  <span className="text-sm font-medium text-[#3D5068]">{fmtCurrency(service.basePrice)}</span>
                </label>
              ))}
            </div>
          </div>
          <div><h3 className="text-sm font-medium text-[#0B1628] mb-2">Equipment Details</h3>
            <textarea value={equipmentNotes} onChange={(e) => setEquipmentNotes(e.target.value)} placeholder="Hood count, fan size, duct length, etc." className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96] h-20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><h3 className="text-sm font-medium text-[#0B1628] mb-2">Frequency</h3>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628]">
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div><h3 className="text-sm font-medium text-[#0B1628] mb-2">Discount (%)</h3>
              <input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628]" />
            </div>
          </div>
          <div className="bg-[#F4F6FA] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-[#6B7F96]">Subtotal</span><span className="text-sm text-[#0B1628]">{fmtCurrency(subtotal)}</span></div>
            {discount > 0 && <div className="flex items-center justify-between mb-2"><span className="text-sm text-[#6B7F96]">Discount ({discount}%)</span><span className="text-sm text-red-500">-{fmtCurrency(subtotal * discount / 100)}</span></div>}
            <div className="flex items-center justify-between pt-2 border-t border-[#D1D9E6]"><span className="text-sm font-semibold text-[#0B1628]">Total</span><span className="text-xl font-bold text-[#1e4d6b]">{fmtCurrency(total)}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => generateQuote.mutate({ services: selectedServices, frequency, discount, equipmentNotes })} className="flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg hover:bg-[#163a52]"><Calculator className="h-4 w-4" /> Generate Quote</button>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Customer email" className="border border-[#D1D9E6] rounded-lg px-3 py-2 text-sm text-[#0B1628] placeholder:text-[#6B7F96]" />
            <button onClick={() => sendQuote.mutate({ email: customerEmail, services: selectedServices, frequency, discount, total })} disabled={!customerEmail} className="flex items-center gap-2 bg-[#d4af37] text-white px-4 py-2 rounded-lg hover:bg-[#b8962f] disabled:opacity-50"><Send className="h-4 w-4" /> Email Quote</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuoteGeneratorPage;