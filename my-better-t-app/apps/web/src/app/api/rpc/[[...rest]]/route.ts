import { createContext } from "@my-better-t-app/api/context"
import { appRouter } from "@my-better-t-app/api/routers/index"
import { env } from "@my-better-t-app/env/server"
import { OpenAPIHandler } from "@orpc/openapi/fetch"
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins"
import { onError } from "@orpc/server"
import { RPCHandler } from "@orpc/server/fetch"
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4"
import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 3600

const ALLOWED_ORIGINS = new Set(env.CORS_ORIGIN)

function buildCorsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin")
  const headers = new Headers()
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("access-control-allow-origin", origin)
    headers.set("vary", "origin")
    headers.set("access-control-allow-credentials", "true")
    headers.set(
      "access-control-allow-methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    )
    headers.set(
      "access-control-allow-headers",
      req.headers.get("access-control-request-headers") ??
        "content-type,authorization",
    )
    headers.set("access-control-max-age", "86400")
  }
  return headers
}

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

async function handleRequest(req: NextRequest) {
  const corsHeaders = buildCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const rpcResult = await rpcHandler.handle(req, {
    prefix: "/api/rpc",
    context: await createContext(req),
  })
  if (rpcResult.response) {
    corsHeaders.forEach((value, key) => rpcResult.response!.headers.set(key, value))
    return rpcResult.response
  }

  const apiResult = await apiHandler.handle(req, {
    prefix: "/api/rpc/api-reference",
    context: await createContext(req),
  })
  if (apiResult.response) {
    corsHeaders.forEach((value, key) => apiResult.response!.headers.set(key, value))
    return apiResult.response
  }

  return new Response("Not found", { status: 404, headers: corsHeaders })
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const PATCH = handleRequest
export const DELETE = handleRequest
export const OPTIONS = handleRequest
