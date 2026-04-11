export async function callJson(url: string, options: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || `Request failed: ${response.status}`) as Error & {
      status?: number;
      code?: string | null;
      details?: unknown;
    };
    error.status = response.status;
    error.code = data?.code || null;
    error.details = data?.details || null;
    throw error;
  }
  return data;
}
