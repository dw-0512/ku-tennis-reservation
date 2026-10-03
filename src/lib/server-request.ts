export async function readJsonBody<T extends object>(
  request: Request,
): Promise<T | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as T)
      : null;
  } catch {
    return null;
  }
}

export function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isAdminPasswordValid(value: unknown) {
  const password = process.env.ADMIN_PASSWORD;
  return (
    typeof password === "string" && password.length > 0 && value === password
  );
}
