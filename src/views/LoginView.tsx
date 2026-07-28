import React, { useState } from 'react';
import { Heart, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@afeto.com.br');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = await login(email, password);
    if (!result.success) {
      setErrorMsg(result.message || 'Falha ao autenticar.');
    }
  };

  const handleQuickFillAdmin = () => {
    setEmail('admin@afeto.com.br');
    setPassword('admin123');
  };

  const handleQuickFillFunc = () => {
    setEmail('funcionario@afeto.com.br');
    setPassword('func123');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccess(`Instruções de redefinição de senha para ${resetEmail} foram registradas. Em caso de perda, solicite ao Administrador do AFETO para redefinir sua conta.`);
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-rose-500 selection:text-white">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-xl shadow-rose-900/40 mb-4 ring-4 ring-rose-500/20">
            <Heart className="w-9 h-9 fill-white/20" />
          </div>
          <h1 className="font-serif font-bold text-3xl text-stone-100 tracking-tight">AFETO</h1>
          <p className="text-stone-400 text-sm mt-1">
            Gestão Financeira e Operacional • Cestas de Café da Manhã
          </p>
        </div>

        {/* Login Form Box */}
        <div className="bg-stone-800/90 backdrop-blur-md border border-stone-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-stone-700/60 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-100">Acesso Restrito</h2>
              <p className="text-xs text-stone-400">Entre com suas credenciais de Administrador</p>
            </div>
            <span className="flex items-center text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Seguro
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-medium animate-shake">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                E-mail de Login
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@afeto.com.br"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-900/90 border border-stone-700 rounded-xl text-stone-100 text-sm placeholder-stone-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-stone-300">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-rose-400 hover:underline font-medium"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-900/90 border border-stone-700 rounded-xl text-stone-100 text-sm placeholder-stone-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-rose-950/50 active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credential Buttons */}
          <div className="pt-2 border-t border-stone-700/60 space-y-2">
            <button
              type="button"
              onClick={handleQuickFillAdmin}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-700/50 hover:bg-stone-900 text-stone-300 text-xs transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform" />
                <span className="font-medium">Preencher Admin (Acesso Total)</span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">admin@afeto.com.br</span>
            </button>

            <button
              type="button"
              onClick={handleQuickFillFunc}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 border border-stone-700/50 hover:bg-stone-900 text-stone-300 text-xs transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span className="font-medium">Preencher Funcionário (Operacional)</span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">funcionario@afeto.com.br</span>
            </button>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-4">
            <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-stone-100">
              <h3 className="text-base font-bold text-stone-100">Recuperação de Senha</h3>
              <p className="text-xs text-stone-400">
                Informe o e-mail cadastrado no sistema para autorizar a redefinição de acesso.
              </p>
              {resetSuccess ? (
                <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-xs">
                  {resetSuccess}
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu.email@afeto.com.br"
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        setResetSuccess(null);
                      }}
                      className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-xl text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
                    >
                      Enviar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-center text-xs text-stone-500 mt-6 font-medium">
          AFETO © {new Date().getFullYear()} • PWA de Gestão Empresarial
        </p>
      </div>
    </div>
  );
};
