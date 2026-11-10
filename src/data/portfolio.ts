import capaApp from "../assets/capas/app-oncologista.webp";
import capaBackoffice from "../assets/capas/backoffice.webp";
import capaFretes from "../assets/capas/fretes.webp";
import capaMordomo from "../assets/capas/mordomo.webp";
import capaPetshop from "../assets/capas/petshop.webp";
import capaSofi from "../assets/capas/sofi.webp";
import type { Text } from "../i18n";

export const profile = {
  name: "Michel Zulszeski",
  role: { pt: "Desenvolvedor Full Stack", en: "Full Stack Developer" } as Text,
  bio: [
    {
      pt: "Desenvolvo aplicações do zero e resolvo problemas reais. Sou especialista em integração entre sistemas e na criação de microsserviços com gRPC ou APIs REST, com experiência em integração com ERP e em automações que tiram o trabalho repetitivo do dia a dia das equipes.",
      en: "I build applications from scratch and solve real problems. I specialize in integrating systems and building microservices with gRPC or REST APIs, with experience in ERP integration and in automations that take repetitive work off teams' daily routine.",
    },
    {
      pt: "Do banco de dados à interface, cuido da aplicação de ponta a ponta: telas modernas e fluidas, pensadas para que a experiência de quem usa seja clara do primeiro clique ao último detalhe de movimento.",
      en: "From the database to the interface, I take care of the application end to end: modern, fluid screens designed so that the experience is clear from the first click to the last detail of motion.",
    },
  ] as Text[],
  facts: [
    {
      label: { pt: "Formação", en: "Education" },
      value: { pt: "Análise e Desenvolvimento de Sistemas · PUCPR", en: "Systems Analysis and Development · PUCPR" },
    },
  ] as { label: Text; value: Text }[],
  email: "michelzulszeski@gmail.com",
  links: [
    { label: "GitHub", href: "https://github.com/chelzzzs" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/michel-zulszeski" },
  ],
  /** Linha de tecnologias abaixo do nome, no topo. */
  headline: [
    "React",
    "TypeScript",
    "TanStack",
    "Astro",
    "Tailwind CSS",
    "Go",
    "UI Engineering",
    { pt: "Integração com ERP", en: "ERP Integration" },
    "Motion Design",
  ] as Text[],
  stack: [
    { group: { pt: "Linguagens", en: "Languages" }, items: ["Go", "TypeScript", "JavaScript", "Python", "Java", "SQL"] },
    {
      group: "Front-end",
      items: ["React", "TanStack", "Astro", "Tailwind CSS", "Vite", "UI Engineering", "Motion Design", "WebGL"],
    },
    {
      group: "Back-end",
      items: [
        { pt: "Microsserviços", en: "Microservices" },
        "gRPC",
        "Gin",
        "Django REST",
        { pt: "Integração com ERP", en: "ERP Integration" },
        "Gemini API",
      ],
    },
    {
      group: { pt: "Dados & infra", en: "Data & infra" },
      items: ["PostgreSQL", "Oracle", "Docker", "Turborepo", "Bun", "GitHub Actions", "Active Directory"],
    },
  ] as { group: Text; items: Text[] }[],
};

/**
 * Tamanho do planeta pela complexidade do projeto. Use sempre uma destas faixas
 * para manter o sistema coerente ao adicionar projetos.
 */
export const SIZE = {
  /** Sistema completo: vários serviços, integrações, front e back. */
  system: 2.0,
  /** App nativo com backend próprio. */
  app: 1.6,
  /** Site com interações elaboradas (React, WebGL). */
  site: 1.15,
  /** Landing page. */
  landing: 0.85,
} as const;

/** Tipo de superfície procedural do planeta (ver scene/shaders.ts). */
export type PlanetKind = "terran" | "gas" | "lava" | "ice" | "desert";

export type Project = {
  id: string;
  name: Text;
  kind: Text;
  description: Text;
  tags: Text[];
  image?: string;
  repo?: string;
  demo?: string;
  /** Texto do botão do demo, quando não é o projeto em si (ex.: um protótipo). */
  demoLabel?: Text;
  planet: {
    type: PlanetKind;
    /** Cores da superfície: base, meio, detalhe. */
    colors: [string, string, string];
    atmosphere: string;
    size: number;
    orbit: number;
    tilt: number;
    rings?: [string, string];
  };
};

export const projects: Project[] = [
  {
    id: "backoffice-oncologico",
    name: { pt: "Sistema BackOffice", en: "BackOffice System" },
    kind: { pt: "Sistema interno · rede de clínicas de oncologia", en: "Internal system · oncology clinic network" },
    description: {
      pt: "Backoffice de uma empresa dona de clínicas oncológicas. Atende o administrativo — financeiro, compras, central de guias, telefonia, arquivo — e o assistencial, da enfermagem à distribuição dos pacientes, integrado ao ERP hospitalar Tasy.",
      en: "Back office for a company that owns oncology clinics. It serves the administrative side (finance, purchasing, insurance authorizations, telephony, records) and patient care, from nursing to patient scheduling, integrated with the Tasy hospital ERP.",
    },
    tags: [
      "React 19",
      "TanStack",
      "TypeScript",
      "Go",
      { pt: "Microsserviços", en: "Microservices" },
      "gRPC",
      "Tasy (ERP)",
      "Active Directory (SSO)",
    ],
    image: capaBackoffice,
    planet: {
      type: "terran",
      colors: ["#1d5c63", "#5f7f3a", "#b07a45"],
      atmosphere: "#5fd6c8",
      size: SIZE.system,
      orbit: 7.5,
      tilt: 0.35,
    },
  },
  {
    id: "app-oncologista",
    name: { pt: "Aplicativo para médicos", en: "App for Physicians" },
    kind: { pt: "App nativo · iOS e Android", en: "Native app · iOS and Android" },
    description: {
      pt: "App para os médicos oncologistas: agenda do dia, faturamento do mês, pacientes, NPS e plano de carreira com níveis e benefícios — com os dados vindos direto do ERP das clínicas e um canal direto com a equipe de relacionamento.",
      en: "App for oncologists: today's schedule, monthly billing, patients, NPS and a career plan with levels and benefits, with data coming straight from the clinics' ERP and a direct channel to the relationship team.",
    },
    tags: ["Swift", "Kotlin", "Go", "gRPC"],
    image: capaApp,
    planet: {
      type: "ice",
      colors: ["#9cc9c0", "#dcebe6", "#ffffff"],
      atmosphere: "#bfeee4",
      size: SIZE.app,
      orbit: 11.5,
      tilt: 0.2,
    },
  },
  {
    id: "mordomo-financeiro",
    name: "Mordomo Financeiro",
    kind: { pt: "App web · finanças pessoais com IA", en: "Web app · AI personal finance" },
    description: {
      pt: "Assistente de finanças pessoais com um mordomo de IA. O usuário conta o gasto do jeito que fala (\"gastei 50 no almoço\") e o Gemini transforma em lançamento categorizado; com o relatório do mês em mãos, ele aconselha com as contas reais. Tem painel com saldo e gráficos, renda, despesas fixas com parcelas e login com JWT. Projeto da graduação na PUCPR, com protótipo navegável de 16 telas.",
      en: "Personal finance assistant with an AI butler. Users log expenses the way they talk (\"spent 50 on lunch\") and Gemini turns them into categorized transactions; with the month's report at hand, it gives advice based on the real numbers. Dashboard with balance and charts, income, fixed expenses with installments and JWT login. A college project at PUCPR, with a 16-screen clickable prototype.",
    },
    tags: ["React 19", "Vite", "Recharts", "Python", "Django REST", "JWT", "Gemini API"],
    image: capaMordomo,
    demo: "https://chelzzzs.github.io/prototipo-mordomo/",
    demoLabel: { pt: "Ver protótipo ↗", en: "View prototype ↗" },
    planet: {
      type: "gas",
      colors: ["#141a2b", "#c79b4b", "#f2dfb0"],
      atmosphere: "#8ea2ff",
      size: SIZE.app,
      orbit: 15.0,
      tilt: 0.28,
    },
  },
  {
    id: "petshop-patricao",
    name: { pt: "Site de Petshop", en: "Pet Shop Website" },
    kind: { pt: "Site · pet shop", en: "Website · pet shop" },
    description: {
      pt: "Landing page de um pet shop de bairro voltada para pedidos no WhatsApp. Mascote interativo que segue o cursor, fundo em WebGL nas cores da marca e cards de produto que viram.",
      en: "Landing page for a neighborhood pet shop, built around orders on WhatsApp. An interactive mascot that follows the cursor, a WebGL background in the brand colors and product cards that flip.",
    },
    tags: ["Astro", "Tailwind CSS", "Motion", "WebGL"],
    image: capaPetshop,
    repo: "https://github.com/chelzzzs/petshop-patricao",
    demo: "https://chelzzzs.github.io/petshop-patricao/",
    planet: {
      type: "desert",
      colors: ["#c98a00", "#ffc531", "#fff7e8"],
      atmosphere: "#ffd36b",
      size: SIZE.landing,
      orbit: 17.9,
      tilt: 0.2,
    },
  },
  {
    id: "sofis-gallery",
    name: "Sofi's Gallery",
    kind: { pt: "Site · portfólio de fotografia", en: "Website · photography portfolio" },
    description: {
      pt: "Portfólio de uma fotógrafa: intro em tela cheia, mural de fotos à deriva, lightbox que nasce da miniatura clicada e uma escultura com efeito de dithering em WebGL.",
      en: "Portfolio for a photographer: a full-screen intro, a wall of drifting photos, a lightbox that grows out of the clicked thumbnail and a sculpture with a WebGL dithering effect.",
    },
    tags: ["React 19", "TypeScript", "Vite", "WebGL (OGL)"],
    image: capaSofi,
    repo: "https://github.com/chelzzzs/sofi-s-gallery",
    demo: "https://chelzzzs.github.io/sofi-s-gallery/",
    planet: {
      type: "gas",
      colors: ["#16131a", "#5a5248", "#e9e2d6"],
      atmosphere: "#f0c9a0",
      size: SIZE.site,
      orbit: 20.7,
      tilt: 0.42,
      rings: ["#e9e2d6", "#4a433c"],
    },
  },
  {
    id: "cclm-transportes",
    name: "CCLM Transportes",
    kind: { pt: "Site · fretes e mudanças", en: "Website · freight and moving" },
    description: {
      pt: "Site de uma empresa de fretes e pequenas mudanças em Curitiba e região. Orçamento que já chega montado no WhatsApp, serviços, bairros atendidos e avaliações do Google.",
      en: "Website for a freight and small-moves company in Curitiba, Brazil. Quotes that arrive ready-made on WhatsApp, services, neighborhoods served and Google reviews.",
    },
    tags: ["Astro", "Tailwind CSS", "TypeScript", "Motion", "Netlify"],
    image: capaFretes,
    demo: "https://frete-rapido-curitiba.netlify.app/",
    planet: {
      type: "lava",
      colors: ["#0b1b3b", "#1d2f5c", "#f59e0b"],
      atmosphere: "#f5a524",
      size: SIZE.landing,
      orbit: 23.4,
      tilt: 0.15,
    },
  },
];
