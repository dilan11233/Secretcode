import { RoomClient } from "@/components/room-client";

interface PageProps {
  params: { roomCode: string };
  searchParams: {
    nick?: string;
    host?: string;
    rt?: string;
    hostTeam?: "blue" | "green";
    hostRole?: "manager" | "employee";
    join?: string;
  };
}

export default function RoomPage({ params, searchParams }: PageProps) {
  const nickname = searchParams.nick?.trim() || "Guest";
  const isHost = searchParams.host === "1";
  const hostTeam = searchParams.hostTeam === "green" ? "green" : "blue";
  const hostRole = searchParams.hostRole === "employee" ? "employee" : "manager";
  const roomToken = searchParams.rt?.trim() || "";
  const forceNewSession = searchParams.join === "1";

  // Token yoksa hata ekranı veriyoruz
  if (!roomToken) {
    return (
      <main className="p-8 text-center bg-purpleNight min-h-screen flex flex-col items-center justify-center">
        <div className="text-red-400 font-bold text-2xl">Missing Room Token!</div>
        <p className="text-white/60 mt-2">Please use the invite link sent to you by the host.</p>
      </main>
    );
  }

  return (
    <RoomClient
      roomCode={params.roomCode.toUpperCase()}
      roomToken={roomToken}
      nickname={nickname}
      isHost={isHost}
      forceNewSession={forceNewSession}
      hostTeam={isHost ? hostTeam : undefined}
      hostRole={isHost ? hostRole : undefined}
    />
  );
}
