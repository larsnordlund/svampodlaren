import {
  species,
  type CustomSpecies,
  type Batch,
  type Entry,
  type Harvest,
  type Project,
} from "./data.ts";

export class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export const deleteKinds = [
  "radera-anteckning",
  "radera-projekt",
  "radera-batch",
  "radera-skörd",
  "radera-svamp",
] as const;
export type DeleteKind = (typeof deleteKinds)[number];
export type Mutation =
  | { kind: "odlingsform"; id: string; growingMethod: string }
  | { kind: DeleteKind; id: string }
  | { kind: "svamp"; record: CustomSpecies }
  | { kind: "projekt"; record: Project }
  | { kind: "batch"; record: Batch }
  | { kind: "anteckning"; record: Entry }
  | { kind: "skörd"; record: Harvest }
  | { kind: "status"; id: string; status: Batch["status"] };
const statuses: Batch["status"][] = [
  "Inokulering",
  "Inkubation",
  "Fruktsättning",
  "Avslutad",
];
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Ogiltig post.");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 120) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new InputError(`${label} måste innehålla 1–${max} tecken.`);
  return value.trim();
}
function id(value: unknown) {
  const result = text(value, "ID", 80);
  if (!/^[a-zA-Z0-9_-]+$/.test(result)) throw new InputError("Ogiltigt ID.");
  return result;
}
function number(
  value: unknown,
  label: string,
  min: number,
  max: number,
  integer = false,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new InputError(
      `${label} måste vara ${integer ? "ett heltal" : "ett tal"} mellan ${min} och ${max}.`,
    );
  return value;
}
function status(value: unknown) {
  if (!statuses.includes(value as Batch["status"]))
    throw new InputError("Välj en giltig odlingsfas.");
  return value as Batch["status"];
}
function date(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new InputError("Ange ett giltigt datum.");
  const parsed = new Date(value + "T12:00:00Z");
  if (
    !Number.isFinite(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw new InputError("Ange ett giltigt datum.");
  return value;
}
function optionalText(value: unknown, label: string, max: number) {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || value.trim().length > max)
    throw new InputError(`${label} får innehålla högst ${max} tecken.`);
  return value.trim();
}
export function speciesNameKey(name: string) {
  return name.trim().normalize("NFC").toLocaleLowerCase("sv-SE");
}
function sourceUrl(value: unknown) {
  const result = optionalText(value, "Källänk", 2048);
  if (!result) return "";
  try {
    const url = new URL(result);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw Error();
  } catch {
    throw new InputError(
      "Källänken måste vara en fullständig http- eller https-adress.",
    );
  }
  return result;
}
export function parseMutation(input: unknown): Mutation {
  const body = object(input);
  if (body.kind === "odlingsform")
    return {
      kind: "odlingsform",
      id: id(body.id),
      growingMethod: optionalText(body.growingMethod, "Odlingsform", 80),
    };
  if (deleteKinds.includes(body.kind as DeleteKind))
    return { kind: body.kind as DeleteKind, id: id(body.id) };
  if (body.kind === "status")
    return { kind: "status", id: id(body.id), status: status(body.status) };
  const r = object(body.record);
  if (body.kind === "svamp") {
    const name = text(r.name, "Svampnamn");
    if (species.some((s) => speciesNameKey(s.name) === speciesNameKey(name)))
      throw new InputError(
        "Svampen finns redan i det inbyggda biblioteket.",
        409,
      );
    return {
      kind: "svamp",
      record: {
        id: id(r.id),
        name,
        latin: optionalText(r.latin, "Vetenskapligt namn", 160),
        description: optionalText(r.description, "Beskrivning", 1000),
        guide: optionalText(r.guide, "Odlingsråd", 4000),
        url: sourceUrl(r.url),
      },
    };
  }
  const base = { id: id(r.id), date: date(r.date) };
  switch (body.kind) {
    case "projekt":
      return {
        kind: "projekt",
        record: {
          ...base,
          name: text(r.name, "Projektnamn"),
          species: text(r.species, "Svampart"),
          location: text(r.location, "Odlingsplats"),
        },
      };
    case "batch":
      return {
        kind: "batch",
        record: {
          ...base,
          projectId: id(r.projectId),
          name: text(r.name, "Batchnamn"),
          substrate: text(r.substrate, "Substrat"),
          growingMethod: optionalText(r.growingMethod, "Odlingsform", 80),
          status: status(r.status),
        },
      };
    case "anteckning":
      return {
        kind: "anteckning",
        record: {
          ...base,
          batchId: id(r.batchId),
          text: text(r.text, "Observation", 2000),
          temperature: number(r.temperature, "Temperatur", -20, 60),
          humidity: number(r.humidity, "Luftfuktighet", 0, 100),
        },
      };
    case "skörd":
      return {
        kind: "skörd",
        record: {
          ...base,
          batchId: id(r.batchId),
          weight: number(r.weight, "Vikt", 1, 1000000, true),
          flush: number(r.flush, "Skördevåg", 1, 100, true),
        },
      };
    default:
      throw new InputError("Okänd åtgärd.");
  }
}
