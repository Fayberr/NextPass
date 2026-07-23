import { Favicon } from './Favicon';
import { KeyRound, ExternalLink, ShieldCheck } from './icons';

export interface PasskeyItem {
  id: string;
  title: string;
  rpId: string;
  userHandle?: string;
  userName?: string;
  createdAt: string;
}

interface PasskeyHubViewProps {
  passkeys: PasskeyItem[];
}

export function PasskeyHubView({ passkeys }: PasskeyHubViewProps) {
  const openSite = (rpId: string) => {
    const electronAPI = (window as any).electronAPI;
    const url = `https://${rpId}`;
    if (electronAPI?.openExternal) {
      electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand-400" />
            <span>Passkeys Hub</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Passwortlose FIDO2/WebAuthn Zugangsdaten direkt auf diesem Gerät
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-300 rounded-xl text-xs">
          <ShieldCheck className="h-4 w-4" />
          <span>FIDO2 WebAuthn Virtual Authenticator Active</span>
        </div>
      </div>

      {/* Grid of Passkey Cards */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
        {passkeys.map((pk) => (
          <div
            key={pk.id}
            className="group bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 hover:border-brand-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all cursor-pointer backdrop-blur-md"
          >
            <div>
              <div className="flex items-center gap-3">
                <Favicon url={`https://${pk.rpId}`} title={pk.title} size={32} />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-brand-300 transition-colors">
                    {pk.title}
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono">{pk.rpId}</p>
                </div>
              </div>

              <div className="mt-4 bg-zinc-950/60 p-3 rounded-xl border border-white/5 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono">Account</span>
                  <span className="font-mono text-zinc-200 text-xs truncate max-w-[150px]">
                    {pk.userName || pk.userHandle || 'FIDO2 Passkey'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono">Erstellt am</span>
                  <span className="font-mono text-zinc-400 text-[11px]">{pk.createdAt}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openSite(pk.rpId)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-1.5 bg-zinc-800/80 hover:bg-brand-600/30 hover:text-brand-300 text-zinc-300 font-medium text-xs rounded-xl border border-white/10 hover:border-brand-500/30 transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Zur Website gehen</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
