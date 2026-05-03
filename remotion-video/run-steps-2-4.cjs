const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');

const { generateWorkflowStep } = require('./server/workflow/workflowGenerator');

const PROJECT_ID = 'xiaomi-mimo2.5';
const STEPS_DIR = path.join(__dirname, 'projects', PROJECT_ID, 'steps');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveStep(stepId, result) {
  ensureDir(STEPS_DIR);
  const filePath = path.join(STEPS_DIR, `step-0${stepId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`Step ${stepId} saved to step-0${stepId}.json`);
  return result;
}

async function runStep2(input) {
  console.log('\n=== Step 2: 标题生成 ===');

  let step2Result;
  try {
    step2Result = await generateWorkflowStep({
      stepId: 2,
      projectState: input.projectState,
      pipelineState: {
        ...input.pipelineState,
        selectedTitleId: input.pipelineState.titles?.selectedId || null,
      },
      generationMeta: {
        mode: 'generate',
        trigger: 'auto',
        attempt: 0,
      },
    });
  } catch (err) {
    console.error('Step 2 generateWorkflowStep threw:', err.message);
    // Check if it's a validation error with details
    if (err.code === 'STEP2_TITLES_INVALID' || err.code === 'STEP2_STRATEGY_INVALID') {
      console.error('Validation error code:', err.code);
      console.error('Details:', JSON.stringify(err.details || {}, null, 2));
    }
    // Try to continue anyway with fallback approach
    console.error('Attempting to continue with fallback...');
    throw err;
  }

  console.log(`Step 2 model=${step2Result.model}, source=${step2Result.source}`);
  console.log(`Step 2 titles: ${step2Result.payload?.titles?.options?.length} options`);
  if (step2Result.payload?.titles?.options?.[0]) {
    console.log(`Selected title: ${step2Result.payload.titles.selectedId}`);
    console.log(`First option: ${step2Result.payload.titles.options[0].title}`);
  }

  return step2Result;
}

async function runStep3(input) {
  console.log('\n=== Step 3: 内容生成 ===');

  const result = await generateWorkflowStep({
    stepId: 3,
    projectState: input.projectState,
    pipelineState: {
      ...input.pipelineState,
      selectedTitleId: input.pipelineState.titles?.selectedId || null,
    },
    generationMeta: {
      mode: 'generate',
      trigger: 'auto',
      attempt: 0,
    },
  });

  console.log(`Step 3 model=${result.model}, source=${result.source}`);
  const copy = result.payload?.copy;
  if (copy) {
    console.log(`Hook: ${(copy.hook || '').substring(0, 60)}...`);
    console.log(`Body sections: ${copy.body?.length || 0}`);
    console.log(`CTA: ${(copy.cta || '').substring(0, 60)}...`);
  }

  return result;
}

async function runStep4(input) {
  console.log('\n=== Step 4: 场景编排 ===');

  const result = await generateWorkflowStep({
    stepId: 4,
    projectState: input.projectState,
    shotsState: input.shotsState || [],
    pipelineState: input.pipelineState,
    generationMeta: {
      mode: 'generate',
      trigger: 'auto',
      attempt: 0,
    },
  });

  console.log(`Step 4 model=${result.model}, source=${result.source}`);
  const shots = result.payload?.shots || [];
  console.log(`Shots: ${shots.length}`);
  shots.slice(0, 3).forEach((shot, i) => {
    console.log(`  Shot ${i + 1}: ${shot.title} (${shot.durationSeconds}s) - ${(shot.narration || '').substring(0, 40)}...`);
  });

  return result;
}

async function main() {
  console.log('Continuing Step 1-4 pipeline for:', PROJECT_ID);

  // Load existing step 1 result
  const step1Path = path.join(STEPS_DIR, 'step-01.json');
  if (!fs.existsSync(step1Path)) {
    console.error('Step 1 file not found at', step1Path);
    console.error('Run the original run-step1-to-step4.cjs first to create Step 1');
    process.exit(1);
  }

  const step1Result = JSON.parse(fs.readFileSync(step1Path, 'utf8'));
  console.log('Loaded step-01.json, thesis:', step1Result.payload?.analysis?.thesis?.substring(0, 60));

  // Load pipeline state
  const pipelineStatePath = path.join(__dirname, 'projects', PROJECT_ID, 'pipeline-state.json');
  let pipelineState = {};
  if (fs.existsSync(pipelineStatePath)) {
    pipelineState = JSON.parse(fs.readFileSync(pipelineStatePath, 'utf8'));
    console.log('Loaded pipeline-state.json');
  }

  const projectState = { name: PROJECT_ID };

  // Build input for step 2 - need to set selectedTitleId
  // First run step 2 to get titles
  const step2Input = {
    stepId: 2,
    projectState,
    pipelineState: {
      ...pipelineState,
      // selectedAnalysis is already set in pipelineState
      selectedAnalysis: pipelineState.selectedAnalysis || step1Result.payload?.analysis || null,
    },
    generationMeta: { mode: 'generate', trigger: 'auto', attempt: 0 },
  };

  // Run step 2
  let step2Result;
  try {
    step2Result = await runStep2(step2Input);
    saveStep(2, step2Result);
  } catch (err) {
    console.error('Step 2 failed:', err.message);
    throw err;
  }

  // Extract titles from step 2 result
  const titles = step2Result.payload?.titles || {};
  const selectedTitleId = titles.selectedId || titles.options?.[0]?.id || null;

  console.log('\n--- Step 2 Results ---');
  console.log('Selected title ID:', selectedTitleId);
  if (titles.options) {
    titles.options.forEach((t, i) => console.log(`  ${i + 1}. [${t.angle}] ${t.title} (score:${t.score})`));
  }

  // Update pipeline state with step 2 results
  const updatedPipelineState = {
    ...pipelineState,
    titles: titles,
    selectedTitleId: selectedTitleId,
    selectedAnalysis: pipelineState.selectedAnalysis || step1Result.payload?.analysis,
  };

  // Run step 3
  let step3Result;
  try {
    step3Input = {
      stepId: 3,
      projectState,
      pipelineState: updatedPipelineState,
      generationMeta: { mode: 'generate', trigger: 'auto', attempt: 0 },
    };
    step3Result = await runStep3(step3Input);
    saveStep(3, step3Result);
  } catch (err) {
    console.error('Step 3 failed:', err.message);
    throw err;
  }

  console.log('\n--- Step 3 Results ---');
  const copy = step3Result.payload?.copy || {};
  console.log('Hook:', copy.hook?.substring(0, 80));
  console.log('Body count:', copy.body?.length);
  copy.body?.forEach((b, i) => console.log(`  ${i + 1}. [${b.label}] ${b.text?.substring(0, 60)}...`));
  console.log('CTA:', copy.cta?.substring(0, 80));

  // Build shotsState from step 3 copy
  const shotsState = [];
  if (copy.hook) {
    shotsState.push({
      id: 'shot-01',
      title: '开场钩子',
      narration: copy.hook,
      durationSeconds: Math.max(5, Math.ceil((copy.hook?.length || 20) / 4)),
    });
  }
  if (copy.body && copy.body.length > 0) {
    copy.body.forEach((item, index) => {
      if (item.text) {
        shotsState.push({
          id: `shot-${String(index + 2).padStart(2, '0')}`,
          title: item.label || `段落 ${index + 1}`,
          narration: item.text,
          durationSeconds: Math.max(8, Math.ceil((item.text?.length || 30) / 4)),
        });
      }
    });
  }
  if (copy.cta) {
    shotsState.push({
      id: `shot-${String(shotsState.length + 1).padStart(2, '0')}`,
      title: '行动召唤',
      narration: copy.cta,
      durationSeconds: Math.max(5, Math.ceil((copy.cta?.length || 20) / 4)),
    });
  }

  console.log('\nDerived shotsState:', shotsState.length, 'shots');
  shotsState.forEach((s, i) => console.log(`  ${i + 1}. ${s.id}: ${s.title} (${s.durationSeconds}s)`));

  // Run step 4
  let step4Result;
  try {
    step4Result = await runStep4({
      stepId: 4,
      projectState,
      shotsState,
      pipelineState: {
        ...updatedPipelineState,
        copy: step3Result.payload?.copy || copy,
      },
      generationMeta: { mode: 'generate', trigger: 'auto', attempt: 0 },
    });
    saveStep(4, step4Result);
  } catch (err) {
    console.error('Step 4 failed:', err.message);
    throw err;
  }

  console.log('\n--- Step 4 Results ---');
  const finalShots = step4Result.payload?.shots || [];
  console.log('Final shots:', finalShots.length);
  finalShots.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.id}: ${s.title} (${s.durationSeconds}s)`);
    console.log(`     narration: ${(s.narration || '').substring(0, 50)}...`);
    if (s.sceneFamily) console.log(`     sceneFamily: ${s.sceneFamily}`);
  });

  // Save final pipeline state
  const finalPipelineState = {
    ...updatedPipelineState,
    copy: step3Result.payload?.copy,
    shots: finalShots,
    selectedTitleId,
  };
  fs.writeFileSync(
    path.join(__dirname, 'projects', PROJECT_ID, 'pipeline-state-step4.json'),
    JSON.stringify(finalPipelineState, null, 2)
  );
  console.log('\nFinal pipeline state saved to pipeline-state-step4.json');

  console.log('\n=== ALL STEPS COMPLETE ===');
  console.log('Step 1:', step1Result.payload?.analysis?.thesis?.substring(0, 50), '...');
  console.log('Step 2:', titles.options?.[0]?.title || 'no title');
  console.log('Step 3:', (copy.hook || '').substring(0, 50), '...');
  console.log('Step 4:', finalShots.length, 'shots generated');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});