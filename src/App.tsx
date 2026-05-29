import React, { useState, useMemo } from 'react';
import { Upload, FileSpreadsheet, LayoutDashboard, Search, Filter } from 'lucide-react';
import { parseExcelFile } from './parser';
import { SheetData, ContratacaoRow } from './types';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';

export default function App() {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');
  const [setorFilter, setSetorFilter] = useState('');
  const [atribuidoFilter, setAtribuidoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedSheets = await parseExcelFile(file);
      if (parsedSheets.length > 0) {
        setSheets(parsedSheets);
        setActiveSheetIdx(0);
        setSearchTerm('');
        setModalidadeFilter('');
        setSetorFilter('');
        setAtribuidoFilter('');
        setStatusFilter('');
      } else {
        alert('Nenhuma aba válida encontrada no arquivo Excel.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao ler o arquivo Excel. Verifique se é um arquivo válido (.xlsx, .xls, .csv).');
    }
  };

  const activeSheet = sheets[activeSheetIdx];

  const { filteredData, modalidades, setores, atribuidos, stats, modalidadeData, setorData } = useMemo(() => {
    if (!activeSheet) return { filteredData: [], modalidades: [], setores: [], atribuidos: [], stats: null, modalidadeData: [], setorData: [] };

    let data = activeSheet.data;

    const mods = Array.from(new Set(data.map(d => d.modalidade).filter(Boolean)));
    const sets = Array.from(new Set(data.map(d => d.setor).filter(Boolean)));
    const attribs = Array.from(new Set(data.map(d => d.atribuido).filter(Boolean)));

    if (modalidadeFilter) data = data.filter(d => d.modalidade === modalidadeFilter);
    if (setorFilter) data = data.filter(d => d.setor === setorFilter);
    if (atribuidoFilter) data = data.filter(d => d.atribuido === atribuidoFilter);
    if (statusFilter === 'CONCLUIDO') data = data.filter(d => !!d.data_conclusao);
    if (statusFilter === 'ANDAMENTO') data = data.filter(d => !d.data_conclusao);
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(d => 
        (d.objeto || '').toLowerCase().includes(lowerTerm) ||
        (d.atribuido || '').toLowerCase().includes(lowerTerm) ||
        (d.setor || '').toLowerCase().includes(lowerTerm) ||
        (d.modalidade || '').toLowerCase().includes(lowerTerm) ||
        (d.processo_sei || '').toLowerCase().includes(lowerTerm) ||
        (d.cod_mat_ser || '').toLowerCase().includes(lowerTerm) ||
        (d.pdm_grupo || '').toLowerCase().includes(lowerTerm) ||
        (d.pncp || '').toLowerCase().includes(lowerTerm)
      );
    }

    const totalEstimado = data.reduce((acc, curr) => acc + curr.valor_estimado, 0);
    const totalContratado = data.reduce((acc, curr) => acc + curr.valor_contratado, 0);
    const tempoMedio = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.tempo_conclusao, 0) / data.length) : 0;
    const qtdProcessos = data.length;

    // Chart Data
    const modMap: Record<string, number> = {};
    const setMap: Record<string, number> = {};

    data.forEach(d => {
      const m = d.modalidade || 'Outro';
      modMap[m] = (modMap[m] || 0) + 1;

      const s = d.setor || 'N/A';
      setMap[s] = (setMap[s] || 0) + d.valor_estimado;
    });

    const mData = Object.keys(modMap).map(k => ({ name: k, value: modMap[k] }));
    const sData = Object.keys(setMap).map(k => ({ name: k, valor: setMap[k] })).sort((a,b) => b.valor - a.valor).slice(0, 10);

    return {
      filteredData: data,
      modalidades: mods,
      setores: sets,
      atribuidos: attribs,
      stats: { totalEstimado, totalContratado, tempoMedio, qtdProcessos },
      modalidadeData: mData,
      setorData: sData
    };
  }, [activeSheet, modalidadeFilter, setorFilter, atribuidoFilter, statusFilter, searchTerm]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16'];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center shrink-0 sticky top-0 z-10">
        <div className="max-w-7xl w-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Painel de <span className="text-blue-600">Contratações</span></span>
          </div>
          
          <div className="flex items-center gap-6">
            {sheets.length > 0 && (
              <select 
                className="bg-slate-100 border-none rounded-full py-2 px-5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48"
                value={activeSheetIdx}
                onChange={e => setActiveSheetIdx(Number(e.target.value))}
              >
                {sheets.map((s, i) => (
                  <option key={i} value={i}>{s.name} ({s.data.length} reg)</option>
                ))}
              </select>
            )}
            
            <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 cursor-pointer transition-colors shadow-sm">
              <Upload className="w-4 h-4" />
              <span>Importar Excel</span>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!activeSheet ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <FileSpreadsheet className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo ao Painel Interativo</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-8">
              Faça o upload de uma planilha de contratações (Excel ou CSV) para visualizar gráficos dinâmicos, métricas e buscar informações facilmente.
            </p>
            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium px-6 py-3 rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg">
              <Upload className="w-5 h-5" />
              <span>Selecionar Arquivo</span>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por objeto, atribuído, setor, protocolo SEI, cód mat/ser..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                
                <select 
                  className="bg-slate-100 border-none text-sm rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-36"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="">Status (Todos)</option>
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="ANDAMENTO">Em Andamento</option>
                </select>

                <select 
                  className="bg-slate-100 border-none text-sm rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-36"
                  value={atribuidoFilter}
                  onChange={e => setAtribuidoFilter(e.target.value)}
                >
                  <option value="">Equipe (Todos)</option>
                  {atribuidos.map((a, i) => <option key={i} value={a}>{a}</option>)}
                </select>

                <select 
                  className="bg-slate-100 border-none text-sm rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-40"
                  value={modalidadeFilter}
                  onChange={e => setModalidadeFilter(e.target.value)}
                >
                  <option value="">Modalidade (Todas)</option>
                  {modalidades.map((m, i) => <option key={i} value={m}>{m}</option>)}
                </select>
                
                <select 
                  className="bg-slate-100 border-none text-sm rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-40"
                  value={setorFilter}
                  onChange={e => setSetorFilter(e.target.value)}
                >
                  <option value="">Setor (Todos)</option>
                  {setores.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5 flex flex-col gap-1 justify-center h-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Processos</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.qtdProcessos}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex flex-col gap-1 justify-center h-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Estimado</p>
                  <p className="text-2xl font-bold text-slate-900 truncate">{formatCurrency(stats?.totalEstimado || 0)}</p>
                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex flex-col gap-1 justify-center h-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Contratado</p>
                  <p className="text-2xl font-bold text-slate-900 truncate">{formatCurrency(stats?.totalContratado || 0)}</p>
                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex flex-col gap-1 justify-center h-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tempo Médio (Dias)</p>
                  <p className="text-2xl font-bold text-orange-600">{stats?.tempoMedio.toFixed(1)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-1 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Processos por Modalidade</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modalidadeData}
                        cx="50%"
                        cy="45%"
                        innerRadius="50%"
                        outerRadius="80%"
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {modalidadeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={48} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="col-span-1 lg:col-span-2 bg-slate-50/50 border-dashed border-2 border-slate-200">
                <CardContent className="h-full flex flex-col justify-center p-8">
                  <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-widest">Legenda de Tags (Tabela)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase">TIPO</span>
                        <div className="flex flex-col gap-0.5">
                           <span className="text-sm font-semibold text-slate-800">Tipo de Objeto</span>
                           <span className="text-xs text-slate-500">Natureza da contratação</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <span className="px-2.5 py-1 bg-orange-50 border border-orange-100 rounded text-[10px] font-bold text-orange-600 uppercase">DESP</span>
                        <div className="flex flex-col gap-0.5">
                           <span className="text-sm font-semibold text-slate-800">Elemento de Despesa</span>
                           <span className="text-xs text-slate-500">Classificação da despesa</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <span className="px-2.5 py-1 bg-purple-50 border border-purple-100 rounded text-[10px] font-bold text-purple-600 uppercase">CÓD</span>
                        <div className="flex flex-col gap-0.5">
                           <span className="text-sm font-semibold text-slate-800">Código do Mat/Ser</span>
                           <span className="text-xs text-slate-500">Identificador no portal</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <span className="px-2.5 py-1 bg-sky-50 border border-sky-100 rounded text-[10px] font-bold text-sky-600 uppercase">PDM</span>
                        <div className="flex flex-col gap-0.5">
                           <span className="text-sm font-semibold text-slate-800">Grupo / PDM</span>
                           <span className="text-xs text-slate-500">Padrão descritivo</span>
                        </div>
                     </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Dados */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento dos Processos</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4 border-b border-slate-100">Identificação</th>
                      <th className="px-6 py-4 border-b border-slate-100">Status / Mod.</th>
                      <th className="px-6 py-4 border-b border-slate-100 min-w-[300px]">Objeto / Especificação</th>
                      <th className="px-6 py-4 border-b border-slate-100">Responsável</th>
                      <th className="px-6 py-4 border-b border-slate-100 text-right">Financeiro (Estim. / Contrat.)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-600">
                    {filteredData.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 border-b border-slate-50 align-top">
                          <div className="font-mono text-xs text-slate-800 font-semibold">{row.processo_sei || 'S/ PROC.'}</div>
                          <div className="font-medium text-slate-400 uppercase text-[10px] mt-1 line-clamp-1">{row.pncp || 'S/ PNCP'}</div>
                          <div className="text-[10px] text-slate-400">Ord: #{row.ordem}</div>
                        </td>
                        <td className="px-6 py-4 border-b border-slate-50 align-top">
                          {row.data_conclusao ? (
                            <div 
                              className="w-fit px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold mb-2 border border-green-200 cursor-help"
                              title={`Concluído em: ${row.data_conclusao}`}
                            >
                              CONCLUÍDO
                            </div>
                          ) : (
                            <div 
                              className="w-fit px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold mb-2 border border-amber-200 cursor-help"
                              title={row.data_entrada ? `Iniciado em: ${row.data_entrada}` : 'Em andamento'}
                            >
                              EM ANDAMENTO
                            </div>
                          )}
                          <div className="w-fit px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold border border-blue-200">
                            {row.modalidade}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-b border-slate-50 align-top">
                          <p className="line-clamp-2 text-slate-700 text-sm font-medium">{row.objeto}</p>
                          <div className="flex flex-wrap gap-2 items-center mt-2">
                            {row.tipo_objeto && (
                              <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-semibold text-slate-500 uppercase">{row.tipo_objeto}</span>
                            )}
                            {row.elemento_despesa && (
                              <span className="px-1.5 py-0.5 bg-orange-50 border border-orange-100 rounded text-[9px] font-semibold text-orange-600 uppercase" title="Elemento de Despesa">Desp: {row.elemento_despesa}</span>
                            )}
                            {row.cod_mat_ser && (
                              <span className="px-1.5 py-0.5 bg-purple-50 border border-purple-100 rounded text-[9px] font-semibold text-purple-600 uppercase" title="Código Mat/Ser">CÓD: {row.cod_mat_ser}</span>
                            )}
                            {row.pdm_grupo && (
                              <span className="px-1.5 py-0.5 bg-sky-50 border border-sky-100 rounded text-[9px] font-semibold text-sky-600 uppercase" title="PDM">PDM: {row.pdm_grupo}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-b border-slate-50 align-top whitespace-nowrap">
                          <div className="text-slate-700 font-medium">{row.atribuido}</div>
                          <div className="font-medium text-slate-400 uppercase text-[10px] mt-0.5">{row.setor}</div>
                        </td>
                        <td className="px-6 py-4 border-b border-slate-50 align-top text-right">
                          <div className="font-semibold text-slate-800">
                            {row.valor_estimado ? formatCurrency(row.valor_estimado) : '-'}
                          </div>
                          {row.valor_contratado > 0 && (
                            <div className="text-[10px] text-green-600 font-bold mt-1">
                              C: {formatCurrency(row.valor_contratado)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          Nenhum registro encontrado para os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredData.length > 50 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Mostrando <strong>50</strong> de {filteredData.length} resultados encontrados.</span>
                </div>
              )}
            </Card>

          </div>
        )}
      </main>
    </div>
  );
}
