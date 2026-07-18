/**
 * SceneTimeline.tsx — 场景时间线渲染
 *
 * 主渲染路径：TransitionSeries + ProjectSceneRegistry
 *
 * DirectorScore 接入点（高级编排方案）：
 *   1. compileProject 返回 CompiledProject.directorScore?: DirectorScore
 *   2. 此组件检查 compiledProject.directorScore 是否存在
 *   3. 如有，调用 scoreToSequences() → DirectorScoreOrchestrator
 *   4. 如无，使用当前 TransitionSeries 路径（默认）
 *   详见 DirectorScoreOrchestrator.tsx
 */

import React from 'react';
import {Sequence} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import type {CompiledProject} from '../project/compileProject';
import {ProjectSceneRegistry} from '../project/sceneRegistry';

const transitionPresentation = (transition: Exclude<CompiledProject['scenes'][number]['transitionOut'], false>) => (
  transition.type === 'slide'
    ? slide({direction: 'from-right'})
    : fade({shouldFadeOutExitingScene: true})
);

export const SceneTimeline: React.FC<{project: CompiledProject}> = ({project}) => (
  <TransitionSeries>
    {project.scenes.flatMap((scene, sceneIndex) => {
      const sceneNode = (
        <TransitionSeries.Sequence
          key={`scene-${scene.id}`}
          durationInFrames={scene.seriesDurationInFrames}
          name={`${sceneIndex + 1}. ${scene.id}`}
        >
          <Sequence
            from={0}
            durationInFrames={scene.seriesDurationInFrames}
            premountFor={Math.min(project.fps, scene.seriesDurationInFrames)}
          >
            <ProjectSceneRegistry
              scene={scene}
              sceneIndex={sceneIndex}
              qualityMode={project.qualityMode}
            />
          </Sequence>
        </TransitionSeries.Sequence>
      );
      if (scene.transitionOut === false) return [sceneNode];
      return [
        sceneNode,
        <TransitionSeries.Transition
          key={`transition-${scene.id}`}
          timing={linearTiming({durationInFrames: scene.transitionOut.durationInFrames})}
          presentation={transitionPresentation(scene.transitionOut)}
        />,
      ];
    })}
  </TransitionSeries>
);
