const HEADER_ORDEM_AJUSTE = [
    "ANO",
    "Numero",
    "Circuito",
    "Regional",
    "Marca",
    "Tipo",
    "Data_Emissao",
    "Engenheiro",
    "Pickup_50P",
    "Tempo_Minimo_50P",
    "Pickup_51P",
    "Curva_Fase",
    "TimeDial_Fase",
    "Curva_Rapida_Fase",
    "TimeDial_CR",
    "PartidaCR",
    "Pickup_50N",
    "Tempo_Minimo_50N",
    "Pickup_51N",
    "Curva_Neutro",
    "TimeDial_Neutro",
    "CurvaRapidaNeutro",
    "Time_Dial_CR",
    "Partida_da_CR",
    "Trip",
    "Temporizacao",
    "Operacoes",
    "Tempo_Morto",
    "Operacao_1",
    "Operacao_2",
    "Operacao_3",
    "Operacao_4",
    "Tempo_Morto_Adicional",
    "Reset_Time",
    "HCL",
    "Maximum_Time",
    "Inrush",
    "Sequence_Control",
    "Observacoes",
    "NumeroAjuste",
];

const CATALOGO_CONSULTA = [
    { nome: "Guará", circuitos: [["Aparecida", "APA"], ["Araretama", "ARA"], ["Barreiro", "BRR"], ["Caçapava", "CAC"], ["Cachoeira Paulista", "CPA"], ["Cruzeiro", "CRU"], ["Germana", "GER"], ["Gará", "GUR"], ["Lorena", "LOR"], ["Mantiqueira", "MTQ"], ["Pinda", "PID"], ["Roseira", "ROS"], ["S. Gonçalo", "SGO"], ["Taubaté", "TAU"]] },
    { nome: "Guarulhos", circuitos: [["AGUA CHATA", "ACT"], ["BELA VISTA", "BVI"], ["BONSUCESSO", "BON"], ["CUMBICA", "CMB"], ["DUTRA", "DUT"], ["FORTALEZA", "FOR"], ["GOPOUVA", "GOP"], ["GUARULHOS", "GUL"], ["IPORANGA", "IPO"], ["JARDIM", "JAR"], ["KIDA MACEDO", "KMA"], ["PIMENTAS", "PME"], ["SAO LUIZ", "SLU"], ["SATÉLITE", "SAT"], ["SKOL", "SKO"], ["VALTER JOSE DOS SANTOS", "VJS"], ["VILA GALVÃO", "VGA"], ["VILA HERMINIA", "VHE"]] },
    { nome: "Litoral Norte", circuitos: [["BOISSUCANGA", "BOI"], ["CARAGUATATUBA", "CAR"], ["JUQUEHY", "JUQ"], ["MARESIAS", "MRE"], ["MASSAGUAÇU", "MAS"], ["OLARIA", "OLR"], ["PORTO NOVO", "PNO"], ["SÃO SEBASTIÃO", "SSC"], ["UNA", "UNA"]] },
    { nome: "Mogi", circuitos: [["BIRITIBA", "BIR"], ["BRAS CUBAS", "BCU"], ["CESAR DE SOUZA", "CSO"], ["COLORADO", "COL"], ["GUARAREMA", "GUE"], ["MANOEL AREIAS PEREIRA", "MAP"], ["MIRIM", "MRM"], ["MOGI CIDADE", "MCI"], ["NAGAO", "NAG"], ["PARATEI", "PRT"], ["SALESOPOLIS", "SAL"], ["SANTA BRANCA", "SBR"], ["TIETE", "TIE"]] },
    { nome: "Poa", circuitos: [["ALEX PETRASOLI", "ASP"], ["AMAZONAS", "AMZ"], ["CASA BRANCA", "CBR"], ["COLORADO", "COL"], ["DONA BENTA", "DBE"], ["FERRAZ DE VASCONCELOS", "FER"], ["ITAQUAQUECETUBA", "ITQ"], ["PARQUE DOURADO", "PDO"], ["PEDREIRAS", "PED"], ["POA", "POA"], ["SUZANO", "SUZ"], ["VILA SANTA MARGARIDA", "VSM"]] },
    { nome: "São José", circuitos: [["ALTOS DA VILA PAIVA", "AVP"], ["INDEPENDENCIA", "INP"], ["JACAREÍ", "JAC"], ["JAMBEIRO", "JAM"], ["JOÃO NOVAES", "JNO"], ["JOSÉ CENTRO", "JCE"], ["PARQUE INDUSTRIAL", "PIL"], ["PARQUE TECNOLÓGICO", "PTE"], ["SANTA LUZIA", "SLZ"], ["SANTA PAULA", "SPA"], ["SJC", "SJC"], ["URBANOVA", "URB"], ["VALE DO SOL", "VSL"]] },
].map((regional) => ({
    id: `regional::${regional.nome.toLowerCase()}`,
    nome: regional.nome,
    circuitos: regional.circuitos.map(([nome, abreviacao]) => ({
        id: `circuito::${regional.nome.toLowerCase()}::${abreviacao.toLowerCase()}`,
        nome,
        abreviacao,
    })),
}));

