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
    { nome: "Guará", circuitos: [["Aparecida", "APA"], ["Araretama", "ARA"], ["Barreiro", "BRR"], ["Caçapava", "CAC"], ["Cachoeira Paulista", "CPA"], ["Cruzeiro", "CRU"], ["Germana", "GER"], ["Guará", "GUR"], ["Lorena", "LOR"], ["Mantiqueira", "MTQ"], ["Pinda", "PID"], ["Roseira", "ROS"], ["S. Gonçalo", "SGO"], ["Taubaté", "TAU"]] },
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
let historicoRequestToken = 0;
let historicoPaginaAtual = 1;
let historicoTotalPaginas = 0;
let historicoTotalRegistros = 0;
let historicoTamanhoPagina = 0;
const HISTORICO_FILTROS_STORAGE_KEY = "oaj.historico.filtros";
const SESSION_MATRICULA_STORAGE_KEY = "oaj.session.matricula";
const CONSULTA_ESTADO_STORAGE_KEY = "oaj.consulta.estado";
const ABA_ATIVA_STORAGE_KEY = "oaj.aba.ativa";
const MODO_FORMULARIO_STORAGE_KEY = "oaj.inicio.modo";
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
let catalogoConsulta = [];
let consultaBuscaEquipamento = "";
let consultaBuscaRegistro = "";
let consultaEquipamentos = [];
let consultaCircuitosDisponiveisBanco = [];
let consultaInicializada = false;
let abaAtiva = "inicio";
let modoFormulario = "normal";
let draftsSalvos = [];
let draftsSelecionados = new Set();
let draftStatusMap = {};
let publicacaoLoteAtiva = false;
let toastTimeoutId = 0;
let confirmResolverAtual = null;
let loadingCounter = 0;
let startupLoadingActive = true;
let publishProgressPollId = 0;
const SINGLE_SHOT_OPERACAO_PADRAO = "01";
let appSettings = {
    sharepoint_root: "",
    sharepoint_root_default: "",
    sharepoint_root_effective: "",
};
const LINHA_VIVA_OBSERVACAO_FIXA = "Linha Viva: Parametrizar para fase e neutro, curva 101, multiplicador de tempo em 0,01.";
const CAMPOS_AJUSTES = [
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
];
const CAMPOS_AJUSTES_SECCIONALIZADOR = new Set([
    "Pickup_50P",
    "Tempo_Minimo_50P",
    "Pickup_50N",
    "Tempo_Minimo_50N",
]);

function normalizarModoFormulario(valor) {
    return String(valor || "").trim().toLowerCase() === "seccionalizador"
        ? "seccionalizador"
        : "normal";
}

function obterCampoSingleShotOperacao() {
    return document.getElementById("single-shot-operacao");
}

function obterSingleShotOperacaoAtual() {
    const valor = obterCampoSingleShotOperacao()?.value?.trim() || "";
    return valor || SINGLE_SHOT_OPERACAO_PADRAO;
}

function montarObservacaoSingleShot(operacao = obterSingleShotOperacaoAtual()) {
    return `Single Shot: Ativo conforme os ajustes parametrizados na operação ${operacao}.`;
}

function obterObservacoesFixasPorModo() {
    return modoFormulario === "seccionalizador"
        ? []
        : [montarObservacaoSingleShot(), LINHA_VIVA_OBSERVACAO_FIXA];
}

function obterPlaceholderObservacoesPorModo() {
    return modoFormulario === "seccionalizador"
        ? "Digite as observações do seccionalizador aqui..."
        : "Digite observações adicionais aqui...";
}

function aplicarModoFormulario() {
    const modoSeccionalizador = modoFormulario === "seccionalizador";

    document.querySelectorAll("[data-form-mode]").forEach((botao) => {
        const ativo = botao.dataset.formMode === modoFormulario;
        botao.classList.toggle("tab-pill-active", ativo);
    });

    document.querySelectorAll("[data-normal-only]").forEach((elemento) => {
        elemento.classList.toggle("hidden", modoSeccionalizador);
    });

    document.querySelectorAll("[data-grupo-cell]").forEach((elemento) => {
        elemento.setAttribute("rowspan", modoSeccionalizador ? "2" : "8");
    });

    const textos = modoSeccionalizador
        ? {
            titulo: "Ordem de Ajuste de Proteção - Secc. RL",
            cabecalho: "ORDEM DE AJUSTE DE PROTEÇÃO - SECC. RL",
            numero: "Secc - RL",
            fase1: "Corrente de Partida (A):",
            fase2: "Número de contagens:",
            neutro1: "Corrente de Partida (A):",
            neutro2: "Número de contagens:",
        }
        : {
            titulo: "Ordem de Ajuste de Proteção - Religador",
            cabecalho: "ORDEM DE AJUSTE DE PROTEÇÃO - RELIGADOR",
            numero: "Religador",
            fase1: "Pickup 50P (A):",
            fase2: "Tempo Mínimo-Fase",
            neutro1: "Pickup 50N (A):",
            neutro2: "Tempo Mínimo-Fase",
        };

    const mapaTextos = {
        "modo-formulario-titulo": textos.titulo,
        "header-template-title": textos.cabecalho,
        "header-numero-label": textos.numero,
        "fase-linha-1-label": textos.fase1,
        "fase-linha-2-label": textos.fase2,
        "neutro-linha-1-label": textos.neutro1,
        "neutro-linha-2-label": textos.neutro2,
    };

    Object.entries(mapaTextos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    });

    const observacoes = document.getElementById("observacoes");
    if (observacoes) {
        observacoes.placeholder = obterPlaceholderObservacoesPorModo();
    }

    window.localStorage?.setItem(MODO_FORMULARIO_STORAGE_KEY, modoFormulario);
}

function definirModoFormulario(valor) {
    modoFormulario = normalizarModoFormulario(valor);
    aplicarModoFormulario();
}

function mostrarToast(mensagem, tipo = "info") {
    const toast = document.getElementById("app-toast");
    if (!toast || !mensagem) {
        return;
    }

    window.clearTimeout(toastTimeoutId);
    toast.textContent = String(mensagem);
    toast.classList.remove("hidden", "text-slate-700", "text-red-700", "border-red-200", "bg-red-50/96", "border-slate-200", "bg-white/96");
    if (tipo === "erro") {
        toast.classList.add("border-red-200", "bg-red-50/96", "text-red-700");
    } else {
        toast.classList.add("border-slate-200", "bg-white/96", "text-slate-700");
    }

    toastTimeoutId = window.setTimeout(() => {
        toast.classList.add("hidden");
    }, tipo === "erro" ? 5200 : 2600);
}

function fecharConfirmacao(aceito) {
    const overlay = document.getElementById("app-confirm-overlay");
    if (overlay) {
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
    }

    if (confirmResolverAtual) {
        const resolver = confirmResolverAtual;
        confirmResolverAtual = null;
        resolver(Boolean(aceito));
    }
}

function confirmarExclusao(mensagem, titulo = "Confirmar exclusão") {
    const overlay = document.getElementById("app-confirm-overlay");
    const title = document.getElementById("app-confirm-title");
    const body = document.getElementById("app-confirm-message");

    if (!overlay || !title || !body) {
        return Promise.resolve(window.confirm(mensagem));
    }

    title.textContent = titulo;
    body.textContent = mensagem;
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");

    return new Promise((resolve) => {
        confirmResolverAtual = resolve;
    });
}

function iniciarCarregamento(mensagem = "Carregando...") {
    loadingCounter += 1;
    const overlay = document.getElementById("app-loading-overlay");
    const message = document.getElementById("app-loading-message");
    const bar = document.getElementById("app-loading-bar");
    if (message) {
        message.textContent = mensagem;
    }
    if (bar) {
        bar.style.width = "18%";
        bar.classList.remove("animate-pulse");
    }
    if (overlay) {
        overlay.classList.remove("hidden");
        overlay.classList.add("flex");
    }
}

