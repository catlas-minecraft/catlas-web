import { HttpApiBuilder } from "@effect/platform"
import { Api } from "@catlas/domain/Api"
import { Effect, Layer } from "effect"
import { AuthLive } from "./auth/AuthHandlers.js"
import { TodosRepository } from "./TodosRepository.js"

const TodosApiLive = HttpApiBuilder.group(Api, "todos", (handlers) =>
  Effect.gen(function*() {
    const todos = yield* TodosRepository
    return handlers
      .handle("getAllTodos", () => todos.getAll)
      .handle("getTodoById", ({ path: { id } }) => todos.getById(id))
      .handle("createTodo", ({ payload: { text } }) => todos.create(text))
      .handle("completeTodo", ({ path: { id } }) => todos.complete(id))
      .handle("removeTodo", ({ path: { id } }) => todos.remove(id))
  }))

export const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(TodosApiLive),
  Layer.provide(AuthLive)
)
