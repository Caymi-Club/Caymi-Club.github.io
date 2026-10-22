/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PromoBanner } from './components/PromoBanner';
import { ActiveBookingReminder } from './components/ActiveBookingReminder';
import { BookingFlow } from './components/BookingFlow';
import { AdminPanel } from './components/AdminPanel';
import { AdminAuthModal } from './components/AdminAuthModal';
import { storageService } from './services/storage';
import { sincronizarServicos, adminTemSessao, observarSessaoAdmin, logoutAdmin } from './services/supabaseService';
import { ConfiguracoesBarbearia, Servico, UltimoAgendamentoCliente } from './types';
import { Lock } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<ConfiguracoesBarbearia>(() => storageService.getConfig());
  const [servicos, setServicos] = useState<Servico[]>(() => storageService.getServicos());
  const [modoAtual, setModoAtual] = useState<'cliente' | 'admin'>('cliente');
  const [modalSenhaAberta, setModalSenhaAberta] = useState(false);
  const [adminLogado, setAdminLogado] = useState(false);
  const [ultimoAgendamento, setUltimoAgendamento] = useState<UltimoAgendamentoCliente | null>(() =>
    storageService.getUltimoAgendamentoCliente()
  );

  // Sync services on mount
  useEffect(() => {
    async function init() {
      try {
        const servicosCarregados = await sincronizarServicos(config);
        setServicos(servicosCarregados);
      } catch (e) {
        console.warn('Erro ao inicializar serviços:', e);
      }
    }
    init();
  }, [config.supabase_url, config.supabase_anon_key]);

  const handleConfigChange = (novaConfig: ConfiguracoesBarbearia) => {
    setConfig(novaConfig);
  };

  const handleServicosChange = (novosServicos: Servico[]) => {
    setServicos(novosServicos);
  };

  // Sessão do Supabase Auth: restaura login existente e acompanha entrada/saída/expiração
  useEffect(() => {
    let ativo = true;
    adminTemSessao(config).then((logado) => {
      if (ativo) setAdminLogado(logado);
    });
    const cancelar = observarSessaoAdmin(config, (logado) => {
      setAdminLogado(logado);
      if (!logado) setModoAtual('cliente');
    });
    return () => {
      ativo = false;
      cancelar();
    };
  }, [config.supabase_url, config.supabase_anon_key]);

  const handleAbrirAdmin = () => {
    if (modoAtual === 'admin') {
      setModoAtual('cliente');
      return;
    }

    if (adminLogado) {
      setModoAtual('admin');
    } else {
      setModalSenhaAberta(true);
    }
  };

  const handleLoginAdmin = () => {
    setAdminLogado(true);
    setModalSenhaAberta(false);
    setModoAtual('admin');
  };

  const handleDeslogarAdmin = async () => {
    await logoutAdmin(config);
    setAdminLogado(false);
    setModoAtual('cliente');
  };

  const handleAtualizarLembrete = () => {
    setUltimoAgendamento(storageService.getUltimoAgendamentoCliente());
  };

  const handleDispensarLembrete = () => {
    storageService.limparUltimoAgendamentoCliente();
    setUltimoAgendamento(null);
  };

  return (
    <div className="min-h-screen bg-[#121010] text-[#f3ece3] selection:bg-[#cf9b56] selection:text-[#121010]">
      {/* Header com Logo, Nome e Endereço */}
      <Header
        config={config}
        modoAtual={modoAtual}
        setModoAtual={setModoAtual}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-5">
        {/* Lembrete de Agendamento Ativo do Cliente */}
        {modoAtual === 'cliente' && ultimoAgendamento && (
          <ActiveBookingReminder
            lembrete={ultimoAgendamento}
            config={config}
            onDispensar={handleDispensarLembrete}
          />
        )}

        {/* Banner do App Parceiro */}
        {modoAtual === 'cliente' && <PromoBanner config={config} />}

        {/* Visualização de Agendamento ou Painel de Alterações */}
        {modoAtual === 'cliente' || !adminLogado ? (
          <BookingFlow
            config={config}
            servicos={servicos}
            onAgendamentoCriado={handleAtualizarLembrete}
          />
        ) : (
          <AdminPanel
            config={config}
            onConfigChange={handleConfigChange}
            servicos={servicos}
            onServicosChange={handleServicosChange}
            onVoltarAgendamento={() => setModoAtual('cliente')}
            onDeslogarAdmin={handleDeslogarAdmin}
          />
        )}
      </main>

      {/* Rodapé com acesso administrativo protegido por senha na parte inferior */}
      <footer className="mt-12 border-t border-[#3a2f27]/40 py-8 text-center text-xs text-[#b9ac9c]">
        <p className="font-oswald tracking-wide text-[#e3b976]/80 text-sm">
          {config.nome}
        </p>
        <p className="mt-1 text-[11px] text-[#b9ac9c]/70">
          Feito com ♥ para clientes fiéis. • Todos os direitos reservados.
        </p>

        {/* Link discreto de administração no final da página com senha */}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={handleAbrirAdmin}
            className="group flex items-center gap-1.5 text-[11px] text-[#3a2f27] hover:text-[#b9ac9c] transition-colors py-1 px-3 rounded-full hover:bg-[#1c1815]"
            title="Acesso restrito ao barbeiro (requer senha)"
          >
            <Lock className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            <span className="opacity-60 group-hover:opacity-100">
              {modoAtual === 'cliente' ? 'Acesso do Barbeiro' : 'Voltar ao Agendamento'}
            </span>
          </button>
        </div>
      </footer>

      {/* Modal de Senha para Acesso Administrativo */}
      <AdminAuthModal
        aberto={modalSenhaAberta}
        config={config}
        onSucesso={handleLoginAdmin}
        onFechar={() => setModalSenhaAberta(false)}
      />
    </div>
  );
}