let historicoRegistros = [];
let historicoSelecionados = new Set();
let historicoEstaArrastando = false;
let historicoRenderToken = 0;
let historicoPaginaAtual = 1;
let historicoTotalPaginas = 0;
let historicoTotalRegistros = 0;
let historicoTamanhoPagina = 100;
const HISTORICO_FILTROS_STORAGE_KEY = "oaj.historico.filtros";
const HISTORICO_FILTROS_PADRAO = {
    numero: "",
    circuito: "",
    ano: "",
    data_inicio: "",
    data_fim: "",
};
let historicoFiltros = { ...HISTORICO_FILTROS_PADRAO };
let consultaFluxo = { regionais: [] };
let consultaTelaAtual = 1;
let consultaRegionalId = "";
let consultaCircuitoId = "";
let consultaCircuitoFinal = "";
let consultaEquipamentoId = "";
let consultaBuscaEquipamento = "";
let consultaBuscaRegistro = "";
let consultaEquipamentos = [];
let consultaCircuitosDisponiveisBanco = [];

function carregarFiltrosHistoricoPersistidos() {
    try {
        const salvo = window.localStorage?.getItem(HISTORICO_FILTROS_STORAGE_KEY);
        if (!salvo) {
            return { ...HISTORICO_FILTROS_PADRAO };
        }

        const dados = JSON.parse(salvo);
        return {
            ...HISTORICO_FILTROS_PADRAO,
            numero: String(dados?.numero || "").trim(),
            circuito: String(dados?.circuito || "").trim(),
            ano: String(dados?.ano || "").trim(),
            data_inicio: String(dados?.data_inicio || "").trim(),
            data_fim: String(dados?.data_fim || "").trim(),
        };
    } catch (erro) {
        console.warn("Falha ao restaurar filtros do histórico.", erro);
        return { ...HISTORICO_FILTROS_PADRAO };
    }
}

function persistirFiltrosHistorico() {
    try {
        window.localStorage?.setItem(
            HISTORICO_FILTROS_STORAGE_KEY,
            JSON.stringify(historicoFiltros),
        );
    } catch (erro) {
        console.warn("Falha ao persistir filtros do histórico.", erro);
    }
}

function aplicarFiltrosHistoricoNaTela() {
    const mapaCampos = {
        "filtro-numero": historicoFiltros.numero,
        "filtro-circuito": historicoFiltros.circuito,
        "filtro-ano": historicoFiltros.ano,
        "filtro-data-inicio": historicoFiltros.data_inicio,
        "filtro-data-fim": historicoFiltros.data_fim,
    };

    Object.entries(mapaCampos).forEach(([id, valor]) => {
        const campo = document.getElementById(id);
        if (campo && campo.value !== valor) {
            campo.value = valor;
        }
    });
}

function atualizarFiltroHistorico(chave, valor) {
    historicoFiltros[chave] = String(valor || "").trim();
    persistirFiltrosHistorico();
}

function obterFiltrosHistorico() {
    return {
        ...historicoFiltros,
        pagina: historicoPaginaAtual,
        tamanho_pagina: historicoTamanhoPagina,
    };
}

function limparFiltrosHistorico() {
    historicoFiltros = { ...HISTORICO_FILTROS_PADRAO };
    persistirFiltrosHistorico();
    aplicarFiltrosHistoricoNaTela();
    historicoPaginaAtual = 1;
    carregarHistorico();
}

function atualizarControlesPaginacaoHistorico() {
    const resumo = document.getElementById("historico-paginacao-resumo");
    const paginaAtual = document.getElementById("historico-pagina-atual");
    const anterior = document.getElementById("historico-pagina-anterior");
    const proxima = document.getElementById("historico-pagina-proxima");
    const selectTamanho = document.getElementById("historico-tamanho-pagina");

    if (resumo) {
        if (!historicoTotalRegistros) {
            resumo.textContent = "0 registros";
        } else {
            const inicio = (historicoPaginaAtual - 1) * historicoTamanhoPagina + 1;
            const fim = Math.min(historicoPaginaAtual * historicoTamanhoPagina, historicoTotalRegistros);
            resumo.textContent = `${inicio}-${fim} de ${historicoTotalRegistros} registros`;
        }
    }

    if (paginaAtual) {
        paginaAtual.textContent = `Página ${historicoTotalPaginas ? historicoPaginaAtual : 0} de ${historicoTotalPaginas}`;
    }

    if (anterior) {
        anterior.disabled = historicoPaginaAtual <= 1;
    }

    if (proxima) {
        proxima.disabled = !historicoTotalPaginas || historicoPaginaAtual >= historicoTotalPaginas;
    }

    if (selectTamanho) {
        selectTamanho.value = String(historicoTamanhoPagina);
    }
}

function alternarTela(aba) {

    document.querySelectorAll("[data-screen]").forEach((section) => {
        const ativa = section.dataset.screen === aba;
        section.classList.toggle("hidden", !ativa);
    });

    document.querySelectorAll(".tab-trigger").forEach((botao) => {
        const ativa = botao.dataset.tab === aba;
        botao.classList.toggle("text-primary", ativa);
        botao.classList.toggle("font-bold", ativa);
        botao.classList.toggle("bg-red-50", ativa);
        botao.classList.toggle("text-slate-500", !ativa);
    });

    if (aba === "historico") {
        carregarHistorico();
    }

    if (aba === "consulta") {
        inicializarConsulta();
    }
}

