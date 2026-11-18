# Relatório de Desenvolvimento - ScanIA

Neste relatório, registro todo o processo de desenvolvimento do **ScanIA**, detalhando as decisões de arquitetura, a execução de cada etapa do projeto, os problemas práticos que enfrentei durante a implementação e as soluções técnicas adotadas. O projeto seguiu o guia prático passo a passo, adaptando a infraestrutura para rodar 100% localmente via Docker Compose e Node.js em substituição ao Supabase Cloud.

---

## Sumário das Etapas

- [Etapa 1 — Preparar o ambiente](#etapa-1--preparar-o-ambiente)
- [Etapa 2 — Criar o projeto e configurar as ferramentas](#etapa-2--criar-o-projeto-e-configurar-as-ferramentas)
- [Etapa 3 — Configurar o backend no Supabase](#etapa-3--configurar-o-backend-no-supabase)
- [Etapa 4 — Fundações: tipos, categorias, tema e conexão](#etapa-4--fundações-tipos-categorias-tema-e-conexão)
- [Etapa 5 — Regras de negócio e testes automatizados](#etapa-5--regras-de-negócio-e-testes-automatizados)
- [Etapa 6 — Camada de dados: schemas, serviços e hooks](#etapa-6--camada-de-dados-schemas-serviços-e-hooks)
- [Etapa 7 — Design system: componentes de interface](#etapa-7--design-system-componentes-de-interface)
- [Etapa 8 — Autenticação e navegação protegida](#etapa-8--autenticação-e-navegação-protegida)
- [Etapa 9 — A Edge Function que lê a nota com IA](#etapa-9--a-edge-function-que-lê-a-nota-com-ia)
- [Etapa 10 — Escanear a nota e listar os resultados](#etapa-10--escanear-a-nota-e-listar-os-resultados)
- [Etapa 11 — Detalhes da nota: revisar, corrigir e excluir](#etapa-11--detalhes-da-nota-revisar-corrigir-e-excluir)
- [Etapa 12 — Resumo mensal](#etapa-12--resumo-mensal)
- [Etapa 13 — Ligar a IA de verdade](#etapa-13--ligar-a-ia-de-verdade)
- [Etapa 14 — Qualidade e roteiro de validação final](#etapa-14--qualidade-e-roteiro-de-validação-final)
- [Etapa 15 — Transformar o projeto em portfólio](#etapa-15--transformar-o-projeto-em-portfólio)
- [Apêndice C — Desafios de evolução: Pipeline CI/CD](#apêndice-c--desafios-de-evolução-pipeline-cicd)

---

## Etapa 1 — Preparar o ambiente

### O que fiz
Verifiquei e preparei todas as ferramentas necessárias na minha máquina de desenvolvimento:
- **Node.js**: validei a versão v24.12.0 instalada.
- **Git**: confirmei a versão v2.47.1 e configurei a conexão com o repositório remoto (`https://github.com/joaoaugustoneto/ScanIA_.git`).
- **Gerenciador de pacotes**: adotei estritamente o `pnpm` (v10.26.1) conforme a diretriz definida para o projeto.
- **Docker e Docker Compose**: validei as instalações do Docker (29.7.2) e Docker Compose (v5.5.1) para orquestrar o backend local.

### Problemas e soluções
- **Substituição do Supabase Cloud por backend local**: O guia original previa a criação de um projeto online no Supabase Cloud, dependendo de serviços externos. Para atender ao requisito de executar tudo localmente com Docker Compose e manter um repositório autocontido, planejei uma pasta independente `server/`. Nessa pasta, estruturei um contêiner PostgreSQL para os dados relacionais e uma API em Node.js/TypeScript que replica os endpoints do Supabase (Auth com JWT, Database REST, Storage privado com links assinados e a função de processamento de notas com IA). Dessa forma, o aplicativo mobile se conecta localmente sem precisar de credenciais de nuvem.
- **Resultado**: Ambiente preparado e validado para início do desenvolvimento.

---

## Etapa 2 — Criar o projeto e configurar as ferramentas

### O que fiz
- Criei a base do projeto mobile com Expo e TypeScript, configurando o `expo-router` para roteamento baseado em arquivos.
- Instalei todas as dependências do ecossistema mobile utilizando exclusivamente o `pnpm`:
  - `expo-router`, `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-status-bar`.
  - `@expo/vector-icons`, `react-native-svg`.
  - `@react-native-async-storage/async-storage`.
  - `expo-image-picker`, `expo-image-manipulator`.
  - `@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`.
  - `react-native-url-polyfill`, `base64-arraybuffer`.
  - `jest-expo`, `jest`, `@types/jest`, `prettier`.
- Configurei o `app.json` com as permissões nativas de câmera e galeria em português, esquemas de navegação e identificadores de pacote.
- Ajustei o `tsconfig.json` com o alias `@/*`, ativei o `strict: true` e configurei as tipagens globais do Jest.
- Criei os arquivos de configuração `.prettierrc`, `.env.example`, `.env` e `.gitignore` para garantir que segredos locais fiquem fora do controle de versão.
- Criei uma tela provisória em `app/index.tsx` para teste de fumaça e conferi a compilação com `pnpm run typecheck`.

### Problemas e soluções
- **Aderência estrita ao pnpm**: Como o tutorial sugeria comandos `npm` e `npx expo install`, adequei todas as chamadas para o `pnpm`, garantindo resolução limpa de dependências e sem conflito de pacotes no ecossistema Expo.
- **Assets obrigatórios para build**: O Expo exige a existência física de ícones e telas de abertura para não falhar na inicialização. Criei os arquivos de imagem padrão em `assets/` para assegurar que o build funcione sem avisos.
- **Resultado**: Projeto mobile inicializado, tipagem validada sem erros e ambiente pronto para integração.

---

## Etapa 3 — Configurar o backend no Supabase

### O que fiz
- Criei o arquivo de referência `supabase/schema.sql` contendo o DDL das tabelas (`receipts`, `receipt_items`), índices de performance, políticas de segurança Row Level Security (RLS) e definições do bucket de storage.
- Criei a pasta `server/` com a infraestrutura local:
  - `server/docker-compose.yml`: orquestração do PostgreSQL 16 Alpine e do contêiner da API.
  - `server/Dockerfile`: imagem de produção para o servidor Node.js/TypeScript.
  - `server/init.sql`: script de inicialização com as tabelas `users`, `receipts` e `receipt_items`.
  - `server/src/`: implementação completa dos módulos:
    - **Auth (`/auth/v1`)**: cadastro de usuários, login por senha gerando JWT seguro, consulta de perfil (`/user`) e logout.
    - **REST (`/rest/v1`)**: consultas filtradas, ordenadas, paginação e suporte a joins relacionais de itens de notas fiscais (`receipt_items`).
    - **Storage (`/storage/v1`)**: upload de fotos para pastas privadas isoladas por usuário (`receipts/<user_id>/...`), exclusão e geração de links assinados temporários.
    - **Processamento de notas (`/functions/v1/scan-receipt`)**: orquestração da extração de dados via IA (Claude Vision ou modo simulado) e persistência direta no banco de dados.
- Implementei uma camada de persistência resiliente em `server/src/db.ts` compatível com PostgreSQL e com fallback transparente para armazenamento local em JSON, permitindo testes ágeis sem dependências externas.
- Configurei as variáveis no `.env` do app móvel apontando para o backend local (`http://localhost:3000`).

### Problemas e soluções
- **Permissões do serviço Docker no Windows**: Durante os testes iniciais, observei que o serviço do Docker Desktop precisava de privilégios de administrador para iniciar o pipe nomeado. Para não ficar bloqueado durante o desenvolvimento e garantir que os testes automatizados rodassem em qualquer ambiente sem necessidade de Docker ativo, construí o `server/src/db.ts` com capacidade híbrida: ele se conecta ao Postgres quando o container está ativo, mas faz fallback automático para persistência local em JSON/TypeScript puro caso o banco esteja offline.
- **Falha de compilação em módulos C++ no Node 24**: Ao testar drivers com dependências nativas (como sqlite3 com node-gyp), tive problemas de compilação no Node 24 no Windows devido à falta de binários pré-compilados. Removi qualquer módulo nativo e implementei o motor de persistência em TypeScript puro, eliminando completamente esse problema.
- **Resultado**: Backend local 100% funcional, testado com chamadas HTTP de cadastro, login, upload e persistência de recibos.

---

## Etapa 4 — Fundações: tipos, categorias, tema e conexão

### O que fiz
- Criei as tipagens TypeScript de domínio em `src/types/index.ts` (`ReceiptStatus`, `ReceiptItem`, `Receipt`, `ReceiptUpdate`).
- Estruturei o catálogo com as 9 categorias em `src/constants/categories.ts`, com tipagem literal estrita via `as const satisfies`, associando cores temáticas e ícones da biblioteca Ionicons, além de função utilitária com fallback seguro (`categoryInfo`).
- Defini os tokens de design system em `src/theme/index.ts` (paleta de cores com tons de índigo, espaçamentos padronizados, raios de borda e elevações).
- Configurei a instância do Supabase em `src/lib/supabase.ts`, integrando a persistência de sessão ao `AsyncStorage` e vinculando a renovação de tokens ao ciclo de vida do aplicativo com `AppState`.
- Configurei o `QueryClient` em `src/lib/queryClient.ts` com políticas de expiração de cache (`staleTime`) e controle de novas tentativas de requisição.
- Implementei o tratamento centralizado de mensagens de erro em português em `src/utils/errors.ts` e a resolução de ícones em `src/utils/icons.ts`.

### Problemas e soluções
- **Validação de tipos das variáveis de ambiente**: Para evitar erros do compilador TypeScript ao ler `process.env.EXPO_PUBLIC_SUPABASE_URL`, configurei o arquivo de declarações `expo-env.d.ts` e mantive os valores definidos no `.env`, garantindo typecheck limpo com `pnpm run typecheck`.
- **Resultado**: Fundações tipadas e validadas com sucesso.

---

## Etapa 5 — Regras de negócio e testes automatizados

### O que fiz
- Desenvolvi as funções utilitárias puras responsáveis pelas regras de negócio:
  - `src/utils/money.ts`: formatação monetária em padrão BRL (`R$ 1.234,56`), conversão de strings com vírgula ou ponto para centavos inteiros, arredondamento matemático sem erro de ponto flutuante e máscara para inputs.
  - `src/utils/date.ts`: manipulação de datas sem desvios de fuso horário em formato ISO (`AAAA-MM-DD`), formatação amigável para exibição brasileira (`DD/MM/AAAA`), máscaras dinâmicas de digitação, rótulos contextuais ("Hoje", "Ontem") e navegação mensal (`monthRange`, `shiftMonth`).
  - `src/utils/summary.ts`: consolidação financeira mensal agrupando gastos por categoria, cálculo de percentuais relativos, contagem de cupons e cálculo de ticket médio em centavos.
  - `supabase/functions/scan-receipt/parse.ts`: sanitização e normalização estrita dos dados retornados pelo modelo de IA, tratando erros com a classe customizada `ReceiptReadError` e mock fixo para testes.
- Escrevi 4 suítes de testes unitários abrangentes com o Jest:
  - `__tests__/money.test.ts`
  - `__tests__/date.test.ts`
  - `__tests__/summary.test.ts`
  - `__tests__/parse.test.ts`
- Executei a suíte de testes com sucesso, cobrindo todos os casos de borda.

### Problemas e soluções
- **Erro de sintaxe no Jest com Flow types do React Native no pnpm**:
  - *Problema*: Na primeira execução de `pnpm test`, o Jest falhou com o erro `SyntaxError: Unexpected identifier 'ErrorHandler'` ao carregar o arquivo `@react-native/js-polyfills/error-guard.js`. Esse erro aconteceu porque o `pnpm` utiliza symlinks e armazena os módulos em uma estrutura aninhada dentro de `.pnpm/`, fazendo com que a regex padrão do `transformIgnorePatterns` do `jest-expo` ignorasse as dependências internas do React Native, deixando arquivos com sintaxe Flow sem transpilação.
  - *Solução*: Criei o arquivo `babel.config.js` com o preset `babel-preset-expo` e ajustei a regex de `transformIgnorePatterns` no `package.json` para suportar tanto caminhos tradicionais quanto o padrão aninhado do pnpm: `(?:\\.pnpm/.*?/node_modules/)?`. Após esse ajuste, todos os 36 testes rodaram e passaram com 100% de sucesso.
- **Resultado**: 4 suítes e 36 testes automatizados aprovados; typecheck com zero erros.

---

## Etapa 6 — Camada de dados: schemas, serviços e hooks

### O que fiz
- Criei os esquemas de validação de dados com Zod:
  - `src/schemas/auth.ts`: esquemas de validação para login e cadastro, com checagem de formato de e-mail e confirmação de senha idêntica.
  - `src/schemas/receipt.ts`: validação do formulário de revisão da nota fiscal (`receiptSchema`), assegurando nome do estabelecimento preenchido, data válida, valor positivo e categoria pertencente ao catálogo.
- Implementei a camada de serviços em `src/services/receipts.ts`:
  - `listReceipts`: listagem ordenada das notas.
  - `getReceipt`: consulta com join de itens de recibo.
  - `uploadReceiptImage`: conversão de base64 para `ArrayBuffer` e envio seguro para o storage privado.
  - `createReceiptRecord`: criação de registro com status inicial `pending`.
  - `analyzeReceipt`: chamada ao endpoint de processamento por IA com tratamento de erros contextuais em JSON (`FunctionsHttpError`).
  - `updateReceipt`: persistência dos dados revisados com alteração de status para `done`.
  - `deleteReceipt`: exclusão do arquivo no storage e remoção do registro no banco de dados.
  - `getImageUrl`: geração de links assinados temporários com validade de 1 hora.
- Implementei o serviço de captura e otimização de imagem em `src/services/imagePicker.ts`:
  - Acesso à câmera nativa e galeria de fotos com gerenciamento de permissões.
  - Redimensionamento automático proporcional com teto de 1600 px de largura e compressão JPEG a 70% (`prepareForUpload`), reduzindo o consumo de banda e agilizando a inferência da IA.
- Criei os hooks do TanStack Query em `src/hooks/useReceipts.ts`:
  - `useReceipts`, `useReceipt`, `useReceiptImageUrl` (com cache de 50 minutos para evitar regeneração desnecessária de URLs assinadas).
  - Mutação `useScanReceipt` com acompanhamento de progresso em duas etapas (`upload` e `analyze`), garantindo que a foto salva permaneça no banco mesmo se a leitura da IA falhar.
  - Mutações `useReanalyzeReceipt`, `useUpdateReceipt` e `useDeleteReceipt` com invalidação automática da chave `['receipts']`.

### Problemas e soluções
- **Validação de mensagens de erro no enum do Zod**: Na definição do `z.enum(CATEGORY_NAMES)`, utilizei a propriedade `errorMap` para manter total conformidade com a tipagem da versão instalada do Zod, prevenindo erros na compilação do TypeScript.
- **Resultado**: Camada de dados, serviços de imagem e hooks integrados e validados com testes e typecheck.

---

## Etapa 7 — Design system: componentes de interface

### O que fiz
- Criei os componentes visuais reutilizáveis do Design System:
  - `src/components/Button.tsx`: botão customizado com 4 variantes visuais (`primary`, `secondary`, `danger`, `ghost`), estado de carregamento e acessibilidade.
  - `src/components/Input.tsx`: campo de texto com suporte a rótulos e mensagens de erro inline.
  - `src/components/FormInput.tsx`: integração do campo de texto com o `react-hook-form` via `<Controller>` e suporte a máscaras em tempo real.
  - `src/components/Card.tsx`: contêiner com sombra suave, raio de borda consistente e fundo temático.
  - `src/components/Screen.tsx`: wrapper padrão de telas com `SafeAreaView` e tratamento automático de teclado e rolagem (`KeyboardAvoidingView` e `ScrollView`).
  - `src/components/StateViews.tsx`: telas padronizadas para estados assíncronos (`LoadingView`, `ErrorState` com botão de nova tentativa e `EmptyState` com ícones).
  - `src/components/MonthSwitcher.tsx`: seletor de mês com navegação cronológica e rótulos amigáveis em português.
  - `src/components/DonutChart.tsx`: gráfico de rosca vetorial construído puramente com arcos matemáticos no `react-native-svg` (sem bibliotecas externas pesadas).
  - `src/components/StatusBadge.tsx`: indicador de status da nota fiscal (`Processando`, `Lida`, `Falhou`) com paleta semântica.
  - `src/components/ReceiptCard.tsx`: card de nota fiscal com ícone temático translúcido, nome da loja, data, status e valor formatado em reais.

### Problemas e soluções
- Não encontrei problemas de compatibilidade ou erros de tipagem nesta etapa. Todos os componentes foram construídos respeitando os tokens de design do tema e validados com `pnpm run typecheck`.
- **Resultado**: Componentes do Design System criados, modulares e validados.

---

## Etapa 8 — Autenticação e navegação protegida

### O que fiz
- Removi o arquivo provisório `app/index.tsx` da raiz para liberar o roteamento do Expo Router.
- Desenvolvi o contexto de autenticação em `src/context/AuthContext.tsx`:
  - Leitura e restauração automática de sessão com `supabase.auth.getSession()`.
  - Escuta em tempo real de eventos de autenticação com `supabase.auth.onAuthStateChange()`.
  - Limpeza total do cache do TanStack Query (`queryClient.clear()`) no logout para evitar vazamento de informações entre contas de usuários diferentes.
  - Métodos `signIn`, `signUp` e `signOut`.
- Configurei as rotas e proteções de tela com Expo Router:
  - `app/_layout.tsx`: raiz da aplicação envolvendo os provedores `QueryClientProvider` e `AuthProvider`.
  - `app/(auth)/_layout.tsx`: guarda das rotas públicas (redireciona para as rotas protegidas se o usuário já estiver autenticado).
  - `app/(auth)/login.tsx`: tela de login com validação em tempo real com `react-hook-form` e `loginSchema`.
  - `app/(auth)/register.tsx`: tela de criação de conta com validação de senha forte e confirmação de senha.
  - `app/(app)/_layout.tsx`: guarda das rotas protegidas (redireciona para `/login` se não houver sessão ativa).
  - `app/(app)/(tabs)/_layout.tsx`: barra inferior com 4 abas: Notas, Escanear, Resumo e Perfil.
  - `app/(app)/(tabs)/profile.tsx`: tela de perfil com avatar com inicial do nome, dados da conta, aviso de privacidade e ação de logout com diálogo de confirmação nativo.
  - Criei arquivos temporários de placeholder para as telas das próximas etapas.

### Problemas e soluções
- A transição entre rotas públicas e protegidas funcionou de primeira, com o Expo Router tratando os redirecionamentos conforme a sessão no `AuthContext`.
- **Resultado**: Autenticação completa e navegação protegida testadas e funcionais.

---

## Etapa 9 — A Edge Function que lê a nota com IA

### O que fiz
- Criei a função canônica em `supabase/functions/scan-receipt/index.ts` e sua implementação correspondente no backend local (`server/src/scanReceipt.ts`).
- Modelei a chamada ao modelo de visão computacional da Anthropic utilizando `tool_use` (`register_receipt`), forçando o modelo a responder estritamente dentro da estrutura JSON esperada com as 9 categorias do app.
- Adicionei proteção contra Prompt Injection: configurei instruções de sistema para que o modelo trate todo o conteúdo da imagem como dado visual bruto e ignore eventuais comandos ou instruções que estejam impressos nos cupons fiscais.
- Otimizei o processamento de imagem convertendo os bytes em blocos para geração do base64, prevenindo estouro de pilha de memória em imagens de alta resolução.
- Implementei o modo simulado (`MOCK_AI=true`), permitindo testar o fluxo de leitura localmente com latência realista de 1,5 segundos sem gerar custos com API externa.
- Estruturei a gravação no banco com substituição de itens anteriores (para casos de repetição de análise), atualização do status do cupom para `done` e inserção dos itens na tabela `receipt_items`.
- Configurei o tratamento de erros diferenciando problemas de leitura da imagem (retornando HTTP 422 com mensagem amigável via `ReceiptReadError`) de falhas internas do servidor (HTTP 500), marcando a nota com status `error` no banco.

### Problemas e soluções
- **Isolamento de tipos Deno vs Node.js**: Como o arquivo `supabase/functions/scan-receipt/index.ts` foi escrito para o runtime do Deno (com `Deno.serve` e importações via `npm:`), configurei o `tsconfig.json` do app para excluir esse diretório da checagem principal do TypeScript. A lógica foi espelhada no servidor local em `server/src/scanReceipt.ts` utilizando Express e Node.js padrão, garantindo que ambos os ambientes fiquem consistentes.
- **Resultado**: Função de processamento de notas com IA implementada e testada no backend local.

---

## Etapa 10 — Escanear a nota e listar os resultados

### O que fiz
- Desenvolvi a tela de escaneamento em `app/(app)/(tabs)/scan.tsx`:
  - Estruturei três estados visuais: tela inicial sem foto (botões para abrir câmera ou galeria e cartão com dicas para uma boa captura), tela de pré-visualização (com a imagem capturada e botões "Analisar com IA" e "Escolher outra foto") e estado de carregamento com mensagens dinâmicas ("Enviando a imagem..." e "A IA está lendo a nota...").
  - Implementei o fluxo completo: captura -> compressão e redução da foto -> upload para o storage privado -> criação do registro com status `pending` -> envio para a função de IA -> tratamento de falhas sem perda da foto salva -> redirecionamento automático para a tela de detalhes.
- Desenvolvi a tela principal de listagem em `app/(app)/(tabs)/index.tsx`:
  - Utilizei `FlatList` com `RefreshControl` para permitir atualização puxando para baixo (pull-to-refresh).
  - Renderizei a lista de notas com o componente `ReceiptCard`, exibindo informações contextuais de acordo com o status (`done`, `pending` ou `error`).
  - Tratei os estados assíncronos com `LoadingView`, `ErrorState` e `EmptyState` (incluindo atalho direto para acionar a câmera quando não há notas cadastradas).

### Problemas e soluções
- O fluxo de captura e os estados visuais integraram-se de maneira limpa com os hooks desenvolvidos na Etapa 6, sem ocorrência de erros.
- **Resultado**: Telas de captura e listagem de notas concluídas e validadas.

---

## Etapa 11 — Detalhes da nota: revisar, corrigir e excluir

### O que fiz
- Criei o formulário de revisão em `src/components/ReceiptForm.tsx`:
  - Preenchimento automático dos dados sugeridos pela IA (estabelecimento, data formatada, valor total e categoria).
  - Seletor de categoria interativo com chips coloridos e ícones.
  - Validação dos dados em tempo real com `react-hook-form` e `zodResolver`.
  - Normalização automática no envio (limpeza de espaços, conversão de data brasileira para ISO e parsing de valor para float).
- Desenvolvi a tela de detalhes da nota fiscal em `app/(app)/receipt/[id].tsx`:
  - Carregamento e exibição da foto original utilizando URL assinada temporária gerada pelo Storage.
  - Exibição de badge com status da nota (`StatusBadge`).
  - Tratamento de notas pendentes ou que falharam na leitura, exibindo a mensagem de erro retornada e botão de "Analisar novamente" (sem necessidade de enviar a foto de novo).
  - Edição manual dos dados com atualização imediata do status para `done` ao salvar.
  - Listagem completa dos itens detalhados do cupom (`receipt_items`), exibindo descrição, quantidade, valor unitário e total por item.
  - Botão de exclusão com diálogo de confirmação, removendo a foto do Storage e o registro do banco em cascata.

### Problemas e soluções
- **Sincronização de estado do formulário após reanálise da IA**:
  - *Problema*: Ao solicitar uma nova análise por IA na tela de detalhes, os novos dados eram salvos no banco, mas os inputs do formulário continuavam exibindo os valores antigos que já estavam instanciados no estado do `react-hook-form`.
  - *Solução*: Vinculei a propriedade `key` do `<ReceiptForm>` ao identificador e status da nota (`key={`${receipt.id}-${receipt.status}-${receipt.total}`}`). Dessa forma, quando a nota é atualizada pela API, o React remonta o formulário automaticamente com os novos dados, sem necessidade de recarregar a tela.
- **Resultado**: Tela de detalhes, revisão, edição, reanálise e exclusão funcionando perfeitamente.

---

## Etapa 12 — Resumo mensal

### O que fiz
- Desenvolvi a tela de métricas financeiras em `app/(app)/(tabs)/summary.tsx`:
  - Seletor de mês com `MonthSwitcher` permitindo navegação cronológica contínua entre meses passados e futuros.
  - Cartão de destaque (Hero) estilizado com o total acumulado do mês selecionado em reais, quantidade de cupons processados e ticket médio por compra.
  - Gráfico de rosca customizado via `DonutChart` (SVG), distribuindo as fatias proporcionalmente por categoria com o valor total consolidado no miolo do gráfico.
  - Legenda interativa exibindo badge colorido, nome da categoria, valor monetário total e porcentagem relativa sobre o total do mês.
  - Tratamento visual para meses sem notas cadastradas ("Nenhuma nota lida neste mês.").
  - Otimização com `useMemo` para recalcular as métricas somente quando houver alteração nas notas ou no mês selecionado.
  - Regra de negócio garantindo que notas com status `pending` ou `error` fiquem de fora dos cálculos financeiros.

### Problemas e soluções
- Todas as funções de manipulação de datas e cálculo em centavos desenvolvidas na Etapa 5 funcionaram perfeitamente com os componentes visuais, sem divergências de arredondamento.
- **Resultado**: Tela de resumo e gráficos financeiros concluídos e validados.

---

## Etapa 13 — Ligar a IA de verdade

### O que fiz
- Estruturei a integração com o modelo de visão computacional da Anthropic (Claude Vision):
  - Configurei as variáveis de ambiente necessárias em `server/.env.example`:
    - `ANTHROPIC_API_KEY`: chave privada de API mantida exclusivamente no backend local e nunca exposta no aplicativo móvel.
    - `ANTHROPIC_MODEL`: modelo de visão configurável (padrão `claude-haiku-4-5-20251001` para velocidade e baixo custo).
    - `MOCK_AI`: flag booleana que permite alternar a qualquer momento entre o modo simulado (`true`, sem custos) e a IA real (`false`).
  - Consolidei as boas práticas de segurança e controle de custos:
    - **Proteção da chave**: a chave da Anthropic fica isolada no servidor backend; o aplicativo cliente se comunica apenas com a API local autenticada com JWT.
    - **Controle de consumo de tokens**: as fotos são reduzidas no próprio dispositivo para no máximo 1600 px de largura com compressão JPEG a 70%, mantendo o tamanho do payload abaixo de 3,5 MB.
    - **Prevenção contra Prompt Injection**: instruções de sistema tratam o cupom fiscal estritamente como dado visual, instruindo o modelo a ignorar quaisquer comandos contidos no papel.
    - **Saída tipada**: uso de `tool_use` (`register_receipt`) obrigando o modelo a devolver o JSON no formato exato das 9 categorias do catálogo.

### Problemas e soluções
- **Proteção de credenciais**: Garanti que os arquivos `.env` do app e do backend permaneçam listados no `.gitignore`, evitando qualquer risco de versionamento acidental de chaves secretas no GitHub.
- **Resultado**: Conexão com IA configurada de forma segura e com suporte a alternância instantânea para modo simulado.

---

## Etapa 14 — Qualidade e roteiro de validação final

### O que fiz
- Executei a rotina completa de qualidade de código:
  - Formatação com Prettier (`pnpm run format`): todos os arquivos em `app/`, `src/`, `__tests__/` e `supabase/functions/` formatados.
  - Checagem estática de tipos com TypeScript (`pnpm run typecheck`): zero erros encontrados.
  - Testes unitários com Jest (`pnpm test`): 4 suítes e 36 testes aprovados com 100% de sucesso.
- Validei de ponta a ponta todos os cenários do roteiro de testes com o backend local (`server/`):
  1. Cadastro rejeitado com senha curta (< 6 caracteres) exibindo mensagem de erro amigável.
  2. Cadastro com dados válidos gerando usuário e sessão JWT persistente.
  3. Tentativa de login com senha incorreta rejeitada com HTTP 400 e mensagem clara.
  4. Persistência de sessão restaurada via token.
  5. Upload de foto para o Storage privado isolado por usuário.
  6. Criação de registro de nota com status inicial `pending`.
  7. Processamento de nota via endpoint `scan-receipt` no modo simulado, atualizando status para `done`.
  8. Consulta relacional da nota com join dos itens de produtos (`receipt_items`).
  9. Edição e revisão manual de campos (estabelecimento, data, total e categoria) persistidos com sucesso.
  10. Geração de URL assinada temporária com validade de 1 hora apontando para a foto privada.
  11. Validação de rejeição de datas inexistentes (ex: 31/02/2026).
  12. Remoção em cascata da nota e do arquivo de imagem no Storage.
  13. Isolamento entre usuários garantindo que contas diferentes não visualizem dados umas das outras.
- Conferi a integridade do repositório:
  - Nenhuma chave ou variável sensível versionada.
  - Scripts SQL e documentação sincronizados.
  - Código limpo, sem `console.log` desnecessário e tipagem estrita sem uso de `any`.

### Problemas e soluções
- **Duplicação de host na geração de links assinados pelo Storage**:
  - *Problema*: Ao testar a exibição da foto na tela de detalhes, observei que a imagem não carregava. Ao inspecionar a URL retornada pelo `createSignedUrl`, vi que ela continha duplicação de protocolo e host (`http://localhost:3000/storage/v1http://localhost:3000/...`). Isso acontecia porque a biblioteca `@supabase/storage-js` já prefixa o endereço base do storage com a resposta da API. Como meu servidor estava devolvendo a URL absoluta, o caminho ficava duplicado.
  - *Solução*: Ajustei o endpoint `POST /storage/v1/object/sign/receipts/*` no servidor para responder apenas com o caminho relativo `/object/public/receipts/...`. Com isso, a biblioteca cliente montou a URL correta e a imagem passou a carregar perfeitamente.
- **Falha na leitura do corpo em requisições de exclusão no Storage**:
  - *Problema*: O parser de JSON do Express havia sido isolado antes das rotas de storage para permitir uploads binários brutos, o que fazia com que o `req.body` ficasse indefinido em chamadas `DELETE /storage/v1/object/receipts`.
  - *Solução*: Ajustei o middleware para manter o stream binário bruto exclusivamente nas rotas `POST /storage/v1/object/receipts/*` e apliquei o `express.json()` para os demais métodos (incluindo o `DELETE`), permitindo que a API leia o array `prefixes` e remova os arquivos do disco corretamente.
- **Resolução de dependências transitivas no Metro Bundler com pnpm no Windows**:
  - *Problema*: Ao executar a aplicação para testes via navegador Web (`pnpm start` e tecla `w`), o Metro Bundler falhou ao empacotar os módulos apontando os erros `Unable to resolve "@babel/runtime/helpers/interopRequireDefault"`, `Unable to resolve "query-string"` e `The required package 'expo-asset' cannot be found`. Isso ocorreu porque o pnpm utiliza isolamento por symlinks em `.pnpm/`, e o Metro no Windows não resolve dependências transitivas de bibliotecas internas se elas não estiverem expressamente mapeadas.
  - *Solução*: Adicionei `@babel/runtime`, `query-string` e `expo-asset` diretamente às dependências do projeto e criei o arquivo `metro.config.js` habilitando `config.resolver.unstable_enableSymlinks = true` e especificando os caminhos de busca `nodeModulesPaths` para o diretório raiz e o store virtual do pnpm. Com esse ajuste, o bundle Web foi gerado perfeitamente (993 módulos compilados sem erros).
- **Resultado**: Todos os cenários de teste e validações de qualidade concluídos com 100% de aprovação.

---

## Etapa 15 — Transformar o projeto em portfólio

### O que fiz
- Mantive o versionamento incremental do projeto no repositório GitHub (`https://github.com/joaoaugustoneto/ScanIA_.git`) com mensagens de commit padronizadas a cada etapa.
- Elaborei um `README.md` técnico e profissional, sem clichês e sem o uso de emojis, contendo:
  - Visão geral e proposta de valor do projeto.
  - Lista completa de funcionalidades construídas.
  - Tecnologias e bibliotecas utilizadas no app móvel e no backend local.
  - Diagrama em árvore da arquitetura de pastas do projeto.
  - Guia detalhado de execução do backend local (via Docker Compose ou Node.js) e do aplicativo Expo com `pnpm`.
  - Instruções para alternar entre o modo simulado e a API real do Claude Vision.
  - Tabela explicativa de scripts do projeto.
  - Identificação e link do meu perfil no GitHub.
- Criei a pasta `docs/` com os arquivos de imagem de referência para inclusão das capturas de tela do app em funcionamento.
- Escrevi este relatório técnico registrando todo o processo de engenharia, desafios e soluções adotadas.

### Problemas e soluções
- **Adaptação do guia original para o backend local**: Removi as referências à CLI do Supabase Cloud e adequei as instruções do `README.md` para execução direta via Docker Compose ou com `pnpm` local, garantindo que qualquer desenvolvedor consiga rodar o projeto rapidamente.
- **Resultado**: Repositório organizado, documentado e pronto para apresentação como projeto de portfólio.

---

## Apêndice C — Desafios de evolução: Pipeline CI/CD

### O que fiz
- Criei a esteira de Integração Contínua (CI) com o GitHub Actions no arquivo `.github/workflows/ci.yml`.
- A pipeline é executada automaticamente a cada `push` ou `pull_request` direcionado para a branch `main`, contendo as seguintes etapas:
  - **Setup de ambiente**: Configuração do Node.js v22 com cache nativo do `pnpm` (v10.26.1) e runtime Deno v2.x.
  - **Instalação estrita com lockfile congelado**: `pnpm install --frozen-lockfile` tanto no projeto raiz quanto na pasta do servidor `server/`.
  - **Checagem estática de tipos**: Execução de `pnpm run typecheck` com o TypeScript (`tsc --noEmit`).
  - **Testes automatizados**: Execução de `pnpm test` (36 testes com Jest cobrindo regras de negócio e validação da IA).
  - **Checagem de formatação**: Execução de `pnpm prettier --check` garantindo a padronização de estilo do código.
  - **Validação de tipos Deno**: Execução de `deno check supabase/functions/scan-receipt/index.ts` validando a conformidade da Edge Function.
  - **Build do backend**: Compilação TypeScript do servidor Express em `server/`.

### Problemas e soluções
- **Lockfile desatualizado no servidor durante o CI**:
  - *Problema*: Na validação preliminar com `--frozen-lockfile` no runner do GitHub Actions, o pnpm apontou o erro `ERR_PNPM_OUTDATED_LOCKFILE` na pasta `server/`, devido a ajustes que fiz na remoção de pacotes nativos.
  - *Solução*: Regeneri e sincronizei o arquivo `server/pnpm-lock.yaml` localmente com `pnpm install`, garantindo que o lockfile estivesse perfeitamente alinhado com o `package.json`. Com isso, a pipeline no GitHub Actions roda de forma determinística e rápida.
- **Resultado**: Pipeline de CI/CD implementada, testada e versionada no repositório.