function atualizarCarregamento(mensagem, progresso) {
    const message = document.getElementById("app-loading-message");
    const bar = document.getElementById("app-loading-bar");
    if (message && mensagem) {
        message.textContent = mensagem;
    }
    if (bar && Number.isFinite(progresso)) {
        const valor = Math.max(6, Math.min(100, Number(progresso)));
        bar.style.width = `${valor}%`;
    }
}

function finalizarCarregamento() {
    loadingCounter = Math.max(0, loadingCounter - 1);
    if (loadingCounter > 0 || startupLoadingActive) {
        return;
    }

    const overlay = document.getElementById("app-loading-overlay");
    const bar = document.getElementById("app-loading-bar");
    if (bar) {
        bar.style.width = "50%";
        bar.classList.add("animate-pulse");
    }
    if (overlay) {
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
    }
}

async function executarComCarregamento(mensagem, operacao) {
    iniciarCarregamento(mensagem);
    try {
        return await operacao();
    } finally {
        finalizarCarregamento();
    }
}

const API_METHODS_COM_OVERLAY = new Set([
    "save_settings",
    "set_session",
    "delete_draft",
    "salvar",
    "deletar_historico",
]);

async function callApi(method, ...args) {
    const mensagens = {
        get_settings: "Carregando configurações...",
        save_settings: "Salvando configurações...",
        get_session: "Carregando sessão...",
        set_session: "Salvando sessão...",
        list_drafts: "Carregando rascunhos...",
        get_draft: "Abrindo rascunho...",
        delete_draft: "Removendo rascunho...",
        salvar: "Salvando rascunho...",
        publicar: "Publicando documento...",
        get_catalogo_consulta: "Carregando consulta...",
        get_circuitos_consulta: "Carregando circuitos...",
        get_equipamentos_consulta: "Carregando equipamentos...",
        get_historico: "Carregando histórico...",
        deletar_historico: "Removendo registros...",
    };

    if (!API_METHODS_COM_OVERLAY.has(method)) {
        return window.pywebview.api[method](...args);
    }

    return executarComCarregamento(
        mensagens[method] || "Processando...",
        () => window.pywebview.api[method](...args),
    );
}

async function executarPublicacaoComProgresso(payload) {
    iniciarCarregamento("Preparando publicação...");
    atualizarCarregamento("Preparando publicação...", 8);

    publishProgressPollId = window.setInterval(async () => {
        try {
            const status = await window.pywebview.api.get_publish_status();
            if (!status) {
                return;
            }
            atualizarCarregamento(
                status.message || "Publicando...",
                Number(status.progress || 8),
            );
        } catch (erro) {
            console.warn("Falha ao consultar progresso da publicação.", erro);
        }
    }, 350);

    try {
        const resposta = await window.pywebview.api.publicar(payload);
        atualizarCarregamento("Finalizando publicação...", 100);
        return resposta;
    } finally {
        if (publishProgressPollId) {
            window.clearInterval(publishProgressPollId);
            publishProgressPollId = 0;
        }
        window.setTimeout(() => finalizarCarregamento(), 180);
    }
}

function renderizarConfiguracoes() {
    const campo = document.getElementById("settings-sharepoint-root");
    const efetivo = document.getElementById("settings-sharepoint-effective");
    const padrao = document.getElementById("settings-sharepoint-default");

    if (campo) {
        campo.value = String(appSettings.sharepoint_root || "");
    }

    if (efetivo) {
        efetivo.textContent = String(appSettings.sharepoint_root_effective || "").trim() || "-";
    }

    if (padrao) {
        padrao.textContent = String(appSettings.sharepoint_root_default || "").trim() || "-";
    }
}

async function carregarConfiguracoes() {
    try {
        const resposta = await callApi("get_settings");
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao carregar configurações.");
        }

        appSettings = {
            sharepoint_root: String(resposta?.settings?.sharepoint_root || "").trim(),
            sharepoint_root_default: String(resposta?.settings?.sharepoint_root_default || "").trim(),
            sharepoint_root_effective: String(resposta?.settings?.sharepoint_root_effective || "").trim(),
        };
        renderizarConfiguracoes();
    } catch (erro) {
        mostrarToast(erro?.message || "Falha ao carregar configurações.", "erro");
    }
}

async function salvarConfiguracoes() {
    try {
        const sharepointRoot = String(document.getElementById("settings-sharepoint-root")?.value || "").trim();
        const resposta = await callApi("save_settings", {
            sharepoint_root: sharepointRoot,
        });
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao salvar configurações.");
        }

        appSettings = {
            sharepoint_root: String(resposta?.settings?.sharepoint_root || "").trim(),
            sharepoint_root_default: String(resposta?.settings?.sharepoint_root_default || "").trim(),
            sharepoint_root_effective: String(resposta?.settings?.sharepoint_root_effective || "").trim(),
        };
        renderizarConfiguracoes();
        mostrarToast(resposta?.mensagem || "Configurações salvas com sucesso.");
    } catch (erro) {
        mostrarToast(erro?.message || "Falha ao salvar configurações.", "erro");
    }
}

function obterMatriculaPersistida() {
    return String(window.localStorage?.getItem(SESSION_MATRICULA_STORAGE_KEY) || "").trim();
}

function atualizarMatriculaAtiva(matricula) {
    const matriculaAtual = String(matricula || "").trim() || "-";
    const header = document.getElementById("session-matricula-display");
    const drafts = document.getElementById("drafts-session-matricula");
    if (header) {
        header.textContent = matriculaAtual;
    }
    if (drafts) {
        drafts.textContent = matriculaAtual;
    }
}

async function sincronizarSessaoAtiva() {
    try {
        const sessaoAtual = await callApi("get_session");
        if (sessaoAtual?.status === "ok" && String(sessaoAtual?.matricula || "").trim()) {
            const matriculaAtual = String(sessaoAtual.matricula).trim();
            window.localStorage?.setItem(SESSION_MATRICULA_STORAGE_KEY, matriculaAtual);
            atualizarMatriculaAtiva(matriculaAtual);
            return matriculaAtual;
        }
    } catch (erro) {
        console.warn("Falha ao sincronizar sessão ativa.", erro);
    }

    atualizarMatriculaAtiva(obterMatriculaPersistida());
    return "";
}

async function garantirSessao() {
    const sessaoAtual = await callApi("get_session");
    if (sessaoAtual?.status === "ok" && String(sessaoAtual?.matricula || "").trim()) {
        const matriculaAtual = String(sessaoAtual.matricula).trim();
        window.localStorage?.setItem(SESSION_MATRICULA_STORAGE_KEY, matriculaAtual);
        atualizarMatriculaAtiva(matriculaAtual);
        return matriculaAtual;
    }

    const matriculaInicial = obterMatriculaPersistida();
    const matriculaInformada = window.prompt(
        "Informe sua matrícula para habilitar SAVE e PUBLISH:",
        matriculaInicial,
    );
    const matricula = String(matriculaInformada || "").trim();

    if (!matricula) {
        throw new Error("Matrícula não informada.");
    }

    const resposta = await callApi("set_session", matricula);
    if (resposta?.status === "erro") {
        throw new Error(resposta?.mensagem || "Falha ao salvar sessão.");
    }

    window.localStorage?.setItem(SESSION_MATRICULA_STORAGE_KEY, matricula);
    atualizarMatriculaAtiva(matricula);
    return matricula;
}

