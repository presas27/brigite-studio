import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Iconsax — official icon system (linear rounded).
 * Decrypted directly from the official Iconsax catalog (https://app.iconsax.io).
 * Pure React SVG implementation: 100% SSR safe, zero runtime fetches, zero hydration issues.
 */

export interface IconsaxProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

function BaseSvg({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.5,
  className,
  children,
  ...props
}: IconsaxProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Iconsax category (settings, free) - 4 rounded squares for overview/dashboard */
export function IconsaxCategory({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M5 10H7C9 10 10 9 10 7V5C10 3 9 2 7 2H5C3 2 2 3 2 5V7C2 9 3 10 5 10Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 10H19C21 10 22 9 22 7V5C22 3 21 2 19 2H17C15 2 14 3 14 5V7C14 9 15 10 17 10Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 22H19C21 22 22 21 22 19V17C22 15 21 14 19 14H17C15 14 14 15 14 17V19C14 21 15 22 17 22Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 22H7C9 22 10 21 10 19V17C10 15 9 14 7 14H5C3 14 2 15 2 17V19C2 21 3 22 5 22Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxCategory.displayName = "IconsaxCategory";

/** Iconsax message-text (emails-messages, free) - speech bubble with lines */
export function IconsaxMessageText({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M16 2H8C4 2 2 4 2 8V21C2 21.55 2.45 22 3 22H16C20 22 22 20 22 16V8C22 4 20 2 16 2Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 9.5H17" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 14.5H14" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxMessageText.displayName = "IconsaxMessageText";

/** Iconsax profile-2user (users, free) - dual user profiles */
export function IconsaxProfile2User({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M9.16006 10.87C9.06006 10.86 8.94006 10.86 8.83006 10.87C6.45006 10.79 4.56006 8.84 4.56006 6.44C4.56006 3.99 6.54006 2 9.00006 2C11.4501 2 13.4401 3.99 13.4401 6.44C13.4301 8.84 11.5401 10.79 9.16006 10.87Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.4098 4C18.3498 4 19.9098 5.57 19.9098 7.5C19.9098 9.39 18.4098 10.93 16.5398 11C16.4598 10.99 16.3698 10.99 16.2798 11" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.16021 14.56C1.74021 16.18 1.74021 18.82 4.16021 20.43C6.91021 22.27 11.4202 22.27 14.1702 20.43C16.5902 18.81 16.5902 16.17 14.1702 14.56C11.4302 12.73 6.92021 12.73 4.16021 14.56Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.3398 20C19.0598 19.85 19.7398 19.56 20.2998 19.13C21.8598 17.96 21.8598 16.03 20.2998 14.86C19.7498 14.44 19.0798 14.16 18.3698 14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxProfile2User.displayName = "IconsaxProfile2User";

/** Iconsax calendar (christmas, free) - schedule calendar */
export function IconsaxCalendar({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M3 18V8C3 5.8 4.8 4 7 4H17C19.2 4 21 5.8 21 8V18C21 20.2 19.2 22 17 22H7C4.8 22 3 20.2 3 18Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.5 6V2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.5 6V2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.7998 14C9.8998 14 10.7998 13.1 10.7998 12C10.7998 10.9 9.8998 10 8.7998 10C7.6998 10 6.7998 10.9 6.7998 12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.7998 16C6.7998 17.1 7.6998 18 8.7998 18C9.8998 18 10.7998 17.1 10.7998 16C10.7998 14.9 9.8998 14 8.7998 14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.1998 18V10L13.7998 13.4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxCalendar.displayName = "IconsaxCalendar";

/** Iconsax video-play (video-audio-image, free) - video player */
export function IconsaxVideoPlay({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.52002 7.11035H21.48" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.52002 2.11035V6.97035" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.48 2.11035V6.52035" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.75 14.4501V13.2501C9.75 11.7101 10.84 11.0801 12.17 11.8501L13.21 12.4501L14.25 13.0501C15.58 13.8201 15.58 15.0801 14.25 15.8501L13.21 16.4501L12.17 17.0501C10.84 17.8201 9.75 17.1901 9.75 15.6501V14.4501V14.4501Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxVideoPlay.displayName = "IconsaxVideoPlay";

/** Iconsax clipboard-text (content-edit, free) - clipboard checklist */
export function IconsaxClipboardText({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M8 12.1992H15" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 16.1992H12.38" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 6H14C16 6 16 5 16 4C16 2 15 2 14 2H10C9 2 8 2 8 4C8 6 9 6 10 6Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 4.01953C19.33 4.19953 21 5.42953 21 9.99953V15.9995C21 19.9995 20 21.9995 15 21.9995H9C4 21.9995 3 19.9995 3 15.9995V9.99953C3 5.43953 4.67 4.19953 8 4.01953" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxClipboardText.displayName = "IconsaxClipboardText";

/** Iconsax book (school-learning, free) - open book for library */
export function IconsaxBook({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M3.5 18V7C3.5 3 4.5 2 8.5 2H15.5C19.5 2 20.5 3 20.5 7V17C20.5 17.14 20.5 17.28 20.49 17.42" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.35 15H20.5V18.5C20.5 20.43 18.93 22 17 22H7C5.07 22 3.5 20.43 3.5 18.5V17.85C3.5 16.28 4.78 15 6.35 15Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 7H16" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 10.5H13" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxBook.displayName = "IconsaxBook";

/** Iconsax weight (essential, free) - classic dumbbell */
export function IconsaxWeight({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M17.1801 18C19.5801 18 20.1801 16.65 20.1801 15V9C20.1801 7.35 19.5801 6 17.1801 6C14.7801 6 14.1801 7.35 14.1801 9V15C14.1801 16.65 14.7801 18 17.1801 18Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.81995 18C4.41995 18 3.81995 16.65 3.81995 15V9C3.81995 7.35 4.41995 6 6.81995 6C9.21995 6 9.81995 7.35 9.81995 9V15C9.81995 16.65 9.21995 18 6.81995 18Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.81995 12H14.1799" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22.5 14.5V9.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 14.5V9.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxWeight.displayName = "IconsaxWeight";

/** Iconsax dumbbell (sports) - tiered Olympic barbell / weights for workouts (optically balanced) */
export function IconsaxDumbbell({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M15.5 19C14.4 19 13.6 18.1 13.6 17V7C13.6 5.9 14.4 5 15.5 5C16.6 5 17.4 5.9 17.4 7V17C17.4 18.1 16.6 19 15.5 19Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 16.2C20 16.2 19.2 15.3 19.2 14.2V9.8C19.2 8.7 20 7.8 21 7.8C22 7.8 22.8 8.7 22.8 9.8V14.2C22.8 15.3 22 16.2 21 16.2Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.5 19C9.6 19 10.4 18.1 10.4 17V7C10.4 5.9 9.6 5 8.5 5C7.4 5 6.6 5.9 6.6 7V17C6.6 18.1 7.4 19 8.5 19Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 16.2C4 16.2 4.8 15.3 4.8 14.2V9.8C4.8 8.7 4 7.8 3 7.8C2 7.8 1.2 8.7 1.2 9.8V14.2C1.2 15.3 2 16.2 3 16.2Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.4 12H13.6" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxDumbbell.displayName = "IconsaxDumbbell";

/** Iconsax lifting-weights2 (fitness) - lifter with barbell */
export function IconsaxLifter({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M2.5 13.5H21.5M2.5 13.5V11.75M2.5 13.5V15.25M21.5 13.5V11.75M21.5 13.5V15.25M19 13.5C19 10 15.5 8 12 8C8.5 8 5 10 5 13.5M10.5 8.25C10.5 11.74 10.5 17 9.5 22H7.5M13.5 8.25C13.5 11.74 13.5 17 14.5 22H16.5M14 4C14 5.11 13.11 6 12 6C10.89 6 10 5.11 10 4C10 2.89 10.89 2 12 2C13.11 2 14 2.9 14 4Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxLifter.displayName = "IconsaxLifter";

/** Iconsax notification (notifications, free) - bell with dot */
export function IconsaxNotification({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M19 8C20.6569 8 22 6.65685 22 5C22 3.34315 20.6569 2 19 2C17.3431 2 16 3.34315 16 5C16 6.65685 17.3431 8 19 8Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V10" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxNotification.displayName = "IconsaxNotification";

/** Iconsax danger (essential, free) - triangle warning alert */
export function IconsaxDanger({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M12 9V14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.0001 21.4093H5.94005C2.47005 21.4093 1.02005 18.9293 2.70005 15.8993L5.82006 10.2793L8.76006 4.9993C10.5401 1.7893 13.4601 1.7893 15.2401 4.9993L18.1801 10.2893L21.3001 15.9093C22.9801 18.9393 21.5201 21.4193 18.0601 21.4193H12.0001V21.4093Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.9945 17H12.0035" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxDanger.displayName = "IconsaxDanger";

/** Iconsax printer (computers-devices-electronics, free) - printer document */
export function IconsaxPrinter({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M7.25 7H16.75V5C16.75 3 16 2 13.75 2H10.25C8 2 7.25 3 7.25 5V7Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 15V19C16 21 15 22 13 22H11C9 22 8 21 8 19V15H16Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 10V15C21 17 20 18 18 18H16V15H8V18H6C4 18 3 17 3 15V10C3 8 4 7 6 7H18C20 7 21 8 21 10Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 15H15.79H7" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 11H10" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxPrinter.displayName = "IconsaxPrinter";

/** Iconsax add (essential, free) - plus sign */
export function IconsaxAdd({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M6 12H18" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 18V6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxAdd.displayName = "IconsaxAdd";

/** Iconsax tick-circle (essential, free) - circle checkmark */
export function IconsaxTickCircle({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.75 11.9999L10.58 14.8299L16.25 9.16992" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxTickCircle.displayName = "IconsaxTickCircle";

/** Iconsax arrow-right4 (arrow, free) - sleek chevron right (>) */
export function IconsaxArrowRight4({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M8.90991 19.9201L15.4299 13.4001C16.1999 12.6301 16.1999 11.3701 15.4299 10.6001L8.90991 4.08008" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxArrowRight4.displayName = "IconsaxArrowRight4";

/** Iconsax arrow-left3 (arrow, free) - sleek chevron left (<) */
export function IconsaxArrowLeft3({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M14.9998 19.9201L8.47984 13.4001C7.70984 12.6301 7.70984 11.3701 8.47984 10.6001L14.9998 4.08008" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxArrowLeft3.displayName = "IconsaxArrowLeft3";

/** Iconsax arrow-right3 (arrow, free) - arrow right with shaft (->) */
export function IconsaxArrowRight3({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M14.4302 5.92969L20.5002 11.9997L14.4302 18.0697" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.5 12H20.33" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxArrowRight3.displayName = "IconsaxArrowRight3";

/** Iconsax 3-dots-more (settings, free) - vertical grip dots */
export function Iconsax3DotsMore({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10Z" stroke="currentColor" strokeWidth={strokeWidth}/>
      <path d="M19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10Z" stroke="currentColor" strokeWidth={strokeWidth}/>
      <path d="M12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z" stroke="currentColor" strokeWidth={strokeWidth}/>
    </BaseSvg>
  );
}
Iconsax3DotsMore.displayName = "Iconsax3DotsMore";

/** Iconsax trash (essential, free) - trash bin */
export function IconsaxTrash({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M21 5.98047C17.67 5.65047 14.32 5.48047 10.98 5.48047C9 5.48047 7.02 5.58047 5.04 5.78047L3 5.98047" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.5 4.97L8.72 3.66C8.88 2.71 9 2 10.69 2H13.31C15 2 15.13 2.75 15.28 3.67L15.5 4.97" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.85 9.14062L18.2 19.2106C18.09 20.7806 18 22.0006 15.21 22.0006H8.79002C6.00002 22.0006 5.91002 20.7806 5.80002 19.2106L5.15002 9.14062" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.33 16.5H13.66" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.5 12.5H14.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxTrash.displayName = "IconsaxTrash";

/** Iconsax menu (essential, free) - 3 horizontal lines */
export function IconsaxMenu({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M3 7H21" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M3 12H21" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M3 17H21" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
    </BaseSvg>
  );
}
IconsaxMenu.displayName = "IconsaxMenu";

/** Iconsax sidebar-left (programming, free) - sidebar toggle close */
export function IconsaxSidebarLeft({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.96997 2V22" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.97 9.43945L12.41 11.9995L14.97 14.5595" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxSidebarLeft.displayName = "IconsaxSidebarLeft";

/** Iconsax sidebar-right (programming, free) - sidebar toggle open */
export function IconsaxSidebarRight({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.97 2V22" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.96997 9.43945L10.53 11.9995L7.96997 14.5595" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxSidebarRight.displayName = "IconsaxSidebarRight";

/** Iconsax close-circle (essential, free) - circle with X */
export function IconsaxCloseCircle({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.17004 14.8299L14.83 9.16992" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.83 14.8299L9.17004 9.16992" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxCloseCircle.displayName = "IconsaxCloseCircle";

/** Iconsax close (arrow2) - bare X */
export function IconsaxCloseX({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </BaseSvg>
  );
}
IconsaxCloseX.displayName = "IconsaxCloseX";

/** Iconsax play (video-audio-image, free) - media play */
export function IconsaxPlay({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M4 12.0004V8.44038C4 4.02038 7.13 2.21038 10.96 4.42038L14.05 6.20038L17.14 7.98038C20.97 10.1904 20.97 13.8104 17.14 16.0204L14.05 17.8004L10.96 19.5804C7.13 21.7904 4 19.9804 4 15.5604V12.0004Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxPlay.displayName = "IconsaxPlay";

/** Iconsax pause (video-audio-image, free) - media pause */
export function IconsaxPause({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M10.65 19.11V4.89C10.65 3.54 10.08 3 8.64 3H5.01C3.57 3 3 3.54 3 4.89V19.11C3 20.46 3.57 21 5.01 21H8.64C10.08 21 10.65 20.46 10.65 19.11Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 19.11V4.89C21 3.54 20.43 3 18.99 3H15.36C13.93 3 13.35 3.54 13.35 4.89V19.11C13.35 20.46 13.92 21 15.36 21H18.99C20.43 21 21 20.46 21 19.11Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxPause.displayName = "IconsaxPause";

/** Iconsax setting (settings, free) - configuration gear */
export function IconsaxSetting({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12.8794V11.1194C2 10.0794 2.85 9.21945 3.9 9.21945C5.71 9.21945 6.45 7.93945 5.54 6.36945C5.02 5.46945 5.33 4.29945 6.24 3.77945L7.97 2.78945C8.76 2.31945 9.78 2.59945 10.25 3.38945L10.36 3.57945C11.26 5.14945 12.74 5.14945 13.65 3.57945L13.76 3.38945C14.23 2.59945 15.25 2.31945 16.04 2.78945L17.77 3.77945C18.68 4.29945 18.99 5.46945 18.47 6.36945C17.56 7.93945 18.3 9.21945 20.11 9.21945C21.15 9.21945 22.01 10.0694 22.01 11.1194V12.8794C22.01 13.9194 21.16 14.7794 20.11 14.7794C18.3 14.7794 17.56 16.0594 18.47 17.6294C18.99 18.5394 18.68 19.6994 17.77 20.2194L16.04 21.2094C15.25 21.6794 14.23 21.3994 13.76 20.6094L13.65 20.4194C12.75 18.8494 11.27 18.8494 10.36 20.4194L10.25 20.6094C9.78 21.3994 8.76 21.6794 7.97 21.2094L6.24 20.2194C5.33 19.6994 5.02 18.5294 5.54 17.6294C6.45 16.0594 5.71 14.7794 3.9 14.7794C2.85 14.7794 2 13.9194 2 12.8794Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxSetting.displayName = "IconsaxSetting";

/** Iconsax status-up (business, free) - bar chart with upward trend */
export function IconsaxStatusUp({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M6.88 18.1501V16.0801" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M12 18.1498V14.0098" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M17.12 18.1497V11.9297" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M17.12 5.84961L16.66 6.38961C14.11 9.36961 10.69 11.4796 6.88 12.4296" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M14.1899 5.84961H17.1199V8.76961" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxStatusUp.displayName = "IconsaxStatusUp";

/** Iconsax logout (arrow, free) - sign out door arrow */
export function IconsaxLogout({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M17.4399 14.62L19.9999 12.06L17.4399 9.5" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.75977 12.0596H19.9298" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.7598 20C7.33977 20 3.75977 17 3.75977 12C3.75977 7 7.33977 4 11.7598 4" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxLogout.displayName = "IconsaxLogout";

/** Iconsax search-normal (search, free) - magnifying glass */
export function IconsaxSearchNormal({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M11 20C15.9706 20 20 15.9706 20 11C20 6.02944 15.9706 2 11 2C6.02944 2 2 6.02944 2 11C2 15.9706 6.02944 20 11 20Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.8978 20.4629C19.1822 22.1242 20.3546 22.4637 21.4838 21.2188C22.5159 20.0805 22.1195 18.9585 20.5969 18.7278C19.4713 18.5472 18.7052 19.3313 18.8978 20.4629Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxSearchNormal.displayName = "IconsaxSearchNormal";

/** Iconsax grid (grid, free) - 4-square grid */
export function IconsaxGrid({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.03003 8.5H22" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.03003 15.5H22" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.51001 21.9898V2.00977" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.51 21.9898V2.00977" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxGrid.displayName = "IconsaxGrid";

/** Iconsax textalign-left (type-paragraph-character, free) - document list lines */
export function IconsaxTextAlignLeft({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M3 4.5H21" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 9.5H12.47" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 14.5H21" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 19.5H12.47" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxTextAlignLeft.displayName = "IconsaxTextAlignLeft";

/** Iconsax trend-up (business, free) - analytics trend line */
export function IconsaxTrendUp({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M16.5 9.5L12.3 13.7L10.7 11.3L7.5 14.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.5 9.5H16.5V11.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxTrendUp.displayName = "IconsaxTrendUp";

/** Iconsax slider-horizontal (grid, free) - adjust ruler / sliders */
export function IconsaxSliderHorizontal({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M18 7V17C18 17.62 17.98 18.17 17.91 18.66C17.62 21.29 16.38 22 13 22H11C7.62 22 6.38 21.29 6.09 18.66C6.02 18.17 6 17.62 6 17V7C6 6.38 6.02 5.83 6.09 5.34C6.38 2.71 7.62 2 11 2H13C16.38 2 17.62 2.71 17.91 5.34C17.98 5.83 18 6.38 18 7Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 17.0001C6 17.6201 6.02 18.1701 6.09 18.6601C5.95 18.6701 5.82 18.6701 5.67 18.6701H5.33C2.67 18.6701 2 18.0001 2 15.3301V8.67008C2 6.00008 2.67 5.33008 5.33 5.33008H5.67C5.82 5.33008 5.95 5.33008 6.09 5.34008C6.02 5.83008 6 6.38008 6 7.00008V17.0001Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 8.67008V15.3301C22 18.0001 21.33 18.6701 18.67 18.6701H18.33C18.18 18.6701 18.05 18.6701 17.91 18.6601C17.98 18.1701 18 17.6201 18 17.0001V7.00008C18 6.38008 17.98 5.83008 17.91 5.34008C18.05 5.33008 18.18 5.33008 18.33 5.33008H18.67C21.33 5.33008 22 6.00008 22 8.67008Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxSliderHorizontal.displayName = "IconsaxSliderHorizontal";

/** Iconsax rotate-left (arrow, free) - circular history arrow */
export function IconsaxRotateLeft({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M9.11008 5.08039C9.98008 4.82039 10.9401 4.65039 12.0001 4.65039C16.7901 4.65039 20.6701 8.53039 20.6701 13.3204C20.6701 18.1104 16.7901 21.9904 12.0001 21.9904C7.21008 21.9904 3.33008 18.1104 3.33008 13.3204C3.33008 11.5404 3.87008 9.88039 4.79008 8.50039" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.87012 5.32L10.7601 2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.87012 5.32031L11.2401 7.78031" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxRotateLeft.displayName = "IconsaxRotateLeft";

/** Iconsax clock (christmas, free) - time clock */
export function IconsaxClock({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 6.44V12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.11035 8.11L12.0004 12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxClock.displayName = "IconsaxClock";

/** Iconsax flash (essential, free) - energy spark / flame */
export function IconsaxFlash({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M6.08998 13.2809H9.17998V20.4809C9.17998 22.1609 10.09 22.5009 11.2 21.2409L18.77 12.6409C19.7 11.5909 19.31 10.7209 17.9 10.7209H14.81V3.52087C14.81 1.84087 13.9 1.50087 12.79 2.76087L5.21998 11.3609C4.29998 12.4209 4.68998 13.2809 6.08998 13.2809Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxFlash.displayName = "IconsaxFlash";

/** Iconsax more (settings, free) - more horizontal dots */
export function IconsaxMore({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M12 9.32C13.19 9.32 14.16 8.35 14.16 7.16C14.16 5.97 13.19 5 12 5C10.81 5 9.83997 5.97 9.83997 7.16C9.83997 8.35 10.81 9.32 12 9.32Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.79 18.9997C7.98 18.9997 8.95 18.0297 8.95 16.8397C8.95 15.6497 7.98 14.6797 6.79 14.6797C5.6 14.6797 4.63 15.6497 4.63 16.8397C4.63 18.0297 5.59 18.9997 6.79 18.9997Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.21 18.9997C18.4 18.9997 19.37 18.0297 19.37 16.8397C19.37 15.6497 18.4 14.6797 17.21 14.6797C16.02 14.6797 15.05 15.6497 15.05 16.8397C15.05 18.0297 16.02 18.9997 17.21 18.9997Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxMore.displayName = "IconsaxMore";

/** Iconsax eye (security, free) - visible eye */
export function IconsaxEye({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M15.58 11.9999C15.58 13.9799 13.98 15.5799 12 15.5799C10.02 15.5799 8.42004 13.9799 8.42004 11.9999C8.42004 10.0199 10.02 8.41992 12 8.41992C13.98 8.41992 15.58 10.0199 15.58 11.9999Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 20.2707C15.53 20.2707 18.82 18.1907 21.11 14.5907C22.01 13.1807 22.01 10.8107 21.11 9.4007C18.82 5.8007 15.53 3.7207 12 3.7207C8.46997 3.7207 5.17997 5.8007 2.88997 9.4007C1.98997 10.8107 1.98997 13.1807 2.88997 14.5907C5.17997 18.1907 8.46997 20.2707 12 20.2707Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxEye.displayName = "IconsaxEye";

/** Iconsax eye-slash (security, free) - eye with privacy slash */
export function IconsaxEyeSlash({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M14.53 9.46992L9.47004 14.5299C8.82004 13.8799 8.42004 12.9899 8.42004 11.9999C8.42004 10.0199 10.02 8.41992 12 8.41992C12.99 8.41992 13.88 8.81992 14.53 9.46992Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.82 5.77047C16.07 4.45047 14.07 3.73047 12 3.73047C8.46997 3.73047 5.17997 5.81047 2.88997 9.41047C1.98997 10.8205 1.98997 13.1905 2.88997 14.6005C3.67997 15.8405 4.59997 16.9105 5.59997 17.7705" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.42004 19.5297C9.56004 20.0097 10.77 20.2697 12 20.2697C15.53 20.2697 18.82 18.1897 21.11 14.5897C22.01 13.1797 22.01 10.8097 21.11 9.39969C20.78 8.87969 20.42 8.38969 20.05 7.92969" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.5099 12.6992C15.2499 14.1092 14.0999 15.2592 12.6899 15.5192" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.47 14.5293L2 21.9993" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L14.53 9.47" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxEyeSlash.displayName = "IconsaxEyeSlash";

/** Iconsax copy (design-tools, free) - duplicate documents */
export function IconsaxCopy({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 6.9V11.1C22 14.6 20.6 16 17.1 16H16V12.9C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2H17.1C20.6 2 22 3.4 22 6.9Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxCopy.displayName = "IconsaxCopy";

/** Iconsax layer (design-tools, free) - stacked layers for programs */
export function IconsaxLayer({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M13.01 2.92031L18.91 5.54031C20.61 6.29031 20.61 7.53031 18.91 8.28031L13.01 10.9003C12.34 11.2003 11.24 11.2003 10.57 10.9003L4.67002 8.28031C2.97002 7.53031 2.97002 6.29031 4.67002 5.54031L10.57 2.92031C11.24 2.62031 12.34 2.62031 13.01 2.92031Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 11C3 11.84 3.63 12.81 4.4 13.15L11.19 16.17C11.71 16.4 12.3 16.4 12.81 16.17L19.6 13.15C20.37 12.81 21 11.84 21 11" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 16C3 16.93 3.55 17.77 4.4 18.15L11.19 21.17C11.71 21.4 12.3 21.4 12.81 21.17L19.6 18.15C20.45 17.77 21 16.93 21 16" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxLayer.displayName = "IconsaxLayer";

/** Iconsax send (essential, free) - paper plane share */
export function IconsaxSend({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M9.51002 4.23062L18.07 8.51062C21.91 10.4306 21.91 13.5706 18.07 15.4906L9.51002 19.7706C3.75002 22.6506 1.40002 20.2906 4.28002 14.5406L5.15002 12.8106C5.37002 12.3706 5.37002 11.6406 5.15002 11.2006L4.28002 9.46062C1.40002 3.71062 3.76002 1.35062 9.51002 4.23062Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.43994 12H10.8399" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxSend.displayName = "IconsaxSend";

/** Iconsax import-arrow (arrow, free) - download / add to home */
export function IconsaxImportArrow({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M16.44 8.90039C20.04 9.21039 21.51 11.0604 21.51 15.1104V15.2404C21.51 19.7104 19.72 21.5004 15.25 21.5004H8.73998C4.26998 21.5004 2.47998 19.7104 2.47998 15.2404V15.1104C2.47998 11.0904 3.92998 9.24039 7.46998 8.91039" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 2V14.88" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.3499 12.6504L11.9999 16.0004L8.6499 12.6504" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxImportArrow.displayName = "IconsaxImportArrow";

/** Iconsax call (call, free) - telephone contact */
export function IconsaxCall({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M21.97 18.33C21.97 18.69 21.89 19.06 21.72 19.42C21.55 19.78 21.33 20.12 21.04 20.44C20.55 20.98 20.01 21.37 19.4 21.62C18.8 21.87 18.15 22 17.45 22C16.43 22 15.34 21.76 14.19 21.27C13.04 20.78 11.89 20.12 10.75 19.29C9.6 18.45 8.51 17.52 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.27 13.75 11.79 14.24 12.32 14.69C12.84 15.13 13.27 15.43 13.61 15.61C13.66 15.63 13.72 15.66 13.79 15.69C13.87 15.72 13.95 15.73 14.04 15.73C14.21 15.73 14.34 15.67 14.45 15.56L15.21 14.81C15.46 14.56 15.7 14.37 15.93 14.25C16.16 14.11 16.39 14.04 16.64 14.04C16.83 14.04 17.03 14.08 17.25 14.17C17.47 14.26 17.7 14.39 17.95 14.56L21.26 16.91C21.52 17.09 21.7 17.3 21.81 17.55C21.91 17.8 21.97 18.05 21.97 18.33Z" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10"/>
    </BaseSvg>
  );
}
IconsaxCall.displayName = "IconsaxCall";

/** Iconsax repeat-arrow (arrow, free) - circular swap arrows */
export function IconsaxRepeatArrow({ strokeWidth = 1.5, ...props }: IconsaxProps) {
  return (
    <BaseSvg strokeWidth={strokeWidth} {...props}>
      <path d="M3.58008 5.16016H17.4201C19.0801 5.16016 20.4201 6.50016 20.4201 8.16016V11.4802" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.74008 2L3.58008 5.15997L6.74008 8.32001" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.4201 18.8395H6.58008C4.92008 18.8395 3.58008 17.4995 3.58008 15.8395V12.5195" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.2603 21.9997L20.4203 18.8397L17.2603 15.6797" stroke="currentColor" strokeWidth={strokeWidth} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </BaseSvg>
  );
}
IconsaxRepeatArrow.displayName = "IconsaxRepeatArrow";

export const ICONSAX_MAP = {
  "category": IconsaxCategory,
  "messageText": IconsaxMessageText,
  "profile2User": IconsaxProfile2User,
  "calendar": IconsaxCalendar,
  "videoPlay": IconsaxVideoPlay,
  "clipboardText": IconsaxClipboardText,
  "book": IconsaxBook,
  "weight": IconsaxWeight,
  "dumbbell": IconsaxDumbbell,
  "lifter": IconsaxLifter,
  "notification": IconsaxNotification,
  "danger": IconsaxDanger,
  "printer": IconsaxPrinter,
  "add": IconsaxAdd,
  "tickCircle": IconsaxTickCircle,
  "arrowRight4": IconsaxArrowRight4,
  "arrowLeft3": IconsaxArrowLeft3,
  "arrowRight3": IconsaxArrowRight3,
  "dots3More": Iconsax3DotsMore,
  "trash": IconsaxTrash,
  "menu": IconsaxMenu,
  "sidebarLeft": IconsaxSidebarLeft,
  "sidebarRight": IconsaxSidebarRight,
  "closeCircle": IconsaxCloseCircle,
  "closeX": IconsaxCloseX,
  "play": IconsaxPlay,
  "pause": IconsaxPause,
  "setting": IconsaxSetting,
  "statusUp": IconsaxStatusUp,
  "logout": IconsaxLogout,
  "searchNormal": IconsaxSearchNormal,
  "grid": IconsaxGrid,
  "textalignLeft": IconsaxTextAlignLeft,
  "trendUp": IconsaxTrendUp,
  "sliderHorizontal": IconsaxSliderHorizontal,
  "rotateLeft": IconsaxRotateLeft,
  "clock": IconsaxClock,
  "flash": IconsaxFlash,
  "more": IconsaxMore,
  "eye": IconsaxEye,
  "eyeSlash": IconsaxEyeSlash,
  "copy": IconsaxCopy,
  "layer": IconsaxLayer,
  "send": IconsaxSend,
  "importArrow": IconsaxImportArrow,
  "call": IconsaxCall,
  "repeatArrow": IconsaxRepeatArrow,
} as const;

export type IconsaxIconName = keyof typeof ICONSAX_MAP;

export function Iconsax({
  name,
  ...props
}: IconsaxProps & { name: IconsaxIconName }) {
  const Component = ICONSAX_MAP[name];
  if (!Component) return null;
  return <Component {...props} />;
}
