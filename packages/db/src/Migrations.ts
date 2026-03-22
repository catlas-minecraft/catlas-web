import { fileURLToPath } from "node:url"

export const migrationsDirectory = fileURLToPath(
  new URL("../migrations", import.meta.url)
)
