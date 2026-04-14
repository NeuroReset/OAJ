# OAJ

Aplicação desktop em Python para cadastro, visualização e histórico de Ordens de Ajuste, com interface HTML/JavaScript exibida via `pywebview` e persistência em SQL Server.

## Visão Geral

O projeto foi estruturado para operar como uma aplicação desktop híbrida:

- Backend em Python
- Frontend em HTML + JavaScript
- Janela nativa com `pywebview`
- Leitura de credenciais a partir do arquivo `db_config.json`
- Gravação e consulta de dados em SQL Server

O fluxo atual é:

1. O `main.py` sobe a janela da aplicação.
2. O frontend em `web/index.html` renderiza a tela principal.
3. O JavaScript em `web/script.js` conversa com o backend usando `window.pywebview.api`.
4. O backend consulta ou salva registros na tabela `dbo.tbl_oaj`.

## Estrutura do Projeto

```text
OAJ/
├─ main.py
├─ db.py
├─ requirements.txt
├─ db_config.example.json
├─ .gitignore
└─ web/
   ├─ index.html
   └─ script.js
```

## Arquivos Principais

### `main.py`

Ponto de entrada da aplicação.

Responsabilidades:

- iniciar o `pywebview`
- expor a classe `Api` para o frontend
- implementar as operações principais da interface
- consultar histórico
- salvar dados no banco
- testar conexão

### `db.py`

Camada de acesso à configuração e conexão com banco.

Responsabilidades:

- localizar o arquivo `db_config.json`
- ler as credenciais definidas em `db_config.json`
- extrair `server`, `database`, `user` e `password`
- abrir conexão `pyodbc` com SQL Server

### `web/index.html`

Interface principal da aplicação.

Hoje contém:

- tela de preenchimento da ordem de ajuste
- navegação entre `Início` e `Histórico`
- tabela de histórico
- botões de salvamento

### `web/script.js`

Lógica de frontend.

Responsabilidades:

- alternar abas e telas
- montar filtros do histórico
- carregar histórico pelo backend
- renderizar tabela
- coletar os dados do formulário
- enviar os dados para a função Python de salvamento

## Tecnologias Utilizadas

- Python 3
- `pywebview`
- `pandas`
- `pyodbc`
- HTML
- JavaScript
- Tailwind via CDN

## Requisitos

Antes de executar, garanta que a máquina tenha:

- Python 3 instalado
- acesso ao SQL Server
- `ODBC Driver 17 for SQL Server` instalado
- arquivo `db_config.json` preenchido com as credenciais

## Instalação

### 1. Clonar o repositório

```powershell
git clone https://github.com/NeuroReset/OAJ.git
cd OAJ
```

### 2. Criar ambiente virtual

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Instalar dependências

```powershell
pip install -r requirements.txt
```

## Configuração

O projeto não versiona credenciais reais.

Crie um arquivo `db_config.json` na raiz do projeto com base no exemplo `db_config.example.json`.

Exemplo:

```json
{
  "server": "BRAZRPROTAPP01",
  "database": "edp-coi-sp",
  "user": "admin-coi",
  "password": "sua-senha"
}
```

Esse arquivo deve definir diretamente:

- servidor
- banco
- usuário
- senha

O backend usa esses valores diretamente para montar a conexão com o SQL Server.

## Como Executar

```powershell
python main.py
```

Ao iniciar:

- o backend testa a conexão
- a janela desktop é aberta
- a interface HTML é carregada

## Integração Frontend x Backend

O `pywebview` expõe métodos Python ao JavaScript pela API:

- `testar_conexao()`
- `get_historico(filtros=None)`
- `salvar(dados)`

No frontend, essas chamadas acontecem por:

```javascript
window.pywebview.api.nomeDaFuncao(...)
```

## Banco de Dados

Tabela atualmente usada:

```text
dbo.tbl_oaj
```

O método `salvar()` monta dinamicamente o `INSERT` com base no objeto recebido do frontend.

O método `get_historico()` hoje busca os 100 registros mais recentes.

## Estado Atual do Projeto

Neste momento o projeto já possui:

- estrutura base funcional
- janela desktop com `pywebview`
- tela principal de edição
- navegação para histórico
- carregamento de histórico
- salvamento básico no banco
- versionamento Git configurado
- publicação no GitHub

## Próximos Passos Sugeridos

Agora que você vai implementar tratamentos e regras de negócio, o caminho natural é evoluir nestas frentes:

### Backend

- validar campos obrigatórios
- normalizar tipos de dados
- tratar erros de conexão com mensagens melhores
- aplicar filtros reais em `get_historico`
- separar regras de negócio da camada de acesso a dados
- adicionar logs

### Frontend

- validar formulário antes de salvar
- destacar campos inválidos
- melhorar mensagens de erro e sucesso
- preencher dados automaticamente ao editar registros
- criar navegação mais clara entre cadastro e histórico

### Arquitetura

- criar camada de serviços
- criar camada de repositório para SQL
- evitar dependência de posição fixa dos inputs no HTML
- mapear campos por `id` ou `name`, não por índice

## Pontos de Atenção

O projeto ainda tem alguns acoplamentos que valem atenção:

- o JavaScript depende muito da ordem dos inputs no DOM
- as credenciais locais precisam ser mantidas fora do Git
- o SQL de histórico ainda não aplica os filtros recebidos
- o tratamento de erros ainda é básico

## Boas Práticas para Evolução

Ao continuar a implementação:

- mantenha credenciais fora do Git
- prefira identificar inputs por `id`
- documente novas colunas e regras de negócio
- faça commits pequenos por funcionalidade
- teste frontend e backend a cada alteração relevante

## Publicação

Repositório remoto:

```text
https://github.com/NeuroReset/OAJ
```

## Licença

Definir posteriormente.
