import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';

import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinksService } from './links.service';

function extractPrincipal(
  auth?: string,
  apiKey?: string,
  principal?: string,
): string {
  if (principal && principal.trim()) return principal.trim();
  if (apiKey && apiKey.trim()) return apiKey.trim();
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return 'anonymous';
}

@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  create(
    @Body() dto: CreateLinkDto,
    @Headers('authorization') auth?: string,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-principal-id') principal?: string,
  ) {
    const principalId = extractPrincipal(auth, apiKey, principal);
    return this.linksService.create(dto, principalId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLinkDto,
  ) {
    return this.linksService.update(id, dto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.linksService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('search')
  search(
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
    @Headers('authorization') auth?: string,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-principal-id') principal?: string,
  ) {
    const principalId = extractPrincipal(auth, apiKey, principal);
    return this.linksService.search(
      q,
      tag,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      principalId,
    );
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @Headers('authorization') auth?: string,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-principal-id') principal?: string,
  ) {
    const principalId = extractPrincipal(auth, apiKey, principal);
    return this.linksService.findById(id, principalId);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Headers('authorization') auth?: string,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-principal-id') principal?: string,
  ) {
    if (!auth && !apiKey && !principal) {
      throw new UnauthorizedException('Authentication credentials missing');
    }
    const principalId = extractPrincipal(auth, apiKey, principal);
    return this.linksService.delete(id, principalId);
  }
}
