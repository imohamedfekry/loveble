import { SocketProvider } from "@/lib/socket/socketProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <SocketProvider>
      {children}
    </SocketProvider>
  );
}