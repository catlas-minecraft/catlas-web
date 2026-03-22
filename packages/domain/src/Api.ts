import { HttpApi } from "@effect/platform"
import { AuthApiGroup } from "./AuthApi.js"
import { TodosApiGroup } from "./TodosApi.js"

export class Api extends HttpApi.make("api").add(TodosApiGroup).add(AuthApiGroup) {}
