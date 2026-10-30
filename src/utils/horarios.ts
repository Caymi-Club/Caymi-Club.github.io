import { ConfiguracoesBarbearia, HorarioDia } from '../types';

// Horário de funcionamento do dia da semana (0 = domingo ... 6 = sábado).
// Configurações antigas não têm `horarios_semana`: usam o horário geral e os dias de funcionamento.
export function horarioDoDia(config: ConfiguracoesBarbearia, diaSemana: number): HorarioDia {
  const padrao: HorarioDia = {
    aberto: (config.dias_funcionamento ?? [1, 2, 3, 4, 5, 6]).includes(diaSemana),
    abertura: config.hora_abertura || '08:00',
    fechamento: config.hora_fechamento || '19:00',
    pausa_almoco: config.pausa_almoco ?? true,
    almoco_inicio: config.almoco_inicio || '12:00',
    almoco_fim: config.almoco_fim || '13:00',
  };
  const salvo = config.horarios_semana?.[diaSemana];
  return salvo ? { ...padrao, ...salvo } : padrao;
}

export function semanaDaConfig(config: ConfiguracoesBarbearia): HorarioDia[] {
  return Array.from({ length: 7 }, (_, dia) => horarioDoDia(config, dia));
}
