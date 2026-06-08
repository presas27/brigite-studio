import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "solid";
  className?: string;
};

const variants = {
  solid: "bg-[#3a2c22] text-white hover:bg-[#2b2019]",
};

/**
 * Brand CTA. Link-based by default (anchors/navigation).
 */
export function Button({
  href,
  children,
  variant = "solid",
  className,
}: ButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-7 py-3 font-serif text-base font-medium transition-colors",
        variants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}
