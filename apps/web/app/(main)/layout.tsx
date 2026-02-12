import { NavBar } from "@/components/nav-bar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
    </>
  );
}
