export type Project = {
  id: string;
  name: string;
  species: string;
  location: string;
  date: string;
};
export type Batch = {
  id: string;
  projectId: string;
  name: string;
  substrate: string;
  growingMethod: string;
  status: "Inokulering" | "Inkubation" | "Fruktsättning" | "Avslutad";
  date: string;
};
export type Entry = {
  id: string;
  batchId: string;
  date: string;
  text: string;
  temperature: number;
  humidity: number;
};
export type Harvest = {
  id: string;
  batchId: string;
  date: string;
  weight: number;
  flush: number;
};
export type CustomSpecies = {
  id: string;
  name: string;
  latin: string;
  description: string;
  guide: string;
  url: string;
};
export type Data = {
  customSpecies: CustomSpecies[];
  projects: Project[];
  batches: Batch[];
  entries: Entry[];
  harvests: Harvest[];
};
export const seed: Data = {
  customSpecies: [],
  projects: [
    {
      id: "p1",
      name: "Ostronskivling i odlingsrummet",
      species: "Ostronskivling",
      location: "Odlingsrum A",
      date: "2026-10-01",
    },
    {
      id: "p2",
      name: "Shiitake på lövträ",
      species: "Shiitake",
      location: "Odlingsrum B",
      date: "2026-09-12",
    },
    {
      id: "p3",
      name: "Igelkottstaggsvamp – höstförsök",
      species: "Igelkottstaggsvamp",
      location: "Odlingsrum A",
      date: "2026-10-15",
    },
  ],
  batches: [
    {
      id: "b1",
      projectId: "p1",
      name: "OST-026",
      growingMethod: "",
      substrate: "Pastöriserad halm",
      status: "Fruktsättning",
      date: "2026-10-01",
    },
    {
      id: "b2",
      projectId: "p1",
      name: "OST-027",
      growingMethod: "",
      substrate: "Lövträpellets",
      status: "Inkubation",
      date: "2026-10-18",
    },
    {
      id: "b3",
      projectId: "p2",
      name: "SHI-012",
      growingMethod: "",
      substrate: "Lövträsågspån",
      status: "Inkubation",
      date: "2026-09-12",
    },
    {
      id: "b4",
      projectId: "p3",
      name: "IGL-004",
      growingMethod: "",
      substrate: "Lövträpellets",
      status: "Inokulering",
      date: "2026-10-25",
    },
  ],
  entries: [
    {
      id: "e1",
      batchId: "b1",
      date: "2026-10-26",
      text: "Fina fruktkroppar och jämn tillväxt. Ökade luftväxlingen något i morse.",
      temperature: 18,
      humidity: 88,
    },
    {
      id: "e2",
      batchId: "b3",
      date: "2026-10-24",
      text: "Mycelet sprider sig jämnt i substratet. Inga avvikelser observerade.",
      temperature: 21,
      humidity: 75,
    },
  ],
  harvests: [
    { id: "h1", batchId: "b1", date: "2026-10-22", weight: 1250, flush: 1 },
    { id: "h2", batchId: "b1", date: "2026-10-25", weight: 840, flush: 2 },
  ],
};
export const species = [
  {
    name: "Ostronskivling",
    latin: "Pleurotus ostreatus",
    tag: "En bra början",
    color: "sage",
    description:
      "En mångsidig art att lära känna. Odlas ofta på halm eller lövträbaserade substrat.",
    guide:
      "Följ anvisningarna för din stam och ditt substrat. Observera mycelets utveckling, dokumentera luftväxling och håll odlingsmiljön ren.",
    url: "https://www.mushroomcompany.com/resources/oyster/index.shtml",
  },
  {
    name: "Shiitake",
    latin: "Lentinula edodes",
    tag: "För den tålmodiga",
    color: "clay",
    description:
      "En vedlevande matsvamp som odlas på lövträstockar eller kompletterade sågspånsblock.",
    guide:
      "Planera för en längre koloniserings- och mognadsperiod. Märk varje batch så att viloperioder och skördevågor går att följa.",
    url: "https://smallfarms.cornell.edu/projects/mushrooms/",
  },
  {
    name: "Igelkottstaggsvamp",
    latin: "Hericium erinaceus",
    tag: "Ett nytt odlingsäventyr",
    color: "sand",
    description:
      "Karaktäristiska vita taggar. Odlas vanligen inomhus på lövträbaserade block.",
    guide:
      "Dokumentera form och färg på fruktkropparna. Anpassa miljön efter leverantörens odlingsguide och den aktuella stammen.",
    url: "https://smallfarms.cornell.edu/projects/mushrooms/",
  },
  {
    name: "Kungsmussling",
    latin: "Pleurotus eryngii",
    tag: "Odla på block",
    color: "sand",
    description:
      "En odlingssvamp som ofta säljs som king oyster. Färdiga odlingsblock är ett enkelt sätt att prova arten inomhus.",
    guide:
      "Börja gärna med ett koloniserat block avsett för kungsmussling. Följ leverantörens anvisningar för öppning och fruktsättning. Anteckna luftväxling, fukt och fruktkropparnas utveckling för varje batch.",
    url: "https://fieldforest.net/resources/instruction-sheets/",
  },
  {
    name: "Jättekragskivling",
    latin: "Stropharia rugoso-annulata",
    tag: "För trädgårdsbädden",
    color: "clay",
    description:
      "Även kallad wine cap. Kan odlas utomhus i bäddar med lövträflis och passar en odling som följer årstiderna.",
    guide:
      "Välj en skuggig plats och anlägg en flisbädd enligt mycelleverantörens instruktioner. Håll bädden fuktig och dokumentera nederbörd, uttorkning och när fruktkropparna visar sig.",
    url: "https://smallfarms.cornell.edu/resources/outdoor-production/",
  },
  {
    name: "Nameko",
    latin: "Pholiota nameko",
    tag: "Prova stockodling",
    color: "clay",
    description:
      "En vedlevande odlingssvamp med bruna hattar. Stockodling på lämpligt lövträ är en av de dokumenterade metoderna.",
    guide:
      "Använd träslag och stockdimensioner som rekommenderas för den aktuella stammen. Märk stockarna med inokuleringsdatum och håll dem skyddade från uttorkning. Följ kolonisering och skördar i dagboken.",
    url: "https://smallfarms.cornell.edu/resources/outdoor-production/",
  },
  {
    name: "Pioppino",
    latin: "Agrocybe aegerita",
    tag: "Ett nytt blockförsök",
    color: "sage",
    description:
      "En odlad svamp som även kallas pioppini. Finns som färdigkoloniserade block för fruktsättning inomhus.",
    guide:
      "Utgå från ett färdigt block och följ den medföljande guiden för pioppino. Registrera startdatum och förändringar i odlingsmiljön. Jämför sedan fruktsättning och skördemängd mellan batcherna.",
    url: "https://fieldforest.net/resources/instruction-sheets/",
  },
  {
    name: "Maitake (korallticka)",
    latin: "Grifola frondosa",
    tag: "För nästa odlingssteg",
    color: "sage",
    description:
      "En art som kan odlas på stockar utomhus eller på sågspånsbaserade block inomhus. Kallas också hen of the woods.",
    guide:
      "Välj en stam och metod som passar din odlingsplats. Följ en artspecifik guide för stock eller block och dokumentera kolonisering, viloperioder och fruktsättning. Jämför inte tidsåtgången direkt med snabbare ostronskivlingar.",
    url: "https://namyco.org/interests/cultivation/commonly-cultivated-mushroom-species/",
  },
  {
    name: "Champinjon",
    latin: "Agaricus bisporus",
    tag: "Odla på kompost",
    color: "sand",
    description:
      "En klassisk odlingssvamp som odlas i särskilt förberett kompostsubstrat med ett täcklager, i stället för på träblock.",
    guide:
      "Börja gärna med en odlingssats med färdigbehandlat substrat och rätt täckmaterial. Följ satsens instruktioner för kolonisering och täckning. Anteckna bevattning och skördevågor för att följa odlingens utveckling.",
    url: "https://extension.psu.edu/basic-procedures-for-agaricus-mushroom-growing",
  },
];

export const growingMethods = [
  "Hink",
  "Påse",
  "Stock",
  "Friland",
  "Bädd",
  "Låda",
  "Burk",
] as const;
