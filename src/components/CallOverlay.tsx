import { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { COPY, formatDuration, Locale } from '../lib/i18n';
import { CallSession } from '../types/chat';
import { Avatar } from './Avatar';

interface CallOverlayProps {
  currentUid: string;
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callSeconds: number;
  callError: string | null;
  terminalNotice: string | null;
  locale: Locale;
  onAcceptIncoming: () => void;
  onDeclineIncoming: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onDismissError: () => void;
}

export function CallOverlay({
  currentUid,
  activeCall,
  incomingCall,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  callSeconds,
  callError,
  terminalNotice,
  locale,
  onAcceptIncoming,
  onDeclineIncoming,
  onEndCall,
  onToggleMute,
  onToggleCamera,
  onDismissError,
}: CallOverlayProps) {
  const t = COPY[locale];
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall?.status]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.status, isCameraOff]);

  return (
    <>
      {/* Media permission error banner */}
      {callError && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 text-sm">
          <p className="flex-1 leading-snug">{callError}</p>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Close"
            className="p-1 hover:bg-red-700 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-6 shadow-2xl">
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar
                    src={incomingCall.callerPhoto}
                    name={incomingCall.callerName}
                    size="xl"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {incomingCall.callerName}
                </h3>
                <p className="text-sm text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                  {incomingCall.callType === 'video'
                    ? t.incomingVideoCall
                    : t.incomingAudioCall}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onDeclineIncoming}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>{t.decline}</span>
              </button>
              <button
                type="button"
                onClick={onAcceptIncoming}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {incomingCall.callType === 'video' ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                <span>{t.accept}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active / Outgoing Call Overlay */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col">
          {/* Hidden audio element ensures remote audio plays cleanly for audio-only & video calls */}
          <audio ref={remoteAudioRef} autoPlay playsInline />

          {/* Top Call Bar */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={
                  activeCall.callerId === currentUid
                    ? activeCall.calleePhoto
                    : activeCall.callerPhoto
                }
                name={
                  activeCall.callerId === currentUid
                    ? activeCall.calleeName
                    : activeCall.callerName
                }
                size="sm"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {activeCall.callerId === currentUid
                    ? activeCall.calleeName
                    : activeCall.callerName}
                </div>
                <div className="text-xs text-slate-300 font-mono-nums">
                  {terminalNotice
                    ? terminalNotice
                    : activeCall.status === 'active'
                    ? `${t.connected} · ${formatDuration(callSeconds)}`
                    : activeCall.callerId === currentUid
                    ? t.calling
                    : t.connecting}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              {activeCall.callType === 'video' ? t.videoCall : t.audioCall}
            </div>
          </div>

          {/* Main Stage */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
            {activeCall.callType === 'video' ? (
              <>
                {/* Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full max-w-5xl rounded-2xl object-cover bg-slate-900 border border-white/10"
                />

                {/* Waiting placeholder while ringing */}
                {activeCall.status !== 'active' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                    <Avatar
                      src={
                        activeCall.callerId === currentUid
                          ? activeCall.calleePhoto
                          : activeCall.callerPhoto
                      }
                      name={
                        activeCall.callerId === currentUid
                          ? activeCall.calleeName
                          : activeCall.callerName
                      }
                      size="xl"
                    />
                    <p className="text-sm text-slate-300">
                      {terminalNotice ?? t.calling}
                    </p>
                  </div>
                )}

                {/* Local Video PiP */}
                <div className="absolute bottom-6 right-6 w-32 sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-800 border border-white/20 shadow-xl">
                  {isCameraOff ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <VideoOff className="w-6 h-6" />
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  )}
                </div>
              </>
            ) : (
              /* Audio Call Stage */
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full border border-teal-500/30 bg-teal-500/10">
                    <Avatar
                      src={
                        activeCall.callerId === currentUid
                          ? activeCall.calleePhoto
                          : activeCall.callerPhoto
                      }
                      name={
                        activeCall.callerId === currentUid
                          ? activeCall.calleeName
                          : activeCall.callerName
                      }
                      size="xl"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-semibold">
                    {activeCall.callerId === currentUid
                      ? activeCall.calleeName
                      : activeCall.callerName}
                  </h3>
                  <p className="text-sm text-slate-300 font-mono-nums">
                    {terminalNotice
                      ? terminalNotice
                      : activeCall.status === 'active'
                      ? formatDuration(callSeconds)
                      : t.calling}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Call Controls Bar */}
          <div className="px-6 py-6 flex items-center justify-center gap-4 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? t.unmute : t.mute}
              className={`h-12 px-5 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="hidden sm:inline">{isMuted ? t.unmute : t.mute}</span>
            </button>

            {activeCall.callType === 'video' && (
              <button
                type="button"
                onClick={onToggleCamera}
                title={isCameraOff ? t.cameraOn : t.cameraOff}
                className={`h-12 px-5 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
                  isCameraOff
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {isCameraOff ? (
                  <VideoOff className="w-5 h-5" />
                ) : (
                  <Video className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">
                  {isCameraOff ? t.cameraOn : t.cameraOff}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onEndCall}
              title={t.endCall}
              className="h-12 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>{t.endCall}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
