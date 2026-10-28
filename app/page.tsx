"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Droplets,
  LayoutDashboard,
  Leaf,
  Menu,
  Plus,
  Search,
  Sprout,
  Thermometer,
  Trash2,
  Wheat,
  X,
} from "lucide-react";
import {
  species as builtInSpecies,
  growingMethods,
  cultivationPhases,
  type Batch,
} from "@/lib/data";
import { useCultivation } from "@/lib/use-cultivation";
import { BatchMethodEditor } from "@/components/batch-method-editor";
import { SpeciesImageEditor } from "@/components/species-image-editor";
import { SpeciesLabelFields } from "@/components/species-label-fields";
import { SpeciesImagePicker } from "@/components/species-image-picker";
import { SpeciesPhoto } from "@/components/species-photo";
import type { Mutation, DeleteKind } from "@/lib/validation";

import type { User } from "@/lib/accounts";
import { AccountGate } from "@/components/account-gate";

const navigation = [
  { name: "Översikt", icon: LayoutDashboard },
  { name: "Odlingsprojekt", icon: Sprout },
  { name: "Batchregister", icon: ClipboardList },
  { name: "Odlingsdagbok", icon: BookOpen },
  { name: "Skördar", icon: Wheat },
  { name: "Svampbibliotek", icon: Mushroom },
];
type View = (typeof navigation)[number]["name"];
type FormKind = "projekt" | "batch" | "anteckning" | "skörd" | "svamp";
type DeleteTarget = {
  kind: DeleteKind;
  id: string;
  noun: string;
  label: string;
  meta: string;
  preview: string;
  blocked: string;
};
const titles: Record<View, string> = {
  Översikt: "Här växer något fint.",
  Odlingsprojekt: "Från idé till odling.",
  Batchregister: "Varje batch har en historia.",
  Odlingsdagbok: "Lär känna din odling.",
  Skördar: "Resultatet av din omsorg.",
  Svampbibliotek: "Kunskap som får växa.",
};
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(
    new Date(),
  );
function Mushroom({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 13a9 9 0 0 1 18 0Z" />
      <path d="M9 13v7h6v-7M8 8h.01M14 6h.01M16 10h.01" />
    </svg>
  );
}
function MushroomArt({ variant = 0 }: { variant?: number }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" aria-hidden="true">
      <path d="M48 211 Q160 185 279 211" stroke="currentColor" opacity=".2" />
      <g transform={variant === 1 ? "translate(5 0)" : "translate(0 0)"}>
        <path
          d="M144 119 Q149 161 131 207 Q154 216 176 206 Q158 157 173 117"
          fill="#e9dfca"
        />
        <path
          d="M61 115 C64 34 237 24 259 113 Q234 145 61 132 Z"
          fill={variant === 1 ? "#927761" : "#b7c5a0"}
        />
        <path d="M61 126 Q152 163 259 113 Q167 129 61 115" fill="#d9ccb0" />
        <path
          d="M80 129 Q151 148 236 122 M93 127 L148 141 M123 126 L155 141 M187 123 L168 141 M215 120 L177 138"
          stroke="#a69b83"
          strokeWidth="2"
          opacity=".7"
        />
        <path
          d="M188 171 Q197 192 189 214 L211 214 Q206 191 214 172"
          fill="#e9dfca"
        />
        <path
          d="M157 173 C166 129 232 133 246 173 Q206 190 157 173"
          fill={variant === 1 ? "#b79c7e" : "#839879"}
        />
        <path
          d="M97 207 L90 187 M235 209 L241 191 M113 208 L108 197"
          stroke="#71836c"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="110" cy="84" r="5" fill="#ede8db" opacity=".5" />
        <circle cx="197" cy="70" r="8" fill="#ede8db" opacity=".35" />
      </g>
    </svg>
  );
}

