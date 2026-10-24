---
name: FácilPDF
description: Espaço de edição documental com formulário, scanner e prévia do PDF.
colors:
  primary: "#176348"
  primary-hover: "#105139"
  ink: "#202c28"
  muted: "#58675f"
  canvas: "#f5f7f5"
  surface: "#ffffff"
  topbar: "#fafbf9"
  border: "#dce3dd"
  input-border: "#d6dfd7"
  nav-hover: "#f3f6f3"
  nav-selected: "#e9f3ec"
  icon-surface: "#eef5ef"
  preview-stage: "#ecf0ed"
  preview-footer: "#f6f8f5"
  focus: "#35865f"
  selection: "#c5e7d6"
  selection-ink: "#173a2c"
  notice-bg: "#edf6ef"
  notice-border: "#b9d5c2"
  notice-ink: "#214f35"
  validation-bg: "#fff4ee"
  validation-ink: "#873e23"
  dropzone-border: "#a9bfb0"
  dropzone-busy: "#f0f6f1"
  control-ink: "#00713fde"
  choice-selected: "#eff7f1"
  choice-selected-border: "#8bb89a"
  review-warning: "#894d16"
  dark-primary: "#8bddb2"
  dark-primary-hover: "#a5e7c4"
  dark-ink: "#e4eee7"
  dark-muted: "#a7baad"
  dark-canvas: "#141c18"
  dark-surface: "#1e2922"
  dark-topbar: "#141c18"
  dark-border: "#3b4d41"
  dark-input-border: "#3b4d41"
  dark-nav-hover: "#26342b"
  dark-nav-selected: "#243c2e"
  dark-icon-surface: "#243c2e"
  dark-preview-stage: "#17211b"
  dark-preview-footer: "#26342b"
  dark-focus: "#8bddb2"
  dark-selection: "#355f46"
  dark-selection-ink: "#d5f4e3"
  dark-notice-bg: "#243c2e"
  dark-notice-border: "#466e54"
  dark-notice-ink: "#c2e6ce"
  dark-validation-bg: "#392a20"
  dark-validation-ink: "#f6c195"
  dark-dropzone-border: "#608a6d"
  dark-dropzone-busy: "#243c2e"
  dark-choice-selected: "#243c2e"
  dark-choice-selected-border: "#669d7a"
  dark-review-warning: "#f6c195"
  dark-solid: "#25734f"
  dark-solid-hover: "#2c8059"
typography:
  headline:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-1px"
  title:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 650
    letterSpacing: "-0.3px"
  body:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 550
  input:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "16px"
  input-mobile:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "16px"
  person-label:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "14px"
  button:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 550
    lineHeight: "20px"
  headline-mobile:
    fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif'
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-1px"
rounded:
  paper: "2px"
  control: "4px"
  native-control: "5px"
  icon: "6px"
  navigation: "7px"
  panel: "10px"
  dropzone: "12px"
spacing:
  tight: "4px"
  control-gap: "8px"
  inline: "12px"
  compact: "16px"
  panel: "24px"
  roomy: "32px"
  desktop-gutter: "38px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    textColor: "{colors.control-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 12px"
  field:
    backgroundColor: "{colors.surface}"
    typography: "{typography.input}"
    height: "42px"
    padding: "0 10px"
  navigation:
    textColor: "{colors.muted}"
    rounded: "{rounded.navigation}"
    padding: "13px 14px"
  navigation-selected:
    textColor: "{colors.primary}"
    backgroundColor: "{colors.nav-selected}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  notice:
    backgroundColor: "{colors.notice-bg}"
    textColor: "{colors.notice-ink}"
    rounded: "{rounded.navigation}"
    padding: "13px 16px"
  a4-tag:
    rounded: "{rounded.control}"
    padding: "4px 8px"
  dropzone:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.dropzone}"
    padding: "50px 25px"
  native-select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.native-control}"
    height: "38px"
    padding: "6px 10px"
  signature-choice:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.navigation}"
    padding: "13px"
  signature-choice-selected:
    backgroundColor: "{colors.choice-selected}"
