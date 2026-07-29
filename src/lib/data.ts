export interface Review {
  id: number;
  author: string;
  rating: number;
  text: string;
  photo?: string;
  photos?: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  installment: string;
  pixPrice: number;
  rating: number;
  reviewCount: number;
  soldCount: string;
  badge?: string;
  description: string;
  mainImage: string;
  gallery: string[];
  features: string[];
  productReviews?: Review[];
}

export const products: Product[] = [
  // ── PRIMEIRO: Kit 650 Figurinhas (R$69,90) ──
  {
    id: "prod-7",
    slug: "kit-650-figurinhas",
    name: "Kit 650 Figurinhas Copa 2026",
    price: 69.90,
    originalPrice: 139.90,
    installment: "5x R$ 13,98 sem juros",
    pixPrice: 62.91,
    rating: 4.9,
    reviewCount: 203,
    soldCount: "+500 vendidos",
    badge: "MAIOR KIT DE FIGURINHAS",
    description: "Super kit com 650 figurinhas (93 envelopes) do álbum Copa do Mundo 2026. O maior kit de figurinhas disponível para completar seu álbum! Produto 100% original Panini.",
    mainImage: "/images/650figurinhas.webp",
    gallery: ["/images/650figurinhas.webp", "/images/figurinhascard1.webp", "/images/figurinhascard2.webp", "/images/figurinhascard3.webp"],
    features: ["93 envelopes lacrados", "650 figurinhas originais Panini", "Maior kit de figurinhas", "Frete grátis FULL", "Ideal para completar o álbum"],
    productReviews: [
      {
        id: 1,
        author: "Roberto Silveira",
        rating: 5,
        text: "Maior kit que já comprei! Com 650 figurinhas deu pra completar quase o álbum inteiro de uma vez. Todas originais Panini, pacotes lacrados e entrega super rápida. Vale cada centavo!"
      },
      {
        id: 2,
        author: "Daniela Moura",
        rating: 5,
        text: "Comprei para dividir com meu irmão e deu super certo! 93 pacotes renderam muitas figurinhas boas e pouquíssimas repetidas. Produto 100% original e chegou em 3 dias. Melhor compra!",
        photo: "/images/rev-8a.webp"
      },
      {
        id: 3,
        author: "Vinícius Almeida",
        rating: 5,
        text: "Simplesmente o melhor custo-benefício! 650 figurinhas por esse preço é imbatível. Saíram várias douradas e especiais. Entrega rápida, tudo lacrado e original. Super recomendo!",
        photos: ["/images/rev-11a.webp", "/images/rev-11b.webp"]
      },
      {
        id: 4,
        author: "Larissa Fernandes",
        rating: 5,
        text: "Kit absurdo de grande! Comprei pro meu filho e ele ficou dias abrindo os pacotes. As figurinhas são 100% originais Panini, qualidade impecável. Chegou tudo certo e bem embalado. Nota mil!",
        photo: "/images/rev-9.webp"
      }
    ]
  },
  {
    id: "prod-2",
    slug: "album-180-figurinhas",
    name: "Kit Álbum Copa 2026 + 180 Figurinhas",
    price: 34.90,
    originalPrice: 79.00,
    installment: "5x R$ 6,98 sem juros",
    pixPrice: 31.41,
    rating: 4.8,
    reviewCount: 923,
    soldCount: "+3.500 vendidos",
    description: "Kit com 1 álbum capa mole oficial Panini + 180 figurinhas (25 envelopes) do álbum Copa do Mundo 2026.",
    mainImage: "/images/sugg-1.webp",
    gallery: ["/images/sugg-1.webp"],
    features: ["25 envelopes lacrados", "Álbum capa mole original", "Frete grátis", "Produto 100% original"],
    productReviews: [
      {
        id: 1,
        author: "Eduardo Martins",
        rating: 5,
        text: "Comprei o kit com 180 figurinhas e não me arrependi! Chegou rápido, tudo lacrado e original. Com 25 envelopes deu pra preencher bastante o álbum. Qualidade Panini top, como sempre."
      },
      {
        id: 2,
        author: "Letícia Barbosa",
        rating: 5,
        text: "Produto chegou certinho e no prazo! As figurinhas são 100% originais, dá pra ver pelo acabamento e o código QR. O álbum capa mole é bem resistente. Perfeito para quem quer começar a colecionar sem gastar muito.",
        photo: "/images/review-extra-5.webp"
      },
      {
        id: 3,
        author: "Felipe Sousa",
        rating: 5,
        text: "Excelente kit! Comprei junto com um amigo e os dois ficamos satisfeitos. Saíram figurinhas ótimas nos pacotes, incluindo algumas douradas. Entrega super rápida e bem embalado. Recomendo sem hesitar!"
      },
      {
        id: 4,
        author: "Renata Campos",
        rating: 5,
        text: "Já é a segunda vez que compro aqui e a qualidade continua impecável. As 180 figurinhas vieram todas em perfeito estado, o álbum é resistente e o preço é imbatível. Frete grátis é um diferencial enorme!",
        photo: "/images/rev-7.webp"
      }
    ]
  },
  {
    id: "prod-3",
    slug: "kit-140-figurinhas",
    name: "Kit 140 Figurinhas Copa 2026",
    price: 22.90,
    originalPrice: 49.90,
    installment: "5x R$ 4,58 sem juros",
    pixPrice: 20.61,
    rating: 4.9,
    reviewCount: 612,
    soldCount: "+2.100 vendidos",
    description: "Kit com 140 figurinhas (20 envelopes) do álbum Copa do Mundo 2026. Ideal para completar seu álbum!",
    mainImage: "/images/sugg-2.webp",
    gallery: ["/images/sugg-2.webp"],
    features: ["20 envelopes lacrados", "Figurinhas 100% originais Panini", "Frete grátis"],
    productReviews: [
      {
        id: 1,
        author: "Thiago Menezes",
        rating: 5,
        text: "Kit ideal para quem já tem o álbum e quer completar! Com 140 figurinhas deu pra tirar muitas repetidas e trocar com os amigos. Todas originais Panini, chegou rápido e bem embalado.",
        photos: ["/images/rev-6a.webp", "/images/rev-6b.webp"]
      },
      {
        id: 2,
        author: "Carolina Vieira",
        rating: 5,
        text: "Comprei para complementar o kit maior que já tinha. As figurinhas são todas originais, pacotes lacrados e em perfeito estado. Atendimento excelente e entrega no prazo. Recomendo muito!"
      },
      {
        id: 3,
        author: "Anderson Lima",
        rating: 5,
        text: "Surpreendente! Com 20 pacotes abertos saíram figurinhas de vários países diferentes. Qualidade de impressão perfeita, nenhuma rasgada ou torta. Produto 100% original Panini, valeu muito a pena!"
      },
      {
        id: 4,
        author: "Priscila Nunes",
        rating: 5,
        text: "Ótimo para quem quer completar o álbum sem gastar muito! Preço justo, entrega rápida e as figurinhas vieram todas lacradas. Já estou pensando em comprar mais um kit. Nota máxima!",
        photo: "/images/rev-10.webp"
      }
    ]
  },
  {
    id: "prod-4",
    slug: "kit-252-figurinhas",
    name: "Kit 252 Figurinhas Copa 2026 - 36 Pacotes",
    price: 39.90,
    originalPrice: 89.00,
    installment: "5x R$ 7,98 sem juros",
    pixPrice: 35.91,
    rating: 4.9,
    reviewCount: 384,
    soldCount: "+1.200 vendidos",
    badge: "IDEAL PARA QUEM JÁ TEM O ÁLBUM",
    description: "Super kit com 252 figurinhas (36 pacotes) para completar seu álbum da Copa do Mundo 2026. O maior kit disponível!",
    mainImage: "/images/sugg-3.webp",
    gallery: ["/images/sugg-3.webp"],
    features: ["36 pacotes lacrados", "Figurinhas originais Panini", "Maior kit disponível", "Frete grátis FULL"],
    productReviews: [
      {
        id: 1,
        author: "Gustavo Pinheiro",
        rating: 5,
        text: "O maior kit e o melhor! Com 36 pacotes deu pra completar quase 80% do álbum de uma vez. Figurinhas todas originais Panini, saíram várias douradas e holográficas. Entrega em 3 dias úteis, perfeito!",
        photos: ["/images/rev-8a.webp", "/images/rev-8b.webp"]
      },
      {
        id: 2,
        author: "Amanda Freitas",
        rating: 5,
        text: "Comprei para completar o álbum que já estava na metade. Com 252 figurinhas quase zerei! Produto 100% original, os pacotes vieram todos lacrados e sem nenhum dano. Entrega super rápida. Amei!"
      },
      {
        id: 3,
        author: "Leandro Castro",
        rating: 5,
        text: "Melhor custo-benefício para quem já tem o álbum! 36 pacotes por esse preço é absurdo. Saíram figurinhas de todas as seleções, incluindo algumas raridades. Qualidade Panini impecável como sempre."
      },
      {
        id: 4,
        author: "Isabela Rocha",
        rating: 5,
        text: "Meu filho completou o álbum com esse kit mais o que já tínhamos! As figurinhas são todas originais, dá pra ver pelo acabamento e o brilho. Entrega rápida e embalagem segura. Compra 100% confiável!",
        photos: ["/images/rev-12a.webp", "/images/rev-12b.webp"]
      }
    ]
  },
  {
    id: "prod-5",
    slug: "kit-album-70-figurinhas",
    name: "Kit Álbum Copa 2026 + 70 Figurinhas",
    price: 24.90,
    originalPrice: 59.00,
    installment: "5x R$ 4,98 sem juros",
    pixPrice: 22.41,
    rating: 4.8,
    reviewCount: 541,
    soldCount: "+2.800 vendidos",
    badge: "ÓTIMO PARA PRESENTEAR",
    description: "Kit com 1 álbum capa mole oficial Panini + 70 figurinhas (10 envelopes) do álbum Copa do Mundo 2026. Perfeito para iniciar sua coleção ou presentear! Produto 100% original Panini.",
    mainImage: "/images/kit-70-capa.webp",
    gallery: [
      "/images/kit-70-capa.webp",
      "/images/kit-70-slide2.webp",
      "/images/kit-70-slide3.webp",
      "/images/kit-70-slide4.webp",
      "/images/kit-70-slide5.webp"
    ],
    features: ["10 envelopes lacrados", "Álbum capa mole original Panini", "70 figurinhas originais", "Frete grátis", "Ótimo para presentear"],
    productReviews: [
      {
        id: 1,
        author: "Paulo Cardoso",
        rating: 5,
        text: "Kit perfeito para presentear! Comprei para o aniversário do meu filho de 8 anos e ele adorou. O álbum é lindo e as 70 figurinhas já deram pra preencher boas páginas. Chegou muito bem embalado."
      },
      {
        id: 2,
        author: "Natália Monteiro",
        rating: 5,
        text: "Ótimo para quem quer começar a colecionar! O álbum é bem feito, capa resistente, e as figurinhas são 100% originais Panini. Com 70 já dá pra ter uma boa base na coleção. Entrega no prazo, recomendo!"
      },
      {
        id: 3,
        author: "Marcos Araújo",
        rating: 5,
        text: "Comprei como presente de Dia das Crianças e foi um sucesso! Minha filha ficou animada com o álbum e ficou abrindo os pacotes na hora. Qualidade excelente, produto original e frete grátis. Nota 10!"
      },
      {
        id: 4,
        author: "Simone Batista",
        rating: 4,
        text: "Produto bom e no prazo! As figurinhas são todas originais Panini e o álbum é resistente. Única coisa é que com 70 figurinhas fica querendo mais — mas para presentear está perfeito. Vale muito o preço!"
      }
    ]
  },
  {
    id: "prod-6",
    slug: "caixa-porta-figurinhas",
    name: "Caixa Guarda Figurinhas",
    price: 15.89,
    originalPrice: 35.98,
    installment: "2x R$ 7,95 sem juros",
    pixPrice: 14.30,
    rating: 4.7,
    reviewCount: 312,
    soldCount: "+1.000 vendidos",
    badge: "PERFEITO PARA GUARDAR E ORGANIZAR",
    description: "Caixa organizadora para guardar e proteger suas figurinhas da Copa do Mundo 2026. Modelo oficial FIFA, com travas de segurança e tampa resistente. Acompanha chaveiro exclusivo! Disponível em várias cores. Produto 100% original.",
    mainImage: "/images/caixa-guarda-main.webp",
    gallery: [
      "/images/caixa-guarda-main.webp",
      "wistia:dujywebmpq",
      "/images/caixa-guarda-azul.webp",
      "/images/caixa-guarda-azul-aberta.webp",
      "/images/caixa-guarda-preta-aberta.webp",
      "/images/caixa-guarda-vermelha-aberta.webp",
      "/images/caixa-guarda-rosa-aberta.webp",
      "/images/caixa-guarda-dourada-aberta.webp",
      "/images/caixa-guarda-interior.webp",
      "/images/caixa-guarda-insert.webp"
    ],
    features: ["Caixa organizadora oficial FIFA", "Travas de segurança resistentes", "Acompanha chaveiro exclusivo", "Disponível em várias cores", "Produto 100% original", "Frete grátis"],
    productReviews: [
      {
        id: 1,
        author: "Camila Rodrigues",
        rating: 5,
        text: "Amei demais! A caixa chegou super bem embalada, é bem resistente e o acabamento é lindo. O chaveiro de brinde é um charme a parte — minha filha ficou encantada! Já coloquei todas as figurinhas organizadinhas. Produto 100% original, recomendo muito!",
        photos: [
          "/images/rev-caixa-preta-1.webp",
          "/images/rev-caixa-preta-2.webp",
          "/images/rev-caixa-preta-3.webp",
          "/images/rev-caixa-preta-4.webp",
          "/images/rev-caixa-preta-5.webp"
        ]
      },
      {
        id: 2,
        author: "Fernanda Azevedo",
        rating: 5,
        text: "Simplesmente perfeita! Comprei a azul e me apaixonei na hora que abri. A qualidade é impressionante — a tampa fecha firme, o travamento é sólido e o interior tem um organizador separador que segura os pacotes de figurinhas com segurança. O chaveiro de brinde é uma graça, ficou pendurado na minha bolsa. Produto chegou rápido e bem embalado. Vale cada centavo!",
        photos: [
          "/images/rev-dep-azul-1.webp",
          "/images/rev-dep-azul-2.webp"
        ]
      },
      {
        id: 3,
        author: "Juliana Nascimento",
        rating: 5,
        text: "Que produto incrível! Escolhi a verde e ficou linda demais — a cor é vibrante, igual à foto. Abri e fiquei impressionada com o espaço interno: cabem muitas figurinhas organizadas e ainda tem o porta-chaveiro embutido. O acabamento é impecável, sem nenhuma rebarbas. Presente ideal para quem coleciona figurinhas da Copa! Já indiquei pra toda a minha família.",
        photos: [
          "/images/rev-dep-verde-1.webp",
          "/images/rev-dep-verde-2.webp"
        ]
      },
      {
        id: 4,
        author: "Beatriz Teixeira",
        rating: 5,
        text: "Pedi a amarela e não me arrependi nem um pouco! A cor é linda, parece uma joia de colecionador. A caixa é robusta, com trava dupla super resistente — não abre por acidente de jeito nenhum. Meu filho ama Copa do Mundo e ficou feliz demais com o presente. A impressão do logo FIFA com a taça ficou perfeita. Super recomendo, entrega rápida e bem protegida na caixa.",
        photo: "/images/rev-dep-amarelo-1.webp"
      }
    ]
  },
  // ── ÚLTIMO: Kit Álbum + 250 Figurinhas (R$49,00) ──
  {
    id: "prod-1",
    slug: "album-250-figurinhas",
    name: "Kit Álbum Copa 2026 + 250 Figurinhas",
    price: 49.00,
    originalPrice: 119.00,
    installment: "5x R$ 9,80 sem juros",
    pixPrice: 44.10,
    rating: 4.9,
    reviewCount: 1847,
    soldCount: "+7.000 vendidos",
    badge: "MAIS VENDIDO — 1º em Álbuns Copa do Mundo",
    description: "Kit completo com 1 álbum capa mole oficial Panini + 250 figurinhas (35 envelopes) do álbum Copa do Mundo 2026. Produto 100% original Panini.",
    mainImage: "/images/album-capa-mole.webp",
    gallery: [
      "/images/album-capa-mole.webp",
      "/images/slide-2.webp",
      "/images/slide-3.webp",
      "/images/slide-4.webp",
      "/images/slide-5.webp",
      "/images/slide-6.webp",
      "/images/slide-7.webp"
    ],
    features: ["35 envelopes lacrados", "Álbum capa mole original Panini", "Frete grátis FULL", "Entrega rápida"],
    productReviews: [
      {
        id: 1,
        author: "Lucas Pereira",
        rating: 5,
        text: "Produto incrível! Chegou em 2 dias, bem embalado e tudo lacrado. O álbum é lindo, capa firme e todas as 250 figurinhas originais Panini. Já completei quase metade do álbum!",
        photo: "/images/review-extra-1.webp"
      },
      {
        id: 2,
        author: "Mariana Santos",
        rating: 5,
        text: "Comprei para o meu filho e ele ficou feliz demais! O kit veio completo, o álbum é de qualidade excelente e as figurinhas todas originais. Com 250 figurinhas já deu pra preencher bastante. Super recomendo!",
        photos: ["/images/review-extra-2.webp", "/images/review-extra-3.webp"]
      },
      {
        id: 3,
        author: "Rodrigo Almeida",
        rating: 5,
        text: "Melhor custo-benefício que encontrei! Procurei em várias lojas e aqui estava bem mais barato com a mesma qualidade Panini. Entrega rápida e produto 100% original. Já indiquei para amigos.",
        photo: "/images/review-extra-4.webp"
      },
      {
        id: 4,
        author: "Gabriela Costa",
        rating: 5,
        text: "Presenteei meu sobrinho e ele não largou mais! O álbum Copa 2026 é muito bem feito, as figurinhas vieram todas lacradas e originais. A embalagem chegou perfeita, sem amassados. Nota 10!",
        photo: "/images/rev-mom-kid.webp"
      }
    ]
  }
];