function preencherSelectFiltro(elementId, valores, placeholder) {
    const select = document.getElementById(elementId);
    if (!select) {
        return;
    }

    const valorAtual = select.value;
    const opcoes = (valores || [])
        .filter((valor) => String(valor || "").trim())
        .map((valor) => String(valor).trim());

    select.innerHTML = [
        `<option value="">${placeholder}</option>`,
        ...opcoes.map((valor) => `<option value="${valor}">${valor}</option>`),
    ].join("");

    if (valorAtual && opcoes.includes(valorAtual)) {
        select.value = valorAtual;
    }
}

function obterRegionalConsultaAtual() {
    return consultaFluxo.regionais.find((item) => item.id === consultaRegionalId) || null;
}

function obterCircuitoConsultaAtual() {
    return (consultaFluxo.circuitos || []).find((item) => item.id === consultaCircuitoId) || null;
}

function obterAbreviacoesConsultaDisponiveis(regional) {
    const circuitoSelecionado = obterCircuitoConsultaAtual();
    if (!circuitoSelecionado?.abreviacao) {
        return [];
    }

    const prefixo = normalizarTextoConsulta(circuitoSelecionado.abreviacao);
    return (consultaCircuitosDisponiveisBanco || [])
        .filter((valor) => {
            const texto = normalizarTextoConsulta(valor);
            if (texto === prefixo) {
                return true;
            }

            if (!texto.startsWith(prefixo)) {
                return false;
            }

            const proximoCaractere = texto.charAt(prefixo.length);
            return !proximoCaractere || /[^a-z0-9]/.test(proximoCaractere);
        })
        .map((valor) => ({ id: valor, nome: valor }));
}

function obterAbreviacaoConsultaAtual() {
    const regional = obterRegionalConsultaAtual();
    return obterAbreviacoesConsultaDisponiveis(regional).find((item) => item.id === consultaCircuitoFinal) || null;
}

function obterEquipamentoConsultaAtual() {
    return consultaEquipamentos.find((item) => item.id === consultaEquipamentoId) || null;
}

function preencherSelectBasico(elementId, opcoes, placeholder, disabled) {
    const select = document.getElementById(elementId);
    if (!select) {
        return;
    }

    select.disabled = Boolean(disabled);
    select.innerHTML = [
        `<option value="">${placeholder}</option>`,
        ...(opcoes || []).map((item) => `<option value="${item.id}">${item.nome}</option>`),
    ].join("");
}

