import React from 'react';
import type {CompiledProject} from '../project/compileProject';

export const GlobalOverlays: React.FC<{project: CompiledProject}> = ({project}) => (
  project.showProjectLabel ? <div
    data-project={project.projectId}
    data-project-schema={project.schemaVersion}
    style={{
      position: 'absolute',
      top: 30,
      left: 42,
      color: 'rgba(248,250,252,0.56)',
      fontSize: 14,
      fontWeight: 800,
      textTransform: 'uppercase',
      pointerEvents: 'none',
    }}
  >
    {project.title}
  </div> : null
);