---

# Design System: FácilPDF

## Overview

**Creative North Star: "Operate — mesa de edição documental"**

Um espaço de trabalho com verde documental, superfícies claras ou escuras e papel branco. A hierarquia acompanha a tarefa: preencher, conferir o documento e salvar. Em telas largas, formulário e prévia dividem o espaço de trabalho; em telas menores, cada etapa ocupa a área disponível. Scanner e histórico usam vistas próprias.

Este documento atualiza a direção provisória com os valores implementados em `src/styles.css`, `src/form-v2.css`, `src/workflow.css`, `src/App.tsx`, `src/ContractForm.tsx`, `src/ScannerView.tsx`, `src/theme.css`, `src/Appearance.tsx`, `src/LocationFields.tsx` e no tema Radix compartilhado. A interface foi desenvolvida em código para teste local; não representa aprovação de uma composição visual pelo usuário. O modo escuro e a preferência persistente foram solicitados pelo usuário como extensão da identidade existente. Direção inicial: variância 3/10, movimento 2/10 e densidade 5/10.

**Key Characteristics:**

- Verde concentrado nas ações, seleção e sinais de documento.
- Painéis tonais com bordas finas sobre fundo esverdeado, acompanhando a aparência escolhida.
- Tipografia compacta e hierarquia orientada à edição.
- Prévia do PDF como parte funcional do espaço de trabalho.

## Colors

O verde profundo é o único acento de identidade; tons quentes aparecem na validação.

- `primary` identifica ações principais, navegação selecionada e ícones documentais; `primary-hover` reforça a interação.
- `ink` é o texto principal e `muted` acompanha instruções e metadados.
- `canvas`, `surface`, `topbar` e `preview-stage` separam as áreas por tom, sem grandes contrastes decorativos.
- `border` delimita os painéis. A entrada usa `input-border` como contorno interno.
- `notice-*` identifica mensagens de estado. `validation-*` identifica campos que precisam de revisão.
- `focus` é o contorno global de teclado; `selection` e `selection-ink` definem a seleção de texto.

Os tokens acima registram os papéis reutilizáveis da aplicação. Variações pontuais de divisores e metadados continuam no CSS. Os controles mantêm a escala green/sage do Radix nos dois modos, com substituição explícita de green-9 e green-10.

### Aparência clara, escura e do dispositivo

Os tokens sem prefixo preservam a aparência clara; os equivalentes `dark-*` registram a aparência escura. A implementação resolve os mesmos papéis por variáveis CSS sob `data-theme`. Fundo, painéis e bordas continuam distintos por tom, sem novas sombras. Texto principal, apoio, seleção, avisos e validação recebem pares próprios.

No escuro, `dark-primary` serve a texto e ícones; os botões sólidos usam `dark-solid` e `dark-solid-hover` com texto branco. Ações suaves usam texto opaco em `primary` ou `dark-primary`, preservando contraste nos dois modos. `color-scheme` e o tema Radix acompanham o modo resolvido, incluindo campos nativos e datas.

**The White Paper Rule.** A aparência muda o espaço de edição; o PDF permanece branco, preservando a leitura do documento que será salvo.

## Typography

DM Sans Variable, com Segoe UI e sans-serif como alternativas, é a família da interface. O título principal usa `headline`; títulos de painel usam `title`. Textos explicativos ficam entre 12 e 14px. No editor de pessoas, campos usam 16px e rótulos e títulos de grupo usam 14px; os demais controles compactos preservam sua escala local de 12–13px. Metadados secundários usam 10–11px. A marca usa 26px, peso 750 e espaçamento de -1px; sua parte leve usa peso 400.

