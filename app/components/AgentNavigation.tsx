import Link from "next/link";

const LINKS = [
  ["Dashboard", "/agent/dashboard"],
  ["My Listings", "/agent/listings"],
  ["Add Listing", "/agent/add-listing"],
  ["Leads", "/agent/leads"],
] as const;

export default function AgentNavigation({ currentPath, mobile = false }: {
  currentPath: string;
  mobile?: boolean;
}) {
  return (
    <nav aria-label={mobile ? "Mobile agent navigation" : "Agent navigation"}
      className={mobile ? "flex gap-2 overflow-x-auto border-b border-slate-200 bg-white p-3 md:hidden" : "space-y-1"}>
      {LINKS.map(([label, href]) => (
        <Link key={href} href={href} aria-current={currentPath === href ? "page" : undefined}
          className={`block shrink-0 rounded-xl px-4 py-3 text-sm font-semibold ${currentPath === href ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
          {mobile && label === "My Listings" ? "Listings" : label}
        </Link>
      ))}
    </nav>
  );
}
