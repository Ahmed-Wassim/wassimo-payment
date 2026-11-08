import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CredentialsService } from './credentials.service.ts';
import { IssueCredentialDto } from './dto/issue-credential.dto.ts';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly service: CredentialsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.service.revoke(id);
  }

  @Post()
  issue(@Body() dto: IssueCredentialDto) {
    return this.service.issueForApp(dto);
  }
}
