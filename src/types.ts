export interface ContratacaoRow {
  ordem?: string;
  pncp?: string;
  modalidade: string;
  atribuido: string;
  data_cadastro?: string;
  processo_sei?: string;
  objeto: string;
  tipo_objeto: string;
  disputa?: string;
  setor: string;
  elemento_despesa?: string;
  valor_estimado: number;
  valor_contratado: number;
  pdm_grupo?: string;
  cod_mat_ser?: string;
  fundamento_legal?: string;
  intempestiva?: string;
  contrato?: string;
  data_pncp?: string;
  resolucao_cnj?: string;
  bens_pne?: string;
  sustentabilidade?: string;
  data_entrada?: string;
  data_conclusao?: string;
  tempo_conclusao: number;
  publicacao_trf6?: string;
}

export interface SheetData {
  name: string;
  data: ContratacaoRow[];
}
