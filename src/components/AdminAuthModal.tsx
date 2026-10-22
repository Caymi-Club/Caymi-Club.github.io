import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, KeyRound, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { ConfiguracoesBarbearia } from '../types';
import { loginAdmin } from '../services/supabaseService';

interface AdminAuthModalProps {
  aberto: boolean;
  config: ConfiguracoesBarbearia;
  onSucesso: () => void;
  onFechar: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ aberto, config, onSucesso, onFechar }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (!aberto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    const res = await loginAdmin(config, email, senha);
    setCarregando(false);

    if (res.success) {
      setSenha('');
      onSucesso();
    } else {
      setErro(res.message || 'Não foi possível entrar. Tente novamente.');
    }
  };

  const classeInput = (comErro: boolean) =>
    `w-full rounded-xl border bg-[#1c1815] py-2.5 pr-10 pl-10 text-xs text-[#f3ece3] outline-none transition-colors ${
      comErro ? 'border-red-500 focus:border-red-500' : 'border-[#3a2f27] focus:border-[#cf9b56]'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl border border-[#cf9b56] bg-[#221c18] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onFechar}
          className="absolute top-4 right-4 rounded-full p-1 text-[#b9ac9c] transition-colors hover:bg-[#3a2f27] hover:text-[#f3ece3]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#cf9b56] bg-[#1c1815] text-[#cf9b56] shadow-lg">
            <Lock className="h-6 w-6 stroke-[2]" />
          </div>
          <h3 className="font-oswald mt-3 text-lg font-bold uppercase tracking-wider text-[#e3b976]">
            Acesso do Administrador
          </h3>
          <p className="mt-1 text-xs text-[#b9ac9c]">
            Entre com seu e-mail e senha para acessar o painel de alterações e caixa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cf9b56]" />
            <input
              type="email"
              autoFocus
              required
              autoComplete="username"
              placeholder="E-mail"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (erro) setErro(null);
              }}
              className={classeInput(!!erro)}
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cf9b56]" />
            <input
              type={mostrarSenha ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                if (erro) setErro(null);
              }}
              className={classeInput(!!erro)}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b9ac9c] hover:text-[#f3ece3]"
            >
              {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {erro && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-xl border border-[#3a2f27] px-3.5 py-2 text-xs font-semibold text-[#b9ac9c] hover:text-[#f3ece3]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="font-oswald flex items-center gap-1.5 rounded-xl bg-[#cf9b56] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#121010] shadow hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