async function trocarMatricula() {
    const matriculaAtual = obterMatriculaPersistida();
    const matriculaInformada = window.prompt("Informe a nova matrícula:", matriculaAtual);
    const matricula = String(matriculaInformada || "").trim();
    if (!matricula) {
        return;
    }

    const resposta = await callApi("set_session", matricula);
    if (resposta?.status === "erro") {
        mostrarToast(resposta?.mensagem || "Falha ao trocar matrícula.", "erro");
        return;
    }

    window.localStorage?.setItem(SESSION_MATRICULA_STORAGE_KEY, matricula);
    atualizarMatriculaAtiva(matricula);

    if (!document.querySelector('[data-screen="salvos"]')?.classList.contains("hidden")) {
        await carregarDraftsSalvos();
    }
}

function obterEquipmentIdAtual() {
    return valorCampo("header-numero");
}

function persistirAbaAtiva() {
    try {
        window.sessionStorage?.setItem(ABA_ATIVA_STORAGE_KEY, abaAtiva);
    } catch (erro) {
        console.warn("Falha ao persistir aba ativa.", erro);
    }
}

function carregarAbaAtivaPersistida() {
    try {
        return String(window.sessionStorage?.getItem(ABA_ATIVA_STORAGE_KEY) || "").trim();
    } catch (erro) {
        console.warn("Falha ao restaurar aba ativa.", erro);
        return "";
    }
}

function persistirEstadoConsulta() {
    try {
        window.sessionStorage?.setItem(
            CONSULTA_ESTADO_STORAGE_KEY,
            JSON.stringify({
                telaAtual: consultaTelaAtual,
                regionalId: consultaRegionalId,
                circuitoId: consultaCircuitoId,
                circuitoFinal: consultaCircuitoFinal,
                equipamentoId: consultaEquipamentoId,
                buscaEquipamento: consultaBuscaEquipamento,
                buscaRegistro: consultaBuscaRegistro,
            }),
        );
    } catch (erro) {
        console.warn("Falha ao persistir estado da consulta.", erro);
    }
}

function limparEstadoConsultaPersistido() {
    try {
        window.sessionStorage?.removeItem(CONSULTA_ESTADO_STORAGE_KEY);
    } catch (erro) {
        console.warn("Falha ao limpar estado da consulta.", erro);
    }
}

function resetarEstadoConsulta() {
    consultaTelaAtual = 1;
    consultaRegionalId = "";
    consultaCircuitoId = "";
    consultaCircuitoFinal = "";
    consultaEquipamentoId = "";
    consultaBuscaEquipamento = "";
    consultaBuscaRegistro = "";
    consultaEquipamentos = [];
    consultaCircuitosDisponiveisBanco = [];
    consultaInicializada = false;
    limparEstadoConsultaPersistido();
}

function restaurarEstadoConsultaPersistido() {
    try {
        const salvo = window.sessionStorage?.getItem(CONSULTA_ESTADO_STORAGE_KEY);
        if (!salvo) {
            return false;
        }

        const dados = JSON.parse(salvo);
        consultaTelaAtual = [1, 2, 3].includes(Number(dados?.telaAtual))
            ? Number(dados.telaAtual)
            : 1;
        consultaRegionalId = String(dados?.regionalId || "").trim();
        consultaCircuitoId = String(dados?.circuitoId || "").trim();
        consultaCircuitoFinal = String(dados?.circuitoFinal || "").trim();
        consultaEquipamentoId = String(dados?.equipamentoId || "").trim();
        consultaBuscaEquipamento = String(dados?.buscaEquipamento || "");
        consultaBuscaRegistro = String(dados?.buscaRegistro || "");
        return Boolean(consultaRegionalId || consultaCircuitoId || consultaCircuitoFinal || consultaEquipamentoId);
    } catch (erro) {
        console.warn("Falha ao restaurar estado da consulta.", erro);
        return false;
    }
}

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

function historicoTemFiltrosAtivos() {
    return Object.values(historicoFiltros).some((valor) => String(valor || "").trim() !== "");
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
        } else if (historicoTamanhoPagina <= 0) {
            resumo.textContent = `${historicoTotalRegistros} registros`;
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
    const abaAnterior = abaAtiva;
    abaAtiva = aba;
    persistirAbaAtiva();

    document.querySelectorAll("[data-screen]").forEach((section) => {
        const ativa = section.dataset.screen === aba;
        section.classList.toggle("hidden", !ativa);
    });

    document.querySelectorAll(".tab-trigger").forEach((botao) => {
        const ativa = botao.dataset.tab === aba;
        botao.classList.toggle("text-primary", ativa);
        botao.classList.toggle("font-bold", ativa);
        botao.classList.toggle("tab-pill-active", ativa);
        botao.classList.toggle("bg-blue-50", ativa && !botao.classList.contains("tab-pill"));
        botao.classList.toggle("text-slate-500", !ativa);
        botao.classList.toggle("text-blue-600", ativa && !botao.classList.contains("tab-pill"));
    });

    atualizarVisibilidadeAcoesGlobais();

    if (aba === "historico") {
        carregarHistorico();
    }

    if (aba === "salvos") {
        carregarDraftsSalvos();
    }

    if (aba === "consulta") {
        inicializarConsulta();
    } else if (abaAnterior === "consulta") {
        resetarEstadoConsulta();
    }

    if (aba === "configuracoes") {
        carregarConfiguracoes();
    }
}

async function alternarTelaInicial(aba) {
    const abaAnterior = abaAtiva;
    abaAtiva = aba;
    persistirAbaAtiva();

    document.querySelectorAll("[data-screen]").forEach((section) => {
        const ativa = section.dataset.screen === aba;
        section.classList.toggle("hidden", !ativa);
    });

    document.querySelectorAll(".tab-trigger").forEach((botao) => {
        const ativa = botao.dataset.tab === aba;
        botao.classList.toggle("text-primary", ativa);
        botao.classList.toggle("font-bold", ativa);
        botao.classList.toggle("tab-pill-active", ativa);
        botao.classList.toggle("bg-blue-50", ativa && !botao.classList.contains("tab-pill"));
        botao.classList.toggle("text-slate-500", !ativa);
        botao.classList.toggle("text-blue-600", ativa && !botao.classList.contains("tab-pill"));
    });

    atualizarVisibilidadeAcoesGlobais();

    if (aba === "historico") {
        await carregarHistorico();
    }

    if (aba === "salvos") {
        await carregarDraftsSalvos();
    }

    if (aba === "consulta") {
        await inicializarConsulta();
    } else if (abaAnterior === "consulta") {
        resetarEstadoConsulta();
    }

    if (aba === "configuracoes") {
        await carregarConfiguracoes();
    }
}

function atualizarVisibilidadeAcoesGlobais() {
    const exibirAcoes = abaAtiva === "inicio";
    const botoes = [
        document.getElementById("header-salvar-btn"),
        document.getElementById("header-publicar-btn"),
        document.getElementById("mobile-salvar-btn"),
    ];

    botoes.forEach((botao) => {
        if (!botao) {
            return;
        }
        botao.hidden = !exibirAcoes;
    });
}

async function sinalizarAppPronto() {
    try {
        if (window.pywebview?.api?.app_ready) {
            await window.pywebview.api.app_ready();
        }
    } catch (erro) {
        console.error("Falha ao sinalizar app pronto.", erro);
    }
}

function finalizarInicializacaoApp() {
    startupLoadingActive = false;
    finalizarCarregamento();
}

function obterStatusLockDraft(draft) {
    const lock = draft?.lock || {};
    if (!lock?.locked) {
        return { texto: "Sem lock ativo", classe: "bg-slate-100 text-slate-600" };
    }

    const matriculaAtual = obterMatriculaPersistida();
    if (String(lock.matricula || "").trim() === matriculaAtual) {
        return { texto: "Lock seu", classe: "bg-emerald-100 text-emerald-700" };
    }

    return {
        texto: `Lock de ${lock.matricula || "-"}`,
        classe: "bg-amber-100 text-amber-700",
    };
}

