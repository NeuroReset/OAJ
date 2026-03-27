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

function obterFiltrosHistorico() {
    return {
        numero: document.getElementById("filtro-numero")?.value?.trim() || "",
        circuito: document.getElementById("filtro-circuito")?.value?.trim() || "",
        ano: document.getElementById("filtro-ano")?.value?.trim() || "",
        data_inicio: document.getElementById("filtro-data-inicio")?.value || "",
        data_fim: document.getElementById("filtro-data-fim")?.value || "",
    };
}

function alternarTela(aba) {
    const ehHistorico = aba === "historico";

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

    if (ehHistorico) {
        carregarHistorico();
    }
}

function renderizarCabecalhoHistorico(colunas) {
    const head = document.getElementById("historico-head");
    if (!head) {
        return;
    }

    head.innerHTML = colunas
        .map((coluna) => `<th class="px-3 py-2 font-bold uppercase text-center whitespace-nowrap">${coluna}</th>`)
        .join("");
}

function renderizarTabelaHistorico(colunas, registros) {
    const body = document.getElementById("historico-body");
    if (!body) {
        return;
    }

    if (!registros.length) {
        body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${colunas.length || 1}">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    body.innerHTML = registros
        .map((registro, indice) => {
            const classeLinha = indice % 2 === 0 ? "bg-white" : "bg-surface-container-low";
            const colunasHtml = colunas
                .map((coluna) => `<td class="px-3 py-2 whitespace-nowrap ${classeLinha}">${registro[coluna] ?? ""}</td>`)
                .join("");

            return `<tr>${colunasHtml}</tr>`;
        })
        .join("");
}

async function carregarHistorico() {
    const body = document.getElementById("historico-body");
    if (body) {
        body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${HEADER_ORDEM_AJUSTE.length}">Carregando...</td></tr>`;
    }

    try {
        const resposta = await window.pywebview.api.get_historico(obterFiltrosHistorico());
        const colunas = resposta?.colunas?.length ? resposta.colunas : HEADER_ORDEM_AJUSTE;
        const registros = resposta?.registros || [];
        const mensagem = resposta?.mensagem || "";

        renderizarCabecalhoHistorico(colunas);
        renderizarTabelaHistorico(colunas, registros);

        if (mensagem && !registros.length && body) {
            body.innerHTML = `<tr><td class="px-4 py-6 text-center text-on-surface-variant" colspan="${colunas.length || 1}">${mensagem}</td></tr>`;
        }
    } catch (erro) {
        if (body) {
            body.innerHTML = `<tr><td class="px-4 py-6 text-center text-error" colspan="${HEADER_ORDEM_AJUSTE.length}">Falha ao carregar histÃ³rico.</td></tr>`;
        }
        console.error(erro);
        alert(`Falha ao carregar histÃ³rico: ${erro.message || erro}`);
    }
}

function texto(el) {
    return el?.textContent?.trim() || "";
}

function valorInput(inputs, index) {
    return inputs[index]?.value?.trim() || "";
}

function extrairDataEmissao() {
    const meta = texto(document.querySelector(".summary-meta span"));
    const match = meta.match(/(\d{2}\/\d{2}\/\d{4})/);
    return match ? match[1] : "";
}

function extrairAno(dataEmissao) {
    const match = dataEmissao.match(/(\d{4})$/);
    return match ? match[1] : "";
}

function extrairObservacoes() {
    const observacoes = Array.from(document.querySelectorAll("section p.leading-relaxed"))
        .map((item) => item.innerText.trim())
        .filter(Boolean);

    return observacoes.join(" | ");
}

function montarRegistroOrdenado() {
    const inputs = Array.from(document.querySelectorAll("input"));
    const dataEmissao = extrairDataEmissao();
    const engenheiro = texto(document.querySelector(".summary-grid p"));

    const valores = {
        ANO: extrairAno(dataEmissao),
        Numero: valorInput(inputs, 0),
        Circuito: valorInput(inputs, 1),
        Regional: "",
        Marca: valorInput(inputs, 3),
        Tipo: "",
        Data_Emissao: dataEmissao,
        Engenheiro: engenheiro,
        Pickup_50P: valorInput(inputs, 4),
        Tempo_Minimo_50P: valorInput(inputs, 5),
        Pickup_51P: valorInput(inputs, 6),
        Curva_Fase: valorInput(inputs, 7),
        TimeDial_Fase: valorInput(inputs, 8),
        Curva_Rapida_Fase: valorInput(inputs, 9),
        TimeDial_CR: valorInput(inputs, 10),
        PartidaCR: valorInput(inputs, 11),
        Pickup_50N: valorInput(inputs, 12),
        Tempo_Minimo_50N: valorInput(inputs, 13),
        Pickup_51N: valorInput(inputs, 14),
        Curva_Neutro: valorInput(inputs, 15),
        TimeDial_Neutro: valorInput(inputs, 16),
        CurvaRapidaNeutro: valorInput(inputs, 17),
        Time_Dial_CR: valorInput(inputs, 18),
        Partida_da_CR: valorInput(inputs, 19),
        Trip: valorInput(inputs, 20),
        Temporizacao: valorInput(inputs, 21),
        Operacoes: valorInput(inputs, 22),
        Tempo_Morto: valorInput(inputs, 23),
        Operacao_1: valorInput(inputs, 24),
        Operacao_2: "",
        Operacao_3: "",
        Operacao_4: "",
        Tempo_Morto_Adicional: valorInput(inputs, 25),
        Reset_Time: valorInput(inputs, 26),
        HCL: valorInput(inputs, 27),
        Maximum_Time: valorInput(inputs, 28),
        Inrush: valorInput(inputs, 29),
        Sequence_Control: valorInput(inputs, 30),
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
    renderizarCabecalhoHistorico(HEADER_ORDEM_AJUSTE);

    document.querySelectorAll(".tab-trigger").forEach((botao) => {
        botao.addEventListener("click", () => alternarTela(botao.dataset.tab));
    });
});
