import React, { ReactNode } from 'react';
import { Droppable as DroppableComponent, DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';

interface DraggableFieldTargetProps {
  targetFieldId: string;
  targetFieldName: string;
  isActive: boolean;
  children: ReactNode;
}

export function DraggableFieldTarget({
  targetFieldId,
  targetFieldName,
  isActive,
  children
}: DraggableFieldTargetProps) {
  return (
    <div className="p-2">
      <DroppableComponent droppableId={`droppable-${targetFieldId}`}>
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`rounded-md transition-colors ${
              snapshot.isDraggingOver 
                ? 'bg-primary/10' 
                : 'bg-transparent'
            }`}
            id={`target-${targetFieldId}`}
            data-field-id={targetFieldId}
          >
            {children}
            {provided.placeholder}
          </div>
        )}
      </DroppableComponent>
    </div>
  );
} 