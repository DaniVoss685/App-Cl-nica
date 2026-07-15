import { useState } from 'react';
import { ClinicalRecordWorkspace } from '../components/ClinicalRecordWorkspace';
import { PatientModal } from '../components/PatientModal';

export function Prontuarios() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  return (
    <>
      <ClinicalRecordWorkspace onOpenPatient={setSelectedPatientId} />
      {selectedPatientId && (
        <PatientModal
          isOpen={!!selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          patientId={selectedPatientId}
          initialTab="clinical"
        />
      )}
    </>
  );
}