export default function Page() {
  return <AccountGate>{(user) => <Home user={user} />}</AccountGate>;
}
function Home({ user }: { user: User }) {
  const admin = user.role === "admin";
  const [view, setView] = useState<View>("Översikt");
  const { data, ready, saving, error, save, retry, clearError } =
    useCultivation();
  const species = [
    ...builtInSpecies,
    ...data.customSpecies.map((s) => ({
      ...s,
      tag: s.badgeText ?? "Egen svamp",
      color: "sage",
    })),
  ];
  const canEdit = (id: string) =>
    admin ||
    Object.values(data).some((rows) =>
      rows.some(
        (r: { id: string; ownerId?: string }) =>
          r.id === id && r.ownerId === user.id,
      ),
    );
  const myProjects = data.projects.filter((p) => p.ownerId === user.id);
  const myBatches = data.batches.filter((b) => b.ownerId === user.id);
  const [imageBusy, setImageBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Alla");
  const [form, setForm] = useState<FormKind | null>(null);
  const [entryBatchId, setEntryBatchId] = useState("");
  const [entryPhase, setEntryPhase] = useState<Batch["status"] | "">("");
  const [notice, setNotice] = useState("");
  const [guide, setGuide] = useState<number | null>(null);
  const [deletion, setDeletion] = useState<DeleteTarget | null>(null);
  useEffect(() => {
    if (!form && guide === null && !deletion) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button, input, select, textarea, a[href]",
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));
    focusable()
      .find((el) => el.hasAttribute("autofocus"))
      ?.focus();
    if (!dialog?.contains(document.activeElement)) focusable()[0]?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (deletion && saving) return;
        setDeletion(null);
        setForm(null);
        setGuide(null);
      }
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [form, guide, deletion, saving]);
  const go = (next: View) => {
    setView(next);
    setQuery("");
    setFilter("Alla");
    setNotice("");
    setMenu(false);
  };
  const batchName = (id: string) => {
    const batch = data.batches.find((b) => b.id === id);
    return batch
      ? batch.name + (batch.growingMethod ? " · " + batch.growingMethod : "")
      : "Okänd batch";
  };
  const projectName = (id: string) =>
    data.projects.find((p) => p.id === id)?.name ?? "Okänt projekt";
  function requestDelete(kind: DeleteKind, id: string) {
    let target: DeleteTarget | undefined;
    switch (kind) {
      case "radera-projekt": {
        const p = data.projects.find((p) => p.id === id);
        if (!p) return;
        const count = data.batches.filter((b) => b.projectId === id).length;
        target = {
          kind,
          id,
          noun: "projektet",
          label: "projekt",
          meta: p.species + " · " + p.location,
          preview: p.name,
          blocked: count
            ? `Projektet har ${count} kopplade batcher. Radera batcherna först.`
            : "",
        };
        break;
      }
      case "radera-batch": {
        const b = data.batches.find((b) => b.id === id);
        if (!b) return;
        const entries = data.entries.filter((e) => e.batchId === id).length;
        const harvests = data.harvests.filter((h) => h.batchId === id).length;
        target = {
          kind,
          id,
          noun: "batchen",
          label: "batch",
          meta: projectName(b.projectId),
          preview: batchName(b.id) + " · " + b.substrate,
          blocked:
            entries || harvests
              ? `Batchen har ${entries} anteckningar och ${harvests} skördar. Radera dem först.`
              : "",
        };
        break;
      }
      case "radera-anteckning": {
        const e = data.entries.find((e) => e.id === id);
        if (!e) return;
        target = {
          kind,
          id,
          noun: "anteckningen",
          label: "anteckning",
          meta: batchName(e.batchId) + " · " + formatDate(e.date),
          preview: e.text,
          blocked: "",
        };
        break;
      }
      case "radera-skörd": {
        const h = data.harvests.find((h) => h.id === id);
        if (!h) return;
        target = {
          kind,
          id,
          noun: "skörden",
          label: "skörd",
          meta: batchName(h.batchId) + " · " + formatDate(h.date),
          preview: `${h.weight.toLocaleString("sv-SE")} g · Skördevåg ${h.flush}`,
          blocked: "",
        };
        break;
      }
      case "radera-svamp": {
        const mushroom = data.customSpecies.find((m) => m.id === id);
        if (!mushroom) return;
        target = {
          kind,
          id,
          noun: "svampen",
          label: "svamp",
          meta: mushroom.latin || "Egen svamp",
          preview: mushroom.name,
          blocked: "",
        };
        break;
      }
    }
    setNotice("");
    clearError();
    setDeletion(target);
  }
  const deleteButton = (kind: DeleteKind, id: string, label: string) =>
    canEdit(id) && (
      <button
        className="delete-entry-button"
        disabled={saving || imageBusy}
        aria-label={label}
        onClick={() => requestDelete(kind, id)}
      >
        <Trash2 size={15} />
        Radera
      </button>
    );
  const total = data.harvests.reduce((sum, h) => sum + h.weight, 0);
  const match = (...values: string[]) =>
    values
      .join(" ")
      .toLocaleLowerCase("sv")
      .includes(query.toLocaleLowerCase("sv"));
  const open = (kind: FormKind) => {
    if (kind === "anteckning") {
      setEntryBatchId(myBatches[0]?.id || "");
      setEntryPhase(myBatches[0]?.status || "");
    }
    setForm(kind);
    setNotice("");
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || imageBusy) return;
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? "").trim();
    const base = { id: crypto.randomUUID(), date: value("date") || today() };
    let mutation: Mutation;
    switch (form) {
      case "svamp":
        mutation = {
          kind: form,
          record: {
            id: base.id,
            name: value("name"),
            latin: value("latin"),
            description: value("description"),
            guide: value("guide"),
            url: value("url"),
            image: value("image"),
            badgeText: value("badgeText"),
            photoCaption: value("photoCaption"),
          },
        };
        break;
      case "projekt":
        mutation = {
          kind: form,
          record: {
            ...base,
            name: value("name"),
            species: value("species"),
            location: value("location"),
          },
        };
        break;
      case "batch":
        mutation = {
          kind: form,
          record: {
            ...base,
            name: value("name"),
            projectId: value("projectId"),
            substrate: value("substrate"),
            growingMethod: value("growingMethod"),
            status: "Inokulering",
          },
        };
        break;
      case "anteckning":
        mutation = {
          kind: form,
          record: {
            ...base,
            batchId: value("batchId"),
            text: value("text"),
            phase: value("phase") as Batch["status"],
            temperature: Number(value("temperature")),
            humidity: Number(value("humidity")),
          },
        };
        break;
      case "skörd":
        mutation = {
          kind: form,
          record: {
            ...base,
            batchId: value("batchId"),
            weight: Number(value("weight")),
            flush: Number(value("flush")),
          },
        };
        break;
      default:
        return;
    }
    if (await save(mutation)) {
      setNotice("Sparat i din lokala SQLite-databas.");
      if (form === "svamp") setQuery("");
      setForm(null);
    }
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "svampodlaren-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  const primary: FormKind =
    view === "Svampbibliotek"
      ? "svamp"
      : view === "Odlingsprojekt"
        ? "projekt"
        : view === "Batchregister"
          ? "batch"
          : view === "Skördar"
            ? "skörd"
            : "anteckning";
  const actionLabel =
    primary === "svamp"
      ? "Lägg till svamp"
      : primary === "projekt"
        ? "Nytt projekt"
        : primary === "batch"
          ? "Ny batch"
          : primary === "skörd"
            ? "Registrera skörd"
            : "Ny anteckning";
  const batchCards = (limit?: number) =>
    data.batches
      .filter(
        (b) =>
          match(
            b.name,
            projectName(b.projectId),
            b.substrate,
            b.growingMethod,
          ) &&
          (filter === "Alla" || b.status === filter) &&
          (!limit || b.status !== "Avslutad"),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
      .map((b, i) => (
        <article className="batch-card" key={b.id}>
          <div className={"batch-art art-" + (i % 3)}>
            <MushroomArt variant={i % 2} />
            <span className={"badge status-" + b.status}>{b.status}</span>
          </div>
          <div className="batch-body">
            <div className="flex items-center justify-between">
              <h3>{b.name}</h3>
              <span className="tiny">{formatDate(b.date)}</span>
            </div>
            <p>{projectName(b.projectId)}</p>
            <div className="batch-meta">
              <span>{b.substrate}</span>
              <span>
                {data.harvests
                  .filter((h) => h.batchId === b.id)
                  .reduce((s, h) => s + h.weight, 0)}{" "}
                g skördat
              </span>
            </div>
            <BatchMethodEditor
              name={b.name}
              value={b.growingMethod || ""}
              disabled={!canEdit(b.id) || !ready || saving}
              onSave={async (growingMethod) => {
                const saved = await save({
                  kind: "odlingsform",
                  id: b.id,
                  growingMethod,
                });
                if (saved) setNotice("Odlingsformen har sparats.");
                return saved;
              }}
            />
            <label className="status-label">
              Odlingsfas
              <select
                aria-label={"Odlingsfas för " + b.name}
                value={b.status}
                disabled={!canEdit(b.id) || !ready || saving}
                onChange={(e) =>
                  void save({
                    kind: "status",
                    id: b.id,
                    status: e.target.value as Batch["status"],
                  })
                }
              >
                {["Inokulering", "Inkubation", "Fruktsättning", "Avslutad"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <div className="record-actions record-footer">
              {deleteButton("radera-batch", b.id, "Radera batch " + b.name)}
            </div>
          </div>
        </article>
      ));
  return (
    <div className="app-shell">
      <datalist id="growing-methods">
        {growingMethods.map((method) => (
          <option value={method} key={method} />
        ))}
      </datalist>
      <aside className={menu ? "sidebar expanded" : "sidebar"}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go("Översikt");
          }}
        >
          <span className="brand-icon">
            <Mushroom size={29} />
          </span>
          <span>
            Svampodlaren<small>FRÅN MYCEL TILL SKÖRD</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">S</span>
          <div>
            Min odlingsverksamhet<small>Din plats att växa</small>
          </div>
          <Leaf size={16} />
        </div>
        <p className="nav-label">DIN ODLING</p>
        <nav aria-label="Huvudmeny">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => go(name)}
              className={view === name ? "nav-link active" : "nav-link"}
              aria-current={view === name ? "page" : undefined}
            >
              <Icon size={19} />
              {name}
              {view === name && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span>SO</span>
            <div>
              Skogens odlare<small>Min lokala odling</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(!menu)}
            aria-label="Öppna eller stäng menyn"
            aria-expanded={menu}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Min odling <ChevronRight size={14} />
            <strong>{view}</strong>
          </div>
          <span className="top-demo">
            <span /> SQLite · lokalt
          </span>
          <button
            className="icon-button export-button"
            onClick={exportData}
            disabled={!ready || saving}
            aria-label="Exportera odlingsdata"
            title="Exportera odlingsdata"
          >
            <ArrowDownToLine size={18} />
          </button>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {view === "Översikt"
                  ? "DIN ODLING, I BALANS"
                  : view.toLocaleUpperCase("sv")}
              </p>
              <h1>{titles[view]}</h1>
              <p className="subtitle">
                {view === "Översikt"
                  ? "En liten överblick över allt som gror, växer och snart är redo att skördas."
                  : "Samla kunskap, följ utvecklingen och ge varje odling rätt förutsättningar."}
              </p>
            </div>
            {
              <button
                className="button primary"
                onClick={() => open(primary)}
                disabled={!ready || saving}
              >
                <Plus size={18} />
                {actionLabel}
              </button>
            }
          </div>
          {notice && (
            <div role="status" className="notice">
              <Check size={17} />
              {notice}
            </div>
          )}
          {!ready && !error && (
            <p role="status" className="notice">
              Laddar din lokala odling…
            </p>
          )}
          {error && (
            <div role="alert" className="warning">
              {error}{" "}
              {!ready && (
                <button className="button secondary" onClick={retry}>
                  Försök igen
                </button>
              )}
            </div>
          )}
          {view === "Översikt" && (
            <>
              <section className="hero">
                <div>
                  <span className="hero-kicker">
                    <span /> ETT STEG NÄRMARE NÄSTA SKÖRD
                  </span>
                  <h2>
                    Små observationer.
                    <br />
                    Stora upptäckter.
                  </h2>
                  <p>
                    Ge din odling lite uppmärksamhet idag.
                    <br />
                    Varje anteckning gör dig till en klokare odlare.
                  </p>
                  <button
                    className="button hero-button"
                    onClick={() => go("Odlingsdagbok")}
                  >
                    Till odlingsdagboken <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="hero-art">
                  <MushroomArt />
                  <span>Odla med nyfikenhet.</span>
                </div>
              </section>
              <section className="stats" aria-label="Odlingsstatistik">
                {[
                  {
                    label: "Aktiva projekt",
                    value: data.projects.filter((p) =>
                      data.batches.some(
                        (b) => b.projectId === p.id && b.status !== "Avslutad",
                      ),
                    ).length,
                    detail: "Pågående odlingsresor",
                    icon: Sprout,
                  },
                  {
                    label: "Batcher i odling",
                    value: data.batches.filter((b) => b.status !== "Avslutad")
                      .length,
                    detail: `${data.batches.filter((b) => b.status === "Fruktsättning").length} i fruktsättning`,
                    icon: ClipboardList,
                  },
                  {
                    label: "Total skörd",
                    value: (total / 1000).toLocaleString("sv-SE") + " kg",
                    detail: `Från ${data.harvests.length} skördetillfällen`,
                    icon: Wheat,
                  },
                  {
                    label: "Dagboksinlägg",
                    value: data.entries.length,
                    detail: "Observationer att lära av",
                    icon: BookOpen,
                  },
                ].map(({ label, value, detail, icon: Icon }) => (
                  <article className="stat" key={label}>
                    <div>
                      <span>{label}</span>
                      <Icon size={19} />
                    </div>
                    <strong>{value}</strong>
                    <small>{detail}</small>
                  </article>
                ))}
              </section>
              <div className="section-heading">
                <div>
                  <h2>Det växer just nu</h2>
                  <p>Följ dina senaste batcher genom odlingen.</p>
                </div>
                <button
                  className="text-link"
                  onClick={() => go("Batchregister")}
                >
                  Alla batcher <ChevronRight size={16} />
                </button>
              </div>
              <section className="batch-grid">{batchCards(3)}</section>
              <div className="lower-grid">
                <section className="panel">
                  <div className="section-heading">
                    <h2>Senaste i dagboken</h2>
                    <BookOpen size={19} />
                  </div>
                  {[...data.entries]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 2)
                    .map((e) => (
                      <div className="journal-preview" key={e.id}>
                        <span className="entry-dot" />
                        <div>
                          <span className="tiny">
                            {formatDate(e.date)} · {batchName(e.batchId)}
                          </span>
                          <p>{e.text}</p>
                        </div>
                      </div>
                    ))}
                  <button
                    className="text-link"
                    onClick={() => go("Odlingsdagbok")}
                  >
                    Öppna dagboken <ChevronRight size={16} />
                  </button>
                </section>
                <section className="knowledge-card">
                  <Leaf size={24} />
                  <p className="eyebrow">LÅT KUNSKAPEN VÄXA</p>
                  <h2>Lär känna din nästa svamp.</h2>
                  <p>
                    Upptäck arter, odlingssätt och nya möjligheter i
                    svampbiblioteket.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => go("Svampbibliotek")}
                  >
                    Utforska biblioteket <ArrowUpRight size={17} />
                  </button>
                </section>
              </div>
            </>
          )}
          {view === "Odlingsprojekt" && (
            <>
              <SearchBox query={query} setQuery={setQuery} />
              <section className="project-grid">
                {data.projects
                  .filter((p) => match(p.name, p.species, p.location))
                  .map((p, i) => (
                    <article className="panel project-card" key={p.id}>
                      <div className={"project-symbol art-" + (i % 3)}>
                        <Sprout size={26} />
                      </div>
                      <div className="record-actions">
                        <span className="tiny">
                          Startat {formatDate(p.date)}
                        </span>
                        {deleteButton(
                          "radera-projekt",
                          p.id,
                          "Radera projekt " + p.name,
                        )}
                      </div>
                      <h2>{p.name}</h2>
                      <p>
                        {p.species} · {p.location}
                      </p>
                      <div className="project-numbers">
                        <span>
                          <strong>
                            {
                              data.batches.filter((b) => b.projectId === p.id)
                                .length
                            }
                          </strong>{" "}
                          batcher
                        </span>
                        <span>
                          <strong>
                            {(
                              data.harvests
                                .filter((h) =>
                                  data.batches.some(
                                    (b) =>
                                      b.id === h.batchId &&
                                      b.projectId === p.id,
                                  ),
                                )
                                .reduce((s, h) => s + h.weight, 0) / 1000
                            ).toLocaleString("sv-SE")}
                          </strong>{" "}
                          kg skördat
                        </span>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => {
                          go("Batchregister");
                          setQuery(p.name);
                        }}
                      >
                        Visa projektets batcher <ChevronRight size={16} />
                      </button>
                    </article>
                  ))}
              </section>
              {!data.projects.some((p) =>
                match(p.name, p.species, p.location),
              ) && <Empty />}
            </>
          )}
          {view === "Batchregister" && (
            <>
              <SearchBox query={query} setQuery={setQuery} />
              <div className="filters" aria-label="Filtrera odlingsfas">
                {[
                  "Alla",
                  "Inokulering",
                  "Inkubation",
                  "Fruktsättning",
                  "Avslutad",
                ].map((s) => (
                  <button
                    aria-pressed={filter === s}
                    className={filter === s ? "selected" : ""}
                    key={s}
                    onClick={() => setFilter(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <section className="batch-grid">{batchCards()}</section>
              {!data.batches.some(
                (b) =>
                  match(
                    b.name,
                    projectName(b.projectId),
                    b.substrate,
                    b.growingMethod,
                  ) &&
                  (filter === "Alla" || filter === b.status),
              ) && <Empty />}
            </>
          )}
          {view === "Odlingsdagbok" && (
            <>
              <SearchBox query={query} setQuery={setQuery} />
              <div className="journal-list">
                {[...data.entries]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .filter((e) => match(e.text, batchName(e.batchId), e.phase))
                  .map((e) => (
                    <article className="panel journal-entry" key={e.id}>
                      <div className="entry-date">
                        <strong>
                          {new Date(e.date + "T12:00:00Z").getUTCDate()}
                        </strong>
                        <span>
                          {formatDate(e.date).split(" ").slice(1).join(" ")}
                        </span>
                      </div>
                      <div className="entry-content">
                        <div className="entry-heading">
                          <span className="badge">{batchName(e.batchId)}</span>
                          {deleteButton(
                            "radera-anteckning",
                            e.id,
                            "Radera anteckning från " +
                              batchName(e.batchId) +
                              ", " +
                              formatDate(e.date),
                          )}
                        </div>
                        <p>{e.text}</p>
                        <label className="status-label journal-phase-label">
                          Odlingsfas vid anteckningen
                          <select
                            aria-label={
                              "Odlingsfas för anteckning från " +
                              batchName(e.batchId) +
                              ", " +
                              formatDate(e.date)
                            }
                            value={e.phase || ""}
                            disabled={!canEdit(e.id) || saving}
                            onChange={(event) =>
                              void save({
                                kind: "anteckningsfas",
                                id: e.id,
                                phase: event.target.value as
                                  Batch["status"] | "",
                              })
                            }
                          >
                            <option value="">Ej angiven</option>
                            {cultivationPhases.map((phase) => (
                              <option key={phase}>{phase}</option>
                            ))}
                          </select>
                        </label>
                        <div className="readings">
                          <span>
                            <Thermometer size={16} />
                            {e.temperature} °C
                          </span>
                          <span>
                            <Droplets size={16} />
                            {e.humidity} % luftfuktighet
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {!data.entries.some((e) =>
                match(e.text, batchName(e.batchId), e.phase),
              ) && <Empty />}
            </>
          )}
          {view === "Skördar" && (
            <>
              <section className="harvest-summary">
                <Wheat size={32} />
                <div>
                  <p>Samlad skörd</p>
                  <strong>
                    {(total / 1000).toLocaleString("sv-SE")} <small>kg</small>
                  </strong>
                </div>
                <span>
                  {data.harvests.length} registrerade skördetillfällen
                </span>
              </section>
              <SearchBox query={query} setQuery={setQuery} />
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Registrerade skördar</caption>
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Datum</th>
                      <th>Skördevåg</th>
                      <th>Vikt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.harvests]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .filter((h) => match(batchName(h.batchId), h.date))
                      .map((h) => (
                        <tr key={h.id}>
                          <td>
                            <strong>{batchName(h.batchId)}</strong>
                            <small>
                              {projectName(
                                data.batches.find((b) => b.id === h.batchId)
                                  ?.projectId ?? "",
                              )}
                            </small>
                            {deleteButton(
                              "radera-skörd",
                              h.id,
                              "Radera skörd från " +
                                batchName(h.batchId) +
                                ", " +
                                formatDate(h.date) +
                                ", " +
                                h.weight +
                                " gram",
                            )}
                          </td>
                          <td>{formatDate(h.date)}</td>
                          <td>Våg {h.flush}</td>
                          <td>
                            <strong>
                              {h.weight.toLocaleString("sv-SE")} g
                            </strong>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!data.harvests.some((h) =>
                match(batchName(h.batchId), h.date),
              ) && <Empty />}
            </>
          )}
          {view === "Svampbibliotek" && (
            <>
              <p className="library-intro">
                En växande samling odlingskunskap. Guiderna är introduktioner –
                följ alltid råd för din specifika stam och odlingsmetod.
              </p>
              <SearchBox query={query} setQuery={setQuery} />
              <section className="batch-grid">
                {species.map(
                  (s, i) =>
                    match(s.name, s.latin) && (
                      <article className="species-card" key={s.name}>
                        <SpeciesPhoto
                          name={s.name}
                          photoCaption={
                            data.customSpecies.find(
                              (own) => own.name === s.name,
                            )?.photoCaption
                          }
                          image={"image" in s ? (s.image as string) : undefined}
                          className="species-art"
                        >
                          {s.tag && <span className="badge">{s.tag}</span>}
                        </SpeciesPhoto>
                        <div className="batch-body">
                          <h2>{s.name}</h2>
                          <em>{s.latin}</em>
                          <p>{s.description}</p>
                          <button
                            className="text-link"
                            onClick={() => setGuide(i)}
                          >
                            Läs odlingsguiden <ArrowUpRight size={17} />
                          </button>
                          {data.customSpecies
                            .filter(
                              (own) => own.name === s.name && canEdit(own.id),
                            )
                            .map((own) => (
                              <SpeciesImageEditor
                                key={own.id}
                                image={own.image}
                                badgeText={own.badgeText}
                                photoCaption={own.photoCaption}
                                disabled={saving}
                                onSave={async (image, labels) => {
                                  const success = await save({
                                    kind: "svamp",
                                    record: { ...own, image, ...labels },
                                    edit: true,
                                  });
                                  if (success)
                                    setNotice(
                                      "Bilden och texterna har sparats.",
                                    );
                                  return success;
                                }}
                              />
                            ))}
                          {"id" in s &&
                            typeof s.id === "string" &&
                            deleteButton(
                              "radera-svamp",
                              s.id,
                              "Radera egen svamp " + s.name,
                            )}
                        </div>
                      </article>
                    ),
                )}
              </section>
              {!species.some((s) => match(s.name, s.latin)) && <Empty />}
            </>
          )}
          <footer>
            <span>
              <Mushroom size={16} /> Svampodlaren
            </span>
            <span>
              Odlingsglädje, en batch i taget.{" "}
              <span className="footer-demo">· SQLite · utan internet</span>
            </span>
          </footer>
        </main>
      </div>
      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              onClick={() => setForm(null)}
              aria-label="Stäng"
            >
              <X />
            </button>
            <p className="eyebrow">DIN LOKALA ODLING</p>
            <h2 id="form-title">
              {form === "svamp"
                ? "Lägg till egen svamp"
                : form === "projekt"
                  ? "Nytt odlingsprojekt"
                  : form === "batch"
                    ? "Lägg till en batch"
                    : form === "skörd"
                      ? "Registrera en skörd"
                      : "En ny observation"}
            </h2>
            <p className="subtitle">
              Sparas i SQLite på den här datorn. Fungerar utan internet.
            </p>
            {error && (
              <p role="alert" className="warning">
                {error}
              </p>
            )}
            <form onSubmit={submit} key={form}>
              <fieldset disabled={saving || imageBusy} className="form-fields">
                {form === "svamp" && (
                  <>
                    <SpeciesImagePicker onBusyChange={setImageBusy} />
                    <SpeciesLabelFields />
                    <Field label="Svampnamn" name="name" autoFocus />
                    <Field
                      label="Vetenskapligt namn (valfritt)"
                      name="latin"
                      maxLength={160}
                      required={false}
                    />
                    <label>
                      Beskrivning (valfritt)
                      <textarea name="description" rows={3} maxLength={1000} />
                    </label>
                    <label>
                      Odlingsråd (valfritt)
                      <textarea name="guide" rows={5} maxLength={4000} />
                    </label>
                    <Field
                      label="Källänk (valfritt)"
                      name="url"
                      type="url"
                      placeholder="https://…"
                      maxLength={2048}
                      required={false}
                    />
                  </>
                )}
                {form === "projekt" && (
                  <>
                    <Field label="Projektnamn" name="name" autoFocus />
                    <label>
                      Svampart
                      <select name="species">
                        {species.map((s) => (
                          <option key={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </label>
                    <Field label="Odlingsplats" name="location" />
                  </>
                )}
                {form === "batch" && (
                  <>
                    <Field label="Batchnamn" name="name" autoFocus />
                    <label>
                      Odlingsprojekt
                      <select name="projectId" required>
                        {myProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Odlingsform / behållare"
                      name="growingMethod"
                      list="growing-methods"
                      maxLength={80}
                      placeholder="Hink, påse, stock, friland eller eget val"
                    />
                    <p className="tiny">
                      Välj ett förslag eller skriv en egen odlingsform.
                    </p>
                    <Field label="Substrat" name="substrate" />
                  </>
                )}
                {(form === "anteckning" || form === "skörd") && (
                  <label>
                    Batch
                    <select
                      name="batchId"
                      required
                      autoFocus
                      value={form === "anteckning" ? entryBatchId : undefined}
                      onChange={(event) => {
                        if (form === "anteckning") {
                          setEntryBatchId(event.target.value);
                          setEntryPhase(
                            data.batches.find(
                              (batch) => batch.id === event.target.value,
                            )?.status || "",
                          );
                        }
                      }}
                    >
                      {myBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {batchName(b.id)} – {projectName(b.projectId)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {form !== "svamp" && (
                  <Field
                    label="Datum"
                    name="date"
                    type="date"
                    defaultValue={today()}
                  />
                )}
                {form === "anteckning" && (
                  <>
                    <label>
                      Odlingsfas
                      <select
                        name="phase"
                        value={entryPhase}
                        onChange={(event) =>
                          setEntryPhase(event.target.value as Batch["status"])
                        }
                        required
                      >
                        <option value="" disabled>
                          Välj odlingsfas
                        </option>
                        {cultivationPhases.map((phase) => (
                          <option key={phase}>{phase}</option>
                        ))}
                      </select>
                    </label>
                    <p className="tiny">
                      Avser fasen vid anteckningstillfället. Batchens aktuella
                      fas ändras i batchregistret.
                    </p>
                    <label>
                      Vad har du observerat?
                      <textarea
                        name="text"
                        required
                        maxLength={2000}
                        rows={4}
                      />
                    </label>
                    <div className="form-row">
                      <Field
                        label="Temperatur (°C)"
                        name="temperature"
                        type="number"
                        min={-20}
                        max={60}
                        step="0.1"
                        defaultValue="20"
                      />
                      <Field
                        label="Luftfuktighet (%)"
                        name="humidity"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue="85"
                      />
                    </div>
                  </>
                )}
                {form === "skörd" && (
                  <div className="form-row">
                    <Field
                      label="Vikt (gram)"
                      name="weight"
                      type="number"
                      min={1}
                      max={1000000}
                    />
                    <Field
                      label="Skördevåg"
                      name="flush"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue="1"
                    />
                  </div>
                )}
              </fieldset>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setForm(null)}
                >
                  Avbryt
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={saving || imageBusy}
                >
                  <Check size={17} />
                  Spara {form}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {deletion && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!saving) setDeletion(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-entry-title"
            aria-describedby="delete-entry-description"
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">BEKRÄFTA RADERING</p>
            <h2 id="delete-entry-title">Radera {deletion.noun}?</h2>
            <p className="subtitle" id="delete-entry-description">
              Posten tas bort permanent. Det går inte att ångra.
            </p>
            <div className="delete-entry-preview">
              <span className="tiny">{deletion.meta}</span>
              <p>{deletion.preview}</p>
            </div>
            {deletion.blocked && (
              <p role="alert" className="warning">
                {deletion.blocked}
              </p>
            )}
            {deletion.kind === "radera-svamp" && (
              <p className="subtitle">
                Befintliga odlingsprojekt behåller svampens namn.
              </p>
            )}
            {error && (
              <p role="alert" className="warning">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="button secondary"
                disabled={saving || imageBusy}
                onClick={() => setDeletion(null)}
              >
                Avbryt
              </button>
              <button
                className="button danger"
                disabled={saving || !!deletion.blocked}
                onClick={async () => {
                  if (
                    await save({
                      kind: deletion.kind,
                      id: deletion.id,
                    })
                  ) {
                    setDeletion(null);
                    setGuide(null);
                    setNotice("Posten har raderats.");
                  }
                }}
              >
                <Trash2 size={16} />
                {saving ? "Raderar…" : "Radera " + deletion.label}
              </button>
            </div>
          </section>
        </div>
      )}
      {guide !== null && (
        <div className="modal-backdrop" onClick={() => setGuide(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="modal-close icon-button"
              onClick={() => setGuide(null)}
              aria-label="Stäng"
            >
              <X />
            </button>
            <SpeciesPhoto
              name={species[guide].name}
              photoCaption={
                data.customSpecies.find(
                  (own) => own.name === species[guide].name,
                )?.photoCaption
              }
              image={
                "image" in species[guide]
                  ? (species[guide] as { image?: string }).image
                  : undefined
              }
              className="guide-art"
              eager
            />
            <p className="eyebrow">
              {guide < builtInSpecies.length
                ? "ODLINGSGUIDE · INTRODUKTION"
                : "EGEN SVAMP · MINA UPPGIFTER"}
            </p>
            <h2 id="guide-title">{species[guide].name}</h2>
            <em>{species[guide].latin}</em>
            <p className="guide-copy">
              {species[guide].description || "Ingen beskrivning angiven."}
            </p>
            <p className="guide-copy">
              {species[guide].guide || "Inga odlingsråd angivna."}
            </p>
            {species[guide].url && (
              <a
                className="text-link"
                href={species[guide].url}
                target="_blank"
                rel="noreferrer"
              >
                Källa och vidare läsning <ArrowUpRight size={17} />
              </a>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function SearchBox({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <label className="search">
      <Search size={18} />
      <span className="sr-only">Sök i aktuell vy</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sök i din odling…"
        aria-label="Sök i aktuell vy"
      />
      {query && (
        <button
          type="button"
          aria-label="Rensa sökning"
          onClick={() => setQuery("")}
        >
          <X size={16} />
        </button>
      )}
    </label>
  );
}
function Empty() {
  return (
    <div className="empty">
      <Sprout size={32} />
      <h2>Här var det lugnt.</h2>
      <p>
        Inga poster matchar din sökning. Prova ett annat sökord eller filter.
      </p>
    </div>
  );
}
function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label>
      {label}
      <input required maxLength={120} {...props} />
    </label>
  );
}
