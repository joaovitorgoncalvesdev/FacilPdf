# FácilPDF

Aplicação local de preenchimento do instrumento particular de doação fornecido. Inclui scanner de PNG/JPG, PDF e DOCX, prévia do PDF real, download com o nome do donatário e histórico no navegador.

## Testar neste computador

Abra `INICIAR.cmd`. Ele inicia o site e o conversor e abre **http://127.0.0.1:5174**. Mantenha a janela aberta durante o uso. Pressione Enter nessa janela para encerrar.

Se os serviços já estiverem rodando, basta abrir o endereço acima. Não execute outra instância. Requer Node.js 22 ou superior e Microsoft Word instalado e ativado neste Windows. Neste computador o Word foi encontrado automaticamente. Não é necessário Python, Docker, banco de dados ou chave de API.

Para iniciar manualmente, execute em dois terminais na pasta do projeto:

```powershell
npm ci
npm run converter
```

```powershell
npm run dev -- --port 5174 --strictPort
```

Na primeira instalação, copie `.env.example` para `.env.local`. O valor local é `VITE_CONVERTER_URL=http://127.0.0.1:8788`.

## Fluxo

1. Escolha **um ou dois doadores e de um a dez donatários**. Preencha cada participante e o imóvel. RG, órgão expedidor, UF, município e endereço estão separados. Endereços são independentes, com opção de copiar o endereço do primeiro doador.
2. Para cada pessoa, selecione **Assinatura à mão** ou **Impressão digital**. O PDF terá linha ou quadrado acima dos respectivos dados, exclusivamente conforme essa escolha. Sem digitais, não há quadrados. O texto do contrato se adapta ao singular ou plural.
3. No Scanner, importe frente, verso, PDFs e Word juntos. Confira os grupos por pessoa e o destino no contrato. O scanner sugere doador/donatário quando esses papéis estão explícitos no arquivo. CPF inválido, filiação ambígua e valores conflitantes ficam sinalizados. Você pode corrigir os valores, reclassificar o campo ou completar informações manualmente.
4. Gere a prévia, confira todas as páginas e clique em **Salvar PDF e histórico**. O arquivo recebe o nome do primeiro donatário.
5. No Histórico, pesquise, reabra, baixe, exclua ou exporte um backup ZIP com PDFs e campos. Restaurar um backup cria novas entradas.

Nascimento, naturalidade, filiação, CAR, CCIR, cartório e informações complementares são opcionais. Quando preenchidos, entram no contrato. Nada é inventado para completar campos vazios.

## Preservação da formatação

`public/templates/doacao.docx` contém o Word original com os dados pessoais substituídos por variáveis. Margens, papel, cabeçalhos e a base tipográfica do instrumento são preservados. A identificação e as referências nas cláusulas se adaptam aos participantes e aos dados fornecidos. A área de assinaturas é reconstruída em blocos que mantêm o marcador e os dados de cada pessoa juntos, com quebra automática quando necessário.

No Windows, o conversor usa **Microsoft Word ExportAsFixedFormat** em uma instância invisível. A prévia e o download usam o mesmo PDF. Os arquivos temporários são removidos após a conversão. O original fornecido não é modificado nem distribuído com seus dados pessoais.

Nomes e endereços maiores podem aumentar as linhas e páginas naturalmente. Preservar a formatação não significa manter a quantidade de páginas para qualquer conteúdo. Confira a prévia antes de assinar. Não há reconstrução do documento em HTML nem redução artificial da fonte para fazer caber.

## Scanner

- Imagens PNG/JPG/WEBP: OCR em português e inglês com modelos de maior precisão, ampliação, fundo branco, contraste, duas segmentações e tentativa adaptativa para sombras quando necessário. Orientações de 90°, 180° e 270° são tentadas se a leitura inicial for fraca; o usuário também pode escolher a rotação.
- PDF com texto: PDF.js com reconstrução visual das linhas. PDFs digitalizados e páginas mistas sem identificação suficiente também passam por OCR.
- Word DOCX: parágrafos e tabelas com Mammoth, mais OCR de até 12 imagens PNG/JPG internas, respeitando limites de memória.
- Até 10 arquivos por lote, com opção para combinar frente e verso. Você pode cancelar, adicionar arquivos ou refazer a leitura.
- Até 20 MB por arquivo, 30 páginas por PDF e limite de resolução por página.
- Detecção por rótulos, contexto e validações, sem envio a um modelo de IA. CPF tem validação dos dois dígitos verificadores; datas impossíveis são recusadas. RG não tem uma validação nacional única, por isso deve ser conferido. Dados repetidos nas assinaturas são vinculados à mesma pessoa, sem contaminar o último participante. Documentos sem rótulos, fotos desfocadas ou manuscritos ainda podem exigir revisão e preenchimento manual.
- `postinstall` prepara o worker, WebAssembly e idiomas em `public/ocr`; eles são servidos pelo próprio site. Os arquivos enviados ao scanner não saem do navegador.

## Persistência

IndexedDB guarda rascunho, campos e PDFs neste navegador e origem. Limpar os dados do site apaga esse histórico. Mudar de `localhost` para `127.0.0.1`, mudar a porta ou migrar para GitHub Pages cria outro armazenamento. Use o mesmo endereço e exporte backup para transferir os dados. Não há sincronização entre dispositivos, conforme a escolha do usuário.

