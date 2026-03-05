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

export interface AllocationResult {
  juniorSupervisors: { block: number; faculty: Faculty }[];
  substituteJrSV: Faculty[];
  seniorSupervisors: Faculty[];
  squads: { squad: number; members: Faculty[] }[];
  unallocated: Faculty[];
}
