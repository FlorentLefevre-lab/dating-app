import { requireAdmin } from "../AdminOnly";

export default async function LogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifie que l'utilisateur est ADMIN, redirige sinon
  await requireAdmin();

  return <>{children}</>;
}