Até 760px, os campos de pessoa e valores do scanner usam 16px; os controles principais do preenchimento têm altura mínima de 44px. O título principal usa 28px, reduzido para 24px até 760px. O título do formulário usa 21px, reduzido para 19px. Títulos do scanner e estados vazios variam entre 19 e 23px conforme a vista. Não há fonte de exibição separada nem hierarquia editorial de marketing.

A fonte do documento Word é Times New Roman e pertence ao modelo, não ao tema da interface. O PDF gerado no navegador usa fontes livres equivalentes, com Tinos como padrão. A prévia e o download usam esse mesmo PDF; a paginação do DOCX pode variar entre editores.

## Layout

A navegação lateral fixa mede 234px, reduz para 195px até 1190px e 175px até 960px; até 640px vira navegação horizontal. O cabeçalho mede 54px, tem fundo transparente e não tem divisor. O conteúdo tem largura máxima de 1000px, ampliada para 1560px a partir de 1100px, e padding superior de 10px, passando a 22px até 760px. As margens laterais são 38px, 24px até 1190px e 16px até 640px.

A partir de 1100px, o editor tem duas colunas: formulário à esquerda e prévia à direita, com proporções de 0.95fr e 1.05fr, larguras mínimas de 340px e 390px e intervalo de 24px. A prévia fica presa a 16px do topo e limitada a calc(100dvh - 32px). Seu documento rola dentro do painel; cabeçalho, rodapé e ações conservam o próprio espaço. Configuração, ferramentas e ações inferiores acompanham a largura disponível.

Abaixo de 1100px, editor, configuração e ações inferiores mantêm largura máxima de 720px, centralizados, com uma área por vez: preencher, depois conferir o PDF. A prévia fica no fluxo, sem posição sticky e sem alternador móvel. Antes da geração, o painel mostra somente um ícone documental e uma instrução breve, sem papel de exemplo.

Campos de pessoa usam padding lateral de 28px e intervalo de 18px; até 760px usam uma coluna, padding lateral de 18px e intervalo de 16px. As opções de assinatura usam duas colunas no desktop e uma no celular. O rodapé usa padding de 22px 28px, reduzido para 20px 18px; sua ação principal mede no mínimo 46px.

O scanner vazio mostra somente o upload, centralizado em até 720px. Após extração, upload e revisão usam o arranjo existente de duas colunas, empilhadas até 960px. Opções avançadas ficam fechadas; a ação de aplicação permanece sticky na base, com divisor e padding vertical de 14px. O histórico permite quebra de linha no celular.

## Elevation & Depth

A profundidade vem principalmente das superfícies e bordas de 1px. Campos usam contorno interno `inset 0 0 0 1px #d6dfd7`. Variantes outline e controles Radix mantêm seus contornos próprios.

## Shapes

Painéis usam 10px; navegação e mensagens, 7px; ícones documentais e validação, 6px; área de upload, 12px; etiqueta A4 e botão Radix de tamanho padrão, 4px; papel de exemplo, 2px. O tema Radix usa `radius="medium"`. A direção provisória de raios 6/10/16px foi substituída por estes valores observados.

## Components

Botões Radix usam variantes solid, outline, soft e ghost. Solid aplica o verde principal e texto branco; o peso é 550. Ações de exclusão usam a variante vermelha do Radix. Estados desabilitados impedem a ação e usam cursor de indisponibilidade. O texto informa geração ou leitura em andamento.

Campos têm rótulos persistentes e indicação de obrigatoriedade ou opcionalidade. No editor de pessoas a altura mínima é 44px. O select nomeado de pessoa ou etapa fica no details fechado “Trocar pessoa ou ir ao imóvel”; as opções incluem nome e função. O rodapé oferece Voltar, oculto na primeira etapa, e uma ação principal: Continuar valida a pessoa atual; Conferir documento gera o PDF após o imóvel. Salvar PDF fica no rodapé do próprio painel de prévia. Editar dados aparece abaixo de 1100px; em telas largas o formulário continua acessível à esquerda. Navegação selecionada combina fundo verde claro, texto verde e estado ativo. A etiqueta A4 é compacta e contornada.

