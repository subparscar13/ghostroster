/**
 * Player name with prestige styling (FR-016, "style the name"): Hall-of-Famers in
 * gold, a gold ★ after an All-Star season. Shared by the draft rows, the roster
 * card, and the result so the treatment is identical everywhere.
 */
export function PlayerName({
  name,
  allStar,
  hof,
  onDark = false,
  className = "",
}: {
  name: string;
  allStar?: boolean | undefined;
  hof?: boolean | undefined;
  onDark?: boolean; // dark backgrounds (roster chips) need the lighter gold
  className?: string;
}) {
  const hofColor = hof ? (onDark ? "text-gold" : "text-gold-ink") : "";
  return (
    <span className={`${hofColor} ${className}`} title={hof ? "Hall of Famer" : undefined}>
      {name}
      {allStar && (
        <span className="ml-1 text-gold" title="All-Star season" aria-label="All-Star season">
          ★
        </span>
      )}
    </span>
  );
}
