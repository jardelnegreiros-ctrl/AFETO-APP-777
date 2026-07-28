import React from 'react';
import { Truck, Calendar, Clock, MapPin, CheckCircle2 } from 'lucide-react';

export const DeliveriesView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <Truck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Logística & Agenda</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Agenda de Entregas</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Organização de rotas por horário, bairros de entrega e horários de saída de cestas.
          </p>
        </div>
      </div>

      {/* Period Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-800">Manhã Cedo (06:00 - 08:00)</h3>
                <p className="text-[10px] text-stone-400">Café da manhã surpresa</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">0</span>
          </div>
          <div className="py-8 text-center text-stone-400 text-xs">Nenhum pedido agendado</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-800">Manhã Padrão (08:00 - 11:00)</h3>
                <p className="text-[10px] text-stone-400">Café comercial / comemorações</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">0</span>
          </div>
          <div className="py-8 text-center text-stone-400 text-xs">Nenhum pedido agendado</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-800">Tarde / Especiais</h3>
                <p className="text-[10px] text-stone-400">Chá da tarde e eventos</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">0</span>
          </div>
          <div className="py-8 text-center text-stone-400 text-xs">Nenhum pedido agendado</div>
        </div>
      </div>

      {/* Empty Map & Route Container */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
          <Truck className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-stone-800">Nenhuma entrega no momento</h3>
        <p className="text-xs text-stone-400 max-w-sm mt-1">
          A rota diária agrupa os pedidos por bairros próximos para otimizar o tempo e garantir cestas frescas no horário exato.
        </p>
      </div>
    </div>
  );
};