export const reviews = [
  { id: 1, author: "Carlos Andrade", rating: 5, text: "Produto chegou certinho! Álbum Panini Copa 2026 original, capa linda e bem firme.", photo: "/images/review-extra-1.webp" },
  { id: 2, author: "Fernanda Lima", rating: 5, text: "O álbum é lindo dos dois lados! Qualidade de impressão perfeita, produto 100% original Panini.", photos: ["/images/review-extra-2.webp", "/images/review-extra-3.webp"] },
  { id: 3, author: "Ana Carvalho", rating: 5, text: "Presente perfeito pro meu filho! Chegou rápido e bem embalado.", photo: "/images/rev-mom-kid.webp" },
  { id: 4, author: "Rafael Moreira", rating: 5, text: "Chegou o kit completo! Álbum com os pacotes, tudo lacrado e original Panini.", photo: "/images/review-extra-4.webp" },
  { id: 5, author: "Patrícia Gomes", rating: 5, text: "Me surpreendi com as figurinhas Panini! Álbum muito bem feito, vale muito a pena!", photo: "/images/review-extra-5.webp" },
  { id: 6, author: "Bruno Cavalcante", rating: 5, text: "Organizei tudo numa caixinha! Vieram figurinhas de várias seleções, produto 100% original.", photos: ["/images/rev-6a.webp", "/images/rev-6b.webp"] },
  { id: 7, author: "Tatiane Ribeiro", rating: 5, text: "Abri todos os pacotes de uma vez! Muita figurinha boa saiu, produto original e lacrado.", photo: "/images/rev-7.webp" },
  { id: 8, author: "Diego Ferreira", rating: 5, text: "Saiu o Mbappé!! Figurinha incrível, qualidade de impressão perfeita.", photos: ["/images/rev-8a.webp", "/images/rev-8b.webp"] },
  { id: 9, author: "Henrique Lopes", rating: 5, text: "Os pacotes vieram com os códigos do álbum digital também! Dupla diversão.", photo: "/images/rev-10.webp" },
  { id: 10, author: "Vanessa Oliveira", rating: 5, text: "Vieram o Vinicius Jr. e o Messi EXTRA roxinho! Duas raridades num único kit.", photos: ["/images/rev-12a.webp", "/images/rev-12b.webp"] }
];
