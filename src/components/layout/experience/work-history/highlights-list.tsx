export function HighlightsList({ items }: { items: string[] }) {
  return (
    <ul className="list-none pl-5 m-0 space-y-0 group-data-[state=open]/collapsible:space-y-1 text-sm md:text-base">
      {items.map((h, idx) => (
        <li
          key={idx}
          className="relative pl-4 opacity-0 translate-y-1 max-h-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.16,1)] [transition-delay:var(--delay-out)] group-data-[state=open]:[transition-delay:var(--delay-in)] group-data-[state=open]:opacity-100 group-data-[state=open]:translate-y-0 group-data-[state=open]:max-h-[400px] group-data-[state=open]:my-1 before:absolute before:left-0 before:top-[0.55em] before:size-1.5 before:rounded-full before:bg-primary"
          style={
            {
              '--delay-in': `${idx * 80}ms`,
              '--delay-out': `${(items.length - 1 - idx) * 80}ms`,
            } as React.CSSProperties
          }>
          {h}
        </li>
      ))}
    </ul>
  )
}
