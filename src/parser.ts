import * as xlsx from 'xlsx';
import { SheetData, ContratacaoRow } from './types';

// Helper to convert formatted currency/number strings to float. e.g. "34.503,40" -> 34503.40
function parseCurrencyStr(val: string | number | undefined | null): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  if (typeof val === 'string') {
    // Remove R$, spaces, etc.
    let clean = val.replace(/R\$\s?/g, '').trim();
    // If it's formatted like 1.234.567,89
    // Remove dots, replace comma with dot
    if (clean.includes(',') && clean.includes('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatExcelDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    if (isNaN(date.getTime())) return String(val);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(val).trim();
}

export async function parseExcelFile(file: File): Promise<SheetData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = xlsx.read(data, { type: 'binary' });

        const parsedSheets: SheetData[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          // skip empty sheets
          if (!sheet || !sheet['!ref']) continue;
          
          const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
          
          const rows: ContratacaoRow[] = [];
          
          // Let's find rows that actually contain data.
          // Because excel can have a header on row 4 as in the example.
          // The parser above gets a list of objects. We need to identify keys.
          
          // To be safe and generic with headers, we might want to manually parse based on generic key matches
          // Wait, sheet_to_json uses the first non-empty row as header by default.
          // Since the first few rows are title, subtitles, we might need to find the real header.
          const jsonGrid = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
          
          let headerRowIdx = -1;
          for (let i = 0; i < jsonGrid.length; i++) {
             const row = jsonGrid[i];
             // Let's assume header has "OBJETO" or "SETOR" or "MODALIDADE"
             if (row.some(cell => typeof cell === 'string' && cell.toUpperCase().includes('OBJETO') || cell.toUpperCase().includes('MODALIDADE'))) {
                 headerRowIdx = i;
                 break;
             }
          }

          if (headerRowIdx === -1) {
              // try standard header
              headerRowIdx = 0;
          }

          const headers = jsonGrid[headerRowIdx].map((h: any) => typeof h === 'string' ? h.toUpperCase().trim() : String(h));
          
          for (let i = headerRowIdx + 1; i < jsonGrid.length; i++) {
              const rowArr = jsonGrid[i];
              if (!rowArr || rowArr.length === 0) continue;
              
              // Map by header index
              const getVal = (possibleHeaders: string[]) => {
                  const idx = headers.findIndex((h:string) => possibleHeaders.some(ph => h.includes(ph)));
                  return idx !== -1 ? rowArr[idx] : undefined;
              };

              const modalidade = String(getVal(['MODALIDADE']) || '').trim();
              if (!modalidade) continue; // Assume empty modality = empty row
              
              const rowObj: ContratacaoRow = {
                  ordem: String(getVal(['ORDEM']) || ''),
                  pncp: String(getVal(['PNCP', 'PORTAL COMPRAS']) || ''),
                  modalidade,
                  atribuido: String(getVal(['ATRIBUÍDO', 'ATRIBUIDO']) || '').trim(),
                  processo_sei: String(getVal(['PROC. SEI', 'PROCESSO SEI']) || '').trim(),
                  objeto: String(getVal(['OBJETO']) || ''),
                  tipo_objeto: String(getVal(['TIPO DO OBJETO']) || '').trim(),
                  setor: String(getVal(['SETOR']) || '').trim(),
                  elemento_despesa: String(getVal(['ELEM. DESP', 'ELEMENTO DE DESPESA']) || '').trim(),
                  valor_estimado: parseCurrencyStr(getVal(['VR. ANUAL ESTIMADO', 'VALOR ESTIMADO'])),
                  valor_contratado: parseCurrencyStr(getVal(['VR. ANUAL CONTRATADO', 'VALOR CONTRATADO'])),
                  pdm_grupo: String(getVal(['PDM', 'GRUPO DE SERVIÇOS']) || '').trim(),
                  cod_mat_ser: String(getVal(['COD. MAT/SER', 'CÓDIGO MATERIAL', 'COD MAT', 'COD MATERIAL']) || '').trim(),
                  tempo_conclusao: parseInt(String(getVal(['TEMPO DE CONCLUSÃO']) || '0'), 10) || 0,
                  data_entrada: formatExcelDate(getVal(['DATA DE CADASTRO', 'DATA CADASTRO', 'DATA ENTRADA'])),
                  data_conclusao: formatExcelDate(getVal(['DATA CONCLUSÃO', 'DATA CONCLUSÃO (NE)'])),
              };

              rows.push(rowObj);
          }

          if (rows.length > 0) {
              parsedSheets.push({
                  name: sheetName,
                  data: rows
              });
          }
        }
        
        resolve(parsedSheets);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}
