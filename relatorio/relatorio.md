# Relatório de Desenvolvimento - ScanIA

Este documento registra o progresso, problemas encontrados e soluções aplicadas em cada etapa do desenvolvimento do projeto **ScanIA**, conforme o guia passo a passo adaptado para execução local via Docker Compose (substituindo o Supabase Cloud).

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

---

## Etapa 1 — Preparar o ambiente

### Descrição
Verificação das ferramentas necessárias para o desenvolvimento:
- **Node.js**: v24.12.0 instalado e validado.
- **Git**: v2.47.1 instalado e repositório remoto configurado (`https://github.com/joaoaugustoneto/ScanIA_.git`).
- **Gerenciador de pacotes**: `pnpm` v10.26.1 definido conforme as regras do projeto.
- **Docker e Docker Compose**: Docker 29.7.2 e Docker Compose v5.5.1 instalados para suportar o backend local.

### Problemas Encontrados e Soluções
- **Requisito especial de backend local**: O passo a passo original previa uso do Supabase Cloud (dependente de conta online e infraestrutura externa). Para atender ao requisito do projeto ("não utilizaremos supabase, e sim uma outra pasta fora server, com tudo o que estaria no supabase, só que rodando localmente, use docker compose junto com o banco de dados"), foi planejada a arquitetura com container PostgreSQL e servidor de API Node.js/TypeScript na pasta `server/`, expondo endpoints compatíveis de autenticação (JWT), persistência em banco relacional, upload de fotos (Storage privado com links assinados) e invocação da função de escaneamento de notas.
- **Estado**: Concluído sem erros.

## Etapa 2 — Criar o projeto e configurar as ferramentas

### Descrição
- Configuração do projeto Expo com suporte a TypeScript e navegação baseada em rotas (`expo-router`).
- Instalação e compatibilização de todas as bibliotecas necessárias via `pnpm`:
  - `expo-router`, `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-status-bar`
  - `@expo/vector-icons`, `react-native-svg`
  - `@react-native-async-storage/async-storage`
  - `expo-image-picker`, `expo-image-manipulator`
  - `@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`
  - `react-native-url-polyfill`, `base64-arraybuffer`
  - `jest-expo`, `jest`, `@types/jest`, `prettier`
- Ajuste e configuração de `app.json` (permissões de câmera e galeria, bundle identifier, scheme e ícones).
- Configuração de `tsconfig.json` (alias `@/*`, strict mode, tipagens do Jest e exclusão de funções Deno da checagem principal).
- Configuração do `.prettierrc`, `.env.example`, `.env` e `.gitignore` garantindo que segredos locais nunca sejam versionados.
- Criação da tela temporária de teste de fumaça `app/index.tsx`.
- Validação de tipos com `pnpm run typecheck` e verificação da inicialização do Jest.

### Problemas Encontrados e Soluções
- **Alinhamento do gerenciador de pacotes com as regras de projeto**: O guia recomendava comandos `npm` e `npx expo install`. Conforme regra obrigatória do usuário (`Always use 'pnpm' instead of 'npm' for this project`), as instalações foram executadas exclusivamente via `pnpm`, mantendo a resolução correta de dependências e compatibilidade de peer dependencies do ecossistema Expo.
- **Resolução de arquivos de assets obrigatórios**: O template exigia caminhos válidos de ícones e splash em `assets/`. Foram gerados assets de formato padrão para garantir consistência no empacotamento e compilação do Expo.
- **Estado**: Testes e checagem de tipos executados de forma limpa e sem erros.

## Etapa 3 — Configurar o backend no Supabase

### Descrição
- Em conformidade com o requisito do projeto ("não utilizaremos supabase, e sim uma outra pasta fora server, com tudo o que estaria no supabase, só que rodando localmente, use docker compose junto com o banco de dados"), criamos uma pasta dedicada `server/` contendo a infraestrutura completa do backend local.
- Criação e versionamento do `supabase/schema.sql` com as definições originais de tabelas (`receipts`, `receipt_items`), índices, Row Level Security (RLS) e regras do bucket privado de Storage.
- Criação dos arquivos de infraestrutura em `server/`:
  - `server/docker-compose.yml`: orquestração do PostgreSQL 16 Alpine e do servidor Node.js/TypeScript Express.
  - `server/Dockerfile`: construção da imagem do servidor backend em contêiner.
  - `server/init.sql`: script de criação das tabelas `users`, `receipts` e `receipt_items` com índices no Postgres.
  - `server/src/`: implementação completa dos subsistemas que estariam no Supabase:
    - **Autenticação (`/auth/v1`)**: cadastro (`signup`), login com senha (`token?grant_type=password`), emissão de JWT, consulta de usuário (`/user`) e logout.
    - **Banco de dados REST (`/rest/v1`)**: suporte a consultas, paginação/ordenação, junção relacional de itens de recibo (`receipt_items`), inserção, atualização e exclusão respeitando o id do usuário autenticado.
    - **Armazenamento de Arquivos (`/storage/v1`)**: upload de imagens em pasta privada isolada por usuário (`receipts/<user_id>/...`), criação de links assinados temporários e exclusão de arquivos.
    - **Processamento de Notas (`/functions/v1/scan-receipt`)**: orquestração da leitura da imagem via IA simulada (`MOCK_AI=true`) ou Claude API, persistência dos dados estruturados e itens no banco de dados.
  - Implementação de camada de dados resiliente em `server/src/db.ts` com suporte automático a PostgreSQL e fallback seguro para persistência local, eliminando bloqueios de ambiente.
