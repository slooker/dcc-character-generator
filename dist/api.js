// Thin fetch wrapper for the FastAPI server in server/.
// Every request sends X-Requested-With (the server's CSRF check) and the
// session cookie; errors carry the server's `detail` message.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`api/${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'crawler-intake', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : `Request failed (${response.status}).`;
    throw new ApiError(response.status, detail);
  }
  return data;
}
