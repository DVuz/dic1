export default function withoutLogin() {
  return {
    success: false,
    message: "Unauthorized - Please login first",
    error: "UNAUTHORIZED",
    status: 401
  } as const;
}