O scanner usa borda tracejada de 1.5px e área branca. Durante a leitura muda para `dropzone-busy`, apresenta progresso e desabilita a seleção. Os dados extraídos podem ser editados e selecionados antes de aplicar. O histórico mantém pesquisa, reabertura, download e exclusão com confirmação na própria linha.

### Configuração e campos do contrato

A configuração inicial usa details/summary fechado por padrão, “Adicionar ou remover pessoas”, com resumo apenas das quantidades de quem recebe e doa. A escolha de um ou dois doadores usa um select nativo junto do título, separado do formulário por divisor. UF, estado civil e tratamento também usam selects nativos, com a mesma altura dos campos, borda `input-border`, raio `native-control` e foco de 2px em `focus`, afastado 1px. Os rótulos continuam visíveis; o asterisco verde sinaliza obrigatoriedade.

A quantidade de donatários usa o mesmo padrão de título e select nativo, de um a dez. Cada pessoa tem sua própria seção, acessível pelo seletor nomeado de pessoa ou etapa e pela continuidade no rodapé. A matrícula usa o campo comum com indicação de opcionalidade, sem asterisco obrigatório.

RG e nascimento, qualificação e filiação, endereço e registros adicionais usam grupos nativos `details/summary`, fechados inicialmente, com divisor superior e indicação discreta de “opcional”. O resumo tem padding vertical de 15px. Endereços permanecem separados por pessoa; copiar o endereço do doador 1 é uma ação explícita.

### Aparência e preenchimento assistido

O alternador usa borda de campo, superfície, texto principal, raio de navegação, padding de 9px por 12px e altura mínima de 38px. Fica no cabeçalho no desktop e junto da marca no celular; até 640px mostra apenas o ícone, mantendo nome acessível. Nas configurações, o select rotulado oferece claro, escuro ou acompanhar o dispositivo. A preferência persiste em `localStorage`; o modo do dispositivo reage às mudanças do sistema.

Seletores de reaproveitamento ficam junto dos campos que alteram, com rótulo persistente e largura disponível. Recuperar uma pessoa do histórico local é uma escolha explícita e preserva a forma de assinatura atual. Copiar endereço mostra a origem; cada endereço continua independente depois da cópia. Município e UF formam um par: município fica desabilitado até escolher a UF, oferece sugestões da lista correspondente e apresenta aviso textual se o valor não corresponde à lista.

Atalhos de município e data usam botões suaves compactos, em linha com quebra e intervalo de 8px. O texto descreve a origem ou o valor, como “Usar município do donatário” e “Data de hoje”. A revisão de preenchimento usa `details/summary`, fundo de ícone, texto de aviso positivo, raio de ícone e padding de 12px. Pendências são botões de largura inteira separados por bordas que levam à seção correspondente; o estado completo orienta gerar a prévia. A revisão do preenchimento aparece após tentativa inválida, com margem lateral de 28px.

### Forma de assinatura

Cada pessoa tem duas linhas de rádio em um `fieldset` com legenda acessível. A linha inteira é clicável, tem raio de navegação, contorno de campo e intervalo de 10px. A escolha usa `choice-selected` e `choice-selected-border`, mantendo o rádio visível. A amostra de assinatura é uma linha de 37px; a de impressão digital é um quadrado de 30px. Essas amostras são decorativas e acompanham títulos escritos. Opções medem no mínimo 66px no desktop e 52px até 760px, com padding de 12px. Nome completo, CPF, “Como aparece no contrato” e assinatura formam o núcleo visível antes dos grupos opcionais.

### Revisão de arquivos em lote

A área de upload permite selecionar e adicionar arquivos, cancelar a leitura e refazê-la. As opções combinam caixas de seleção para leitura aprofundada e união de frente/verso, além de select de orientação. Progresso e avisos aparecem junto dos arquivos; uma seção expansível permite conferir a imagem e a orientação. O texto extraído tem revisão por arquivo e ação explícita para reanálise.

