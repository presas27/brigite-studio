"use client";

import { useTranslations } from "next-intl";
import { CategoryDropdown, type CategoryOption } from "@/components/studio/CategoryDropdown";
import { Icon } from "@/components/studio/coach/icons";
import { field } from "@/components/studio/theme";
import { ViewToggle, type View } from "@/components/studio/ViewToggle";
import { cn } from "@/lib/utils";

/**
 * The filter row every browsable list in the app shares: live text search,
 * a searchable category dropdown, and a grid/list switch.
 *
 * One line from `sm` up, where the search box takes whatever the dropdown and
 * the toggle leave it. On a phone that leftover is about 80px — a search field
 * too narrow to read its own placeholder — so the search takes the full first
 * line and the two controls wrap underneath it, the toggle pushed to the far
 * edge to bracket the row.
 */
export function FilterBar({
  query,
  onQueryChangeAction,
  categoryOptions,
  categoryValue,
  onCategoryChangeAction,
  view,
  onViewChangeAction,
}: {
  query: string;
  onQueryChangeAction: (query: string) => void;
  categoryOptions: CategoryOption[];
  categoryValue: string | null;
  onCategoryChangeAction: (value: string | null) => void;
  view: View;
  onViewChangeAction: (view: View) => void;
}) {
  const common = useTranslations("Studio.common");

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative w-full sm:w-auto sm:flex-1">
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cream/40"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChangeAction(event.target.value)}
          placeholder={common("searchPlaceholder")}
          aria-label={common("search")}
          className={cn(field, "py-2.5 pl-9 text-sm")}
        />
      </div>

      <CategoryDropdown
        options={categoryOptions}
        value={categoryValue}
        onChangeAction={onCategoryChangeAction}
      />

      <div className="ml-auto sm:ml-0">
        <ViewToggle view={view} onChangeAction={onViewChangeAction} />
      </div>
    </div>
  );
}
