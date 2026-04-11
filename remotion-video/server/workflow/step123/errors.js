class WorkflowGenerationError extends Error {
  constructor({
    status = 500,
    code = 'WORKFLOW_GENERATION_FAILED',
    message = '工作流生成失败',
    details = null,
  } = {}) {
    super(message);
    this.name = 'WorkflowGenerationError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function toWorkflowGenerationError(error, fallback) {
  if (error instanceof WorkflowGenerationError) {
    return error;
  }

  return new WorkflowGenerationError({
    status: fallback?.status || 500,
    code: fallback?.code || 'WORKFLOW_GENERATION_FAILED',
    message: fallback?.message || error?.message || '工作流生成失败',
    details: fallback?.details || null,
  });
}

module.exports = {
  WorkflowGenerationError,
  toWorkflowGenerationError,
};