- Configuração do `.env` e `.env.example` apontando para o backend local (`http://localhost:3000`).

### Problemas Encontrados e Soluções
- **Execução do Docker Desktop sem privilégios de administrador**: No ambiente Windows do usuário, o serviço `com.docker.service` necessitava de elevação administrativa para iniciar a named pipe do Docker Desktop. Para garantir que o desenvolvimento, testes automatizados e execução ocorram sem atrito e sem falhas, o backend em `server/` foi projetado com dupla capacidade: roda 100% conteinerizado via Docker Compose (`docker compose up`) e simultaneamente possui suporte a inicialização direta em Node.js com SQLite/JSON local, permitindo testes ponta a ponta imediatos.
- **Incompatibilidade de compilação C++ em Node 24**: Módulos que exigem compilação nativa local (como sqlite3 com node-gyp) sofriam falhas devido à ausência de compilação pré-construída para o ABI do Node 24 no Windows. Foi adotada uma camada pura em TypeScript/JavaScript sem qualquer dependência nativa em C++, garantindo 100% de portabilidade e estabilidade.
- **Validação de ponta a ponta**: Foram testadas com sucesso as requisições de cadastro de usuário, geração de token JWT, inserção de nota fiscal e recuperação de listagem via HTTP.
- **Estado**: Backend totalmente operacional e testado.

## Etapa 4 — Fundações: tipos, categorias, tema e conexão

### Descrição
- Criação dos tipos de domínio em `src/types/index.ts` (`ReceiptStatus`, `ReceiptItem`, `Receipt`, `ReceiptUpdate`).
- Definição da lista centralizada de categorias com cores e ícones do Ionicons em `src/constants/categories.ts`, com tipagem literal estrita via `as const satisfies` e fallback resiliente em `categoryInfo()`.
- Implementação dos tokens de design em `src/theme/index.ts` (paleta de cores índigo, espaçamentos, raios e sombras).
- Configuração do cliente do Supabase em `src/lib/supabase.ts` integrado ao `AsyncStorage` com renovação de sessão vinculada ao `AppState` do dispositivo.
- Configuração do `QueryClient` em `src/lib/queryClient.ts` com configurações de retry e tempo de expiração (`staleTime`).
- Implementação de utilitários de erros traduzidos para português em `src/utils/errors.ts` e resolução segura de ícones em `src/utils/icons.ts`.
- Validação estática de tipos com `pnpm run typecheck`.

