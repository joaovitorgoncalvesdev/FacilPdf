# FácilPDF

Site: **https://joaovitorgoncalvesdev.github.io/FacilPdf/**.

Preenche o instrumento particular de doação, lê PNG/JPG/WEBP/PDF/DOCX e gera documentos com histórico neste navegador.

## Usar sem instalar nada

1. Preencha os participantes e o imóvel ou use **Importar dados** para ler documentos.
2. Confira os dados e a assinatura/digital de cada pessoa. Em **Adicionar ou remover pessoas**, escolha um ou dois doadores e de um a dez donatários.
3. Gere e confira o PDF. **Salvar PDF e histórico** gera quando necessário, baixa com o nome do primeiro donatário e guarda uma cópia no navegador.
4. Para editar em outro programa, use **Baixar Word**. O DOCX abre no Word ou editor compatível.

Não é necessário instalar Node.js, Word ou conversor para usar o site. Por escolha explícita do usuário em 23/10/2026, a conexão com Word local saiu do fluxo. O site não controla o Word do computador.

## Preenchimento e revisão

- Nome e CPF por pessoa, matrícula opcional, demais informações incluídas conforme preenchidas.
- Estado e município associados, cópia de endereço e recuperação de pessoas do histórico.
- Uma pessoa por vez, com Continuar; salto por nome/papel recolhido e atalhos de data/cidade.
- Erros junto dos campos; gerar com pendências leva ao primeiro ajuste. Comparação de áreas só aparece depois de informar ambas.
- Status real de salvamento do rascunho. **Desfazer novo documento** recupera a última versão anterior durante a sessão; não é uma lixeira permanente.
- Em computador e celular, preenchimento e revisão aparecem separadamente: Continuar → Conferir documento → Salvar PDF. Word editável em Outras opções.
- Histórico com busca, limpar busca, reabrir, duplicar, baixar, excluir e backup ZIP.
- Claro, escuro ou conforme o dispositivo; o documento mantém papel branco.

## Scanner

OCR em português/inglês com ampliação, contraste, segmentações complementares e tentativas de orientação conforme a qualidade encontrada. PDF com texto tem linhas reconstruídas; páginas digitalizadas e imagens internas do DOCX também passam por OCR.

Até dez arquivos de 20 MB por lote, trinta páginas por PDF e doze imagens internas por DOCX, respeitando limites de memória. O usuário revisa valores, evidências e destino por pessoa. CPF e datas passam por validação; RG deve ser conferido. Fotos desfocadas e manuscritos podem exigir correção manual.

Ajustes avançados ficam recolhidos. É possível selecionar/desmarcar os campos de uma pessoa e filtrar avisos/conflitos. O filtro não modifica a seleção. Resultados ficam preservados ao navegar entre áreas durante a sessão; recarregar a página exige nova leitura.

## Formatação

O DOCX preenchido parte de `public/templates/doacao.docx`, sem os dados pessoais do original. Conteúdo, concordância, participantes e assinaturas vêm da mesma fonte usada pelo PDF.

O PDF é gerado no navegador com pdfmake e fontes livres Tinos/Carlito incorporadas. Respeita papel, margens e base visual do modelo, com blocos de assinatura/digital e testemunhas mantidos juntos. As quebras de linha e página podem variar em relação ao Word; confira todas as páginas. Texto maior pode aumentar a quantidade de páginas. A prévia e o download usam o mesmo arquivo.

## Dados e hospedagem

Scanner, geração e histórico funcionam no navegador. Os documentos não são enviados à hospedagem. IndexedDB guarda rascunho e PDFs nesta origem e navegador; limpar dados do site remove o histórico. Exporte backup para transferir ou guardar cópia. Não existe sincronização entre dispositivos.

GitHub Pages hospeda arquivos estáticos. O fluxo `.github/workflows/pages.yml` instala dependências, prepara OCR, testa e publica `dist` com base `/FacilPdf/`. Nenhum processamento na Vercel.

## Desenvolvimento local

Somente para desenvolver: Node.js 22 ou superior, `npm ci` e `npm run dev -- --port 5174 --strictPort`. Acesse http://127.0.0.1:5174. Para verificar: `npm test` e `npm run build`.

Os arquivos de conversão local antigos permanecem no repositório por compatibilidade, mas não fazem parte do uso recomendado e não são chamados pela interface. O postinstall prepara somente o OCR.

Dados pessoais originais, arquivos de teste e PDFs gerados ficam em `.local`, ignorada pelo Git; não são publicados.