O painel de revisão acompanha a superfície do modo escolhido, com os mesmos contornos e raio de painel, padding de 23px, reduzido para 18px até 1190px e 17px no celular. O topo permite escolher um ou dois doadores e de um a dez donatários; os controles permitem quebra de linha. O resumo de pessoas identificadas e CPFs válidos é um estado textual em verde, 12px, entrelinha 1.6 e margem inferior de 18px, orientando conferir o destino. Cada pessoa tem título, instrução e select de destino entre as pessoas ativas; os dados do imóvel formam grupo próprio. Cada informação combina caixa de seleção, select do campo, valor editável, aviso quando necessário e origem expansível. “CPF válido” combina ícone e texto em verde; avisos de CPF e data usam `review-warning` e texto explícito para correção antes de aplicar. Valores já preenchidos são mostrados em texto secundário, com indicação de que serão mantidos quando a substituição estiver desmarcada. Um filtro mostra apenas avisos ou conflitos sem mudar a seleção dos demais dados. Cada grupo mostra a quantidade de campos selecionados e permite selecionar ou desmarcar o grupo. A substituição é uma escolha explícita junto da ação final, que informa a quantidade de campos selecionados. As opções avançadas de leitura ficam em details/summary fechado por padrão.

### Exportação e prévia paginada

Salvar PDF é a ação principal da revisão; Word editável e Começar outro documento ficam em “Outras opções”, conforme escolha explícita do usuário em 23/10/2026. A interface não apresenta painel de conexão ou download de conversor. As instruções de configuração explicam as fontes equivalentes e a possível variação de paginação entre editores.

A prévia usa PDF.js em canvas branco, inclusive no modo escuro. A navegação fica centralizada acima da página, com intervalo de 15px, margem inferior de 16px e contador “Página X de Y” em 12px anunciado como atualização discreta. Botões suaves têm nomes acessíveis e ficam desabilitados nos limites. O canvas é centralizado, tem largura máxima de 100% e altura proporcional. Carregamento aparece como estado textual; falhas aparecem como alerta que orienta abrir ou baixar o PDF original. Esses padrões reutilizam os tokens existentes, sem nova paleta ou elevação.

O foco global usa contorno de 3px em `focus`, afastado 3px. Mudanças de fundo e texto duram 160ms com `ease-out`; mensagens entram em 180ms com deslocamento de 3px. Esses movimentos só são aplicados em `prefers-reduced-motion: no-preference`.

A prévia é gerada por uma ação explícita. Quando os dados mudam, o cabeçalho indica a desatualização e oferece Atualizar prévia; Salvar PDF permanece desabilitado até a atualização. O rascunho dos campos é salvo após 500ms sem alterações; esse salvamento não gera o PDF. Alterações pendentes impedem salvar um PDF desatualizado. O estado do rascunho distingue alterações pendentes, salvamento e falha. Mensagens e estados vazios devem indicar a próxima ação disponível. Iniciar novo documento oferece Desfazer em uma faixa de estado durante a sessão. Ao continuar uma pessoa ou gerar com pendências, a interface mostra erros junto dos campos e leva o foco à primeira pendência; aria-invalid e aria-describedby associam o erro ao controle.

## Do's and Don'ts

### Do

- Reutilizar verde, superfícies do modo escolhido, bordas e hierarquia compacta.
- Preservar rótulos, foco visível e mensagens de progresso.
- Adaptar painéis e ações nos pontos de quebra documentados.
- Preservar o modelo no Word editável e conferir o PDF gerado no navegador com fontes equivalentes.
- Usar texto opaco no acento do modo para ações suaves e rótulos persistentes no preenchimento assistido.

### Don't

- Acrescentar ilustrações decorativas à área de edição.
- Adicionar sombras decorativas aos painéis de edição.
- Substituir controles do Radix por aproximações sem conferir seus estados.
- Apresentar histórico local como sincronização entre dispositivos.


