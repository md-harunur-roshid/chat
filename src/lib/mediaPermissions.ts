export type PermissionStatusValue = 'granted' | 'prompt' | 'denied' | 'unsupported';

export interface MediaPermissionState {
  mic: PermissionStatusValue;
  camera: PermissionStatusValue;
}

export async function checkMediaPermissions(): Promise<MediaPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { mic: 'unsupported', camera: 'unsupported' };
  }

  let mic: PermissionStatusValue = 'prompt';
  let camera: PermissionStatusValue = 'prompt';
  let usedPermissionsApi = false;

  if (navigator.permissions?.query) {
    try {
      const [micStatus, camStatus] = await Promise.all([
        navigator.permissions.query({ name: 'microphone' as PermissionName }),
        navigator.permissions.query({ name: 'camera' as PermissionName }),
      ]);
      mic = micStatus.state;
      camera = camStatus.state;
      usedPermissionsApi = true;
    } catch {
      usedPermissionsApi = false;
    }
  }

  if (!usedPermissionsApi && navigator.mediaDevices.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioLabel = devices.some((d) => d.kind === 'audioinput' && d.label.length > 0);
      const hasVideoLabel = devices.some((d) => d.kind === 'videoinput' && d.label.length > 0);
      mic = hasAudioLabel ? 'granted' : 'prompt';
      camera = hasVideoLabel ? 'granted' : 'prompt';
    } catch {
      // Leave as 'prompt'
    }
  }

  return { mic, camera };
}

export async function requestMediaAccess(options: {
  audio: boolean;
  video: boolean;
}): Promise<{ ok: boolean; errorKind?: 'denied' | 'not_found' | 'unsupported' }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, errorKind: 'unsupported' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: options.audio,
      video: options.video,
    });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';

    // If device has mic but no camera, fall back to requesting mic alone
    if (options.audio && options.video && (name === 'NotFoundError' || name === 'OverconstrainedError')) {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioOnly.getTracks().forEach((track) => track.stop());
        return { ok: true };
      } catch (audioErr) {
        const audioName = audioErr instanceof DOMException ? audioErr.name : '';
        if (audioName === 'NotAllowedError' || audioName === 'PermissionDeniedError') {
          return { ok: false, errorKind: 'denied' };
        }
        return { ok: false, errorKind: 'not_found' };
      }
    }

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return { ok: false, errorKind: 'denied' };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return { ok: false, errorKind: 'not_found' };
    }
    return { ok: false, errorKind: 'denied' };
  }
}
