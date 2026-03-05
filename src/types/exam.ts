export interface Faculty {
  faculty_id: string;
  name: string;
  gender: string;
  department: string;
  teaching_type: 'Teaching' | 'Non-Teaching';
  qualification: 'Graduate' | 'Postgraduate' | 'PhD';
  designation: string;
  experience_years: number;
  active_status: boolean;
}

export interface FairnessCounter {
  faculty_id: string;
  jr_sv_count: number;
  sr_sv_count: number;
  squad_count: number;
  total_allocations: number;
  last_allocated_term: string;
}

export interface ExamTerm {
  term_id: string;
  term_name: string;
  total_students: number;
  total_blocks: number;
  created_at: string;
}

export interface Allocation {
  allocation_id: string;
  term_id: string;
  faculty_id: string;
  role: 'Jr_SV' | 'Sr_SV' | 'Squad';
  block_number?: number;
  squad_number?: number;
}

export interface TimetableSession {
  exam_date: string;
  session: string;
  subject: string;
  student_count: number;
  pwd_students: number;
  normal_blocks: number;
  pwd_blocks: number;
  total_blocks: number;
}

export interface SessionAllocationResult {
  exam_date: string;
  session: string;
  subject: string;
  totalBlocks: number;
  juniorSupervisors: { block: number; faculty: Faculty; isPwd: boolean }[];
  substituteJrSV: Faculty[];
  seniorSupervisors: Faculty[];
  squads: { squad: number; members: Faculty[] }[];
}

export interface AllocationResult {
  sessions: SessionAllocationResult[];
  unallocated: Faculty[];
}
