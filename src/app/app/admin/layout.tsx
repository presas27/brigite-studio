import { StudioChrome, type ChromeSection } from "@/components/studio/chrome/StudioChrome";
import { requireAdmin } from "@/lib/studio/auth";
import { getThemeMode } from "@/lib/studio/theme-mode";

const SECTIONS: ChromeSection[] = [
  { items: [{ href: "/app/admin", labelKey: "overview", icon: "overview" }] },
  {
    items: [
      { href: "/app/admin/treinadores", labelKey: "trainers", icon: "clients" },
      { href: "/app/admin/alunos", labelKey: "clients", icon: "list" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, themeMode] = await Promise.all([requireAdmin(), getThemeMode()]);
  return (
    <StudioChrome
      role="coach"
      homeHref="/app/admin"
      sections={SECTIONS}
      name={admin.name}
      email={admin.email}
      themeMode={themeMode}
      badges={{}}
    >
      {children}
    </StudioChrome>
  );
}
