# Module 03 — System-Level Architecture Context

## Architecture Summary

- Framework: NestJS 12 with TypeScript 6.
- HTTP platform: `@nestjs/platform-express`.
- Database: MongoDB.
- ODM: Mongoose 9 through `@nestjs/mongoose`.
- Application entry point: `src/main.ts`.
- Root module: `src/app.module.ts`.
- Features are organized as NestJS modules under `src/<feature>/`.
- Existing URL-shortener functionality is organized under `src/links/`.
- Database setup is centralized in `src/database/database.module.ts`.

## Module Pattern

Feature modules follow the NestJS pattern:

- `<feature>.module.ts`
- `<feature>.controller.ts`
- `<feature>.service.ts`
- schema files colocated with the feature
- DTOs under a feature-specific `dto/` directory when needed

`LinksModule` is the existing reference implementation.

## Database Pattern

Mongoose schemas use:

- `@Schema(...)`
- `@Prop(...)`
- `SchemaFactory.createForClass(...)`
- `HydratedDocument<T>` for document types
- Mongoose models injected with `@InjectModel(...)`

Existing database registration occurs through `MongooseModule`.

The existing Link schema uses snake_case persisted field names such as `created_by`, `long_url`, `created_at`, and `expires_at`.

## Timestamp Convention

The existing Link schema uses:

`@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })`

Therefore timestamp behavior must be checked against the specific existing schema before being copied. Do not assume that every schema has identical timestamp settings.

## Naming Conventions

- TypeScript classes: PascalCase.
- Variables, methods, and functions: camelCase.
- Persisted database fields: existing schemas use snake_case where appropriate.
- NestJS feature files use names such as `links.controller.ts`, `links.service.ts`, and `link.schema.ts`.
- DTO files use names such as `create-link.dto.ts`.

## Routing

Controllers use NestJS decorators:

- `@Controller(...)`
- `@Post()`
- `@Get()`
- `@Patch()`
- `@Delete()`
- `@Param()`
- `@Body()`
- `@Query()`

The existing Links controller is the primary route-pattern reference.

## Validation

Global validation is configured in `src/main.ts` using `ValidationPipe` with:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

DTO validation uses `class-validator`.

Existing DTOs use decorators such as `@IsString()`, `@IsOptional()`, `@MaxLength()`, and custom validators where required.

New request DTOs should use the existing validation mechanism rather than introducing another validation library.

## Error Handling

The existing service layer uses NestJS HTTP exceptions including:

- `BadRequestException`
- `NotFoundException`

Examples from `LinksService`:

- invalid ObjectId -> `BadRequestException`
- missing resource -> `NotFoundException`

Do not invent a separate application-wide error wrapper or custom error framework unless existing project evidence requires it.

## Authentication

No existing authentication/user module or authentication middleware was found in the inspected application files.

Do not invent a second authentication mechanism or a User schema merely to satisfy a feature requirement. If a task requires user identity, use an existing identity mechanism if one is actually present, otherwise preserve the task boundary and explicitly document the unresolved integration point.

## Constraints

- Do not install new npm dependencies without a demonstrated requirement.
- Reuse existing NestJS, Mongoose, class-validator, and testing conventions.
- Do not modify unrelated existing features.
- Do not invent authentication infrastructure.
- Do not invent a duplicate User model.
- New files must follow existing NestJS naming conventions.
- Database schemas must follow the existing Mongoose schema pattern.
- Validation must use the existing global `ValidationPipe` and class-validator setup.
- HTTP errors must use the existing NestJS exception pattern.
- Run the relevant tests and build after changes.
