export function Exception(description, message, statusCode) {
  this.message = message || "error";
  this.statusCode = statusCode || 800;
  this.description = description || null;
}
