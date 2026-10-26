import type { Batch, Entry, Harvest, Project } from "./data.ts";

export class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export type Mutation =
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
export function parseMutation(input: unknown): Mutation {
  const body = object(input);
  if (body.kind === "status")
    return { kind: "status", id: id(body.id), status: status(body.status) };
  const r = object(body.record);
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
