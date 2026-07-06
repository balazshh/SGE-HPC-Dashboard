import { useUi } from "../lib/ui";

interface StatusPillProps {
  value: string;
}

export function StatusPill({ value }: StatusPillProps) {
  const { statusLabel } = useUi();
  return <span className={`status-pill status-pill--${value}`}>{statusLabel(value)}</span>;
}
