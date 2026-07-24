export function EventRequiredNotice({ label }: { label?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/15 bg-white/60 p-8 text-center text-sm text-ink/50">
      Ask an Admin to create {label ?? 'this event'} in Event Management — nothing to show until it exists.
    </div>
  );
}
