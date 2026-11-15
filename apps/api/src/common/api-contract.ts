import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  type OpenAPIObject,
  type ReferenceObject,
  type SchemaObject,
} from '@nestjs/swagger';
import { ProblemDetailsSchema } from '@paylens/shared';
import { z } from 'zod';

/**
 * What one route accepts and answers, stated with the shared Zod schemas the route already
 * validates with. The OpenAPI document is generated from these, so the docs cannot drift
 * from the validation (api.md: "OpenAPI generated from the shared Zod schemas").
 */
export interface ApiContractOptions {
  readonly summary: string;
  readonly params?: z.ZodType;
  readonly query?: z.ZodType;
  readonly body?: z.ZodType;
  readonly success: {
    readonly status: HttpStatus;
    readonly schema: z.ZodType;
    readonly description: string;
  };
  /** Errors this route can answer, besides 401 and 403 (every non-public route). */
  readonly problems?: readonly HttpStatus[];
  /** A change to a person: If-Match with the ETag they loaded is required. */
  readonly ifMatch?: boolean;
  /** The answer carries the person's version as ETag. */
  readonly etag?: boolean;
  /** Open without signing in (no 401 or 403). */
  readonly public?: boolean;
  /** Answers that are not problems, such as readiness reporting 503 with its checks. */
  readonly otherResponses?: readonly {
    readonly status: HttpStatus;
    readonly schema: z.ZodType;
    readonly description: string;
  }[];
}

const PROBLEM_DESCRIPTIONS: Readonly<Partial<Record<HttpStatus, string>>> = {
  [HttpStatus.BAD_REQUEST]: 'Invalid input; `errors` lists each field',
  [HttpStatus.UNAUTHORIZED]: 'Not signed in',
  [HttpStatus.FORBIDDEN]: 'Signed in, but this role may not do this',
  [HttpStatus.NOT_FOUND]: 'There is no such resource',
  [HttpStatus.CONFLICT]:
    'Someone changed the record since it was loaded, or a unique value is taken',
  [HttpStatus.UNPROCESSABLE_ENTITY]:
    'A business rule was broken; `code` says which',
  [HttpStatus.PRECONDITION_REQUIRED]:
    'If-Match is missing; send the ETag of the version you loaded',
};

const PROBLEM_REF = { $ref: '#/components/schemas/ProblemDetails' };

export function ApiContract(options: ApiContractOptions): MethodDecorator {
  const decorators: MethodDecorator[] = [
    ApiOperation({ summary: options.summary }),
  ];

  for (const field of fieldsOf(options.params)) {
    decorators.push(ApiParam({ ...field, required: true }));
  }
  for (const field of fieldsOf(options.query)) {
    decorators.push(ApiQuery(field));
  }
  if (options.body !== undefined) {
    decorators.push(ApiBody({ schema: toSchema(options.body, 'input') }));
  }
  if (options.ifMatch === true) {
    decorators.push(
      ApiHeader({
        name: 'If-Match',
        required: true,
        description: 'The ETag of the version you loaded, e.g. "3"',
      }),
    );
  }

  const { success } = options;
  decorators.push(
    ApiResponse({
      status: success.status,
      description: success.description,
      content: {
        'application/json': { schema: toSchema(success.schema, 'output') },
      },
      ...(options.etag === true && {
        headers: {
          ETag: {
            description: 'The version, to send back as If-Match',
            schema: { type: 'string' },
          },
        },
      }),
    }),
  );
  for (const other of options.otherResponses ?? []) {
    decorators.push(
      ApiResponse({
        status: other.status,
        description: other.description,
        content: {
          'application/json': { schema: toSchema(other.schema, 'output') },
        },
      }),
    );
  }

  const problems = new Set<HttpStatus>([
    ...(options.public === true
      ? []
      : [HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN]),
    ...(options.problems ?? []),
  ]);
  for (const status of [...problems].sort((a, b) => a - b)) {
    decorators.push(
      ApiResponse({
        status,
        description: PROBLEM_DESCRIPTIONS[status] ?? 'Error',
        content: { 'application/problem+json': { schema: PROBLEM_REF } },
      }),
    );
  }

  return applyDecorators(...decorators);
}

/** Adds the schemas every route refers to by name; call on the generated document. */
export function withSharedSchemas(document: OpenAPIObject): OpenAPIObject {
  return {
    ...document,
    components: {
      ...document.components,
      schemas: {
        ...document.components?.schemas,
        ProblemDetails: toSchema(ProblemDetailsSchema, 'output'),
      },
    },
  };
}

/** One entry per property of an object schema: path parameters or query parameters. */
function fieldsOf(schema: z.ZodType | undefined): {
  name: string;
  required: boolean;
  schema: SchemaObject | ReferenceObject;
}[] {
  if (schema === undefined) {
    return [];
  }
  const json = toSchema(schema, 'input');
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([name, property]) => ({
    name,
    required: required.has(name),
    schema: property,
  }));
}

/**
 * A Zod schema as JSON Schema 2020-12, the dialect OpenAPI 3.1 uses. `input` describes what a
 * client sends (defaults make fields optional); `output` what the API answers. Transforms
 * cannot be described, so they show as "any value" rather than failing.
 */
function toSchema(schema: z.ZodType, io: 'input' | 'output'): SchemaObject {
  const json: Record<string, unknown> = {
    ...z.toJSONSchema(schema, { io, unrepresentable: 'any' }),
  };
  // The dialect is set once for the whole document, not per schema.
  delete json['$schema'];
  // Both are JSON Schema; the two libraries only type it differently.
  return json as SchemaObject;
}
