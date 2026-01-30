import { requireAdminOrModerator } from "../AdminOnly";

export default async function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminOrModerator();
  return <>{children}</>;
}
