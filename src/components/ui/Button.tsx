import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "cream" | "dark";
  className?: string;
};

const variants = {
  cream: "bg-butter text-ink hover:bg-[#efe0c8]",
  dark: "bg-ink text-cream hover:bg-[#241b13]",
};

/**
 * Brand CTA pill. Link-based by default (anchors/navigation). `group`
 * lets children nudge on hover (e.g. a trailing arrow).
 */
export function Button({
  href,
  children,
  variant = "cream",
  className,
}: ButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-sans text-base font-semibold transition-colors duration-200",
        variants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}