function normalizarTextoConsulta(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function circuitoCatalogoExisteNoBanco(circuitoCatalogo, circuitosBanco) {
    const nome = normalizarTextoConsulta(circuitoCatalogo?.nome);
    const abreviacao = normalizarTextoConsulta(circuitoCatalogo?.abreviacao);

    return (circuitosBanco || []).some((circuitoBanco) => {
        const valor = normalizarTextoConsulta(circuitoBanco);
        return valor === nome || valor === abreviacao || valor.includes(nome) || valor.includes(abreviacao);
    });
}

function obterCircuitosConsultaDisponiveis(regional) {
    if (regional?.circuitos?.length) {
        return regional.circuitos;
    }
    return consultaFluxo.circuitos || [];
}

function atualizarVisibilidadeConsulta() {
    document.getElementById("consulta-tela-1")?.classList.toggle("hidden", consultaTelaAtual !== 1);
    document.getElementById("consulta-tela-1")?.classList.toggle("flex", consultaTelaAtual === 1);
    document.getElementById("consulta-tela-2")?.classList.toggle("hidden", consultaTelaAtual !== 2);
    document.getElementById("consulta-tela-3")?.classList.toggle("hidden", consultaTelaAtual !== 3);
}

function renderizarTela1Consulta() {
    const regionais = consultaFluxo.regionais || [];
    const regionalAtual = obterRegionalConsultaAtual();
    const circuitos = obterCircuitosConsultaDisponiveis(regionalAtual);
    const abreviacoes = obterAbreviacoesConsultaDisponiveis(regionalAtual);

    preencherSelectBasico("consulta-regional", regionais, "Selecione a Regional", false);
    preencherSelectBasico("consulta-circuito", circuitos, "Selecione o Circuito", !consultaRegionalId);
    preencherSelectBasico(
        "consulta-abreviacao",
        abreviacoes,
        "Selecione o Circuito Final",
        !(consultaRegionalId && consultaCircuitoId)
    );

    const regionalSelect = document.getElementById("consulta-regional");
    const circuitoSelect = document.getElementById("consulta-circuito");
    const abreviacaoSelect = document.getElementById("consulta-abreviacao");
    const botaoIr = document.getElementById("consulta-ir");

    if (regionalSelect) {
        regionalSelect.value = consultaRegionalId;
    }
    if (circuitoSelect) {
        circuitoSelect.value = consultaCircuitoId;
    }
    if (abreviacaoSelect) {
        abreviacaoSelect.value = consultaCircuitoFinal;
    }
    if (botaoIr) {
        botaoIr.disabled = !(consultaRegionalId && consultaCircuitoId && consultaCircuitoFinal);
    }
}

function renderizarTela2Consulta() {
    const regionalAtual = obterRegionalConsultaAtual();
    const circuitoAtual = obterCircuitoConsultaAtual();
    const abreviacaoAtual = obterAbreviacaoConsultaAtual();
    const termo = consultaBuscaEquipamento.trim().toLowerCase();
    const filtrados = !termo
        ? consultaEquipamentos
        : consultaEquipamentos.filter((item) =>
            [item.nome, item.codigo].some((campo) => String(campo || "").toLowerCase().includes(termo))
        );

    const container = document.getElementById("consulta-equipamentos");
    const vazio = document.getElementById("consulta-equipamentos-vazio");

    document.getElementById("consulta-pill-regional").textContent = regionalAtual?.nome || "-";
    document.getElementById("consulta-pill-circuito").textContent = circuitoAtual?.nome || "-";
    document.getElementById("consulta-pill-abreviacao").textContent = abreviacaoAtual?.nome || "-";

    if (!container || !vazio) {
        return;
    }

    if (!filtrados.length) {
        container.innerHTML = "";
        vazio.classList.remove("hidden");
        return;
    }

    vazio.classList.add("hidden");
    container.innerHTML = filtrados.map((item) => `
        <button
            type="button"
            class="consulta-equipamento rounded-md border border-[#c6ced9] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black"
            data-id="${item.id}"
        >
            <div class="mb-3 flex items-start justify-between gap-3">
                <div>
                    <div class="text-[16px] font-bold text-[#111827]">${item.nome}</div>
                    <div class="mt-1 text-[12px] font-medium text-[#6b7280]">${item.codigo}</div>
                </div>
                <div class="rounded-md bg-black px-3 py-2 text-center text-white">
                    <div class="text-[18px] font-extrabold leading-none">${item.total_registros || item.registros.length}</div>
                    <div class="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em]">registros</div>
                </div>
            </div>
            <div class="flex items-center justify-between border-t border-[#edf1f5] pt-3 text-[12px] font-semibold text-[#374151]">
                <span class="inline-flex items-center gap-2">Abrir tabela</span>
                <span aria-hidden="true" class="icon icon-sm"><svg fill="none" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg></span>
            </div>
        </button>
    `).join("");

    container.querySelectorAll(".consulta-equipamento").forEach((botao) => {
        botao.addEventListener("click", () => {
            consultaEquipamentoId = botao.dataset.id || "";
            consultaTelaAtual = 3;
            renderizarConsulta();
        });
    });
}

function renderizarTela3Consulta() {
    const regionalAtual = obterRegionalConsultaAtual();
    const circuitoAtual = obterCircuitoConsultaAtual();
    const abreviacaoAtual = obterAbreviacaoConsultaAtual();
    const equipamentoAtual = obterEquipamentoConsultaAtual();
    const termo = consultaBuscaRegistro.trim().toLowerCase();
    const registros = equipamentoAtual?.registros || [];
    const filtrados = !termo
        ? registros
        : registros.filter((row) =>
            Object.values(row || {})
                .join(" ")
                .toLowerCase()
                .includes(termo)
        );

    document.getElementById("consulta-breadcrumb").innerHTML = `${regionalAtual?.nome || "-"} <span class="mx-1">&gt;</span> ${circuitoAtual?.nome || "-"} <span class="mx-1">&gt;</span> ${equipamentoAtual?.nome || "-"}`;
    document.getElementById("consulta-pill3-regional").textContent = regionalAtual?.nome || "-";
    document.getElementById("consulta-pill3-circuito").textContent = circuitoAtual?.nome || "-";
    document.getElementById("consulta-pill3-abreviacao").textContent = abreviacaoAtual?.nome || "-";
    document.getElementById("consulta-pill3-equipamento").textContent = equipamentoAtual?.codigo || "-";
    document.getElementById("consulta-registros-total").textContent = `${filtrados.length} registros`;

    const head = document.getElementById("consulta-registros-head");
    const body = document.getElementById("consulta-registros-body");
    const vazio = document.getElementById("consulta-registros-vazio");
    if (!head || !body || !vazio) {
        return;
    }

    if (!filtrados.length) {
        head.innerHTML = "";
        body.innerHTML = "";
        vazio.classList.remove("hidden");
        return;
    }

    const colunas = Object.keys(filtrados[0] || {});
    head.innerHTML = colunas
        .map((coluna) => `<th class="border-b border-[#cad2dd] px-4 py-3 font-bold whitespace-nowrap">${coluna}</th>`)
        .join("");

    vazio.classList.add("hidden");
    body.innerHTML = filtrados.map((row, idx) => `
        <tr class="${idx % 2 === 0 ? "bg-white" : "bg-[#f7f9fc]"}">
            ${colunas.map((coluna) => `<td class="border-b border-[#edf1f5] px-4 py-3 whitespace-nowrap">${row[coluna] ?? ""}</td>`).join("")}
        </tr>
    `).join("");
}

function renderizarConsulta() {
    atualizarVisibilidadeConsulta();
    renderizarTela1Consulta();

    if (consultaTelaAtual === 2) {
        renderizarTela2Consulta();
    }

    if (consultaTelaAtual === 3) {
        renderizarTela3Consulta();
    }
}

async function carregarFluxoConsulta() {
    consultaFluxo = {
        regionais: CATALOGO_CONSULTA.map((regional) => ({
            id: regional.id,
            nome: regional.nome,
            circuitos: (regional.circuitos || []).map((circuito) => ({
                id: circuito.id,
                nome: circuito.nome,
                abreviacao: circuito.abreviacao,
            })),
        })),
        circuitos: [],
    };
}

async function carregarCircuitosConsultaDoBanco() {
    const regionalAtual = obterRegionalConsultaAtual();
    if (!regionalAtual?.nome) {
        consultaCircuitosDisponiveisBanco = [];
        consultaFluxo.circuitos = [];
        return;
    }

    try {
        const resposta = await window.pywebview.api.get_circuitos_consulta(regionalAtual.nome);
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao carregar circuitos.");
        }

        consultaCircuitosDisponiveisBanco = resposta?.circuitos || [];
        consultaFluxo.circuitos = obterCircuitosConsultaDisponiveis(regionalAtual);
    } catch (erro) {
        consultaCircuitosDisponiveisBanco = [];
        consultaFluxo.circuitos = obterCircuitosConsultaDisponiveis(regionalAtual);
        console.error(erro);
        alert(`Falha ao carregar circuitos: ${erro.message || erro}`);
    }
}