function obterStatusPublicacaoDraft(draft) {
    const status = draftStatusMap[draft?.equipment_id] || "";
    if (status === "publicando") {
        return { texto: "Publicando...", classe: "bg-blue-100 text-blue-700" };
    }
    if (status === "ok") {
        return { texto: "Publicado", classe: "bg-emerald-100 text-emerald-700" };
    }
    if (status === "erro") {
        return { texto: "Falhou", classe: "bg-red-100 text-red-700" };
    }
    return { texto: "Pendente", classe: "bg-slate-100 text-slate-600" };
}

function atualizarResumoSelecaoDrafts() {
    const resumo = document.getElementById("drafts-resumo");
    const botao = document.getElementById("drafts-publicar-selecionados");
    const marcarTodos = document.getElementById("drafts-selecionar-todos");
    const total = draftsSalvos.length;
    const selecionados = draftsSelecionados.size;

    if (resumo) {
        resumo.textContent = selecionados
            ? `${selecionados} de ${total} selecionado${selecionados === 1 ? "" : "s"}`
            : `${total} rascunho${total === 1 ? "" : "s"}`;
    }

    if (botao) {
        botao.disabled = !selecionados || publicacaoLoteAtiva;
        botao.textContent = publicacaoLoteAtiva
            ? "Publicando lote..."
            : `Publicar selecionados${selecionados ? ` (${selecionados})` : ""}`;
    }

    if (marcarTodos) {
        marcarTodos.checked = total > 0 && selecionados === total;
        marcarTodos.indeterminate = selecionados > 0 && selecionados < total;
        marcarTodos.disabled = !total || publicacaoLoteAtiva;
    }
}

function alternarSelecaoDraft(equipmentId, selecionado) {
    if (!equipmentId || publicacaoLoteAtiva) {
        return;
    }
    if (selecionado) {
        draftsSelecionados.add(equipmentId);
    } else {
        draftsSelecionados.delete(equipmentId);
    }
    atualizarResumoSelecaoDrafts();
}

function alternarSelecaoTodosDrafts(selecionar) {
    if (publicacaoLoteAtiva) {
        return;
    }
    draftsSelecionados = selecionar
        ? new Set(draftsSalvos.map((draft) => draft.equipment_id).filter(Boolean))
        : new Set();
    renderizarDraftsSalvos();
}

