export type ClassroomRole = 'teacher' | 'student';

export interface ClassroomSession {
  id: string;
  name: string;
  topic?: string;
  code: string;
  status: 'active' | 'ended';
  locked: boolean;
}

export interface StudentParticipant {
  id: string;
  name: string;
  roll: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface Exercise {
  title: string;
  language: 'python' | 'java';
  instructions: string;
  files?: WorkspaceFile[];
}

export interface Submission {
  id: string;
  studentId: string;
  name: string;
  submittedAt: string;
  files: WorkspaceFile[];
}

export interface NativeExecutionRequest {
  language: 'python' | 'java';
  activeFile: string;
  files: WorkspaceFile[];
}

export interface NativeExecutionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  commandLabel?: string;
}

export interface ClassroomEventMap {
  join_request: StudentParticipant;
  admission_updated: StudentParticipant;
  workspace_updated: { participantId: string; updatedAt: string };
  submission_received: Submission;
  exercise_published: { exercise: Exercise };
  lock_changed: { locked: boolean };
  session_ended: Record<string, never>;
  participant_disconnected: { participantId: string };
}

export interface DesktopBridge {
  readonly isDesktop: true;
  readonly platform: string;
  runNativeCode(input: NativeExecutionRequest): Promise<NativeExecutionResult>;
}

export interface ClassroomApi {
  request<T>(url: string, options?: RequestInit, token?: string | null): Promise<T>;
}
