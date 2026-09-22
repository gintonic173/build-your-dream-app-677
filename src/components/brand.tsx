import { cn } from "@/lib/utils";
import mark from "@/assets/voltio-mark.png";

export function VoltioMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      src={mark}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function VoltioWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <VoltioMark size={26} />
      <span className="font-display text-[1.0625rem] font-semibold tracking-tight">
        Voltio
      </span>
    </span>
  );
}