async function inicializarConsulta() {
    if (!consultaFluxo.regionais.length) {
        await carregarFluxoConsulta();
    }
    if (consultaRegionalId) {
        await carregarCircuitosConsultaDoBanco();
    }
    renderizarConsulta();
}

async function carregarEquipamentosConsulta() {
    const regionalAtual = obterRegionalConsultaAtual();
    const circuitoAtual = obterCircuitoConsultaAtual();
    const abreviacaoAtual = obterAbreviacaoConsultaAtual();

    try {
        const resposta = await window.pywebview.api.get_equipamentos_consulta({
            regional: regionalAtual?.nome || "",
            circuito: circuitoAtual?.nome || "",
            abreviacao: circuitoAtual?.abreviacao || "",
            circuito_final: abreviacaoAtual?.nome || "",
        });

        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao carregar equipamentos.");
        }

        consultaEquipamentos = resposta?.equipamentos || [];
    } catch (erro) {
        consultaEquipamentos = [];
        console.error(erro);
        alert(`Falha ao carregar equipamentos: ${erro.message || erro}`);
    }
}

function renderizarCabecalhoHistorico(colunas) {
    const head = document.getElementById("historico-head");
    if (!head) {
        return;
    }

    const colunaSelecao = `
        <th class="px-3 py-2 text-center">
            <input aria-label="Selecionar todas as linhas" class="rounded border-outline-variant" id="historico-selecionar-todos" type="checkbox" />
        </th>
    `;

    head.innerHTML = colunaSelecao + colunas
        .map((coluna) => `<th class="px-3 py-2 font-bold uppercase text-center whitespace-nowrap">${coluna}</th>`)
        .join("");

    const selecionarTodos = document.getElementById("historico-selecionar-todos");
    if (selecionarTodos) {
        selecionarTodos.addEventListener("change", (evento) => {
            if (evento.target.checked) {
                historicoSelecionados = new Set(historicoRegistros.map((_, indice) => indice));
            } else {
                historicoSelecionados = new Set();
            }

            renderizarTabelaHistorico(colunas, historicoRegistros);
            atualizarEstadoSelecaoHistorico();
        });
    }
}

function garantirEventosTabelaHistorico() {
    const body = document.getElementById("historico-body");
    if (!body || body.dataset.eventosInicializados === "true") {
        return;
    }

    body.addEventListener("change", (evento) => {
        const checkbox = evento.target.closest(".historico-checkbox");
        if (!checkbox) {
            return;
        }

        const indice = Number(checkbox.dataset.indice);
        alternarSelecaoHistorico(indice);
        checkbox.closest("tr")?.classList.toggle("historico-linha-selecionada", historicoSelecionados.has(indice));
    });

    body.addEventListener("click", (evento) => {
        const linha = evento.target.closest("tr[data-indice]");
        if (!linha || historicoEstaArrastando) {
            return;
        }

        if (evento.target.closest("input, button, a")) {
            return;
        }

        const indice = Number(linha.dataset.indice);
        const checkbox = linha.querySelector(".historico-checkbox");
        if (!checkbox) {
            return;
        }

        checkbox.checked = !checkbox.checked;
        alternarSelecaoHistorico(indice);
        linha.classList.toggle("historico-linha-selecionada", historicoSelecionados.has(indice));
    });

    body.dataset.eventosInicializados = "true";
}

function atualizarEstadoSelecaoHistorico() {
    const totalSelecionados = historicoSelecionados.size;
    const resumo = document.getElementById("historico-selecionados");
    const botaoExcluir = document.getElementById("historico-excluir");
    const selecionarTodos = document.getElementById("historico-selecionar-todos");
    const totalRegistros = historicoRegistros.length;

    if (resumo) {
        resumo.textContent = `${totalSelecionados} selecionado${totalSelecionados === 1 ? "" : "s"}`;
    }

    if (botaoExcluir) {
        botaoExcluir.disabled = totalSelecionados === 0;
    }

    if (selecionarTodos) {
        selecionarTodos.checked = totalRegistros > 0 && totalSelecionados === totalRegistros;
        selecionarTodos.indeterminate = totalSelecionados > 0 && totalSelecionados < totalRegistros;
    }
}

function alternarSelecaoHistorico(indice) {
    if (historicoSelecionados.has(indice)) {
        historicoSelecionados.delete(indice);
    } else {
        historicoSelecionados.add(indice);
    }

    atualizarEstadoSelecaoHistorico();
}

function obterRegistrosSelecionados() {
    return Array.from(historicoSelecionados)
        .sort((a, b) => a - b)
        .map((indice) => historicoRegistros[indice])
        .filter(Boolean);
}

