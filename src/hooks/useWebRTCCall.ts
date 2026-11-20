import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  acceptCallSession,
  addIceCandidateRecord,
  createCallSession,
  sendChatMessage,
  updateCallStatus,
} from '../lib/chatService';
import { db, generateSafeId, getSortedPair, handleFirestoreError } from '../lib/firebase';
import { COPY, formatDuration, Locale } from '../lib/i18n';
import { callTonePlayer } from '../lib/sound';
import {
  CallSession,
  CallType,
  IceCandidateRecord,
  OperationType,
  UserProfile,
} from '../types/chat';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
};

export function useWebRTCCall(currentUser: UserProfile | null, locale: Locale) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);
  const [terminalNotice, setTerminalNotice] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedCandidateIdsRef = useRef<Set<string>>(new Set());
  const activeCallIdRef = useRef<string | null>(null);
  const callSecondsRef = useRef<number>(0);

  const cleanupMediaAndPeer = useCallback(() => {
    callTonePlayer.stop();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    processedCandidateIdsRef.current.clear();
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const queued = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const cand of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {
        // Ignore stale ICE candidates
      }
    }
  }, []);

  const createConfiguredPeerConnection = useCallback(
    (callId: string, participants: [string, string], uid: string, stream: MediaStream) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const inboundStream = new MediaStream();
      setRemoteStream(inboundStream);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!inboundStream.getTracks().some((t) => t.id === track.id)) {
              inboundStream.addTrack(track);
            }
          });
          setRemoteStream(new MediaStream(inboundStream.getTracks()));
        } else if (event.track) {
          inboundStream.addTrack(event.track);
          setRemoteStream(new MediaStream(inboundStream.getTracks()));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.candidate && event.candidate.candidate.trim().length > 0) {
          void addIceCandidateRecord({
            callId,
            participants,
            senderId: uid,
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid ?? '',
            sdpMLineIndex: event.candidate.sdpMLineIndex ?? 0,
          });
        }
      };

      pcRef.current = pc;
      return pc;
    },
    []
  );

  // Listen for incoming ringing calls for currentUser
  useEffect(() => {
    if (!currentUser) return;
    const path = 'calls';
    const q = query(collection(db, path), where('calleeId', '==', currentUser.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const ringingCalls = snap.docs
          .map((d) => d.data() as CallSession)
          .filter((c) => {
            if (c.status !== 'ringing') return false;
            const createdMs = c.createdAt ? c.createdAt.toMillis() : now;
            return now - createdMs < 90_000;
          })
          .sort((a, b) => (b.createdAt?.toMillis() ?? now) - (a.createdAt?.toMillis() ?? now));

        const latestIncoming = ringingCalls[0] ?? null;

        if (!activeCallIdRef.current && latestIncoming) {
          setIncomingCall(latestIncoming);
          callTonePlayer.startIncomingRing();
        } else if (!latestIncoming) {
          setIncomingCall((prev) => {
            if (prev && !activeCallIdRef.current) {
              callTonePlayer.stop();
            }
            return null;
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => {
      unsub();
    };
  }, [currentUser]);

  // Listen to activeCall document and its ICE candidates
  const activeCallId = activeCall?.callId ?? null;
  useEffect(() => {
    activeCallIdRef.current = activeCallId;
  }, [activeCallId]);

  useEffect(() => {
    if (!activeCallId || !currentUser) return;

    const callPath = `calls/${activeCallId}`;
    const unsubCall = onSnapshot(
      doc(db, 'calls', activeCallId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as CallSession;
        setActiveCall(data);

        // If caller receives answer SDP while pc has no remote description yet
        const pc = pcRef.current;
        if (
          data.callerId === currentUser.uid &&
          data.status === 'active' &&
          data.answerSdp &&
          pc &&
          !pc.currentRemoteDescription
        ) {
          callTonePlayer.stop();
          void pc
            .setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.answerSdp }))
            .then(() => flushPendingCandidates(pc))
            .catch(() => {});
        }

        // Handle terminal states triggered by either side
        if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
          const t = COPY[locale];
          const label =
            data.status === 'declined'
              ? t.callDeclined
              : data.status === 'missed'
              ? t.callMissed
              : t.callEnded;
          setTerminalNotice(label);
          cleanupMediaAndPeer();

          window.setTimeout(() => {
            setActiveCall((curr) => (curr?.callId === activeCallId ? null : curr));
            setTerminalNotice(null);
            setCallSeconds(0);
            callSecondsRef.current = 0;
          }, 1300);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, callPath);
      }
    );

    const candidatesPath = `calls/${activeCallId}/candidates`;
    const qCandidates = query(
      collection(db, 'calls', activeCallId, 'candidates'),
      where('participants', 'array-contains', currentUser.uid)
    );
    const unsubCandidates = onSnapshot(
      qCandidates,
      (snap) => {
        snap.docs.forEach((d) => {
          const rec = d.data() as IceCandidateRecord;
          if (rec.senderId === currentUser.uid) return;
          if (processedCandidateIdsRef.current.has(rec.candidateId)) return;
          processedCandidateIdsRef.current.add(rec.candidateId);

          const candidateInit: RTCIceCandidateInit = {
            candidate: rec.candidate,
            sdpMid: rec.sdpMid || null,
            sdpMLineIndex: rec.sdpMLineIndex,
          };

          const pc = pcRef.current;
          if (pc && pc.remoteDescription) {
            void pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch(() => {});
          } else {
            pendingCandidatesRef.current.push(candidateInit);
          }
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, candidatesPath);
      }
    );

    return () => {
      unsubCall();
      unsubCandidates();
    };
  }, [activeCallId, cleanupMediaAndPeer, currentUser, flushPendingCandidates, locale]);

  // Live duration timer while activeCall.status === 'active'
  useEffect(() => {
    if (activeCall?.status !== 'active') {
      return;
    }
    const id = window.setInterval(() => {
      setCallSeconds((s) => {
        const next = s + 1;
        callSecondsRef.current = next;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeCall?.status]);

  const startCall = useCallback(
    async (callee: UserProfile, chatId: string, callType: CallType) => {
      if (!currentUser || activeCallIdRef.current) return;
      setCallError(null);
      setTerminalNotice(null);
      setCallSeconds(0);
      callSecondsRef.current = 0;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        const callId = generateSafeId('call');
        const participants = getSortedPair(currentUser.uid, callee.uid);
        const pc = createConfiguredPeerConnection(callId, participants, currentUser.uid, stream);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await createCallSession({
          callId,
          chatId,
          caller: currentUser,
          callee,
          callType,
          offerSdp: offer.sdp ?? '',
        });

        activeCallIdRef.current = callId;
        setActiveCall({
          callId,
          chatId,
          callerId: currentUser.uid,
          calleeId: callee.uid,
          callerName: currentUser.displayName,
          callerPhoto: currentUser.photoURL,
          calleeName: callee.displayName,
          calleePhoto: callee.photoURL,
          callType,
          status: 'ringing',
          offerType: 'offer',
          offerSdp: offer.sdp ?? '',
          answerType: '',
          answerSdp: '',
          createdAt: null,
          updatedAt: null,
        });
        callTonePlayer.startOutgoingRingback();
      } catch (err) {
        cleanupMediaAndPeer();
        setCallError(COPY[locale].mediaError);
        console.error('Failed to start call:', err);
      }
    },
    [cleanupMediaAndPeer, createConfiguredPeerConnection, currentUser, locale]
  );

  const acceptIncomingCall = useCallback(async () => {
    if (!currentUser || !incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);
    callTonePlayer.stop();
    setCallError(null);
    setTerminalNotice(null);
    setCallSeconds(0);
    callSecondsRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.callType === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const participants = getSortedPair(call.callerId, call.calleeId);
      const pc = createConfiguredPeerConnection(call.callId, participants, currentUser.uid, stream);

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'offer', sdp: call.offerSdp })
      );
      await flushPendingCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      activeCallIdRef.current = call.callId;
      setActiveCall({ ...call, status: 'active' });
      await acceptCallSession(call.callId, answer.sdp ?? '');
    } catch (err) {
      cleanupMediaAndPeer();
      setCallError(COPY[locale].mediaError);
      void updateCallStatus(call.callId, 'declined');
      console.error('Failed to accept call:', err);
    }
  }, [cleanupMediaAndPeer, createConfiguredPeerConnection, currentUser, flushPendingCandidates, incomingCall, locale]);

  const declineIncomingCall = useCallback(async () => {
    if (!currentUser || !incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);
    callTonePlayer.stop();
    await updateCallStatus(call.callId, 'declined');

    const t = COPY[locale];
    const typeLabel = call.callType === 'video' ? t.videoCall : t.audioCall;
    await sendChatMessage({
      chatId: call.chatId,
      participants: getSortedPair(call.callerId, call.calleeId),
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: `${typeLabel} · ${t.callDeclined}`,
      type: 'call_event',
    });
  }, [currentUser, incomingCall, locale]);

  const endActiveCall = useCallback(async () => {
    if (!currentUser || !activeCall) return;
    const call = activeCall;
    const nextStatus = call.status === 'ringing' && call.callerId === currentUser.uid ? 'missed' : 'ended';
    const elapsed = callSecondsRef.current;

    cleanupMediaAndPeer();
    await updateCallStatus(call.callId, nextStatus);

    const t = COPY[locale];
    const typeLabel = call.callType === 'video' ? t.videoCall : t.audioCall;
    const summaryText =
      nextStatus === 'missed'
        ? `${typeLabel} · ${t.callMissed}`
        : `${typeLabel} · ${formatDuration(elapsed)}`;

    await sendChatMessage({
      chatId: call.chatId,
      participants: getSortedPair(call.callerId, call.calleeId),
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: summaryText,
      type: 'call_event',
    });
  }, [activeCall, cleanupMediaAndPeer, currentUser, locale]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextOff = !isCameraOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextOff;
    });
    setIsCameraOff(nextOff);
  }, [isCameraOff]);

  const dismissError = useCallback(() => setCallError(null), []);

  return {
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callSeconds,
    callError,
    terminalNotice,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endActiveCall,
    toggleMute,
    toggleCamera,
    dismissError,
  };
}
