import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShareModalContent } from '@/components/routine/ShareModal';
import { useRoutineStore } from '@/store/routineStore';

export const CollaborationScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedRoutine, fetchRoutineById } = useRoutineStore();

  useEffect(() => {
    if (id && (!selectedRoutine || selectedRoutine.id !== id)) {
      fetchRoutineById(id);
    }
  }, [id, selectedRoutine, fetchRoutineById]);

  if (!id) {
    return (
      <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-4">
        <p className="text-sm text-text-muted">Missing Routine ID.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary p-4 flex items-center justify-center">
      <ShareModalContent
        isOpen={true}
        timelineId={id}
        timelineName={selectedRoutine?.name || 'Routine'}
        startDate={selectedRoutine?.start_date}
        endDate={selectedRoutine?.end_date}
        userRole={selectedRoutine?.role || 'owner'}
        onClose={() => navigate(`/routines/${id}`)}
      />
    </div>
  );
};

export default CollaborationScreen;