function habilitarArrasteHistorico() {
    const container = document.getElementById("historico-scroll");
    if (!container || container.dataset.arrasteInicializado === "true") {
        return;
    }

    const estado = {
        ativo: false,
        inicioX: 0,
        inicioY: 0,
        scrollLeft: 0,
        scrollTop: 0,
        moveu: false,
    };

    const finalizarArraste = () => {
        if (!estado.ativo) {
            return;
        }

        estado.ativo = false;
        container.classList.remove("arrastando");

        window.setTimeout(() => {
            historicoEstaArrastando = false;
        }, 0);
    };

    container.addEventListener("pointerdown", (evento) => {
        if (evento.button !== 0 || evento.target.closest("input, button, a, label")) {
            return;
        }

        estado.ativo = true;
        estado.moveu = false;
        estado.inicioX = evento.clientX;
        estado.inicioY = evento.clientY;
        estado.scrollLeft = container.scrollLeft;
        estado.scrollTop = container.scrollTop;
        container.classList.add("arrastando");
        container.setPointerCapture(evento.pointerId);
    });

    container.addEventListener("pointermove", (evento) => {
        if (!estado.ativo) {
            return;
        }

        const deltaX = evento.clientX - estado.inicioX;
        const deltaY = evento.clientY - estado.inicioY;

        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
            estado.moveu = true;
            historicoEstaArrastando = true;
        }

        if (!estado.moveu) {
            return;
        }

        container.scrollLeft = estado.scrollLeft - deltaX;
        container.scrollTop = estado.scrollTop - deltaY;
    });

    container.addEventListener("pointerup", finalizarArraste);
    container.addEventListener("pointercancel", finalizarArraste);
    container.addEventListener("lostpointercapture", finalizarArraste);
    container.dataset.arrasteInicializado = "true";
}

function renderizarTabelaHistorico(colunas, registros) {
    const body = document.getElementById("historico-body");
    if (!body) {
        return;
    }

    garantirEventosTabelaHistorico();

    if (!registros.length) {
        body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${(colunas.length || 1) + 1}">Nenhum registro encontrado.</td></tr>`;
        atualizarEstadoSelecaoHistorico();
        return;
    }

    const tokenAtual = ++historicoRenderToken;
    const tamanhoLote = 200;

    const montarLinha = (registro, indice) => {
            const classeLinha = indice % 2 === 0 ? "bg-white" : "bg-surface-container-low";
            const selecionada = historicoSelecionados.has(indice);
            const colunasHtml = colunas
                .map((coluna) => `<td class="px-3 py-2 whitespace-nowrap ${classeLinha}">${registro[coluna] ?? ""}</td>`)
                .join("");
            const checkboxHtml = `
                <td class="px-3 py-2 text-center ${classeLinha}">
                    <input aria-label="Selecionar linha ${indice + 1}" class="historico-checkbox rounded border-outline-variant" data-indice="${indice}" type="checkbox" ${selecionada ? "checked" : ""} />
                </td>
            `;

            return `<tr class="${selecionada ? "historico-linha-selecionada" : ""}" data-indice="${indice}">${checkboxHtml}${colunasHtml}</tr>`;
    };

    body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${(colunas.length || 1) + 1}">Renderizando ${registros.length} registros...</td></tr>`;

    const renderizarLote = (inicio) => {
        if (tokenAtual !== historicoRenderToken) {
            return;
        }

        const fim = Math.min(inicio + tamanhoLote, registros.length);
        const html = registros
            .slice(inicio, fim)
            .map((registro, indiceLocal) => montarLinha(registro, inicio + indiceLocal))
            .join("");

        if (inicio === 0) {
            body.innerHTML = html;
        } else {
            body.insertAdjacentHTML("beforeend", html);
        }

        if (fim < registros.length) {
            window.setTimeout(() => renderizarLote(fim), 0);
            return;
        }

        atualizarEstadoSelecaoHistorico();
    };

    renderizarLote(0);

    atualizarEstadoSelecaoHistorico();
}

async function carregarHistorico() {
    const body = document.getElementById("historico-body");
    historicoRenderToken += 1;
    historicoSelecionados = new Set();
    historicoRegistros = [];
    atualizarEstadoSelecaoHistorico();
    if (body) {
        body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${HEADER_ORDEM_AJUSTE.length + 1}">Carregando...</td></tr>`;
    }
    atualizarControlesPaginacaoHistorico();

    try {
        const resposta = await window.pywebview.api.get_historico(obterFiltrosHistorico());
        const colunas = resposta?.colunas?.length ? resposta.colunas : HEADER_ORDEM_AJUSTE;
        const registros = resposta?.registros || [];
        const mensagem = resposta?.mensagem || "";
        historicoPaginaAtual = Number(resposta?.pagina || 1);
        historicoTamanhoPagina = Number(resposta?.tamanho_pagina || historicoTamanhoPagina || 100);
        historicoTotalRegistros = Number(resposta?.total_registros || 0);
        historicoTotalPaginas = Number(resposta?.total_paginas || 0);

        historicoRegistros = registros;
        renderizarCabecalhoHistorico(colunas);
        renderizarTabelaHistorico(colunas, registros);
        atualizarControlesPaginacaoHistorico();

        if (mensagem && !registros.length && body) {
            body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${(colunas.length || 1) + 1}">${mensagem}</td></tr>`;
        }
    } catch (erro) {
        historicoTotalRegistros = 0;
        historicoTotalPaginas = 0;
        atualizarControlesPaginacaoHistorico();
        if (body) {
            body.innerHTML = `<tr><td class="px-4 py-6 text-center text-error" colspan="${HEADER_ORDEM_AJUSTE.length + 1}">Falha ao carregar histórico.</td></tr>`;
        }
        console.error(erro);
        alert(`Falha ao carregar histórico: ${erro.message || erro}`);
    }
}

