# FácilPDF
## Platform
web
## Purpose
Automatizar o instrumento particular de doação fornecido pelo usuário, preservando texto e formatação, com leitura de PNG, PDF e DOCX.
## Confirmed constraints
Histórico somente neste navegador, escolha explícita do usuário. Arquivos devem receber o nome do donatário. Extração revisada antes de aplicar. Hospedar no GitHub Pages, decisão explícita em 18/10/2026. Scanner, histórico e PDF no navegador por padrão, sem instalação. PDF pelo Word deste computador permanece como opção para maior fidelidade, com conversor local. Poupar a cota da Vercel.

Um ou dois doadores, escolhidos no formulário. De um a dez donatários, cada um com dados independentes. Cada doador e cada donatário escolhem assinatura por linha ou impressão digital em quadrado; nenhum quadrado quando todos assinam. Endereços independentes e campos separados por dado. Nascimento, naturalidade, filiação e registros do imóvel são opcionais e entram no contrato se preenchidos. O texto se adapta ao singular e plural, preservando a base visual do modelo.

Scanner: arquivos múltiplos, leitura de frente/verso, contraste, segmentações complementares, correção de orientação, OCR de imagens embutidas no Word, reconstrução de linhas do PDF e revisão por pessoa. O usuário escolhe o destino e se pode sobrescrever campos. Rótulos e evidências explícitas orientam os dados, sem inventar dígitos de documentos ou atribuir nomes pelo gênero aparente.
## Stack
React e TypeScript com Vite, escolhidos para operação no navegador sem credenciais externas. IndexedDB guarda campos e arquivos PDF. OCR com Tesseract e PDF.js. DOCX via Mammoth para leitura e OOXML para exportação.
## Evidence
Modelo original local fornecido pelo usuário. O aplicativo distribui somente versão com variáveis, sem dados pessoais originais.

Modo escuro solicitado pelo usuário, com preferência persistente e opção de acompanhar o dispositivo. Simplificar o preenchimento com municípios por UF, atalhos de cidade/data, cópia de endereço e recuperação de pessoas do histórico local.

Prévia do PDF via PDF.js/canvas, com paginação e suporte a celular; sem depender do leitor PDF integrado ao navegador. Botão Salvar PDF e histórico gera quando necessário. Painel de conexão manual com o Word, instruções de rede local e conversor para download. Matrícula opcional: quando vazia, a referência é omitida da cláusula. Arquivo nomeado pelo primeiro donatário. Scanner valida CPF/data antes de aplicar e separa homônimos com CPFs diferentes.

Duas formas de gerar PDF, escolhidas explicitamente pelo usuário: pelo site (padrão, sem instalação, computador ou celular, processamento no navegador) e pelo Word (opcional, Windows/Word/conversor local). A seleção explica vantagens e requisitos dentro do site. O PDF do navegador usa Tinos/Carlito, fontes livres equivalentes às do modelo; quebras e paginação podem variar. Ambas as opções usam o mesmo conteúdo do DOCX, a mesma prévia e o mesmo histórico. Baixar Word fornece o documento editável.