function renderizarDraftsSalvos() {
    const lista = document.getElementById("drafts-lista");
    const vazio = document.getElementById("drafts-vazio");
    const resumo = document.getElementById("drafts-resumo");

    if (!lista || !vazio || !resumo) {
        return;
    }

    if (!draftsSalvos.length) {
        lista.innerHTML = "";
        vazio.classList.remove("hidden");
        atualizarResumoSelecaoDrafts();
        return;
    }

    vazio.classList.add("hidden");
    lista.innerHTML = draftsSalvos.map((draft) => {
        const statusLock = obterStatusLockDraft(draft);
        const statusPublicacao = obterStatusPublicacaoDraft(draft);
        const selecionado = draftsSelecionados.has(draft.equipment_id);
        return `
            <article class="app-card p-5">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="space-y-3">
                        <div class="flex flex-wrap items-center gap-2">
                            <label class="inline-flex items-center">
                                <input class="rounded border-outline-variant" type="checkbox" ${selecionado ? "checked" : ""} ${publicacaoLoteAtiva ? "disabled" : ""} onchange="alternarSelecaoDraft('${draft.equipment_id}', this.checked)" />
                            </label>
                            <h3 class="text-xl font-black text-on-surface">${draft.numero || draft.equipment_id || "-"}</h3>
                            <span class="rounded-full px-3 py-1 text-xs font-bold ${statusLock.classe}">${statusLock.texto}</span>
                            <span class="rounded-full px-3 py-1 text-xs font-bold ${statusPublicacao.classe}">${statusPublicacao.texto}</span>
                        </div>
                        <div class="grid gap-2 text-sm text-on-surface-variant sm:grid-cols-2 xl:grid-cols-4">
                            <div><span class="font-bold text-on-surface">Circuito:</span> ${draft.circuito || "-"}</div>
                            <div><span class="font-bold text-on-surface">Regional:</span> ${draft.regional || "-"}</div>
                            <div><span class="font-bold text-on-surface">Engenheiro:</span> ${draft.engenheiro || "-"}</div>
                            <div><span class="font-bold text-on-surface">Salvo em:</span> ${formatarDataHoraDraft(draft.saved_at)}</div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button class="btn btn-secondary" onclick="abrirDraftSalvo('${draft.equipment_id}')" type="button" ${publicacaoLoteAtiva ? "disabled" : ""}>Abrir</button>
                        <button class="btn btn-primary" onclick="publicarDraftSalvo('${draft.equipment_id}')" type="button" ${publicacaoLoteAtiva ? "disabled" : ""}>Publicar</button>
                        <button class="btn btn-danger" onclick="excluirDraftSalvo('${draft.equipment_id}')" type="button" ${publicacaoLoteAtiva ? "disabled" : ""}>Excluir</button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
    atualizarResumoSelecaoDrafts();
}

async function carregarDraftsSalvos() {
    const lista = document.getElementById("drafts-lista");
    const vazio = document.getElementById("drafts-vazio");
    const resumo = document.getElementById("drafts-resumo");
    if (lista) {
        lista.innerHTML = `<div class="app-card px-6 py-8 text-center text-sm text-on-surface-variant">Carregando rascunhos...</div>`;
    }
    if (vazio) {
        vazio.classList.add("hidden");
    }
    if (resumo) {
        resumo.textContent = "Carregando...";
    }

    try {
        await garantirSessao();
        const resposta = await callApi("list_drafts");
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao listar rascunhos.");
        }

        atualizarMatriculaAtiva(resposta?.matricula || obterMatriculaPersistida());
        draftsSalvos = Array.isArray(resposta?.drafts) ? resposta.drafts : [];
        draftsSelecionados = new Set(
            Array.from(draftsSelecionados).filter((equipmentId) =>
                draftsSalvos.some((draft) => draft.equipment_id === equipmentId),
            ),
        );
        renderizarDraftsSalvos();
    } catch (erro) {
        draftsSalvos = [];
        draftsSelecionados = new Set();
        if (lista) {
            lista.innerHTML = `<div class="app-card border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700">${erro?.message || erro}</div>`;
        }
        if (resumo) {
            resumo.textContent = "Erro ao carregar";
        }
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

    const circuitosCatalogo = (circuitoSelecionado.circuitos_finais || [])
        .filter((valor) => String(valor || "").trim());
    if (circuitosCatalogo.length) {
        return circuitosCatalogo.map((valor) => ({ id: valor, nome: valor }));
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

function encontrarRegionalPorCircuito(circuitoInformado) {
    const circuitoNormalizado = normalizarTextoConsulta(circuitoInformado);
    if (!circuitoNormalizado) {
        return null;
    }

    for (const regional of catalogoConsulta) {
        for (const circuito of regional.circuitos || []) {
            const nome = normalizarTextoConsulta(circuito.nome);
            const abreviacao = normalizarTextoConsulta(circuito.abreviacao);
            if (
                circuitoNormalizado === nome ||
                circuitoNormalizado === abreviacao ||
                circuitoNormalizado.startsWith(`${abreviacao} `) ||
                circuitoNormalizado.startsWith(`${nome} `)
            ) {
                return {
                    regional: regional.nome,
                    circuito: circuito.nome,
                    abreviacao: circuito.abreviacao,
                };
            }
        }
    }

    return null;
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
            class="consulta-equipamento app-card p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-md"
            data-id="${item.id}"
        >
            <div class="mb-3 flex items-start justify-between gap-3">
                <div>
                    <div class="text-[16px] font-bold text-[#111827]">${item.nome}</div>
                    <div class="mt-1 text-[12px] font-medium text-[#6b7280]">${item.codigo}</div>
                </div>
                <div class="rounded-xl bg-slate-900 px-3 py-2 text-center text-white">
                    <div class="text-[18px] font-extrabold leading-none">${item.total_registros || item.registros.length}</div>
                    <div class="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em]">registros</div>
                </div>
            </div>
            <div class="flex items-center justify-between border-t border-slate-200 pt-3 text-[12px] font-semibold text-[#374151]">
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
        .map((coluna) => `<th class="border-b border-slate-200 px-4 py-3 font-bold whitespace-nowrap">${coluna}</th>`)
        .join("");

    vazio.classList.add("hidden");
    body.innerHTML = filtrados.map((row, idx) => `
        <tr class="${idx % 2 === 0 ? "bg-white" : "bg-[#f7f9fc]"}">
            ${colunas.map((coluna) => `<td class="border-b border-slate-100 px-4 py-3 whitespace-nowrap">${row[coluna] ?? ""}</td>`).join("")}
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

    persistirEstadoConsulta();
}

async function carregarFluxoConsulta() {
    const resposta = await callApi("get_catalogo_consulta");
    if (resposta?.status === "erro") {
        throw new Error(resposta?.mensagem || "Falha ao carregar catÃ¡logo.");
    }

    catalogoConsulta = resposta?.regionais || [];
    consultaFluxo = {
        regionais: catalogoConsulta.map((regional) => ({
            id: regional.id,
            nome: regional.nome,
            circuitos: (regional.circuitos || []).map((circuito) => ({
                id: circuito.id,
                nome: circuito.nome,
                abreviacao: circuito.abreviacao,
                circuitos_finais: circuito.circuitos_finais || [],
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
        const resposta = await callApi("get_circuitos_consulta", regionalAtual.nome);
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao carregar circuitos.");
        }

        consultaCircuitosDisponiveisBanco = resposta?.circuitos || [];
        consultaFluxo.circuitos = obterCircuitosConsultaDisponiveis(regionalAtual);
    } catch (erro) {
        consultaCircuitosDisponiveisBanco = [];
        consultaFluxo.circuitos = obterCircuitosConsultaDisponiveis(regionalAtual);
        console.error(erro);
        mostrarToast(`Falha ao carregar circuitos: ${erro.message || erro}`, "erro");
    }
}

async function inicializarConsulta() {
    try {
        if (!consultaFluxo.regionais.length) {
            await carregarFluxoConsulta();
        }
        if (consultaRegionalId) {
            await carregarCircuitosConsultaDoBanco();
        }
        if (consultaTelaAtual >= 2 && consultaRegionalId && consultaCircuitoId && consultaCircuitoFinal) {
            await carregarEquipamentosConsulta();
            if (
                consultaTelaAtual === 3 &&
                consultaEquipamentoId &&
                !consultaEquipamentos.some((item) => item.id === consultaEquipamentoId)
            ) {
                consultaTelaAtual = 2;
                consultaEquipamentoId = "";
            }
        }
        consultaInicializada = true;
        renderizarConsulta();
    } catch (erro) {
        console.error(erro);
        mostrarToast(`Falha ao carregar consulta: ${erro.message || erro}`, "erro");
    }
}

async function carregarEquipamentosConsulta() {
    const regionalAtual = obterRegionalConsultaAtual();
    const circuitoAtual = obterCircuitoConsultaAtual();
    const abreviacaoAtual = obterAbreviacaoConsultaAtual();

    try {
        const resposta = await callApi("get_equipamentos_consulta", {
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
        mostrarToast(`Falha ao carregar equipamentos: ${erro.message || erro}`, "erro");
    }
}

function renderizarCabecalhoHistorico(colunas) {
    const head = document.getElementById("historico-head");
    if (!head) {
        return;
    }

    const colunaSelecao = `
        <th class="px-3 py-3 text-center">
            <input aria-label="Selecionar todas as linhas" class="rounded border-outline-variant" id="historico-selecionar-todos" type="checkbox" />
        </th>
    `;

    head.innerHTML = colunaSelecao + colunas
        .map((coluna) => `<th class="px-4 py-3 font-bold uppercase text-center whitespace-nowrap">${coluna}</th>`)
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
                .map((coluna) => `<td class="px-4 py-3 whitespace-nowrap ${classeLinha}">${registro[coluna] ?? ""}</td>`)
                .join("");
            const checkboxHtml = `
                <td class="px-4 py-3 text-center ${classeLinha}">
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
    const tokenRequisicao = ++historicoRequestToken;
    historicoRenderToken += 1;
    historicoSelecionados = new Set();
    historicoRegistros = [];
    historicoTotalRegistros = 0;
    historicoTotalPaginas = 0;
    atualizarEstadoSelecaoHistorico();
    atualizarControlesPaginacaoHistorico();

    if (historicoTamanhoPagina <= 0 && !historicoTemFiltrosAtivos()) {
        if (body) {
            body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${HEADER_ORDEM_AJUSTE.length + 1}">Defina a quantidade por p&aacute;gina ou aplique um filtro para exibir o hist&oacute;rico.</td></tr>`;
        }
        return;
    }

    if (body && !body.querySelector("tr[data-indice]")) {
        body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${HEADER_ORDEM_AJUSTE.length + 1}">Carregando...</td></tr>`;
    }

    try {
        const resposta = await callApi("get_historico", obterFiltrosHistorico());
        if (tokenRequisicao !== historicoRequestToken) {
            return;
        }
        const colunas = resposta?.colunas?.length ? resposta.colunas : HEADER_ORDEM_AJUSTE;
        const registros = resposta?.registros || [];
        const mensagem = resposta?.mensagem || "";
        historicoPaginaAtual = Number(resposta?.pagina || 1);
        historicoTamanhoPagina = Number(
            resposta?.tamanho_pagina ?? historicoTamanhoPagina ?? 0,
        );
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
        if (tokenRequisicao !== historicoRequestToken) {
            return;
        }
        historicoTotalRegistros = 0;
        historicoTotalPaginas = 0;
        atualizarControlesPaginacaoHistorico();
        if (body) {
            body.innerHTML = `<tr><td class="px-4 py-6 text-center text-error" colspan="${HEADER_ORDEM_AJUSTE.length + 1}">Falha ao carregar histórico.</td></tr>`;
        }
        console.error(erro);
        mostrarToast(`Falha ao carregar histórico: ${erro.message || erro}`, "erro");
    }
}

async function deletarSelecionados() {
    const registros = obterRegistrosSelecionados();
    if (!registros.length) {
        mostrarToast("Selecione ao menos uma linha.", "erro");
        return;
    }

    const confirmar = await confirmarExclusao(`Deseja deletar ${registros.length} registro${registros.length === 1 ? "" : "s"} selecionado${registros.length === 1 ? "" : "s"}?`, "Confirmar exclusão");
    if (!confirmar) {
        return;
    }

    try {
        const resposta = await callApi("deletar_historico", registros);
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao deletar registros.");
        }
        mostrarToast(resposta?.mensagem || "Registros deletados com sucesso.");
        await carregarHistorico();
    } catch (erro) {
        console.error(erro);
        mostrarToast(`Falha ao deletar registros: ${erro.message || erro}`, "erro");
    }
}

function texto(el) {
    return el?.textContent?.trim() || "";
}

function valorCampo(id) {
    return document.getElementById(id)?.value?.trim() || "";
}

function formatarSegmentoCircuito(valor) {
    const texto = String(valor || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const letras = texto.slice(0, 3).replace(/[^A-Z]/g, "");
    const digitos = texto.slice(3).replace(/\D/g, "").slice(0, 4);

    if (!letras && !digitos) {
        return "";
    }

    if (!digitos) {
        return letras;
    }

    return `${letras}-${digitos}`;
}

function valorIndicaOff(valor) {
    return String(valor || "").trim().toUpperCase() === "OFF";
}

function detectarTipoCircuito(valor, pickup51N = "", curvaFase = "") {
    if (valorIndicaOff(pickup51N) && valorIndicaOff(curvaFase)) {
        return "MN";
    }

    const texto = String(valor || "").trim().toUpperCase();
    if (!texto) {
        return "";
    }

    return texto.includes("_X_") ? "NA" : "NF";
}

function formatarCircuitoValor(valor) {
    const texto = String(valor || "").trim().toUpperCase();
    const possuiSeparadorFinal = /\s*_?\s*X\s*_?\s*$/i.test(texto);
    const segmentos = texto
        .split(/\s*_?\s*X\s*_?\s*/i)
        .map((parte) => formatarSegmentoCircuito(parte))
        .filter(Boolean);

    if (!segmentos.length) {
        return "";
    }

    const numeroFormatado = segmentos.slice(0, 2).join("_x_");
    if (possuiSeparadorFinal && segmentos.length === 1) {
        return `${numeroFormatado}_x_`;
    }

    return numeroFormatado;
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

function formatarDataHoraDraft(timestamp) {
    const valor = Number(timestamp || 0);
    if (!valor) {
        return "-";
    }

    const data = new Date(valor * 1000);
    if (Number.isNaN(data.getTime())) {
        return "-";
    }

    return data.toLocaleString("pt-BR");
}

function dataBrParaIso(dataBr) {
    const valor = String(dataBr || "").trim();
    const partes = valor.split("/");
    if (partes.length !== 3) {
        return "";
    }

    const [dia, mes, ano] = partes;
    if (!(dia && mes && ano)) {
        return "";
    }

    return `${ano.padStart(4, "0")}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function sincronizarDadosHeader() {
    const dataExecucao = document.getElementById("header-data-input");
    const campoCircuito = document.getElementById("header-circuito");
    const campoTensao = document.getElementById("header-tensao");
    const campoTensaoDisplay = document.getElementById("header-tensao-display");

    if (dataExecucao && !dataExecucao.value) {
        dataExecucao.value = obterDataHojeIso();
    }

    if (campoCircuito) {
        campoCircuito.value = formatarCircuitoValor(campoCircuito.value);
    }

    if (campoTensao) {
        campoTensao.value = campoTensao.value || "13.800V";
    }

    if (campoTensaoDisplay) {
        campoTensaoDisplay.textContent = campoTensao?.value || "13.800V";
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
    const observacoesFixas = obterObservacoesFixasPorModo();
    const observacoesAdicionais = document.getElementById("observacoes")?.value?.trim() || "";

    return observacoesAdicionais
        ? [...observacoesFixas, observacoesAdicionais].join(" | ")
        : observacoesFixas.join(" | ");
}

function extrairObservacoesAdicionais(valor) {
    const texto = String(valor || "").trim();
    if (!texto) {
        return "";
    }

    const partes = texto
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => item !== LINHA_VIVA_OBSERVACAO_FIXA)
        .filter((item) => !item.startsWith("Single Shot:"));

    return partes.join(" | ");
}

function extrairOperacaoSingleShot(valor) {
    const texto = String(valor || "").trim();
    if (!texto) {
        return "";
    }

    const match = texto.match(/Single Shot:\s*Ativo conforme os ajustes parametrizados na opera(?:ç|c)[aã]o\s+([^.|]+)\./i);
    return match?.[1]?.trim() || "";
}

function sincronizarCamposParaClone(origem, clone) {
    const camposOrigem = Array.from(origem.querySelectorAll("input, textarea, select"));
    const camposClone = Array.from(clone.querySelectorAll("input, textarea, select"));

    camposOrigem.forEach((campoOrigem, indice) => {
        const campoClone = camposClone[indice];
        if (!campoClone) {
            return;
        }

        if (campoOrigem.tagName === "TEXTAREA") {
            campoClone.textContent = campoOrigem.value || "";
        } else if (campoOrigem.tagName === "SELECT") {
            campoClone.value = campoOrigem.value;
            Array.from(campoClone.options).forEach((option) => {
                option.selected = option.value === campoOrigem.value;
            });
        } else {
            campoClone.value = campoOrigem.value || "";
            campoClone.setAttribute("value", campoOrigem.value || "");
            if (campoOrigem.checked) {
                campoClone.setAttribute("checked", "checked");
            } else {
                campoClone.removeAttribute("checked");
            }
        }

        campoClone.setAttribute("readonly", "readonly");
        campoClone.setAttribute("tabindex", "-1");
    });
}

function criarContainerCaptura(inicioOriginal) {
    const larguraBase = 1600;
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-100000px";
    container.style.top = "0";
    container.style.width = `${larguraBase}px`;
    container.style.padding = "0";
    container.style.margin = "0";
    container.style.background = "#ffffff";
    container.style.zIndex = "-1";
    container.style.overflow = "hidden";

    const main = document.createElement("main");
    main.style.maxWidth = "none";
    main.style.width = `${larguraBase}px`;
    main.style.padding = "0";
    main.style.margin = "0";
    main.style.background = "#ffffff";

    const inicioClone = inicioOriginal.cloneNode(true);
    sincronizarCamposParaClone(inicioOriginal, inicioClone);
    inicioClone.querySelectorAll("button, nav, [onclick], .tab-trigger").forEach((elemento) => {
        elemento.remove();
    });
    inicioClone.style.margin = "0";
    inicioClone.style.padding = "0";
    inicioClone.style.width = "100%";
    inicioClone.setAttribute("data-pdf-capture", "true");
    inicioClone.querySelectorAll("*").forEach((elemento) => {
        if (elemento instanceof HTMLElement) {
            if (window.getComputedStyle(elemento).position === "fixed") {
                elemento.remove();
            }
        }
    });

    const estilosPdf = document.createElement("style");
    estilosPdf.textContent = `
      [data-pdf-capture="true"] {
        margin: 0 !important;
        padding: 0 !important;
      }

      [data-pdf-capture="true"] .summary-grid {
        margin-bottom: 10px !important;
        padding: 8px 10px !important;
        border-radius: 10px !important;
      }

      [data-pdf-capture="true"] .summary-meta {
        margin-top: 8px !important;
      }

      [data-pdf-capture="true"] .grid {
        gap: 6px !important;
      }

      [data-pdf-capture="true"] label,
      [data-pdf-capture="true"] .font-label {
        font-size: 11px !important;
        font-weight: 700 !important;
      }

      [data-pdf-capture="true"] input,
      [data-pdf-capture="true"] textarea,
      [data-pdf-capture="true"] select {
        min-height: 0 !important;
        height: 26px !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        font-size: 14px !important;
      }

      [data-pdf-capture="true"] .technical-table {
        font-size: 13px !important;
      }

      [data-pdf-capture="true"] .technical-table th,
      [data-pdf-capture="true"] .technical-table td {
        padding: 2px 6px !important;
      }

      [data-pdf-capture="true"] .technical-table input {
        height: 20px !important;
        line-height: 20px !important;
        font-size: 13px !important;
      }

      [data-pdf-capture="true"] .technical-table th {
        font-size: 12px !important;
        font-weight: 800 !important;
      }

      [data-pdf-capture="true"] h2 {
        font-size: 13px !important;
      }

      [data-pdf-capture="true"] .rounded-xl,
      [data-pdf-capture="true"] .rounded-lg,
      [data-pdf-capture="true"] .rounded-md {
        border-radius: 8px !important;
      }

      [data-pdf-capture="true"] #observacoes {
        min-height: 64px !important;
        height: 64px !important;
        font-size: 13px !important;
      }

      [data-pdf-capture="true"] .mt-8,
      [data-pdf-capture="true"] .mt-10,
      [data-pdf-capture="true"] .mt-12,
      [data-pdf-capture="true"] .mt-14 {
        margin-top: 8px !important;
      }

      [data-pdf-capture="true"] .mb-8,
      [data-pdf-capture="true"] .mb-6,
      [data-pdf-capture="true"] .mb-5,
      [data-pdf-capture="true"] .mb-4 {
        margin-bottom: 8px !important;
      }

      [data-pdf-capture="true"] h1,
      [data-pdf-capture="true"] h2 {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
      }

      [data-pdf-capture="true"] p,
      [data-pdf-capture="true"] span,
      [data-pdf-capture="true"] div {
        font-size: 13px !important;
      }
    `;
    main.appendChild(estilosPdf);
    main.appendChild(inicioClone);
    container.appendChild(main);
    document.body.appendChild(container);
    return container;
}

function montarHtmlPdfFront() {
    sincronizarDadosHeader();

    const inicioOriginal = document.querySelector('[data-screen="inicio"]');
    if (!inicioOriginal) {
        return "";
    }

    const inicioClone = inicioOriginal.cloneNode(true);
    sincronizarCamposParaClone(inicioOriginal, inicioClone);

    const headHtml = Array.from(document.head.children)
        .filter((elemento) => ["META", "TITLE", "STYLE", "LINK"].includes(elemento.tagName))
        .map((elemento) => elemento.outerHTML)
        .join("\n");

    return `<!DOCTYPE html>
<html class="${document.documentElement.className}" lang="pt-BR">
<head>
${headHtml}
<style>
  body {
    min-height: auto !important;
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  main {
    max-width: none !important;
    padding: 12px !important;
    margin: 0 !important;
  }

  input,
  textarea,
  select {
    pointer-events: none !important;
    caret-color: transparent !important;
    color: inherit !important;
    -webkit-text-fill-color: currentColor !important;
  }

  .summary-grid,
  .technical-table,
  .technical-table td,
  .technical-table th {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @page {
    size: A4 landscape;
    margin: 10mm;
  }
</style>
</head>
<body class="${document.body.className}">
  <main>
    ${inicioClone.outerHTML}
  </main>
</body>
</html>`;
}

async function capturarImagemPdfFront() {
    sincronizarDadosHeader();

    if (typeof window.html2canvas !== "function") {
        return "";
    }

    const inicioOriginal = document.querySelector('[data-screen="inicio"]');
    if (!inicioOriginal) {
        return "";
    }

    const container = criarContainerCaptura(inicioOriginal);
    try {
        const alvo = container.firstElementChild;
        const canvas = await window.html2canvas(alvo, {
            backgroundColor: "#ffffff",
            scale: 3,
            useCORS: true,
            logging: false,
            width: alvo.scrollWidth,
            height: alvo.scrollHeight,
            windowWidth: alvo.scrollWidth,
            windowHeight: alvo.scrollHeight,
        });
        return canvas.toDataURL("image/png");
    } catch (erro) {
        console.error("Falha ao capturar screenshot para PDF.", erro);
        return "";
    } finally {
        container.remove();
    }
}

function preencherFormularioComDraft(dados) {
    const payload = dados || {};
    definirModoFormulario(payload.ModoFormulario || payload.Modo || "");
    document.getElementById("header-numero").value = String(payload.Numero || payload.Religador || "");
    document.getElementById("header-circuito").value = formatarCircuitoValor(String(payload.Circuito || ""));
    document.getElementById("header-marca").value = String(payload.Marca || "");
    document.getElementById("header-autor").value = String(payload.Engenheiro || "");
    document.getElementById("header-tensao").value = String(payload.TensaoPdf || payload.Tensao || "");
    document.getElementById("header-tensao-display").textContent = String(payload.TensaoPdf || payload.Tensao || "13.800V");
    document.getElementById("header-data-input").value = dataBrParaIso(payload.Data_Emissao || "");
    obterCampoSingleShotOperacao().value = String(
        payload.SingleShotOperacao || extrairOperacaoSingleShot(payload.Observacoes || "") || SINGLE_SHOT_OPERACAO_PADRAO
    );
    document.getElementById("observacoes").value = extrairObservacoesAdicionais(payload.Observacoes || "");

    const ajustes = Array.from(document.querySelectorAll(".technical-table input"));
    CAMPOS_AJUSTES.forEach((campo, indice) => {
        if (!ajustes[indice]) {
            return;
        }
        ajustes[indice].value = String(payload[campo] || "");
    });

    sincronizarDadosHeader();
}

async function abrirDraftSalvo(equipmentId) {
    try {
        await garantirSessao();
        const resposta = await callApi("get_draft", equipmentId);
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao abrir rascunho.");
        }

        preencherFormularioComDraft(resposta?.draft?.dados || {});
        alternarTela("inicio");
    } catch (erro) {
        mostrarToast(erro?.message || "Falha ao abrir rascunho.", "erro");
    }
}

async function publicarDraftSalvo(equipmentId) {
    try {
        await garantirSessao();
        const resposta = await executarPublicacaoComProgresso({ Numero: equipmentId });
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao publicar rascunho.");
        }

        const arquivos = Array.isArray(resposta?.arquivos_pdf) ? resposta.arquivos_pdf : [];
        const mensagemArquivos = arquivos.length ? `\nPDF salvo em:\n${arquivos.join("\n")}` : "";
        const mensagemSharepoint = resposta?.sharepoint_path
            ? `\nSharePoint:\n${resposta.sharepoint_path}`
            : "";
        mostrarToast(resposta?.mensagem || "Publicado com sucesso.");
        await carregarDraftsSalvos();
    } catch (erro) {
        mostrarToast(erro?.message || "Falha ao publicar rascunho.", "erro");
    }
}

async function publicarDraftsSelecionados() {
    const equipmentIds = Array.from(draftsSelecionados).filter(Boolean);
    if (!equipmentIds.length || publicacaoLoteAtiva) {
        return;
    }

    publicacaoLoteAtiva = true;
    let publicados = 0;
    let falhas = 0;
    renderizarDraftsSalvos();

    try {
        await garantirSessao();

        for (const equipmentId of equipmentIds) {
            draftStatusMap[equipmentId] = "publicando";
            renderizarDraftsSalvos();

            try {
                const resposta = await executarPublicacaoComProgresso({ Numero: equipmentId });
                if (resposta?.status === "erro") {
                    throw new Error(resposta?.mensagem || "Falha ao publicar rascunho.");
                }
                draftStatusMap[equipmentId] = "ok";
                draftsSelecionados.delete(equipmentId);
                publicados += 1;
            } catch (erro) {
                console.error(erro);
                draftStatusMap[equipmentId] = "erro";
                falhas += 1;
            }

            renderizarDraftsSalvos();
        }
    } finally {
        publicacaoLoteAtiva = false;
        await carregarDraftsSalvos();
        renderizarDraftsSalvos();
    }

    if (falhas) {
        mostrarToast(`${publicados} publicado(s), ${falhas} com falha.`, "erro");
        return;
    }

    mostrarToast(`${publicados} rascunho(s) publicado(s) com sucesso.`);
}

async function excluirDraftSalvo(equipmentId) {
    const confirmar = await confirmarExclusao(`Deseja excluir o rascunho do equipamento ${equipmentId}?`, "Confirmar exclusão");
    if (!confirmar) {
        return;
    }

    try {
        await garantirSessao();
        const resposta = await callApi("delete_draft", equipmentId);
        if (resposta?.status === "erro") {
            throw new Error(resposta?.mensagem || "Falha ao excluir rascunho.");
        }

        mostrarToast(resposta?.mensagem || "Rascunho removido com sucesso.");
        await carregarDraftsSalvos();
    } catch (erro) {
        mostrarToast(erro?.message || "Falha ao excluir rascunho.", "erro");
    }
}

function montarRegistroOrdenado() {
    const dataEmissao = extrairDataEmissao();
    const engenheiro = valorCampo("header-autor");
    const circuitoInformado = formatarCircuitoValor(valorCampo("header-circuito"));
    const regionalDetectada = encontrarRegionalPorCircuito(circuitoInformado);
    const tensao = valorCampo("header-tensao");
    const ajustes = Array.from(document.querySelectorAll(".technical-table input"));
    const pickup51N = ajustes[10]?.value?.trim() || "";
    const curvaNeutro = ajustes[11]?.value?.trim() || "";
    const tipoCircuito = detectarTipoCircuito(circuitoInformado, pickup51N, curvaNeutro);
    const curvaFase = ajustes[3]?.value?.trim() || "";

    const campoCircuito = document.getElementById("header-circuito");
    if (campoCircuito) {
        campoCircuito.value = circuitoInformado;
    }

    const valores = {
        ANO: extrairAno(dataEmissao),
        Numero: valorCampo("header-numero"),
        ModoFormulario: modoFormulario,
        Circuito: circuitoInformado,
        Regional: regionalDetectada?.regional || "",
        Marca: valorCampo("header-marca"),
        Tipo: tipoCircuito,
        Data_Emissao: dataEmissao,
        Engenheiro: engenheiro,
        Pickup_50P: ajustes[0]?.value?.trim() || "",
        Tempo_Minimo_50P: ajustes[1]?.value?.trim() || "",
        Pickup_51P: ajustes[2]?.value?.trim() || "",
        Curva_Fase: curvaFase,
        TimeDial_Fase: ajustes[4]?.value?.trim() || "",
        Curva_Rapida_Fase: ajustes[5]?.value?.trim() || "",
        TimeDial_CR: ajustes[6]?.value?.trim() || "",
        PartidaCR: ajustes[7]?.value?.trim() || "",
        Pickup_50N: ajustes[8]?.value?.trim() || "",
        Tempo_Minimo_50N: ajustes[9]?.value?.trim() || "",
        Pickup_51N: pickup51N,
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
        SingleShotOperacao: obterSingleShotOperacaoAtual(),
        NumeroAjuste: "",
        RegionalDetectada: regionalDetectada?.regional || "",
        TensaoPdf: tensao,
    };

    if (modoFormulario === "seccionalizador") {
        CAMPOS_AJUSTES.forEach((campo) => {
            if (!CAMPOS_AJUSTES_SECCIONALIZADOR.has(campo)) {
                valores[campo] = "";
            }
        });
    }

    return HEADER_ORDEM_AJUSTE.reduce((registro, chave) => {
        registro[chave] = valores[chave] ?? "";
        return registro;
    }, {
        ModoFormulario: valores.ModoFormulario,
        RegionalDetectada: valores.RegionalDetectada,
        TensaoPdf: valores.TensaoPdf,
        SingleShotOperacao: valores.SingleShotOperacao,
    });
}

async function salvar() {
    try {
        const dados = montarRegistroOrdenado();
        await garantirSessao();
        const res = await callApi("salvar", dados);
        if (res?.status === "erro") {
            mostrarToast(res?.mensagem || "Falha ao salvar.", "erro");
            return;
        }

        mostrarToast(res?.mensagem || "Rascunho salvo com sucesso.");
        if (!document.querySelector('[data-screen="salvos"]')?.classList.contains("hidden")) {
            await carregarDraftsSalvos();
        }
    } catch (erro) {
        mostrarToast(erro?.message || "Falha ao preparar sessão para salvar.", "erro");
    }
}

async function publicar() {
    try {
        const dados = montarRegistroOrdenado();
        const equipmentId = String(dados?.Numero || obterEquipmentIdAtual() || "").trim();
        if (!equipmentId) {
            mostrarToast("Informe o número do equipamento antes de publicar.", "erro");
            return;
        }

        await garantirSessao();
        const res = await executarPublicacaoComProgresso(dados);
        if (res?.status === "erro") {
            mostrarToast(res?.mensagem || "Falha ao publicar.", "erro");
            return;
        }

        const arquivos = Array.isArray(res?.arquivos_pdf) ? res.arquivos_pdf : [];
        const mensagemArquivos = arquivos.length ? `\nPDF salvo em:\n${arquivos.join("\n")}` : "";
        const mensagemSharepoint = res?.sharepoint_path
            ? `\nSharePoint:\n${res.sharepoint_path}`
            : "";
        mostrarToast(res?.mensagem || "Publicado com sucesso.");
        if (!document.querySelector('[data-screen="salvos"]')?.classList.contains("hidden")) {
            await carregarDraftsSalvos();
        }
    } catch (erro) {
        mostrarToast(erro?.message || "Falha ao preparar sessão para publicar.", "erro");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const startupMessage = document.getElementById("app-loading-message");
    if (startupMessage) {
        startupMessage.textContent = "Carregando sessão e preparando a interface...";
    }

    const abaPersistida = carregarAbaAtivaPersistida();
    definirModoFormulario(window.localStorage?.getItem(MODO_FORMULARIO_STORAGE_KEY) || "");
    if (abaPersistida === "consulta") {
        restaurarEstadoConsultaPersistido();
        abaAtiva = "consulta";
    }

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

    document.querySelectorAll("[data-form-mode]").forEach((botao) => {
        botao.addEventListener("click", () => definirModoFormulario(botao.dataset.formMode));
    });

    document.getElementById("app-confirm-cancel")?.addEventListener("click", () => fecharConfirmacao(false));
    document.getElementById("app-confirm-accept")?.addEventListener("click", () => fecharConfirmacao(true));
    document.getElementById("app-confirm-overlay")?.addEventListener("click", (evento) => {
        if (evento.target?.id === "app-confirm-overlay") {
            fecharConfirmacao(false);
        }
    });
    document.getElementById("settings-save")?.addEventListener("click", () => salvarConfiguracoes());

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && confirmResolverAtual) {
            fecharConfirmacao(false);
        }
    });

    document.getElementById("header-circuito")?.addEventListener("input", (evento) => {
        const valorFormatado = formatarCircuitoValor(evento.target.value);
        if (evento.target.value !== valorFormatado) {
            evento.target.value = valorFormatado;
        }
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
        historicoTamanhoPagina = Number(evento.target.value || 0);
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

    if (buscaEquipamento) {
        buscaEquipamento.value = consultaBuscaEquipamento;
    }
    if (buscaRegistro) {
        buscaRegistro.value = consultaBuscaRegistro;
    }

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
        persistirEstadoConsulta();
        if (consultaTelaAtual === 2) {
            renderizarTela2Consulta();
        }
    });

    buscaRegistro?.addEventListener("input", (evento) => {
        consultaBuscaRegistro = evento.target.value || "";
        persistirEstadoConsulta();
        if (consultaTelaAtual === 3) {
            renderizarTela3Consulta();
        }
    });

    try {
        await sincronizarSessaoAtiva();

        if (abaPersistida === "configuracoes") {
            await alternarTelaInicial("configuracoes");
        } else {
            await alternarTelaInicial(abaPersistida === "consulta" ? "consulta" : "inicio");
        }
    } finally {
        finalizarInicializacaoApp();
    }
});
