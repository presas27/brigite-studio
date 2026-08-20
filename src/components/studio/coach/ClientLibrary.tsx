"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Empty } from "@/components/studio/Empty";
import { FilterBar } from "@/components/studio/FilterBar";
import { muted } from "@/components/studio/theme";
import { usePersistedView } from "@/components/studio/usePersistedView";
import { searchKey } from "@/lib/utils";
import { ClientCard } from "./ClientCard";
import { ClientListRow, type ClientRow } from "./ClientListRow";

/**
 * Same filter bar as the exercise library, adapted to clients: the category
 * is each client's plan (a fixed set, translated server-side) instead of a
 * free-form tag, and there is no thumbnail — a client has no picture on file.
 */
export function ClientLibrary({
  rows,
  planOptions,
  locale,
}: {
  rows: ClientRow[];
  planOptions: { value: string; label: string; count: number }[];
  locale: string;
}) {
  const t = useTranslations("Studio.clients");
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [view, setView] = usePersistedView("studio.clients.view");

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    return rows.filter(({ client }) => {
      const matchesQuery =
        !needle || searchKey(client.name).includes(needle) || searchKey(client.email).includes(needle);
      const matchesPlan = !plan || client.profile.plan === plan;
      return matchesQuery && matchesPlan;
    });
  }, [rows, query, plan]);

  return (
    <div className="space-y-6">
      <FilterBar
        query={query}
        onQueryChangeAction={setQuery}
        categoryOptions={planOptions}
        categoryValue={plan}
        onCategoryChangeAction={setPlan}
        view={view}
        onViewChangeAction={setView}
      />

      {results.length === 0 ? (
        <Empty title={t("noResults")} />
      ) : (
        <>
          <p className={muted}>{t("count", { count: results.length })}</p>
          {view === "grid" ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((row) => (
                <ClientCard key={row.client.id} row={row} locale={locale} />
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {results.map((row) => (
                <ClientListRow key={row.client.id} row={row} locale={locale} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
