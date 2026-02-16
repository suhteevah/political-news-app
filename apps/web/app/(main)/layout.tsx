import { NavBar } from "@/components/nav-bar";
import Link from "next/link";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
      <footer className="border-t border-gray-800 mt-16 py-8 text-sm text-gray-500">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p>&copy; {new Date().getFullYear()} The Right Wire</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="hover:text-gray-300 transition-colors">About</Link>
              <Link href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
              <Link href="/contact" className="hover:text-gray-300 transition-colors">Contact</Link>
              <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
              <Link href="/refunds" className="hover:text-gray-300 transition-colors">Refunds</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
