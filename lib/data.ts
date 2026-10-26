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
export type Data = {
  projects: Project[];
  batches: Batch[];
  entries: Entry[];
  harvests: Harvest[];
};
export const seed: Data = {
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
      substrate: "Pastöriserad halm",
      status: "Fruktsättning",
      date: "2026-10-01",
    },
    {
      id: "b2",
      projectId: "p1",
      name: "OST-027",
      substrate: "Lövträpellets",
      status: "Inkubation",
      date: "2026-10-18",
    },
    {
      id: "b3",
      projectId: "p2",
      name: "SHI-012",
      substrate: "Lövträsågspån",
      status: "Inkubation",
      date: "2026-09-12",
    },
    {
      id: "b4",
      projectId: "p3",
      name: "IGL-004",
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
];