## GitHub Pages e duas opções de PDF

Endereço do site: **https://joaovitorgoncalvesdev.github.io/FacilPdf/**.

**PDF pelo site** é a opção padrão: geração no navegador, sem instalar programas, inclusive no celular. Usa pdfmake e fontes livres Tinos/Carlito, equivalentes às fontes do modelo. As quebras de linha e de página podem variar em relação ao Word. O conteúdo, os campos opcionais e as assinaturas vêm do mesmo DOCX preenchido. A prévia, o download e o histórico usam o mesmo PDF gerado.

**PDF pelo Word** é opcional para maior fidelidade às fontes e à paginação do modelo. Abra **ABRIR-SITE.cmd** neste computador para iniciar o conversor e acessar o site. Mantenha a janela aberta enquanto gera PDFs. Se o navegador solicitar acesso à rede local, permita para este site. Requer Word instalado e Node.js 22 ou superior. O iniciador configura somente a origem exata do GitHub Pages; o conversor atende apenas em `127.0.0.1:8788` e não é exposto à internet.

O scanner, os formulários e o histórico funcionam no navegador. O DOCX preenchido vai somente ao conversor local; a hospedagem não converte nem armazena os documentos. Em outro computador, somente a opção PDF pelo Word exige o conversor e o Word locais. A opção pelo site dispensa ambos. Baixar o Word preenchido funciona sem o conversor.

O código do projeto fica em repositório público; documentos pessoais, `.local`, rascunhos e históricos não são publicados. Não há uso de processamento, armazenamento ou tráfego da Vercel. O GitHub Pages possui seus próprios limites de hospedagem.

O fluxo `.github/workflows/pages.yml` instala as dependências, prepara o OCR, executa os testes e publica `dist`. O caminho base `/FacilPdf/` também se aplica ao modelo Word, favicon, manifesto e arquivos OCR. Para simular a publicação localmente, defina `PAGES_BASE_PATH=/FacilPdf/` ao executar `npm run build` e acesse `/FacilPdf/` no servidor de prévia.

## Preenchimento e aparência

- Estados e municípios associados, com busca por digitação e normalização de acentos. Alterar o estado limpa um município incompatível.
- Atalhos para usar o município do donatário no imóvel, o município do imóvel na assinatura e a data de hoje.
- Cópia de endereço entre participantes, sem copiar CPF ou identidade.
- Recuperação explícita de pessoas do histórico local, preservando a escolha atual entre assinatura e digital.
- Lista clicável dos ajustes pendentes para navegar às respectivas seções.
- Máscara de CPF e CEP, sugestões editáveis para profissão, nacionalidade e órgão expedidor.
- Modo claro, escuro ou conforme o dispositivo. A preferência fica salva no navegador e não altera a aparência do documento ou PDF.

## Verificação

```powershell
npm test
npm run build
```

Os testes cobrem validação de CPF, campos obrigatórios, nomes de arquivo e extração de dados. O fluxo de navegador também foi exercitado durante a implementação: geração via Word, nome do download, persistência após recarregar, leitura DOCX e OCR de imagem. Dados do modelo original usados na verificação ficam apenas em `.local`, que é ignorada pelo Git.

Na versão flexível, foram gerados e inspecionados PDFs com um doador e duas assinaturas; um doador com digital; dois doadores com três assinaturas; dois doadores com combinação de linha/digital; e todos com digital. Sem digitais, a contagem de quadrados foi zero; em cada outra combinação, correspondeu exatamente à escolha dos participantes. As cinco amostras ocuparam duas páginas sem sobreposição. Também foram testados OCR com sombra e documento invertido, RG/CNH com campos em linhas separadas e aplicação de CPF/RG às três pessoas corretas. O documento adaptável muda a identificação, concordância e assinaturas em relação ao original, de acordo com as escolhas do usuário.

## PDF, conexão e scanner

O painel **Conexão com o Word local** permite verificar manualmente se o conversor está disponível. No site publicado, **Baixar conversor do Word** fornece um ZIP com o iniciador e o serviço local. Extraia os arquivos e abra `ABRIR-SITE.cmd` em um Windows com Word e Node.js 22 LTS instalados. A primeira execução instala apenas as dependências do conversor. Mantenha a janela aberta e permita a rede local no navegador quando solicitado.

A prévia usa PDF.js para mostrar o PDF verdadeiro, com botões de página, em desktop e celular. Não depende de iframe ou do leitor PDF do navegador. **Salvar PDF e histórico** gera um PDF atualizado quando necessário e baixa com o nome do primeiro donatário; se faltar espaço no histórico, o download ainda é disponibilizado. Alterações durante a conversão impedem salvar uma versão desatualizada.

A matrícula é opcional. Sem valor, a cláusula omite a expressão de matrícula. Donatários adicionais têm sua própria qualificação e assinatura/digital, com concordância no plural. Reduzir a quantidade exclui essas pessoas do PDF; os dados ficam no rascunho para poder reativá-las.

O scanner reconhece nomes em qualificação resumida e contratos com donatários no plural, distribui sugestões por participante e recusa importar CPF ou data inválidos selecionados. Homônimos com CPFs válidos diferentes ficam separados. A leitura aprofundada tenta reforço quando faltam nome ou nascimento e revê orientação quando não encontra dados de identificação úteis. Resultados continuam sujeitos à conferência do usuário.
