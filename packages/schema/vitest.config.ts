import { mergeConfig, type UserConfigExport } from "vite-plus";
import shared from "../../vitest.shared.js";

const config: UserConfigExport = {};

export default mergeConfig(shared, config);
