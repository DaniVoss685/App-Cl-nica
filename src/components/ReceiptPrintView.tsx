import React from 'react';
import { ReceiptData } from '../types';
import { numberToWordsBRL } from '../lib/numberToWords';
import { Building2, Printer, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useStore } from '../store';

interface ReceiptPrintViewProps {
  receipt: ReceiptData;
  onClose?: () => void;
}

export function ReceiptPrintView({ receipt, onClose }: ReceiptPrintViewProps) {
  const { clinicProfessionalSignature } = useStore();
  const signatureImg = receipt.professionalSignature || clinicProfessionalSignature;

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(receipt.amount || 0);

  const amountInWords = receipt.amountInWords || numberToWordsBRL(receipt.amount || 0);

  const formattedDate = receipt.date 
    ? new Date(receipt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action bar (hidden on print) */}
      <div className="print:hidden flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">Recibo gerado com sucesso!</span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handlePrint} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 px-4 py-2"
          >
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </Button>
          {onClose && (
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs"
            >
              Fechar
            </Button>
          )}
        </div>
      </div>

      {/* Official Receipt Sheet */}
      <div id="printable-receipt" className="bg-white border border-slate-300 rounded-2xl p-8 max-w-3xl mx-auto shadow-md print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-slate-800 font-sans">
        {/* Header da Clínica */}
        <div className="border-b-2 border-indigo-600 pb-6 mb-6 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600 print:hidden" />
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {receipt.clinicName || 'CLÍNICA DE SAÚDE & ESTÉTICA'}
              </h1>
            </div>
            {receipt.clinicRazaoSocial && (
              <p className="text-xs font-semibold text-slate-600">{receipt.clinicRazaoSocial}</p>
            )}
            {receipt.clinicCnpj && (
              <p className="text-xs text-slate-500 font-medium">CNPJ / CPF: {receipt.clinicCnpj}</p>
            )}
            {receipt.clinicAddress && (
              <p className="text-xs text-slate-500">{receipt.clinicAddress}</p>
            )}
            {receipt.clinicPhone && (
              <p className="text-xs text-slate-500">Tel / WhatsApp: {receipt.clinicPhone}</p>
            )}
          </div>

          <div className="text-right">
            <div className="inline-block bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl text-center">
              <span className="block text-[10px] uppercase font-bold text-indigo-600 tracking-wider">RECIBO DE PAGAMENTO</span>
              <span className="text-lg font-black text-indigo-950">Nº {receipt.number}</span>
            </div>
            <div className="mt-3 text-right">
              <span className="text-sm text-slate-500 font-medium">VALOR</span>
              <div className="text-2xl font-black text-emerald-700 bg-emerald-50/80 px-3 py-1 rounded-lg border border-emerald-200 inline-block ml-2">
                {formattedAmount}
              </div>
            </div>
          </div>
        </div>

        {/* Corpo do Recibo */}
        <div className="space-y-6 my-8 leading-relaxed text-sm">
          {/* Recebi de */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <p>
              <strong className="text-slate-900 font-bold uppercase">RECEBI(MOS) DE:</strong>{' '}
              <span className="text-base font-bold text-slate-900">{receipt.patientName}</span>
            </p>
            {receipt.patientCpf && (
              <p className="text-xs text-slate-600">
                <strong className="font-semibold">CPF:</strong> {receipt.patientCpf}
              </p>
            )}
            {receipt.patientAddress && (
              <p className="text-xs text-slate-600">
                <strong className="font-semibold">Endereço:</strong> {receipt.patientAddress}
              </p>
            )}
          </div>

          {/* Quantia por extenso */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80">
            <p className="text-amber-950 font-medium">
              <strong className="font-bold uppercase text-amber-900">A QUANTIA DE:</strong>{' '}
              <span className="font-bold italic text-amber-900 capitalize">
                {amountInWords}
              </span>
            </p>
          </div>

          {/* Referente a */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2">
            <p className="font-bold text-slate-900 uppercase">REFERENTE A:</p>
            <p className="text-slate-800 font-medium whitespace-pre-wrap pl-2 border-l-2 border-indigo-400">
              {receipt.description || 'Atendimento / Procedimento em saúde e estética.'}
            </p>
          </div>

          {/* Detalhes de Pagamento */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-700 block uppercase">FORMA DE PAGAMENTO</span>
              <span className="font-semibold text-slate-900 capitalize">{receipt.paymentMethod || 'Dinheiro / Pix'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700 block uppercase">DATA DA EMISSÃO</span>
              <span className="font-semibold text-slate-900">{formattedDate}</span>
            </div>
          </div>

          {receipt.observations && (
            <div className="text-xs text-slate-500 italic pt-2">
              <strong>Observações:</strong> {receipt.observations}
            </div>
          )}
        </div>

        {/* Assinatura */}
        <div className="mt-12 pt-8 border-t border-slate-300 flex flex-col items-center justify-center text-center">
          {signatureImg ? (
            <img 
              src={signatureImg} 
              alt="Assinatura Profissional" 
              className="h-16 max-w-[220px] object-contain mb-1" 
            />
          ) : (
            <div className="h-10" />
          )}
          <div className="w-64 border-b border-slate-800 mb-2"></div>
          <p className="font-bold text-slate-900 text-sm">{receipt.professionalName || receipt.clinicRazaoSocial || receipt.clinicName || 'Emitente Responsável'}</p>
          {receipt.professionalRegistro && (
            <p className="text-xs font-semibold text-slate-600">{receipt.professionalRegistro}</p>
          )}
          {receipt.professionalCpf && (
            <p className="text-xs text-slate-500">CPF: {receipt.professionalCpf}</p>
          )}
          {!receipt.professionalCpf && receipt.clinicCnpj && (
            <p className="text-xs text-slate-500">CNPJ / CPF: {receipt.clinicCnpj}</p>
          )}
        </div>
      </div>
    </div>
  );
}