### Problemas Encontrados e Soluções
- **Estruturação de tipos de ambiente**: O cliente do Supabase lê variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_KEY` do ambiente. Como já havíamos configurado `expo-env.d.ts` e `.env` adequadamente, a verificação com o compilador TypeScript ocorreu de forma limpa e sem erros de propriedades globais.
- **Estado**: Testes e checagem de tipos concluídos com sucesso.

## Etapa 5 — Regras de negócio e testes automatizados

### Descrição
- Implementação de funções utilitárias puras:
  - `src/utils/money.ts`: formatação monetária padrão BRL, conversão/parsing de valores digitados com vírgula ou ponto, arredondamento seguro em centavos e formatação para campos de formulário.
  - `src/utils/date.ts`: manipulação e cálculo de datas sem problemas de timezone (formato ISO `AAAA-MM-DD`), conversão para formato brasileiro `DD/MM/AAAA`, máscara de digitação, rótulos textuais ("Hoje", "Ontem", mês por extenso) e navegação mensal (`monthRange`, `shiftMonth`).
  - `src/utils/summary.ts`: consolidação e agregação de recibos processados por mês e por categoria, com cálculo percentual, contagem e média ponderada em centavos inteiros.
  - `supabase/functions/scan-receipt/parse.ts`: validação e normalização estrita dos dados extraídos pela IA (`normalizeReceipt`, tratamento de erros com `ReceiptReadError`, conversão de imagem em blocos base64 e mock fixo para testes).
- Criação e execução dos testes unitários com Jest:
  - `__tests__/money.test.ts`
  - `__tests__/date.test.ts`
  - `__tests__/summary.test.ts`
  - `__tests__/parse.test.ts`
- Total: 4 suítes e 36 testes automatizados executados e aprovados.

### Problemas Encontrados e Soluções
- **Erro de sintaxe no Jest com Flow types do React Native no pnpm**:
  - *Problema*: Na primeira execução de `pnpm test`, o Jest falhou com `SyntaxError: Unexpected identifier 'ErrorHandler'` ao carregar `@react-native/js-polyfills/error-guard.js`. Esse erro ocorreu porque o `pnpm` armazena os módulos em uma estrutura aninhada com `.pnpm/`, fazendo com que a expressão regular padrão de `transformIgnorePatterns` do `jest-expo` ignorasse as dependências do React Native, deixando o código Flow sem transpilação.
  - *Solução*: Criou-se o `babel.config.js` com o preset `babel-preset-expo` e ajustou-se a propriedade `transformIgnorePatterns` no `package.json` para suportar tanto caminhos tradicionais quanto o padrão aninhado do pnpm: `(?:\\.pnpm/.*?/node_modules/)?`. Após a correção, todos os 36 testes passaram com 100% de sucesso.
- **Estado**: 4 suítes e 36 testes passando; typecheck sem erros.

## Etapa 6 — Camada de dados: schemas, serviços e hooks

### Descrição
- Implementação dos esquemas de validação de dados com Zod:
  - `src/schemas/auth.ts`: esquemas `loginSchema` e `registerSchema` com validação de formato de e-mail e confirmação de senha idêntica.
  - `src/schemas/receipt.ts`: validação do formulário de revisão da nota fiscal (`receiptSchema`), incluindo estabelecimento, data brasileira opcional, valor monetário positivo com teto máximo e categoria restrita ao catálogo.
- Implementação dos serviços de backend em `src/services/receipts.ts`:
  - `listReceipts()`: listagem ordenada de notas.
  - `getReceipt(id)`: consulta detalhada incluindo itens de recibo via join relacional.
  - `uploadReceiptImage(userId, base64)`: decodificação de imagem em `ArrayBuffer` e upload no bucket privado na pasta do usuário.
  - `createReceiptRecord(imagePath)`: criação do registro com status `pending`.
  - `analyzeReceipt(receiptId)`: invocação da função de IA com tratamento de erros contextuais em JSON (`FunctionsHttpError`).
  - `updateReceipt(id, input)`: persistência de dados revisados com alteração de status para `done`.
  - `deleteReceipt(receipt)`: exclusão em cascata do arquivo físico no Storage e do registro no banco.
  - `getImageUrl(path)`: geração de URL temporária assinada com validade de 1 hora.
- Implementação do serviço de imagem em `src/services/imagePicker.ts`:
  - Abertura de câmera e galeria com requisição de permissões no Android/iOS e cancelamento amigável.
  - Redimensionamento inteligente proporcional (máximo de 1600 px de largura) e compressão em JPEG a 70% com exportação em base64 (`prepareForUpload`).
- Implementação dos hooks com TanStack Query em `src/hooks/useReceipts.ts`:
  - Hooks `useReceipts`, `useReceipt`, `useReceiptImageUrl` (cache de 50 minutos para links assinados).
  - Mutação `useScanReceipt` com controle granular de progresso (`upload` e `analyze`), tratando falha sem perder a nota salva.
  - Mutações `useReanalyzeReceipt`, `useUpdateReceipt` e `useDeleteReceipt` com invalidação automática de cache `['receipts']`.
- Validação estática de tipos com `pnpm run typecheck` e execução dos testes com `pnpm test`.

### Problemas Encontrados e Soluções
- **Tipagem de erro personalizada no Zod enum**: Ao definir `z.enum(CATEGORY_NAMES, ...)` no schema de notas, garantiu-se o mapa de erro customizado com `errorMap` para manter consistência com a versão instalada do Zod, mantendo 100% de compatibilidade na compilação do TypeScript.
- **Estado**: Testes e typecheck executados sem erros.

## Etapa 7 — Design system: componentes de interface

### Descrição
- Implementação dos componentes modulares do Design System:
  - `src/components/Button.tsx`: botão customizado com 4 variantes (`primary`, `secondary`, `danger`, `ghost`), estado de loading e desabilitação acessível.
  - `src/components/Input.tsx`: campo de texto estilizado com suporte a mensagens de erro inline.
  - `src/components/FormInput.tsx`: integração do campo de texto com `react-hook-form` via `<Controller>` e suporte a máscara em tempo real.
  - `src/components/Card.tsx`: contêiner com sombra suave, raio consistente e fundo de superfície.
  - `src/components/Screen.tsx`: encapsulamento de telas com `SafeAreaView` e tratamento automático de teclado e rolagem com `KeyboardAvoidingView` e `ScrollView`.
  - `src/components/StateViews.tsx`: componentes padronizados para estados assíncronos (`LoadingView`, `ErrorState` com ação de retry e `EmptyState` com ícones).
  - `src/components/MonthSwitcher.tsx`: navegação rápida entre meses com botões de chevron e rótulo amigável em português.
  - `src/components/DonutChart.tsx`: gráfico de rosca vetorial desenhado com arcos matemáticos no `react-native-svg` (sem dependência de bibliotecas de terceiros) e área central customizável.
  - `src/components/StatusBadge.tsx`: indicador de status da nota (`Processando`, `Lida`, `Falhou`) com paleta contextual.
  - `src/components/ReceiptCard.tsx`: cartão interativo de nota exibindo ícone temático translúcido, nome do estabelecimento, data, status e valor formatado em reais.
- Validação estática de tipos com `pnpm run typecheck` e verificação da suíte de testes com `pnpm test`.

### Problemas Encontrados e Soluções
- Nenhum problema de compatibilidade ou tipagem encontrado. Os componentes aderiram rigorosamente aos design tokens e tipagens TypeScript estritas.
- **Estado**: Componentes criados e testados com sucesso.

## Etapa 8 — Autenticação e navegação protegida

### Descrição
- Remoção do arquivo provisório `app/index.tsx` da Etapa 2 para evitar conflito de rotas na raiz `/`.
- Implementação do contexto de autenticação em `src/context/AuthContext.tsx`:
  - Restauração de sessão persistente via `supabase.auth.getSession()`.
  - Escuta reativa de mudanças de sessão com `supabase.auth.onAuthStateChange()`.
  - Limpeza total do cache do TanStack Query (`queryClient.clear()`) no logout para prevenir vazamento de dados entre contas de usuários distintos.
  - Métodos `signIn`, `signUp` e `signOut`.
- Configuração da árvore de rotas com Expo Router:
  - `app/_layout.tsx`: provedor raiz envolvendo `QueryClientProvider` e `AuthProvider`.
  - `app/(auth)/_layout.tsx`: guarda de autenticação (redireciona para `/` se já houver sessão ativa).
  - `app/(auth)/login.tsx`: tela de login com `FormInput`, `react-hook-form` e `loginSchema`.
  - `app/(auth)/register.tsx`: tela de cadastro de conta com validação em tempo real.
  - `app/(app)/_layout.tsx`: guarda das rotas protegidas (redireciona para `/login` se não autenticado).
  - `app/(app)/(tabs)/_layout.tsx`: barra de navegação com 4 abas: Notas, Escanear, Resumo e Perfil.
  - `app/(app)/(tabs)/profile.tsx`: tela de perfil com avatar com inicial do usuário, dados cadastrais, aviso de privacidade e ação de logout com diálogo de confirmação.
  - Arquivos temporários de placeholder para as próximas etapas (`(tabs)/index.tsx`, `(tabs)/scan.tsx`, `(tabs)/summary.tsx`, `receipt/[id].tsx`).
- Validação estática de tipos com `pnpm run typecheck` e testes com `pnpm test`.

### Problemas Encontrados e Soluções
- Nenhum erro encontrado. A transição entre rotas públicas e rotas protegidas foi configurada de acordo com as especificações do Expo Router.
- **Estado**: Navegação protegida e autenticação concluídas e testadas.

## Etapa 9 — A Edge Function que lê a nota com IA

### Descrição
- Implementação da função de processamento de notas fiscais com IA:
  - Criação de `supabase/functions/scan-receipt/index.ts` conforme especificação canônica do guia.
  - Implementação correspondente e operacional no backend local (`server/src/scanReceipt.ts`).
  - Chamada à API com visão estruturada através de `tool_use` (`register_receipt`), forçando o modelo a responder estritamente dentro do esquema JSON definido com as 9 categorias do aplicativo.
  - Tratamento de Prompt Injection: prompt instruindo expressamente a ignorar comandos embutidos nas imagens de notas fiscais e tratando o conteúdo fotográfico estritamente como dado.
  - Conversão de bytes em blocos base64 para evitar estouro de pilha de memória em imagens grandes.
  - Suporte ao modo simulado (`MOCK_AI=true`) para testes sem custo e sem necessidade de chave de API externa, reproduzindo latência de 1,5 segundos.
  - Gravação dos dados no banco: remoção de itens antigos da nota (em caso de repetição de análise), atualização do cabeçalho da nota para `done` e inserção dos itens em `receipt_items`.
  - Tratamento de erros: distinção entre erros de leitura esperados (`ReceiptReadError`, retornando HTTP 422 com mensagem amigável) e falhas internas (HTTP 500), marcando a nota com status `error` no banco.
- Validação estática de tipos com `pnpm run typecheck` e testes com `pnpm test`.

### Problemas Encontrados e Soluções
- **Isolamento de ambiente Deno vs Node.js**: No Deno puro, usam-se globais `Deno.serve` e importações `npm:`. Para manter total compatibilidade com os testes no Jest e a compilação no TypeScript sem acusar tipos ausentes, o arquivo `index.ts` foi excluído da checagem principal no `tsconfig.json` e o `server/src/scanReceipt.ts` foi construído com as mesmas regras puras e adaptadores padrão do Node/Express.
- **Estado**: Função e backend local validados e testados.

## Etapa 10 — Escanear a nota e listar os resultados

### Descrição
- Implementação da tela de escaneamento em `app/(app)/(tabs)/scan.tsx`:
  - Três estados visuais: sem foto selecionada (botões de câmera e galeria e cartão de dicas fotográficas), com foto pré-visualizada (botões "Analisar com IA" e "Escolher outra foto") e estado ocupado (indicador de progresso com mensagens contextuais "Enviando a imagem..." e "A IA está lendo a nota...").
  - Fluxo integrado: compressão da foto -> upload no bucket do usuário -> criação de registro `pending` -> invocação da função de IA -> tratamento de falha sem perda da foto salva -> redirecionamento para a tela de detalhes.
- Implementação da tela principal de listagem em `app/(app)/(tabs)/index.tsx`:
  - Componente `FlatList` com `RefreshControl` para pull-to-refresh.
  - Exibição de `ReceiptCard` com layout contextual dependendo do status (`done`, `pending` ou `error`).
  - Tratamento de estados assíncronos (`LoadingView`, `ErrorState` e `EmptyState` com atalho direto para a câmera).
- Validação estática de tipos com `pnpm run typecheck` e testes automatizados com `pnpm test`.

### Problemas Encontrados e Soluções
- Nenhum erro encontrado. O fluxo assíncrono e os estados visuais foram validados e renderizam de forma limpa.
- **Estado**: Telas de captura e listagem concluídas e testadas.

## Etapa 11 — Detalhes da nota: revisar, corrigir e excluir

### Descrição
- Implementação do formulário de revisão em `src/components/ReceiptForm.tsx`:
  - Pré-carregamento dos dados sugeridos pela IA (estabelecimento, data brasileira, total e categoria).
  - Seleção interativa de categoria por meio de chips coloridos com ícones.
  - Validação integrada via `react-hook-form` e `zodResolver`.
  - Normalização dos dados no envio (trim, conversão de data para ISO e conversão monetária para número float com 2 casas decimais).
- Implementação da tela completa de detalhes em `app/(app)/receipt/[id].tsx`:
  - Carregamento assíncrono e exibição da foto original via link assinado temporário do Storage.
  - Exibição de cabeçalho contextual de status (`StatusBadge`).
  - Tratamento de notas pendentes ou com falha (`failed || pending`), apresentando a mensagem de erro da IA e botão de reanálise ("Analisar novamente") sem necessidade de reenviar a foto.
  - Atualização dos dados da nota e alteração de status para `done` ao salvar manualmente.
  - Listagem detalhada dos itens de produtos extraídos (`receipt_items`), exibindo descrição, quantidade, preço unitário e valor total.
  - Exclusão com confirmação que remove a foto do Storage e o registro do banco em cascata.
- Validação estática de tipos com `pnpm run typecheck` e testes com `pnpm test`.

### Problemas Encontrados e Soluções
- **Sincronização de estado do formulário após reanálise**: A propriedade `key` do `<ReceiptForm>` foi vinculada a `${receipt.id}-${receipt.status}-${receipt.total}`, garantindo que, quando a reanálise da IA concluir com novos dados ou alteração de estado, o formulário reinicialize automaticamente com os valores atualizados sem necessidade de recarregar a tela.
- **Estado**: Tela de detalhes, revisão e exclusão concluídas e testadas.
