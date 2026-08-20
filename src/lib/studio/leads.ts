import { all, get, run, type Row } from "./db";
import { newId } from "./id";
import type { Lead, LeadSource, LeadStatus, PlanId } from "./types";

/**
 * Leads — people who asked about training and are not clients yet.
 *
 * The table is real; what fills it is not, yet. Today the contact form on
 * brigitestudio.com only emails `hello@`, so `seedLeads()` puts a handful of
 * plausible enquiries in so the screen can be designed against something. The
 * wiring is one call: the contact route runs `createLead()` alongside the mail
 * it already sends, and `seedLeads()` gets deleted.
 */

const SELECT = `SELECT id, name, email, phone, message, interest, source, status, notes,
                       client_id, created_at, updated_at
                  FROM leads`;

function mapLead(row: Row): Lead {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    message: String(row.message ?? ""),
    interest: row.interest ? (String(row.interest) as PlanId) : null,
    source: String(row.source) as LeadSource,
    status: String(row.status) as LeadStatus,
    notes: String(row.notes ?? ""),
    clientId: row.client_id ? String(row.client_id) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

/** Newest first, optionally narrowed to one column of the pipeline. */
export function listLeads(status?: LeadStatus): Lead[] {
  const rows = status
    ? all<Row>(`${SELECT} WHERE status = ? ORDER BY created_at DESC`, status)
    : all<Row>(`${SELECT} ORDER BY created_at DESC`);
  return rows.map(mapLead);
}

export function findLead(leadId: string): Lead | undefined {
  const row = get<Row>(`${SELECT} WHERE id = ?`, leadId);
  return row && mapLead(row);
}

/** One count per status, zeros included, for the filter row. */
export function leadCounts(): Record<LeadStatus, number> {
  const counts: Record<LeadStatus, number> = { new: 0, talking: 0, won: 0, lost: 0 };
  for (const row of all<Row>("SELECT status, count(*) AS total FROM leads GROUP BY status")) {
    counts[String(row.status) as LeadStatus] = Number(row.total);
  }
  return counts;
}

/** The door the website will knock on. Everything else here is the coach side. */
export function createLead(input: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  interest?: PlanId | null;
  source?: LeadSource;
}): string {
  const id = newId();
  const now = Date.now();
  run(
    `INSERT INTO leads (id, name, email, phone, message, interest, source, status, notes,
                        client_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', '', NULL, ?, ?)`,
    id,
    input.name,
    input.email,
    input.phone ?? "",
    input.message ?? "",
    input.interest ?? null,
    input.source ?? "site",
    now,
    now,
  );
  return id;
}

export function setLeadStatus(leadId: string, status: LeadStatus): void {
  run("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?", status, Date.now(), leadId);
}

export function setLeadNotes(leadId: string, notes: string): void {
  run("UPDATE leads SET notes = ? WHERE id = ?", notes, leadId);
}

/** Mark a lead as converted and remember which account it became. */
export function linkLeadToClient(leadId: string, clientId: string): void {
  run(
    "UPDATE leads SET status = 'won', client_id = ?, updated_at = ? WHERE id = ?",
    clientId,
    Date.now(),
    leadId,
  );
}

const DAY_MS = 86_400_000;

/** Stand-in enquiries. Delete this once the site posts real ones. */
const MOCK: {
  name: string;
  email: string;
  phone: string;
  message: string;
  interest: PlanId | null;
  source: LeadSource;
  status: LeadStatus;
  daysAgo: number;
}[] = [
  {
    name: "Marta Ribeiro",
    email: "marta.ribeiro@gmail.com",
    phone: "912 445 108",
    message:
      "Olá Sara! Vi o teu Instagram e queria começar treino online. Trabalho por turnos, dá para treinar de manhã cedo?",
    interest: "online",
    source: "site",
    status: "new",
    daysAgo: 0,
  },
  {
    name: "Inês Carvalho",
    email: "ines.carvalho@outlook.pt",
    phone: "",
    message:
      "Boa tarde. Ando a fazer pilates há dois anos e queria trabalhar força e parada de mãos. Fazes acompanhamento presencial em Lisboa?",
    interest: "personal",
    source: "site",
    status: "new",
    daysAgo: 2,
  },
  {
    name: "Rui Salgado",
    email: "rui.salgado@gmail.com",
    phone: "934 002 771",
    message: "Interessado em aéreo. Nunca fiz, tenho 41 anos e ombro direito operado em 2023.",
    interest: "specialty",
    source: "instagram",
    status: "new",
    daysAgo: 5,
  },
  {
    name: "Catarina Lopes",
    email: "catarina.lopes@sapo.pt",
    phone: "961 337 204",
    message: "A Joana falou-me de ti. Queria voltar a treinar depois da gravidez, sem pressa.",
    interest: "personal",
    source: "referral",
    status: "talking",
    daysAgo: 9,
  },
  {
    name: "Diogo Pinheiro",
    email: "diogo.pinheiro@gmail.com",
    phone: "",
    message: "Quanto custa o plano online? Treino em casa, tenho halteres e uma barra.",
    interest: "online",
    source: "site",
    status: "talking",
    daysAgo: 12,
  },
  {
    name: "Sofia Mendes",
    email: "sofia.mendes@gmail.com",
    phone: "917 220 954",
    message: "Queria experimentar uma aula antes de decidir.",
    interest: "personal",
    source: "walkin",
    status: "won",
    daysAgo: 24,
  },
  {
    name: "André Faria",
    email: "andre.faria@gmail.com",
    phone: "",
    message: "Procuro treino de força três vezes por semana, ao fim do dia.",
    interest: "personal",
    source: "site",
    status: "lost",
    daysAgo: 38,
  },
];

/** Idempotent: fills an empty table and never touches a populated one. */
export function seedLeads(): void {
  const row = get<Row>("SELECT count(*) AS total FROM leads");
  if (Number(row?.total ?? 0) > 0) return;

  const now = Date.now();
  for (const mock of MOCK) {
    const at = now - mock.daysAgo * DAY_MS;
    run(
      `INSERT INTO leads (id, name, email, phone, message, interest, source, status, notes,
                          client_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', NULL, ?, ?)`,
      newId(),
      mock.name,
      mock.email,
      mock.phone,
      mock.message,
      mock.interest,
      mock.source,
      mock.status,
      at,
      at,
    );
  }
}
