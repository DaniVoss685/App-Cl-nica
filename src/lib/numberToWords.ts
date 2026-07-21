/**
 * Converte um valor numérico em reais (R$) para o seu equivalente por extenso em Português do Brasil.
 * Exemplo: 1250.50 => "um mil e duzentos e cinquenta reais e cinquenta centavos"
 */

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function converterGrupo(num: number): string {
  if (num === 0) return '';
  if (num === 100) return 'cem';

  const c = Math.floor(num / 100);
  const d = Math.floor((num % 100) / 10);
  const u = num % 10;

  const partes: string[] = [];

  if (c > 0) partes.push(CENTENAS[c]);

  if (d === 1) {
    partes.push(DEZ_A_DEZENOVE[u]);
  } else {
    if (d > 1) partes.push(DEZENAS[d]);
    if (u > 0) partes.push(UNIDADES[u]);
  }

  return partes.join(' e ');
}

export function numberToWordsBRL(value: number): string {
  if (isNaN(value) || value === 0) return 'zero reais';

  const valorPositivo = Math.abs(value);
  const inteiro = Math.floor(valorPositivo);
  const centavos = Math.round((valorPositivo - inteiro) * 100);

  const partesExtenso: string[] = [];

  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1000000);
    const milhares = Math.floor((inteiro % 1000000) / 1000);
    const unidadesSimples = inteiro % 1000;

    if (milhoes > 0) {
      const termo = milhoes === 1 ? 'um milhão' : `${converterGrupo(milhoes)} milhões`;
      partesExtenso.push(termo);
    }

    if (milhares > 0) {
      const termo = milhares === 1 ? 'um mil' : `${converterGrupo(milhares)} mil`;
      partesExtenso.push(termo);
    }

    if (unidadesSimples > 0) {
      partesExtenso.push(converterGrupo(unidadesSimples));
    }

    const sufixoMoeda = inteiro === 1 ? 'real' : 'reais';
    partesExtenso.push(sufixoMoeda);
  }

  if (centavos > 0) {
    const extensoCentavos = converterGrupo(centavos);
    const sufixoCentavo = centavos === 1 ? 'centavo' : 'centavos';
    if (partesExtenso.length > 0) {
      partesExtenso.push(`e ${extensoCentavos} ${sufixoCentavo}`);
    } else {
      partesExtenso.push(`${extensoCentavos} ${sufixoCentavo}`);
    }
  }

  return partesExtenso.join(' ');
}