async function deletarSelecionados() {
    const registros = obterRegistrosSelecionados();
    if (!registros.length) {
        alert("Selecione ao menos uma linha.");
        return;
    }

    const confirmar = window.confirm(`Deseja deletar ${registros.length} registro${registros.length === 1 ? "" : "s"} selecionado${registros.length === 1 ? "" : "s"}?`);
    if (!confirmar) {
        return;
    }

    try {
        const resposta = await window.pywebview.api.deletar_historico(registros);
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao deletar registros.");
        }
        alert(resposta?.mensagem || "Registros deletados com sucesso.");
        await carregarHistorico();
    } catch (erro) {
        console.error(erro);
        alert(`Falha ao deletar registros: ${erro.message || erro}`);
    }
}

function texto(el) {
    return el?.textContent?.trim() || "";
}

function valorCampo(id) {
    return document.getElementById(id)?.value?.trim() || "";
}

function obterDataHojeIso() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function formatarDataBr(dataIso) {
    if (!dataIso) {
        return "";
    }

    const [ano, mes, dia] = dataIso.split("-");
    if (!ano || !mes || !dia) {
        return "";
    }

    return `${dia}/${mes}/${ano}`;
}

function sincronizarDadosHeader() {
    const dataExecucao = document.getElementById("header-data-input");

    if (dataExecucao && !dataExecucao.value) {
        dataExecucao.value = obterDataHojeIso();
    }
}

function extrairDataEmissao() {
    const dataExecucao = document.getElementById("header-data-input")?.value || "";
    return formatarDataBr(dataExecucao);
}

function extrairAno(dataEmissao) {
    const match = dataEmissao.match(/(\d{4})$/);
    return match ? match[1] : "";
}

function extrairObservacoes() {
    const observacoesFixas = [
        "Single Shot: Ativo conforme os ajustes parametrizados na operação 01.",
        "Linha Viva: Parametrizar para fase e neutro, curva 101, multiplicador de tempo em 0,01.",
    ];
    const observacoesAdicionais = document.getElementById("observacoes")?.value?.trim() || "";

    return observacoesAdicionais
        ? [...observacoesFixas, observacoesAdicionais].join(" | ")
        : observacoesFixas.join(" | ");
}

function montarRegistroOrdenado() {
    const dataEmissao = extrairDataEmissao();
    const engenheiro = valorCampo("header-autor");
    const ajustes = Array.from(document.querySelectorAll(".technical-table input"));

    const valores = {
        ANO: extrairAno(dataEmissao),
        Numero: valorCampo("header-numero"),
        Circuito: valorCampo("header-circuito"),
        Regional: "",
        Marca: valorCampo("header-marca"),
        Tipo: "",
        Data_Emissao: dataEmissao,
        Engenheiro: engenheiro,
        Pickup_50P: ajustes[0]?.value?.trim() || "",
        Tempo_Minimo_50P: ajustes[1]?.value?.trim() || "",
        Pickup_51P: ajustes[2]?.value?.trim() || "",
        Curva_Fase: ajustes[3]?.value?.trim() || "",
        TimeDial_Fase: ajustes[4]?.value?.trim() || "",
        Curva_Rapida_Fase: ajustes[5]?.value?.trim() || "",
        TimeDial_CR: ajustes[6]?.value?.trim() || "",
        PartidaCR: ajustes[7]?.value?.trim() || "",
        Pickup_50N: ajustes[8]?.value?.trim() || "",
        Tempo_Minimo_50N: ajustes[9]?.value?.trim() || "",
        Pickup_51N: ajustes[10]?.value?.trim() || "",
        Curva_Neutro: ajustes[11]?.value?.trim() || "",
        TimeDial_Neutro: ajustes[12]?.value?.trim() || "",
        CurvaRapidaNeutro: ajustes[13]?.value?.trim() || "",
        Time_Dial_CR: ajustes[14]?.value?.trim() || "",
        Partida_da_CR: ajustes[15]?.value?.trim() || "",
        Trip: ajustes[16]?.value?.trim() || "",
        Temporizacao: ajustes[17]?.value?.trim() || "",
        Operacoes: ajustes[18]?.value?.trim() || "",
        Tempo_Morto: ajustes[19]?.value?.trim() || "",
        Operacao_1: ajustes[20]?.value?.trim() || "",
        Operacao_2: ajustes[21]?.value?.trim() || "",
        Operacao_3: ajustes[22]?.value?.trim() || "",
        Operacao_4: ajustes[23]?.value?.trim() || "",
        Tempo_Morto_Adicional: ajustes[24]?.value?.trim() || "",
        Reset_Time: ajustes[25]?.value?.trim() || "",
        HCL: ajustes[26]?.value?.trim() || "",
        Maximum_Time: ajustes[27]?.value?.trim() || "",
        Inrush: ajustes[28]?.value?.trim() || "",
        Sequence_Control: ajustes[29]?.value?.trim() || "",
        Observacoes: extrairObservacoes(),
        NumeroAjuste: "",
    };

    return HEADER_ORDEM_AJUSTE.reduce((registro, chave) => {
        registro[chave] = valores[chave] ?? "";
        return registro;
    }, {});
}

