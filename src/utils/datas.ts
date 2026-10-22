// Datas no fuso do aparelho. Não usar toISOString().slice(0, 10): ele devolve a data em UTC,
// que no Brasil já é o dia seguinte depois das 21h.

// YYYY-MM-DD da data informada (padrão: agora)
export function dataLocalISO(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// YYYY-MM-DD local de um instante em ISO (ex.: o campo `inicio` de um agendamento)
export function dataLocalDeISO(iso: string): string {
  return dataLocalISO(new Date(iso));
}

// YYYY-MM local
export function mesLocalISO(d: Date = new Date()): string {
  return dataLocalISO(d).slice(0, 7);
}
