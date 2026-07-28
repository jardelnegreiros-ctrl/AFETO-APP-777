import React, { useState } from 'react';
import { Heart, Star, Send, CheckCircle2, MessageSquare, Coffee } from 'lucide-react';
import { db } from '../db';
import { PesquisaSatisfacao } from '../types';

export const PublicSurveyView: React.FC = () => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Extract vendaId from query string if available
  const urlParams = new URLSearchParams(window.location.search);
  const vendaId = urlParams.get('vendaId') || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newPesquisa: PesquisaSatisfacao = {
        id: `pesq_${Date.now()}`,
        vendaId: vendaId || undefined,
        rating,
        comment: comment.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      await db.pesquisasSatisfacao.put(newPesquisa);
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Erro ao registrar avaliação de satisfação:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white/95 backdrop-blur-md border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative z-10 text-stone-900 space-y-6">
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-lg mx-auto">
            <Heart className="w-7 h-7 fill-white/20" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
            AFETO • Cestas & Café
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Pesquisa de Satisfação & Experiência do Cliente
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">Sua resposta foi enviada!</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Agradecemos imensamente por dedicar seu tempo. Seu feedback é fundamental para continuarmos transmitindo afeto e carinho em cada cesta.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                Como você avalia sua experiência com a AFETO?
              </label>

              {/* Star Rating Bar */}
              <div className="flex items-center justify-center space-x-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-rose-600 block">
                {rating === 5 && '😍 Excelente / Encantado'}
                {rating === 4 && '😊 Muito Bom'}
                {rating === 3 && '😐 Satisfatório'}
                {rating === 2 && '😕 Pode Melhorar'}
                {rating === 1 && '😞 Insatisfeito'}
              </span>
            </div>

            {/* Optional Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Seu Nome (Opcional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Ana Paula"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium text-stone-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Comentários ou Sugestões
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos o que achou dos itens, apresentação e entrega..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium text-stone-900 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Enviando...' : 'Enviar Avaliação de Satisfação'}</span>
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-stone-100">
          <p className="text-[10px] text-stone-400 font-medium">
            AFETO • Presentes, Café & Cestas Exclusivas
          </p>
        </div>
      </div>
    </div>
  );
};
