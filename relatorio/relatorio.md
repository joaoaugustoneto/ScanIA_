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
