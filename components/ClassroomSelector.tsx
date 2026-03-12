'use client';

interface Classroom {
  id: string;
  name: string;
  section?: string | null;
  google_classroom_id: string;
}

interface ClassroomSelectorProps {
  classrooms: Classroom[];
  onSelect: (classroomId: string) => void;
  value?: string;
}

export default function ClassroomSelector({ classrooms, onSelect, value }: ClassroomSelectorProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      <option value="" disabled>
        Selecione uma turma
      </option>
      {classrooms.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}{c.section ? ` — ${c.section}` : ''}
        </option>
      ))}
    </select>
  );
}