async function salvar() {
    const dados = montarRegistroOrdenado();
    const res = await window.pywebview.api.salvar(dados);
    alert(res);
}

document.addEventListener("DOMContentLoaded", () => {
    historicoFiltros = carregarFiltrosHistoricoPersistidos();
    aplicarFiltrosHistoricoNaTela();
    renderizarCabecalhoHistorico(HEADER_ORDEM_AJUSTE);
    sincronizarDadosHeader();
    atualizarEstadoSelecaoHistorico();
    atualizarControlesPaginacaoHistorico();
    habilitarArrasteHistorico();

    document.querySelectorAll(".tab-trigger").forEach((botao) => {
        botao.addEventListener("click", () => alternarTela(botao.dataset.tab));
    });

    document.querySelectorAll("#filtro-numero, #filtro-circuito, #filtro-ano").forEach((campo) => {
        campo.addEventListener("input", (evento) => {
            const chave = evento.target.id.replace("filtro-", "").replace("-", "_");
            atualizarFiltroHistorico(chave, evento.target.value);
        });
        campo.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter") {
                const chave = evento.target.id.replace("filtro-", "").replace("-", "_");
                atualizarFiltroHistorico(chave, evento.target.value);
                historicoPaginaAtual = 1;
                carregarHistorico();
            }
        });
    });

    document.getElementById("historico-pagina-anterior")?.addEventListener("click", () => {
        if (historicoPaginaAtual <= 1) {
            return;
        }
        historicoPaginaAtual -= 1;
        carregarHistorico();
    });

    document.getElementById("historico-pagina-proxima")?.addEventListener("click", () => {
        if (!historicoTotalPaginas || historicoPaginaAtual >= historicoTotalPaginas) {
            return;
        }
        historicoPaginaAtual += 1;
        carregarHistorico();
    });

    document.getElementById("historico-tamanho-pagina")?.addEventListener("change", (evento) => {
        historicoTamanhoPagina = Number(evento.target.value || 100);
        historicoPaginaAtual = 1;
        carregarHistorico();
    });

    const regionalSelect = document.getElementById("consulta-regional");
    const circuitoSelect = document.getElementById("consulta-circuito");
    const abreviacaoSelect = document.getElementById("consulta-abreviacao");
    const botaoIr = document.getElementById("consulta-ir");
    const botaoVoltar1 = document.getElementById("consulta-voltar-1");
    const botaoVoltar2 = document.getElementById("consulta-voltar-2");
    const buscaEquipamento = document.getElementById("consulta-busca-equipamento");
    const buscaRegistro = document.getElementById("consulta-busca-registro");

    regionalSelect?.addEventListener("change", async (evento) => {
        consultaRegionalId = evento.target.value;
        consultaCircuitoId = "";
        consultaCircuitoFinal = "";
        consultaEquipamentoId = "";
        consultaEquipamentos = [];
        consultaCircuitosDisponiveisBanco = [];
        await carregarCircuitosConsultaDoBanco();
        renderizarConsulta();
    });

    circuitoSelect?.addEventListener("change", (evento) => {
        consultaCircuitoId = evento.target.value;
        consultaCircuitoFinal = "";
        consultaEquipamentoId = "";
        consultaEquipamentos = [];
        renderizarConsulta();
    });

    abreviacaoSelect?.addEventListener("change", (evento) => {
        consultaCircuitoFinal = evento.target.value;
        consultaEquipamentoId = "";
        consultaEquipamentos = [];
        renderizarConsulta();
    });

    botaoIr?.addEventListener("click", async () => {
        if (!(consultaRegionalId && consultaCircuitoId)) {
            return;
        }
        await carregarEquipamentosConsulta();
        consultaTelaAtual = 2;
        consultaBuscaEquipamento = "";
        if (buscaEquipamento) {
            buscaEquipamento.value = "";
        }
        renderizarConsulta();
    });

    botaoVoltar1?.addEventListener("click", () => {
        consultaTelaAtual = 1;
        renderizarConsulta();
    });

    botaoVoltar2?.addEventListener("click", () => {
        consultaTelaAtual = 2;
        renderizarConsulta();
    });

    document.querySelectorAll("#filtro-data-inicio, #filtro-data-fim").forEach((campo) => {
        campo.addEventListener("change", (evento) => {
            const chave = evento.target.id.replace("filtro-", "").replace("-", "_");
            atualizarFiltroHistorico(chave, evento.target.value);
            historicoPaginaAtual = 1;
            carregarHistorico();
        });
    });

    buscaEquipamento?.addEventListener("input", (evento) => {
        consultaBuscaEquipamento = evento.target.value || "";
        if (consultaTelaAtual === 2) {
            renderizarTela2Consulta();
        }
    });

    buscaRegistro?.addEventListener("input", (evento) => {
        consultaBuscaRegistro = evento.target.value || "";
        if (consultaTelaAtual === 3) {
            renderizarTela3Consulta();
        }
    });
});
